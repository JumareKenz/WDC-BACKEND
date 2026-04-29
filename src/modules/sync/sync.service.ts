import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { withRlsTransaction, type RlsContext } from '../../common/rls/rls-context';
import { ReportsService } from '../reports/reports.service';
import type { OpKind, Transition } from '../reports/report-projection';
import type {
  SyncBatchDto,
  SyncBatchResponseDto,
  SyncOpDto,
  SyncOpResultDto,
  SyncPulledOpDto,
} from './sync.dto';

@Injectable()
export class SyncService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    @Inject(ReportsService) private readonly reports: ReportsService,
  ) {}

  async applyBatch(
    actor: RlsContext,
    batch: SyncBatchDto,
  ): Promise<SyncBatchResponseDto> {
    // 1. Idempotency check (system role — idempotency_keys is system-only).
    const idem = await this.checkIdempotency(batch.idempotencyKey);
    if (idem) {
      return idem;
    }

    // 2. Group ops by report for batching.
    const byReport = new Map<string, SyncOpDto[]>();
    for (const op of batch.ops) {
      const list = byReport.get(op.reportId) ?? [];
      list.push(op);
      byReport.set(op.reportId, list);
    }

    const results: SyncOpResultDto[] = [];
    let maxSeq = 0n;

    for (const [, ops] of byReport) {
      // Separate transitions and content ops.
      const contentOps: SyncOpDto[] = [];
      const transitionOps: SyncOpDto[] = [];
      for (const op of ops) {
        if (op.opKind === 'field_set' || op.opKind === 'attachment_add') {
          contentOps.push(op);
        } else {
          transitionOps.push(op);
        }
      }

      // Apply content ops in a single transaction per report.
      if (contentOps.length > 0) {
        const reportId = contentOps[0]?.reportId;
        if (!reportId) throw new Error('missing reportId in contentOps');
        const contentResult = await this.applyContentOpsBatch(actor, reportId, contentOps);
        results.push(...contentResult.results);
        for (const seq of contentResult.serverSeqs) {
          if (seq > maxSeq) maxSeq = seq;
        }
      }

      // Apply transitions individually (state machine guards are sequential).
      for (const op of transitionOps) {
        const r = await this.applyTransitionOp(actor, op);
        results.push(r.result);
        if (r.serverSeq && r.serverSeq > maxSeq) maxSeq = r.serverSeq;
      }
    }

    // 3. Pull ops the client has not yet seen.
    let pulledOps: SyncPulledOpDto[] | undefined;
    if (batch.sinceCursor) {
      pulledOps = await this.pullOps(actor, batch.sinceCursor);
      for (const p of pulledOps) {
        const seq = BigInt(p.serverSeq);
        if (seq > maxSeq) maxSeq = seq;
      }
    }

    const applied = results.filter((r) => r.status === 'applied').length;
    const rejected = results.filter((r) => r.status === 'rejected').length;
    const nextCursor = maxSeq > 0n ? String(maxSeq) : batch.sinceCursor ?? '0';

    const response: SyncBatchResponseDto = {
      nextCursor,
      applied,
      rejected,
      results,
      pulledOps,
    };

    // 4. Store idempotency record.
    await this.storeIdempotency(batch.idempotencyKey, response);

    return response;
  }

  // ---------------------------------------------------------------------------
  // Batched content ops (field_set + attachment_add) — single txn per report.
  // ---------------------------------------------------------------------------

  private async applyContentOpsBatch(
    actor: RlsContext,
    reportId: string,
    ops: SyncOpDto[],
  ): Promise<{ results: SyncOpResultDto[]; serverSeqs: bigint[] }> {
    const results: SyncOpResultDto[] = [];
    const serverSeqs: bigint[] = [];

    try {
      const client = await this.pool.connect();
      try {
        await withRlsTransaction(client, actor, async (c) => {
          // Verify report is editable.
          const stateR = await c.query<{ state: string }>(
            `SELECT state FROM reports WHERE id = $1`,
            [reportId],
          );
          const stateRow = stateR.rows[0];
          if (!stateRow) {
            for (const op of ops) {
              results.push({
                reportId: op.reportId,
                opId: op.opId ?? randomUUID(),
                status: 'rejected',
                error: 'report not found',
              });
            }
            return;
          }
          if (stateRow.state !== 'draft' && stateRow.state !== 'returned') {
            for (const op of ops) {
              results.push({
                reportId: op.reportId,
                opId: op.opId ?? randomUUID(),
                status: 'rejected',
                error: `cannot append content op: report is ${stateRow.state}`,
              });
            }
            return;
          }

          // Secretary scope check.
          if (actor.role === 'secretary') {
            const scopeR = await c.query<{ ward_id: string }>(
              `SELECT ward_id FROM reports WHERE id = $1`,
              [reportId],
            );
            if (scopeR.rows[0]?.ward_id !== actor.wardId) {
              for (const op of ops) {
                results.push({
                  reportId: op.reportId,
                  opId: op.opId ?? randomUUID(),
                  status: 'rejected',
                  error: 'secretary cannot edit a report outside their ward',
                });
              }
              return;
            }
          }

          // Assign deterministic opIds.
          const opIds = ops.map((op) => op.opId ?? randomUUID());

          // Batch insert all content ops.
          const values: unknown[] = [];
          const placeholders: string[] = [];
          let idx = 1;
          for (let i = 0; i < ops.length; i++) {
            const op = ops[i];
            const opId = opIds[i];
            if (!op || !opId) continue;
            placeholders.push(
              `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}::jsonb, $${idx++})`,
            );
            values.push(
              reportId,
              opId,
              op.deviceId ?? 'sync-client',
              actor.userId,
              op.opKind,
              JSON.stringify(op.payload),
              op.wallClockTs ?? new Date().toISOString(),
            );
          }

          const insertR = await c.query<{ op_id: string; server_seq: string }>(
            `INSERT INTO report_op_log
               (report_id, op_id, device_id, actor_user_id, op_kind, payload, wall_clock_ts)
             VALUES ${placeholders.join(', ')}
             ON CONFLICT (report_id, op_id) DO NOTHING
             RETURNING op_id, server_seq::text AS server_seq`,
            values,
          );

          // Build a map of op_id -> server_seq for returned rows.
          const seqMap = new Map<string, string>();
          for (const row of insertR.rows) {
            seqMap.set(row.op_id, row.server_seq);
          }

          // Reproject canonical once after all inserts.
          const allOpsR = await c.query<{
            op_id: string;
            op_kind: OpKind;
            payload: Record<string, unknown>;
            wall_clock_ts: Date;
          }>(
            `SELECT op_id, op_kind, payload, wall_clock_ts
             FROM report_op_log WHERE report_id = $1`,
            [reportId],
          );
          const { projectCanonical } = await import('../reports/report-projection');
          const canonical = projectCanonical(
            allOpsR.rows.map((row) => ({
              opId: row.op_id,
              opKind: row.op_kind,
              payload: row.payload,
              wallClockTs: row.wall_clock_ts.toISOString(),
            })),
          );
          await c.query(`UPDATE reports SET canonical = $1::jsonb WHERE id = $2`, [
            JSON.stringify(canonical),
            reportId,
          ]);

          // Build results.
          for (let i = 0; i < ops.length; i++) {
            const op = ops[i];
            const opId = opIds[i];
            if (!op || !opId) continue;
            const seq = seqMap.get(opId);
            if (seq) {
              results.push({ reportId: op.reportId, opId, status: 'applied', serverSeq: seq });
              serverSeqs.push(BigInt(seq));
            } else {
              // Op was a duplicate (ON CONFLICT DO NOTHING) — still count as applied.
              results.push({ reportId: op.reportId, opId, status: 'applied' });
            }
          }
        });
      } finally {
        client.release();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      for (const op of ops) {
        results.push({
          reportId: op.reportId,
          opId: op.opId ?? randomUUID(),
          status: 'rejected',
          error: msg,
        });
      }
    }

    return { results, serverSeqs };
  }

  // ---------------------------------------------------------------------------
  // Single transition op.
  // ---------------------------------------------------------------------------

  private async applyTransitionOp(
    actor: RlsContext,
    op: SyncOpDto,
  ): Promise<{ result: SyncOpResultDto; serverSeq?: bigint }> {
    const opId = op.opId ?? randomUUID();
    const t = op.opKind as Transition;
    const notes =
      t === 'return' && typeof op.payload.notes === 'string'
        ? op.payload.notes
        : undefined;

    try {
      await this.reports.transition({
        actor,
        reportId: op.reportId,
        transition: t,
        notes,
        requestId: null,
      });
      // Transitions that insert an op_log row have a server_seq.
      const seq = await this.lookupServerSeq(op.reportId, opId).catch(() => undefined);
      return {
        result: { reportId: op.reportId, opId, status: 'applied', serverSeq: seq },
        serverSeq: seq ? BigInt(seq) : undefined,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        result: { reportId: op.reportId, opId, status: 'rejected', error: msg },
      };
    }
  }

  private async lookupServerSeq(reportId: string, opId: string): Promise<string | undefined> {
    const client = await this.pool.connect();
    try {
      const r = await withRlsTransaction(
        client,
        { userId: null, role: 'system', lgaId: null, wardId: null },
        async (c) => {
          const q = await c.query<{ server_seq: string }>(
            `SELECT server_seq::text AS server_seq FROM report_op_log
             WHERE report_id = $1 AND op_id = $2`,
            [reportId, opId],
          );
          return q.rows[0]?.server_seq;
        },
      );
      return r;
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // Cursor pull.
  // ---------------------------------------------------------------------------

  private async pullOps(actor: RlsContext, sinceCursor: string): Promise<SyncPulledOpDto[]> {
    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(client, actor, async (c) => {
        const since = BigInt(sinceCursor);
        const r = await c.query<{
          report_id: string;
          op_id: string;
          op_kind: string;
          actor_user_id: string;
          device_id: string;
          wall_clock_ts: Date;
          server_seq: string;
          payload: Record<string, unknown>;
        }>(
          `SELECT report_id, op_id, op_kind, actor_user_id, device_id,
                  wall_clock_ts, server_seq::text AS server_seq, payload
           FROM report_op_log
           WHERE server_seq > $1
           ORDER BY server_seq ASC
           LIMIT 200`,
          [since],
        );
        return r.rows.map((row) => ({
          reportId: row.report_id,
          opId: row.op_id,
          opKind: row.op_kind,
          actorUserId: row.actor_user_id,
          deviceId: row.device_id,
          wallClockTs: row.wall_clock_ts.toISOString(),
          serverSeq: row.server_seq,
          payload: row.payload,
        }));
      });
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // Idempotency helpers (system role — idempotency_keys is system-only).
  // ---------------------------------------------------------------------------

  private async checkIdempotency(
    key: string,
  ): Promise<SyncBatchResponseDto | undefined> {
    const client = await this.pool.connect();
    try {
      const stored = await withRlsTransaction(
        client,
        { userId: null, role: 'system', lgaId: null, wardId: null },
        async (c) => {
          const r = await c.query<{
            response_body: SyncBatchResponseDto;
          }>(
            `SELECT response_body
             FROM idempotency_keys WHERE key = $1 AND expires_at > now()`,
            [key],
          );
          return r.rows[0];
        },
      );
      return stored?.response_body;
    } finally {
      client.release();
    }
  }

  private async storeIdempotency(
    key: string,
    response: SyncBatchResponseDto,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await withRlsTransaction(
        client,
        { userId: null, role: 'system', lgaId: null, wardId: null },
        async (c) => {
          await c.query(
            `INSERT INTO idempotency_keys (key, request_hash, response_status, response_body, expires_at)
             VALUES ($1, $2, $3, $4::jsonb, now() + interval '24 hours')
             ON CONFLICT (key) DO NOTHING`,
            [key, '', 200, JSON.stringify(response)],
          );
        },
      );
    } finally {
      client.release();
    }
  }
}
