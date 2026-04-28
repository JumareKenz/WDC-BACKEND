/**
 * RLS denial tests.
 *
 * Strategy: open a single transaction at the top of the suite, insert fixture
 * rows under role=system, then for each test SAVEPOINT, apply per-role GUCs
 * via `set_config(..., true)`, run the assertions, RELEASE. The whole
 * transaction is rolled back in afterAll, so the dev DB never accumulates
 * test data.
 *
 * Requires the dev compose stack (postgres on 127.0.0.1:5433) and the seed +
 * migrations applied. Skips automatically when DATABASE_URL is unset (e.g.
 * pure-unit CI runs).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';

const DATABASE_URL = process.env.DATABASE_URL ?? '';
const integration = DATABASE_URL ? describe : describe.skip;

interface Fixture {
  lgaA: string;
  lgaB: string;
  wardA: string;
  wardB: string;
  secretaryA: string;
  coordinatorA: string;
  director: string;
  formVersion: string;
  reportA: string;
  reportB: string;
}

async function asRole(
  c: PoolClient,
  role: 'secretary' | 'coordinator' | 'director' | 'system',
  ctx: { userId?: string; lgaId?: string; wardId?: string } = {},
): Promise<void> {
  await c.query(`SELECT set_config('app.current_role', $1, true)`, [role]);
  await c.query(`SELECT set_config('app.current_user_id', $1, true)`, [ctx.userId ?? '']);
  await c.query(`SELECT set_config('app.current_lga_id', $1, true)`, [ctx.lgaId ?? '']);
  await c.query(`SELECT set_config('app.current_ward_id', $1, true)`, [ctx.wardId ?? '']);
}

integration('RLS policies', () => {
  let pool: Pool;
  let client: PoolClient;
  let fx: Fixture;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    client = await pool.connect();
    await client.query('BEGIN');
    // The dev DATABASE_URL uses the wdc superuser, which bypasses RLS even
    // with FORCE. Switch to wdc_app for the lifetime of this transaction so
    // policies engage.
    await client.query('SET LOCAL ROLE wdc_app');
    await asRole(client, 'system');

    // Fixture data under system role.
    const codeA = `T-${randomUUID().slice(0, 6)}`;
    const codeB = `T-${randomUUID().slice(0, 6)}`;
    const lgaA = (
      await client.query<{ id: string }>(
        `INSERT INTO lgas (code, name, name_ha) VALUES ($1, $2, $3) RETURNING id`,
        [codeA, `LgaA-${codeA}`, `LgaA-${codeA}`],
      )
    ).rows[0]!.id;
    const lgaB = (
      await client.query<{ id: string }>(
        `INSERT INTO lgas (code, name, name_ha) VALUES ($1, $2, $3) RETURNING id`,
        [codeB, `LgaB-${codeB}`, `LgaB-${codeB}`],
      )
    ).rows[0]!.id;
    const wardA = (
      await client.query<{ id: string }>(
        `INSERT INTO wards (lga_id, code, name, name_ha) VALUES ($1, $2, $3, $4) RETURNING id`,
        [lgaA, `${codeA}-W01`, `WardA-${codeA}`, `WardA-${codeA}`],
      )
    ).rows[0]!.id;
    const wardB = (
      await client.query<{ id: string }>(
        `INSERT INTO wards (lga_id, code, name, name_ha) VALUES ($1, $2, $3, $4) RETURNING id`,
        [lgaB, `${codeB}-W01`, `WardB-${codeB}`, `WardB-${codeB}`],
      )
    ).rows[0]!.id;

    const buf = Buffer.from('x');
    const insertUser = `
      INSERT INTO users (
        role, lga_id, ward_id,
        full_name_ciphertext, phone_hash, phone_ciphertext, key_id
      ) VALUES ($1, $2, $3, $4, $5, $6, 'kid-test')
      RETURNING id
    `;
    const secretaryA = (
      await client.query<{ id: string }>(insertUser, [
        'secretary',
        lgaA,
        wardA,
        buf,
        Buffer.from(randomUUID()),
        buf,
      ])
    ).rows[0]!.id;
    const coordinatorA = (
      await client.query<{ id: string }>(insertUser, [
        'coordinator',
        lgaA,
        null,
        buf,
        Buffer.from(randomUUID()),
        buf,
      ])
    ).rows[0]!.id;
    const director = (
      await client.query<{ id: string }>(insertUser, [
        'director',
        null,
        null,
        buf,
        Buffer.from(randomUUID()),
        buf,
      ])
    ).rows[0]!.id;

    const form = (
      await client.query<{ id: string }>(
        `INSERT INTO forms (slug, title, title_ha, scope_kind, created_by)
         VALUES ($1, 'Test', 'Test', 'state', $2) RETURNING id`,
        [`test-${randomUUID().slice(0, 8)}`, director],
      )
    ).rows[0]!.id;
    const formVersion = (
      await client.query<{ id: string }>(
        `INSERT INTO form_versions (form_id, version_number, schema)
         VALUES ($1, 1, '{}'::jsonb) RETURNING id`,
        [form],
      )
    ).rows[0]!.id;

    const reportA = (
      await client.query<{ id: string }>(
        `INSERT INTO reports (form_version_id, ward_id, submitted_by, submission_method)
         VALUES ($1, $2, $3, 'wizard') RETURNING id`,
        [formVersion, wardA, secretaryA],
      )
    ).rows[0]!.id;
    const reportB = (
      await client.query<{ id: string }>(
        `INSERT INTO reports (form_version_id, ward_id, submitted_by, submission_method)
         VALUES ($1, $2, $3, 'wizard') RETURNING id`,
        [formVersion, wardB, director],
      )
    ).rows[0]!.id;

    fx = {
      lgaA,
      lgaB,
      wardA,
      wardB,
      secretaryA,
      coordinatorA,
      director,
      formVersion,
      reportA,
      reportB,
    };
  });

  afterAll(async () => {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
    if (pool) await pool.end();
  });

  /**
   * Treat each test as a transaction sandbox: SAVEPOINT before, always
   * ROLLBACK TO SAVEPOINT then RELEASE after — even on the happy path. If we
   * skipped the rollback, a test that uses `expect(...).rejects.toThrow` to
   * verify an RLS denial would leave the txn in an aborted state (the failed
   * statement aborts the savepoint subtxn even though the test's assertion
   * passed), and the next test's SAVEPOINT would fail with
   * "current transaction is aborted". Always rolling back avoids that and
   * keeps tests independent.
   */
  async function withSavepoint<T>(fn: () => Promise<T>): Promise<T> {
    const sp = `sp_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    await client.query(`SAVEPOINT ${sp}`);
    let out: T;
    let caught: unknown;
    try {
      out = await fn();
    } catch (e) {
      caught = e;
    }
    try {
      await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
    } catch {
      // savepoint may already be gone (e.g. connection dropped); ignore.
    }
    try {
      await client.query(`RELEASE SAVEPOINT ${sp}`);
    } catch {
      // ditto.
    }
    if (caught) throw caught;
    return out!;
  }

  it('secretary sees their own ward report and not the other', async () => {
    await withSavepoint(async () => {
      await asRole(client, 'secretary', {
        userId: fx.secretaryA,
        lgaId: fx.lgaA,
        wardId: fx.wardA,
      });
      const visible = await client.query<{ id: string }>(
        `SELECT id FROM reports WHERE id IN ($1, $2)`,
        [fx.reportA, fx.reportB],
      );
      expect(visible.rows.map((r) => r.id)).toEqual([fx.reportA]);
    });
  });

  it('coordinator sees reports in their LGA but not other LGAs', async () => {
    await withSavepoint(async () => {
      await asRole(client, 'coordinator', {
        userId: fx.coordinatorA,
        lgaId: fx.lgaA,
      });
      const visible = await client.query<{ id: string }>(
        `SELECT id FROM reports WHERE id IN ($1, $2) ORDER BY id`,
        [fx.reportA, fx.reportB],
      );
      expect(visible.rows.map((r) => r.id)).toEqual([fx.reportA]);
    });
  });

  it('director sees all reports', async () => {
    await withSavepoint(async () => {
      await asRole(client, 'director', { userId: fx.director });
      const visible = await client.query<{ id: string }>(
        `SELECT id FROM reports WHERE id IN ($1, $2)`,
        [fx.reportA, fx.reportB],
      );
      expect(visible.rows.length).toBe(2);
    });
  });

  it('secretary cannot insert a report for another ward', async () => {
    await withSavepoint(async () => {
      await asRole(client, 'secretary', {
        userId: fx.secretaryA,
        lgaId: fx.lgaA,
        wardId: fx.wardA,
      });
      await expect(
        client.query(
          `INSERT INTO reports (form_version_id, ward_id, submitted_by, submission_method)
           VALUES ($1, $2, $3, 'wizard')`,
          [fx.formVersion, fx.wardB, fx.secretaryA],
        ),
      ).rejects.toThrow(/row-level security/);
    });
  });

  it('secretary cannot read another secretary user row', async () => {
    await withSavepoint(async () => {
      await asRole(client, 'secretary', {
        userId: fx.secretaryA,
        lgaId: fx.lgaA,
        wardId: fx.wardA,
      });
      const visible = await client.query<{ id: string }>(
        `SELECT id FROM users WHERE id IN ($1, $2)`,
        [fx.secretaryA, fx.coordinatorA],
      );
      expect(visible.rows.map((r) => r.id)).toEqual([fx.secretaryA]);
    });
  });

  it('coordinator cannot modify directors (write policy denies)', async () => {
    await withSavepoint(async () => {
      await asRole(client, 'coordinator', {
        userId: fx.coordinatorA,
        lgaId: fx.lgaA,
      });
      const res = await client.query(
        `UPDATE users SET status = 'suspended' WHERE id = $1`,
        [fx.director],
      );
      // RLS on UPDATE filters target rows out → 0 rows updated, no error.
      expect(res.rowCount).toBe(0);
    });
  });

  it('audit_events cannot be inserted by non-system roles', async () => {
    await withSavepoint(async () => {
      await asRole(client, 'director', { userId: fx.director });
      await expect(
        client.query(
          `INSERT INTO audit_events (actor_role, event_kind, payload, prev_hash, hash)
           VALUES ('director', 'test', '{}'::jsonb, 'prev', 'h_${randomUUID()}')`,
        ),
      ).rejects.toThrow(/row-level security/);
    });
  });

  it('audit_events: even system cannot UPDATE (append-only trigger fires)', async () => {
    await withSavepoint(async () => {
      await asRole(client, 'system');
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO audit_events (actor_role, event_kind, payload, prev_hash, hash)
         VALUES ('system', 'test', '{}'::jsonb, 'prev', 'h_${randomUUID()}')
         RETURNING id`,
      );
      const id = inserted.rows[0]!.id;
      await expect(
        client.query(`UPDATE audit_events SET event_kind = 'tampered' WHERE id = $1`, [id]),
      ).rejects.toThrow(/append-only/);
    });
  });

  it('audit_events: even system cannot DELETE (append-only trigger fires)', async () => {
    await withSavepoint(async () => {
      await asRole(client, 'system');
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO audit_events (actor_role, event_kind, payload, prev_hash, hash)
         VALUES ('system', 'test', '{}'::jsonb, 'prev', 'h_${randomUUID()}')
         RETURNING id`,
      );
      const id = inserted.rows[0]!.id;
      await expect(
        client.query(`DELETE FROM audit_events WHERE id = $1`, [id]),
      ).rejects.toThrow(/append-only/);
    });
  });

  it('report_op_log is append-only', async () => {
    await withSavepoint(async () => {
      await asRole(client, 'system');
      await client.query(
        `INSERT INTO report_op_log
           (report_id, op_id, device_id, actor_user_id, op_kind, payload, wall_clock_ts)
         VALUES ($1, gen_random_uuid(), 'dev', $2, 'field_set', '{}'::jsonb, now())`,
        [fx.reportA, fx.secretaryA],
      );
      await expect(
        client.query(`DELETE FROM report_op_log WHERE report_id = $1`, [fx.reportA]),
      ).rejects.toThrow(/append-only/);
    });
  });

  it('a deployed form_version cannot be updated', async () => {
    await withSavepoint(async () => {
      await asRole(client, 'system');
      const fv = await client.query<{ id: string }>(
        `UPDATE form_versions SET deployed_at = now(), deployed_by = $1
         WHERE id = $2 RETURNING id`,
        [fx.director, fx.formVersion],
      );
      expect(fv.rows[0]!.id).toBe(fx.formVersion);
      await expect(
        client.query(`UPDATE form_versions SET schema = '{"x":1}'::jsonb WHERE id = $1`, [
          fx.formVersion,
        ]),
      ).rejects.toThrow(/immutable/);
    });
  });
});
