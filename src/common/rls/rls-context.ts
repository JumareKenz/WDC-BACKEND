import type { PoolClient } from 'pg';

export type Role = 'secretary' | 'coordinator' | 'director' | 'system';

export interface RlsContext {
  userId: string | null;
  role: Role;
  lgaId: string | null;
  wardId: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLE_VALUES: readonly Role[] = ['secretary', 'coordinator', 'director', 'system'];

function assertUuidOrNull(value: string | null, field: string): void {
  if (value !== null && !UUID_RE.test(value)) {
    throw new Error(`RLS context: ${field} must be a UUID or null`);
  }
}

/**
 * Apply the four RLS GUCs on a connection-bound client via SET LOCAL. The
 * caller must have started a transaction (BEGIN) on this client; SET LOCAL
 * is scoped to the surrounding transaction and is the only safe way to set
 * per-request context on a pooled connection.
 *
 * Pass null for any GUC that should be unset (the SQL helper coerces empty
 * back to NULL via `nullif(..., '')`).
 */
export async function applyRlsContext(client: PoolClient, ctx: RlsContext): Promise<void> {
  if (!ROLE_VALUES.includes(ctx.role)) {
    throw new Error(`RLS context: role must be one of ${ROLE_VALUES.join(', ')}`);
  }
  assertUuidOrNull(ctx.userId, 'userId');
  assertUuidOrNull(ctx.lgaId, 'lgaId');
  assertUuidOrNull(ctx.wardId, 'wardId');

  await client.query(`SELECT set_config('app.current_role', $1, true)`, [ctx.role]);
  await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [ctx.userId ?? '']);
  await client.query(`SELECT set_config('app.current_lga_id', $1, true)`, [ctx.lgaId ?? '']);
  await client.query(`SELECT set_config('app.current_ward_id', $1, true)`, [ctx.wardId ?? '']);
}

/**
 * Run `fn` inside a transaction with RLS context applied. The transaction
 * commits on success and rolls back on throw. Use this from services for any
 * DB work that must enforce RLS — i.e. anything that touches user data.
 */
export async function withRlsTransaction<T>(
  client: PoolClient,
  ctx: RlsContext,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  await client.query('BEGIN');
  try {
    await applyRlsContext(client, ctx);
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}
