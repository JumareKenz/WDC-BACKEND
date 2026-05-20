/**
 * Post-migration issue scanner. Produces migration_issues_report.txt.
 *
 * Usage: pnpm flag:migration
 */
import { Pool } from 'pg';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function getNewPool(): Pool {
  return new Pool({
    host: 'localhost',
    port: 5433,
    database: 'wdc',
    user: 'wdc',
    password: 'wdc',
  });
}

async function main(): Promise<void> {
  const pool = getNewPool();
  const lines: string[] = [];

  function log(msg: string): void {
    lines.push(msg);
    process.stdout.write(msg + '\n');
  }

  log('═══════════════════════════════════════════════════════════════');
  log('  MIGRATION ISSUES REPORT');
  log(`  Generated: ${new Date().toISOString()}`);
  log('═══════════════════════════════════════════════════════════════');
  log('');

  // 1. Users with must_reset_password = true
  log('─── Users with must_reset_password = true ───');
  const resetUsers = await pool.query(
    `SELECT id, role, email_ciphertext, must_reset_password FROM users WHERE must_reset_password = true ORDER BY role, created_at`,
  );
  log(`Count: ${resetUsers.rows.length}`);
  log('');
  if (resetUsers.rows.length > 0) {
    log(`${'ID'.padEnd(38)} ${'Role'.padEnd(14)} Email (plaintext buffer)`);
    log('─'.repeat(90));
    for (const row of resetUsers.rows) {
      const email = row.email_ciphertext ? Buffer.from(row.email_ciphertext).toString('utf8') : '(none)';
      log(`${row.id.padEnd(38)} ${row.role.padEnd(14)} ${email}`);
    }
  }
  log('');

  // 2. Records with key_id = 'mvp_plaintext_migration'
  log('─── Records with key_id = mvp_plaintext_migration (unencrypted PII) ───');
  const plaintextUsers = await pool.query(
    `SELECT count(*)::int as cnt FROM users WHERE key_id = 'mvp_plaintext_migration'`,
  );
  log(`  users: ${plaintextUsers.rows[0].cnt} records`);
  log('');
  log('  ⚠ These records contain plaintext PII that MUST be re-encrypted');
  log('    before production cutover using the application KMS key.');
  log('');

  // 3. Reports assigned to default form_version
  log('─── Reports assigned to default form_version ───');
  const formVersions = await pool.query(
    `SELECT form_version_id, count(*)::int as cnt FROM reports GROUP BY form_version_id ORDER BY cnt DESC`,
  );
  if (formVersions.rows.length > 0) {
    for (const row of formVersions.rows) {
      log(`  form_version_id: ${row.form_version_id} → ${row.cnt} reports`);
    }
  } else {
    log('  No reports found.');
  }
  log('');

  // 4. Orphaned records (broken foreign keys)
  log('─── Foreign Key Integrity Checks ───');
  log('');

  const fkChecks = [
    {
      name: 'wards.lga_id → lgas.id',
      query: `SELECT w.id, w.lga_id FROM wards w LEFT JOIN lgas l ON l.id = w.lga_id WHERE l.id IS NULL`,
    },
    {
      name: 'users.lga_id → lgas.id',
      query: `SELECT u.id, u.lga_id FROM users u LEFT JOIN lgas l ON l.id = u.lga_id WHERE u.lga_id IS NOT NULL AND l.id IS NULL`,
    },
    {
      name: 'users.ward_id → wards.id',
      query: `SELECT u.id, u.ward_id FROM users u LEFT JOIN wards w ON w.id = u.ward_id WHERE u.ward_id IS NOT NULL AND w.id IS NULL`,
    },
    {
      name: 'reports.ward_id → wards.id',
      query: `SELECT r.id, r.ward_id FROM reports r LEFT JOIN wards w ON w.id = r.ward_id WHERE w.id IS NULL`,
    },
    {
      name: 'reports.submitted_by → users.id',
      query: `SELECT r.id, r.submitted_by FROM reports r LEFT JOIN users u ON u.id = r.submitted_by WHERE u.id IS NULL`,
    },
    {
      name: 'reports.form_version_id → form_versions.id',
      query: `SELECT r.id, r.form_version_id FROM reports r LEFT JOIN form_versions fv ON fv.id = r.form_version_id WHERE fv.id IS NULL`,
    },
    {
      name: 'attachments.report_id → reports.id',
      query: `SELECT a.id, a.report_id FROM attachments a LEFT JOIN reports r ON r.id = a.report_id WHERE r.id IS NULL`,
    },
    {
      name: 'attachments.uploaded_by → users.id',
      query: `SELECT a.id, a.uploaded_by FROM attachments a LEFT JOIN users u ON u.id = a.uploaded_by WHERE u.id IS NULL`,
    },
    {
      name: 'delivery_attempts.recipient_user_id → users.id',
      query: `SELECT d.id, d.recipient_user_id FROM delivery_attempts d LEFT JOIN users u ON u.id = d.recipient_user_id WHERE u.id IS NULL`,
    },
    {
      name: 'investigations.opened_by → users.id',
      query: `SELECT i.id, i.opened_by FROM investigations i LEFT JOIN users u ON u.id = i.opened_by WHERE u.id IS NULL`,
    },
    {
      name: 'forms.created_by → users.id',
      query: `SELECT f.id, f.created_by FROM forms f LEFT JOIN users u ON u.id = f.created_by WHERE u.id IS NULL`,
    },
  ];

  let orphanTotal = 0;
  for (const check of fkChecks) {
    const result = await pool.query(check.query);
    const count = result.rows.length;
    orphanTotal += count;
    const status = count === 0 ? 'OK' : `BROKEN (${count} orphaned)`;
    log(`  ${check.name}`);
    log(`    → ${status}`);
    if (count > 0 && count <= 10) {
      for (const row of result.rows) {
        log(`      orphan: ${JSON.stringify(row)}`);
      }
    } else if (count > 10) {
      for (const row of result.rows.slice(0, 5)) {
        log(`      orphan: ${JSON.stringify(row)}`);
      }
      log(`      ... and ${count - 5} more`);
    }
  }

  log('');
  log('═══════════════════════════════════════════════════════════════');
  log('  SUMMARY');
  log('═══════════════════════════════════════════════════════════════');
  log(`  Users needing password reset:   ${resetUsers.rows.length}`);
  log(`  Records with plaintext PII:     ${plaintextUsers.rows[0].cnt}`);
  log(`  Orphaned FK references:         ${orphanTotal}`);
  log('');
  if (orphanTotal > 0) {
    log('  ⚠ ACTION REQUIRED: Fix orphaned foreign key references before cutover.');
  }
  if (parseInt(plaintextUsers.rows[0].cnt) > 0) {
    log('  ⚠ ACTION REQUIRED: Re-encrypt PII records before production.');
  }
  log('');

  const outPath = resolve(process.cwd(), 'migration_issues_report.txt');
  writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  process.stdout.write(`\nReport written to: ${outPath}\n`);

  await pool.end();
}

main().catch((err) => {
  process.stderr.write(`Issue scan failed: ${(err as Error).stack ?? String(err)}\n`);
  process.exit(1);
});
