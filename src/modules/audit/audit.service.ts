import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { withRlsTransaction, type Role } from '../../common/rls/rls-context';

export interface AuditEventInput {
  actorUserId: string | null;
  actorRole: Role;
  eventKind: string;
  targetTable?: string | null;
  targetId?: string | null;
  payload: Record<string, unknown>;
  requestId?: string | null;
}

const GENESIS_HASH = '0'.repeat(64);

@Injectable()
export class AuditService {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  /**
   * Append an event to the hash-chained audit log. We always run as
   * role=system because audit_events_insert_system_only is the only INSERT
   * policy on this table — any other role attempting to insert is treated
   * as a tampering attempt and rejected by RLS.
   *
   * The chain: prev_hash = previous row's hash (or GENESIS for the first),
   * hash = sha256(prev_hash || canonical_json(event)). The append-only
   * trigger blocks UPDATE/DELETE so a successful INSERT extends the chain
   * irreversibly. Daily anchoring (signed digest of the latest hash) is
   * scheduled in M11.
   */
  async append(evt: AuditEventInput): Promise<{ id: string; hash: string }> {
    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(
        client,
        { userId: null, role: 'system', lgaId: null, wardId: null },
        async (c) => {
          const prev = await c.query<{ hash: string }>(
            `SELECT hash FROM audit_events ORDER BY id DESC LIMIT 1`,
          );
          const prevHash = prev.rows[0]?.hash ?? GENESIS_HASH;
          const occurredAt = new Date().toISOString();
          const canonical = canonicalJson({
            occurred_at: occurredAt,
            actor_user_id: evt.actorUserId,
            actor_role: evt.actorRole,
            event_kind: evt.eventKind,
            target_table: evt.targetTable ?? null,
            target_id: evt.targetId ?? null,
            payload: evt.payload,
            request_id: evt.requestId ?? null,
          });
          const hash = sha256Hex(prevHash + canonical);

          const inserted = await c.query<{ id: string }>(
            `INSERT INTO audit_events
               (occurred_at, actor_user_id, actor_role, event_kind,
                target_table, target_id, payload, prev_hash, hash, request_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id`,
            [
              occurredAt,
              evt.actorUserId,
              evt.actorRole,
              evt.eventKind,
              evt.targetTable ?? null,
              evt.targetId ?? null,
              evt.payload,
              prevHash,
              hash,
              evt.requestId ?? null,
            ],
          );
          const row = inserted.rows[0];
          if (!row) throw new Error('audit_events insert returned no row');
          return { id: row.id, hash };
        },
      );
    } finally {
      client.release();
    }
  }
}

/**
 * Canonical JSON: sorted keys, no whitespace, stable boolean/number formats.
 * Required so the hash is reproducible across runtimes — the M11 chain
 * verifier must regenerate the exact bytes.
 */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export const __test__ = { canonicalJson, sha256Hex, GENESIS_HASH };
