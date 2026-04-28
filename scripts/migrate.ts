/**
 * Hand-rolled SQL migration runner.
 *
 * `drizzle-kit migrate` would also do this, but for the WDC schema we need
 * three things drizzle-kit doesn't model: RLS policies, custom triggers, and
 * the pgvector `vector` column type. Easier to keep one source of truth (the
 * numbered .sql files) than to fight the toolchain.
 *
 * Each .sql file under drizzle/ matching `^[0-9]{4}_.*\.sql$` is applied in
 * order. Applied filenames are recorded in `_wdc_migrations`. Re-running this
 * script is a no-op once everything's applied.
 *
 * Usage: pnpm drizzle:migrate (DATABASE_URL must be set)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';

const DIR = resolve(process.cwd(), 'drizzle');
const PATTERN = /^\d{4}_.*\.sql$/;

async function ensureLedger(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _wdc_migrations (
      filename    text PRIMARY KEY,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function appliedSet(pool: Pool): Promise<Set<string>> {
  const { rows } = await pool.query<{ filename: string }>(
    'SELECT filename FROM _wdc_migrations',
  );
  return new Set(rows.map((r) => r.filename));
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const pool = new Pool({ connectionString: url });
  try {
    await ensureLedger(pool);
    const applied = await appliedSet(pool);
    const files = readdirSync(DIR).filter((f) => PATTERN.test(f)).sort();

    if (files.length === 0) {
      process.stdout.write('no migrations found in drizzle/\n');
      return;
    }

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        process.stdout.write(`skip ${file} (already applied)\n`);
        continue;
      }
      const sql = readFileSync(resolve(DIR, file), 'utf8');
      process.stdout.write(`apply ${file} ... `);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO _wdc_migrations (filename) VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
        process.stdout.write('ok\n');
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        process.stderr.write(`\nFAILED applying ${file}: ${(err as Error).message}\n`);
        throw err;
      } finally {
        client.release();
      }
    }
    process.stdout.write(`done — applied ${count} new migration(s)\n`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  process.stderr.write(`migrate failed: ${(err as Error).stack ?? String(err)}\n`);
  process.exit(1);
});
