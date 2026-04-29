import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { withRlsTransaction, type RlsContext, type Role } from '../../common/rls/rls-context';
import { AuditService } from '../audit/audit.service';
import {
  expectedFromState,
  isEditable,
  nextState,
  projectCanonical,
  rolesForTransition,
  type CanonicalReport,
  type FieldSetPayload,
  type OpKind,
  type ReportOp,
  type ReportState,
  type Transition,
} from './report-projection';

export interface ReportRow {
  id: string;
  form_version_id: string;
  ward_id: string;
  submitted_by: string;
  submission_method: 'amira' | 'wizard' | 'snap';
  state: ReportState;
  sealed_at: Date | null;
  canonical: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface OpRow {
  op_id: string;
  op_kind: OpKind;
  actor_user_id: string;
  device_id: string;
  wall_clock_ts: Date;
  server_seq: string;
  payload: Record<string, unknown>;
}

const DEFAULT_DEVICE_ID = 'server';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async create(args: {
    actor: RlsContext;
    formVersionId: string;
    submissionMethod: 'amira' | 'wizard' | 'snap';
    wardId?: string;
  }): Promise<ReportRow> {
    const wardId = args.wardId ?? args.actor.wardId;
    if (!wardId) {
      throw new BadRequestException('wardId is required (or sign in as a ward-scoped secretary)');
    }
    if (!args.actor.userId) {
      throw new ForbiddenException('actor must be authenticated');
    }

    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(client, args.actor, async (c) => {
        // Reject if the form_version is not deployed.
        const fv = await c.query<{ deployed_at: Date | null }>(
          `SELECT deployed_at FROM form_versions WHERE id = $1`,
          [args.formVersionId],
        );
        const fvRow = fv.rows[0];
        if (!fvRow) throw new NotFoundException('form version not found');
        if (fvRow.deployed_at === null) {
          throw new BadRequestException('cannot create a report against a non-deployed form version');
        }

        const r = await c.query<ReportRow>(
          `INSERT INTO reports (form_version_id, ward_id, submitted_by, submission_method)
           VALUES ($1, $2, $3, $4)
           RETURNING id, form_version_id, ward_id, submitted_by, submission_method,
                     state, sealed_at, canonical, created_at, updated_at`,
          [args.formVersionId, wardId, args.actor.userId, args.submissionMethod],
        );
        const row = r.rows[0];
        if (!row) throw new Error('reports INSERT returned no row');
        return row;
      });
    } finally {
      client.release();
    }
  }

  async getById(actor: RlsContext, id: string): Promise<ReportRow> {
    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(client, actor, async (c) => {
        const row = await this.fetchReport(c, id);
        return row;
      });
    } finally {
      client.release();
    }
  }

  async list(actor: RlsContext, filters: { state?: ReportState }): Promise<ReportRow[]> {
    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(client, actor, async (c) => {
        const where: string[] = [];
        const params: unknown[] = [];
        if (filters.state) {
          params.push(filters.state);
          where.push(`state = $${params.length}`);
        }
        const r = await c.query<ReportRow>(
          `SELECT id, form_version_id, ward_id, submitted_by, submission_method,
                  state, sealed_at, canonical, created_at, updated_at
           FROM reports
           ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
           ORDER BY created_at DESC LIMIT 200`,
          params,
        );
        return r.rows;
      });
    } finally {
      client.release();
    }
  }

  async listOps(actor: RlsContext, reportId: string): Promise<OpRow[]> {
    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(client, actor, async (c) => {
        await this.fetchReport(c, reportId);
        const r = await c.query<OpRow>(
          `SELECT op_id, op_kind, actor_user_id, device_id, wall_clock_ts,
                  server_seq::text AS server_seq, payload
           FROM report_op_log WHERE report_id = $1 ORDER BY server_seq ASC`,
          [reportId],
        );
        return r.rows;
      });
    } finally {
      client.release();
    }
  }

  /**
   * Append a field_set op and reproject the canonical state. The full op
   * log remains the source of truth; reports.canonical is a cached
   * projection used by reads.
   */
  async setField(args: {
    actor: RlsContext;
    reportId: string;
    payload: FieldSetPayload;
    opId?: string;
    wallClockTs?: string;
    deviceId?: string;
    requestId: string | null;
  }): Promise<ReportRow> {
    return this.appendContentOp({
      actor: args.actor,
      reportId: args.reportId,
      opKind: 'field_set',
      payload: { ...args.payload },
      opId: args.opId,
      wallClockTs: args.wallClockTs,
      deviceId: args.deviceId,
      requestId: args.requestId,
    });
  }

  async addAttachment(args: {
    actor: RlsContext;
    reportId: string;
    payload: Record<string, unknown>;
    opId?: string;
    wallClockTs?: string;
    deviceId?: string;
    requestId: string | null;
  }): Promise<ReportRow> {
    return this.appendContentOp({
      actor: args.actor,
      reportId: args.reportId,
      opKind: 'attachment_add',
      payload: args.payload,
      opId: args.opId,
      wallClockTs: args.wallClockTs,
      deviceId: args.deviceId,
      requestId: args.requestId,
    });
  }

  async transition(args: {
    actor: RlsContext;
    reportId: string;
    transition: Transition;
    notes?: string;
    requestId: string | null;
  }): Promise<ReportRow> {
    const allowed = rolesForTransition(args.transition);
    if (!allowed.includes(args.actor.role)) {
      throw new ForbiddenException(
        `${args.actor.role} cannot perform ${args.transition} (allowed: ${allowed.join(', ')})`,
      );
    }
    if (!args.actor.userId && args.transition !== 'seal') {
      throw new ForbiddenException('actor must be authenticated');
    }

    const fromState = expectedFromState(args.transition);
    const toState = nextState(args.transition);

    const opKind: OpKind | null =
      args.transition === 'submit'
        ? 'submit'
        : args.transition === 'open_review'
          ? 'open_review'
          : args.transition === 'approve'
            ? 'approve'
            : args.transition === 'return'
              ? 'return'
              : args.transition === 'seal'
                ? 'seal'
                : null;

    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(client, args.actor, async (c) => {
        const current = await this.fetchReport(c, args.reportId);
        if (current.state !== fromState) {
          throw new ConflictException(
            `cannot ${args.transition}: current state is ${current.state}, expected ${fromState}`,
          );
        }

        const payload =
          args.transition === 'return' && args.notes
            ? { notes: args.notes }
            : args.transition === 'edit_returned'
              ? {}
              : {};

        if (opKind) {
          await this.insertOp(c, {
            reportId: args.reportId,
            actorUserId: args.actor.userId ?? current.submitted_by,
            opKind,
            payload,
          });
        }

        const sealedAt = args.transition === 'seal' ? new Date() : null;
        const updateSets = [`state = $1`];
        const params: unknown[] = [toState];
        if (toState === 'approved') {
          params.push(new Date());
          updateSets.push(`approved_at = $${params.length}`);
        } else if (fromState === 'approved' && toState === 'returned') {
          params.push(null);
          updateSets.push(`approved_at = $${params.length}`);
        }
        if (sealedAt) {
          params.push(sealedAt);
          updateSets.push(`sealed_at = $${params.length}`);
        }
        params.push(args.reportId);
        const r = await c.query<ReportRow>(
          `UPDATE reports SET ${updateSets.join(', ')}
           WHERE id = $${params.length}
           RETURNING id, form_version_id, ward_id, submitted_by, submission_method,
                     state, sealed_at, canonical, created_at, updated_at`,
          params,
        );
        if (!r.rows[0]) throw new NotFoundException('report not found');

        // Reproject canonical from the op log so any return-notes or
        // attachment-adds in the same lifecycle are reflected.
        await this.reprojectCanonical(c, args.reportId);

        await this.audit.append({
          actorUserId: args.actor.userId,
          actorRole: args.actor.role,
          eventKind: `reports.${args.transition}`,
          targetTable: 'reports',
          targetId: args.reportId,
          payload: { from: fromState, to: toState, notes: args.notes ?? null },
          requestId: args.requestId,
        });

        // Return the fresh row so canonical in the response is current.
        return await this.fetchReport(c, args.reportId);
      });
    } finally {
      client.release();
    }
  }

  /**
   * Find approved reports past the grace window and seal them. Idempotent —
   * re-running a few seconds later finds zero new candidates.
   */
  async runSealingPass(args: { graceDays: number; requestId: string | null }): Promise<{ sealed: number }> {
    const client = await this.pool.connect();
    try {
      const ids = await withRlsTransaction(
        client,
        { userId: null, role: 'system', lgaId: null, wardId: null },
        async (c) => {
          // Use approved_at (not updated_at, which the trigger overwrites on
          // every write) to compute the grace window.
          const r = await c.query<{ id: string }>(
            `SELECT id FROM reports
             WHERE state = 'approved'
               AND approved_at < now() - ($1 || ' days')::interval
             ORDER BY approved_at ASC LIMIT 200`,
            [String(args.graceDays)],
          );
          return r.rows.map((row) => row.id);
        },
      );
      let sealed = 0;
      for (const id of ids) {
        try {
          await this.transition({
            actor: { userId: null, role: 'system', lgaId: null, wardId: null },
            reportId: id,
            transition: 'seal',
            requestId: args.requestId,
          });
          sealed += 1;
        } catch {
          // A concurrent sealing run, or state changed under us — skip.
        }
      }
      return { sealed };
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------

  private async appendContentOp(args: {
    actor: RlsContext;
    reportId: string;
    opKind: OpKind;
    payload: Record<string, unknown>;
    opId?: string;
    wallClockTs?: string;
    deviceId?: string;
    requestId: string | null;
  }): Promise<ReportRow> {
    if (!args.actor.userId) throw new ForbiddenException('actor must be authenticated');
    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(client, args.actor, async (c) => {
        const current = await this.fetchReport(c, args.reportId);
        if (!isEditable(current.state)) {
          throw new ConflictException(
            `cannot append content op: report is ${current.state} (only draft/returned are editable)`,
          );
        }
        // Secretary may only edit reports in their own ward; RLS already
        // gates SELECT, but enforce on writes too.
        if (args.actor.role === 'secretary' && current.ward_id !== args.actor.wardId) {
          throw new ForbiddenException('secretary cannot edit a report outside their ward');
        }

        const userId = args.actor.userId;
        if (!userId) throw new ForbiddenException('actor must be authenticated');
        await this.insertOp(c, {
          reportId: args.reportId,
          actorUserId: userId,
          opKind: args.opKind,
          payload: args.payload,
          opId: args.opId,
          wallClockTs: args.wallClockTs,
          deviceId: args.deviceId,
        });

        await this.reprojectCanonical(c, args.reportId);
        const r = await c.query<ReportRow>(
          `SELECT id, form_version_id, ward_id, submitted_by, submission_method,
                  state, sealed_at, canonical, created_at, updated_at
           FROM reports WHERE id = $1`,
          [args.reportId],
        );
        const out = r.rows[0];
        if (!out) throw new NotFoundException('report disappeared mid-update');
        return out;
      });
    } finally {
      client.release();
    }
  }

  private async fetchReport(c: PoolClient, id: string): Promise<ReportRow> {
    const r = await c.query<ReportRow>(
      `SELECT id, form_version_id, ward_id, submitted_by, submission_method,
              state, sealed_at, canonical, created_at, updated_at
       FROM reports WHERE id = $1`,
      [id],
    );
    const row = r.rows[0];
    if (!row) throw new NotFoundException('report not found');
    return row;
  }

  private async insertOp(
    c: PoolClient,
    args: {
      reportId: string;
      actorUserId: string;
      opKind: OpKind;
      payload: Record<string, unknown>;
      opId?: string;
      wallClockTs?: string;
      deviceId?: string;
    },
  ): Promise<void> {
    try {
      await c.query(
        `INSERT INTO report_op_log
           (report_id, op_id, device_id, actor_user_id, op_kind, payload, wall_clock_ts)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
        [
          args.reportId,
          args.opId ?? randomUUID(),
          args.deviceId ?? DEFAULT_DEVICE_ID,
          args.actorUserId,
          args.opKind,
          JSON.stringify(args.payload),
          args.wallClockTs ?? new Date().toISOString(),
        ],
      );
    } catch (e) {
      const msg = (e as Error).message;
      if (/report_op_log_pk|duplicate key/.test(msg)) {
        // Idempotency: a retry with the same op_id is a no-op.
        return;
      }
      throw e;
    }
  }

  private async reprojectCanonical(c: PoolClient, reportId: string): Promise<void> {
    const r = await c.query<{ op_id: string; op_kind: OpKind; payload: Record<string, unknown>; wall_clock_ts: Date }>(
      `SELECT op_id, op_kind, payload, wall_clock_ts
       FROM report_op_log WHERE report_id = $1`,
      [reportId],
    );
    const ops: ReportOp[] = r.rows.map((row) => ({
      opId: row.op_id,
      opKind: row.op_kind,
      payload: row.payload,
      wallClockTs: row.wall_clock_ts.toISOString(),
    }));
    const canonical: CanonicalReport = projectCanonical(ops);
    await c.query(`UPDATE reports SET canonical = $1::jsonb WHERE id = $2`, [
      JSON.stringify(canonical),
      reportId,
    ]);
  }
}

// Discard unused Role import warning — used at type level only.
export type _unusedRole = Role;
