/**
 * Post-migration verification: compares row counts between MVP and new database.
 *
 * Usage: MVP_DB_PASSWORD=<password> pnpm verify:migration
 */
import { Pool } from 'pg';

interface TableMapping {
  mvpTable: string;
  newTable: string;
  note?: string;
}

const TABLE_MAPPINGS: TableMapping[] = [
  { mvpTable: 'lgas', newTable: 'lgas' },
  { mvpTable: 'wards', newTable: 'wards' },
  { mvpTable: 'users', newTable: 'users', note: 'May differ due to duplicate phone skips' },
  { mvpTable: 'reports', newTable: 'reports' },
  { mvpTable: 'voice_notes', newTable: 'attachments' },
  { mvpTable: 'notifications', newTable: 'delivery_attempts' },
  { mvpTable: 'investigation_notes', newTable: 'investigations' },
  { mvpTable: 'form_definitions', newTable: 'forms' },
];

async function main(): Promise<void> {
  const mvpPassword = process.env.MVP_DB_PASSWORD;
  if (!mvpPassword) throw new Error('MVP_DB_PASSWORD environment variable is required');

  const mvp = new Pool({
    host: '64.23.131.118',
    port: 5432,
    database: 'wdc_app_db',
    user: 'wdc_app_user',
    password: mvpPassword,
  });

  const newDb = new Pool({
    host: 'localhost',
    port: 5433,
    database: 'wdc',
    user: 'wdc',
    password: 'wdc',
  });

  process.stdout.write('=== Migration Verification ===\n\n');
  process.stdout.write('─'.repeat(70) + '\n');
  process.stdout.write(
    `${'MVP Table'.padEnd(22)} ${'New Table'.padEnd(22)} ${'MVP'.padEnd(6)} ${'New'.padEnd(6)} ${'Result'.padEnd(10)}\n`,
  );
  process.stdout.write('─'.repeat(70) + '\n');

  let allPass = true;

  for (const mapping of TABLE_MAPPINGS) {
    const mvpRes = await mvp.query(`SELECT count(*)::int as cnt FROM ${mapping.mvpTable}`);
    const newRes = await newDb.query(`SELECT count(*)::int as cnt FROM ${mapping.newTable}`);
    const mvpCount = mvpRes.rows[0].cnt;
    const newCount = newRes.rows[0].cnt;

    let result: string;
    if (newCount >= mvpCount) {
      result = 'PASS';
    } else if (mapping.note) {
      result = 'WARN';
    } else {
      result = 'FAIL';
      allPass = false;
    }

    process.stdout.write(
      `${mapping.mvpTable.padEnd(22)} ${mapping.newTable.padEnd(22)} ${String(mvpCount).padEnd(6)} ${String(newCount).padEnd(6)} ${result.padEnd(10)}\n`,
    );
    if (result === 'WARN' || result === 'FAIL') {
      const diff = mvpCount - newCount;
      process.stdout.write(`  → ${diff} record(s) not migrated. ${mapping.note || 'Investigate.'}\n`);
    }
  }

  process.stdout.write('─'.repeat(70) + '\n');
  process.stdout.write(`\nOverall: ${allPass ? 'PASS' : 'FAIL'}\n`);

  if (!allPass) {
    process.stdout.write('\n⚠ Some tables have fewer records than expected.\n');
    process.stdout.write('  Run scripts/flag_migration_issues.ts for detailed analysis.\n');
  }

  await mvp.end();
  await newDb.end();
}

main().catch((err) => {
  process.stderr.write(`Verification failed: ${(err as Error).stack ?? String(err)}\n`);
  process.exit(1);
});
