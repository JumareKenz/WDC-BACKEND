import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { withRlsTransaction, type RlsContext } from '../../common/rls/rls-context';
import { AuditService } from '../audit/audit.service';

interface InvestigationRow {
  id: string;
  title: string;
  summary: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  opened_by: string;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface EvidenceRow {
  id: string;
  investigation_id: string;
  kind: 'report_ref' | 'attachment_ref' | 'note' | 'external_link';
  ref_table: string | null;
  ref_id: string | null;
  note: string | null;
  added_by: string;
  created_at: Date;
}

export interface InvestigationView {
  id: string;
  title: string;
  summary: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  openedBy: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceView {
  id: string;
  kind: 'report_ref' | 'attachment_ref' | 'note' | 'external_link';
  refTable: string | null;
  refId: string | null;
  note: string | null;
  addedBy: string;
  createdAt: string;
}

@Injectable()
export class InvestigationsService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async create(
    actor: RlsContext,
    args: {
      title: string;
      summary?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      requestId: string | null;
    },
  ): Promise<InvestigationView> {
    requireDirector(actor);
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<InvestigationRow>(
          `INSERT INTO investigations (title, summary, priority, opened_by)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, summary, status, priority, opened_by, closed_at, created_at, updated_at`,
          [args.title, args.summary ?? null, args.priority ?? 'normal', actor.userId],
        );
        const out = r.rows[0];
        if (!out) throw new Error('investigations insert returned no row');
        return out;
      });
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        eventKind: 'investigations.created',
        targetTable: 'investigations',
        targetId: row.id,
        payload: { title: row.title, priority: row.priority },
        requestId: args.requestId,
      });
      return toInvestigationView(row);
    } finally {
      client.release();
    }
  }

  async list(
    actor: RlsContext,
    args: { cursor?: string; limit?: number },
  ): Promise<{ items: InvestigationView[]; nextCursor: string | null }> {
    requireDirector(actor);
    const limit = Math.min(args.limit ?? 20, 100);
    const client = await this.pool.connect();
    try {
      const { rows } = await withRlsTransaction(client, actor, async (c) => {
        const decoded = args.cursor ? decodeCursor(args.cursor) : null;
        if (args.cursor && !decoded) {
          throw new ForbiddenException('invalid cursor');
        }
        const params: unknown[] = [];
        let where = '';
        if (decoded) {
          params.push(decoded.createdAt.toISOString(), decoded.id);
          where = `WHERE (created_at, id) < ($1, $2)`;
        }
        params.push(limit + 1);
        const r = await c.query<InvestigationRow>(
          `SELECT id, title, summary, status, priority, opened_by, closed_at, created_at, updated_at
           FROM investigations
           ${where}
           ORDER BY created_at DESC, id DESC
           LIMIT $${params.length}`,
          params,
        );
        return r;
      });
      const more = rows.length > limit;
      const slice = more ? rows.slice(0, limit) : rows;
      const items = slice.map(toInvestigationView);
      const last = slice[slice.length - 1];
      const nextCursor = more && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;
      return { items, nextCursor };
    } finally {
      client.release();
    }
  }

  async getById(actor: RlsContext, id: string): Promise<InvestigationView & { evidence: EvidenceView[] }> {
    requireDirector(actor);
    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(client, actor, async (c) => {
        const inv = await c.query<InvestigationRow>(
          `SELECT id, title, summary, status, priority, opened_by, closed_at, created_at, updated_at
           FROM investigations WHERE id = $1`,
          [id],
        );
        const row = inv.rows[0];
        if (!row) throw new NotFoundException('investigation not found');
        const evRows = await c.query<EvidenceRow>(
          `SELECT id, investigation_id, kind, ref_table, ref_id, note, added_by, created_at
           FROM investigation_evidence WHERE investigation_id = $1 ORDER BY created_at ASC`,
          [id],
        );
        return { ...toInvestigationView(row), evidence: evRows.rows.map(toEvidenceView) };
      });
    } finally {
      client.release();
    }
  }

  async update(
    actor: RlsContext,
    id: string,
    patch: {
      title?: string;
      summary?: string;
      status?: 'open' | 'in_progress' | 'resolved' | 'closed';
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    },
    requestId: string | null,
  ): Promise<InvestigationView> {
    requireDirector(actor);
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const sets: string[] = [];
        const params: unknown[] = [];
        if (patch.title !== undefined) {
          params.push(patch.title);
          sets.push(`title = $${params.length}`);
        }
        if (patch.summary !== undefined) {
          params.push(patch.summary);
          sets.push(`summary = $${params.length}`);
        }
        if (patch.status !== undefined) {
          params.push(patch.status);
          sets.push(`status = $${params.length}`);
        }
        if (patch.priority !== undefined) {
          params.push(patch.priority);
          sets.push(`priority = $${params.length}`);
        }
        if (sets.length === 0) {
          const r = await c.query<InvestigationRow>(
            `SELECT id, title, summary, status, priority, opened_by, closed_at, created_at, updated_at
             FROM investigations WHERE id = $1`,
            [id],
          );
          const out = r.rows[0];
          if (!out) throw new NotFoundException('investigation not found');
          return out;
        }
        params.push(id);
        const r = await c.query<InvestigationRow>(
          `UPDATE investigations SET ${sets.join(', ')}
           WHERE id = $${params.length}
           RETURNING id, title, summary, status, priority, opened_by, closed_at, created_at, updated_at`,
          params,
        );
        const out = r.rows[0];
        if (!out) throw new NotFoundException('investigation not found');
        return out;
      });
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        eventKind: 'investigations.updated',
        targetTable: 'investigations',
        targetId: row.id,
        payload: { status: row.status, priority: row.priority },
        requestId,
      });
      return toInvestigationView(row);
    } finally {
      client.release();
    }
  }

  async close(actor: RlsContext, id: string, requestId: string | null): Promise<InvestigationView> {
    requireDirector(actor);
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<InvestigationRow>(
          `UPDATE investigations
           SET status = 'closed', closed_at = now()
           WHERE id = $1
           RETURNING id, title, summary, status, priority, opened_by, closed_at, created_at, updated_at`,
          [id],
        );
        const out = r.rows[0];
        if (!out) throw new NotFoundException('investigation not found');
        return out;
      });
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        eventKind: 'investigations.closed',
        targetTable: 'investigations',
        targetId: row.id,
        payload: { title: row.title },
        requestId,
      });
      return toInvestigationView(row);
    } finally {
      client.release();
    }
  }

  async reopen(actor: RlsContext, id: string, requestId: string | null): Promise<InvestigationView> {
    requireDirector(actor);
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<InvestigationRow>(
          `UPDATE investigations
           SET status = 'open', closed_at = NULL
           WHERE id = $1
           RETURNING id, title, summary, status, priority, opened_by, closed_at, created_at, updated_at`,
          [id],
        );
        const out = r.rows[0];
        if (!out) throw new NotFoundException('investigation not found');
        return out;
      });
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        eventKind: 'investigations.reopened',
        targetTable: 'investigations',
        targetId: row.id,
        payload: { title: row.title },
        requestId,
      });
      return toInvestigationView(row);
    } finally {
      client.release();
    }
  }

  async addEvidence(
    actor: RlsContext,
    investigationId: string,
    args: {
      kind: 'report_ref' | 'attachment_ref' | 'note' | 'external_link';
      refTable?: string;
      refId?: string;
      note?: string;
      requestId: string | null;
    },
  ): Promise<EvidenceView> {
    requireDirector(actor);
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        // Verify investigation exists
        const inv = await c.query<{ id: string }>(
          `SELECT id FROM investigations WHERE id = $1`,
          [investigationId],
        );
        if (inv.rows.length === 0) throw new NotFoundException('investigation not found');
        const r = await c.query<EvidenceRow>(
          `INSERT INTO investigation_evidence
             (investigation_id, kind, ref_table, ref_id, note, added_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, investigation_id, kind, ref_table, ref_id, note, added_by, created_at`,
          [
            investigationId,
            args.kind,
            args.refTable ?? null,
            args.refId ?? null,
            args.note ?? null,
            actor.userId,
          ],
        );
        const out = r.rows[0];
        if (!out) throw new Error('investigation_evidence insert returned no row');
        return out;
      });
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        eventKind: 'investigations.evidence_added',
        targetTable: 'investigation_evidence',
        targetId: row.id,
        payload: { investigation_id: investigationId, kind: row.kind },
        requestId: args.requestId,
      });
      return toEvidenceView(row);
    } finally {
      client.release();
    }
  }

  async removeEvidence(
    actor: RlsContext,
    investigationId: string,
    evidenceId: string,
    requestId: string | null,
  ): Promise<void> {
    requireDirector(actor);
    const client = await this.pool.connect();
    try {
      await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<{ id: string }>(
          `DELETE FROM investigation_evidence
           WHERE id = $1 AND investigation_id = $2
           RETURNING id`,
          [evidenceId, investigationId],
        );
        if (r.rows.length === 0) throw new NotFoundException('evidence not found');
      });
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        eventKind: 'investigations.evidence_removed',
        targetTable: 'investigation_evidence',
        targetId: evidenceId,
        payload: { investigation_id: investigationId },
        requestId,
      });
    } finally {
      client.release();
    }
  }

  async timeline(
    actor: RlsContext,
    investigationId: string,
  ): Promise<Array<{ occurredAt: string; actorRole: string; actorUserId: string | null; eventKind: string; payload: Record<string, unknown> }>> {
    requireDirector(actor);
    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(client, actor, async (c) => {
        // Verify investigation exists
        const inv = await c.query<{ id: string }>(
          `SELECT id FROM investigations WHERE id = $1`,
          [investigationId],
        );
        if (inv.rows.length === 0) throw new NotFoundException('investigation not found');

        // Evidence additions as synthetic timeline events
        const ev = await c.query<{
          created_at: Date;
          added_by: string;
          kind: string;
          note: string | null;
          ref_table: string | null;
          ref_id: string | null;
        }>(
          `SELECT created_at, added_by, kind, note, ref_table, ref_id
           FROM investigation_evidence WHERE investigation_id = $1 ORDER BY created_at ASC`,
          [investigationId],
        );

        // Audit events targeting this investigation
        const audit = await c.query<{
          occurred_at: Date;
          actor_role: string;
          actor_user_id: string | null;
          event_kind: string;
          payload: Record<string, unknown>;
        }>(
          `SELECT occurred_at, actor_role, actor_user_id, event_kind, payload
           FROM audit_events
           WHERE target_table = 'investigations' AND target_id = $1
           ORDER BY occurred_at ASC`,
          [investigationId],
        );

        // Merge and sort by occurred_at
        const merged = [
          ...ev.rows.map((r) => ({
            occurredAt: r.created_at.toISOString(),
            actorRole: 'director',
            actorUserId: r.added_by,
            eventKind: `investigations.evidence_added_${r.kind}`,
            payload: { note: r.note, ref_table: r.ref_table, ref_id: r.ref_id } as Record<string, unknown>,
          })),
          ...audit.rows.map((r) => ({
            occurredAt: r.occurred_at.toISOString(),
            actorRole: r.actor_role,
            actorUserId: r.actor_user_id,
            eventKind: r.event_kind,
            payload: r.payload,
          })),
        ];
        merged.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
        return merged;
      });
    } finally {
      client.release();
    }
  }
}

function requireDirector(actor: RlsContext): void {
  if (actor.role !== 'director') {
    throw new ForbiddenException('director role required for this action');
  }
}

function toInvestigationView(row: InvestigationRow): InvestigationView {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    status: row.status,
    priority: row.priority,
    openedBy: row.opened_by,
    closedAt: row.closed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function toEvidenceView(row: EvidenceRow): EvidenceView {
  return {
    id: row.id,
    kind: row.kind,
    refTable: row.ref_table,
    refId: row.ref_id,
    note: row.note,
    addedBy: row.added_by,
    createdAt: row.created_at.toISOString(),
  };
}

function encodeCursor(args: { createdAt: Date; id: string }): string {
  return Buffer.from(`${args.createdAt.toISOString()}|${args.id}`).toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [iso, id] = decoded.split('|');
    if (!iso || !id) return null;
    const createdAt = new Date(iso);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}
