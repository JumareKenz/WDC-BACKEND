/**
 * MVP → New Schema Data Migration
 *
 * WARNING: This script stores PII as plaintext UTF-8 buffers with
 * key_id = 'mvp_plaintext_migration'. These records MUST be re-encrypted
 * using the application's KMS key before going to production.
 *
 * Usage: MVP_DB_PASSWORD=<password> pnpm migrate:mvp
 */
import { Pool, PoolClient } from 'pg';
import { v5 as uuidv5 } from 'uuid';
import { createHash } from 'node:crypto';

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function deterministicUuid(table: string, id: number | string): string {
  return uuidv5(`mvp_${table}_${id}`, NAMESPACE);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toBuffer(value: string | null): Buffer | null {
  if (value === null || value === undefined) return null;
  return Buffer.from(value, 'utf8');
}

function sha256Hex(value: string): Buffer {
  return createHash('sha256').update(value.toLowerCase().trim()).digest();
}

// Maps MVP integer IDs to new-DB UUIDs (populated at runtime)
const lgaIdMap = new Map<number, string>();
const wardIdMap = new Map<number, string>();

async function withSavepoint<T>(client: PoolClient, name: string, fn: () => Promise<T>): Promise<T> {
  await client.query(`SAVEPOINT ${name}`);
  try {
    const result = await fn();
    await client.query(`RELEASE SAVEPOINT ${name}`);
    return result;
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    throw err;
  }
}

interface MigrationStats {
  table: string;
  inserted: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
}

const ROLE_MAP: Record<string, string> = {
  WDC_SECRETARY: 'secretary',
  LGA_COORDINATOR: 'coordinator',
  STATE_OFFICIAL: 'director',
};

const REPORT_STATUS_MAP: Record<string, string> = {
  SUBMITTED: 'submitted',
  REVIEWED: 'in_review',
  FLAGGED: 'in_review',
  DECLINED: 'returned',
  APPROVED: 'approved',
};

const INVESTIGATION_STATUS_MAP: Record<string, string> = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  CLOSED: 'closed',
  RESOLVED: 'resolved',
};

const INVESTIGATION_PRIORITY_MAP: Record<string, string> = {
  LOW: 'low',
  MEDIUM: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
};

const TRANSCRIPTION_STATUS_MAP: Record<string, string> = {
  DONE: 'done',
  FAILED: 'failed',
  PENDING: 'pending',
  IN_PROGRESS: 'processing',
};

async function getMvpPool(): Promise<Pool> {
  const password = process.env.MVP_DB_PASSWORD;
  if (!password) throw new Error('MVP_DB_PASSWORD environment variable is required');
  return new Pool({
    host: '64.23.131.118',
    port: 5432,
    database: 'wdc_app_db',
    user: 'wdc_app_user',
    password,
  });
}

function getNewPool(): Pool {
  return new Pool({
    host: 'localhost',
    port: 5433,
    database: 'wdc',
    user: 'wdc',
    password: 'wdc',
  });
}

async function migrateLgas(mvp: Pool, client: PoolClient): Promise<MigrationStats> {
  const stats: MigrationStats = { table: 'lgas', inserted: 0, skipped: 0, errors: 0, errorDetails: [] };
  const { rows: mvpRows } = await mvp.query('SELECT * FROM lgas ORDER BY id');
  const { rows: newRows } = await client.query('SELECT id, name FROM lgas');
  const nameToUuid = new Map(newRows.map((r: { id: string; name: string }) => [r.name, r.id]));

  for (const row of mvpRows) {
    const existingId = nameToUuid.get(row.name);
    if (existingId) {
      lgaIdMap.set(row.id, existingId);
      stats.skipped++;
    } else {
      stats.errors++;
      stats.errorDetails.push(`LGA id=${row.id} name="${row.name}": no match in new DB`);
    }
  }
  return stats;
}

async function migrateWards(mvp: Pool, client: PoolClient): Promise<MigrationStats> {
  const stats: MigrationStats = { table: 'wards', inserted: 0, skipped: 0, errors: 0, errorDetails: [] };
  const { rows: mvpRows } = await mvp.query('SELECT * FROM wards ORDER BY id');
  const { rows: newRows } = await client.query('SELECT id, lga_id, code FROM wards');

  // Build lookup: lgaUuid + ward number → new ward UUID
  // New ward code pattern: "BIR-W01" → number = 1
  const lgaWardNumToUuid = new Map<string, string>();
  for (const r of newRows) {
    const match = (r as { code: string }).code.match(/-W(\d+)$/);
    if (match) {
      lgaWardNumToUuid.set(`${(r as { lga_id: string }).lga_id}:${parseInt(match[1], 10)}`, (r as { id: string }).id);
    }
  }

  for (const row of mvpRows) {
    const lgaUuid = lgaIdMap.get(row.lga_id);
    if (!lgaUuid) {
      stats.errors++;
      stats.errorDetails.push(`Ward id=${row.id}: no LGA mapping for lga_id=${row.lga_id}`);
      continue;
    }

    // MVP ward code pattern: "BGW-01" → number = 1
    const wardNumMatch = row.code.match(/-(\d+)$/);
    const wardNum = wardNumMatch ? parseInt(wardNumMatch[1], 10) : null;

    if (wardNum !== null) {
      const existingId = lgaWardNumToUuid.get(`${lgaUuid}:${wardNum}`);
      if (existingId) {
        wardIdMap.set(row.id, existingId);
        stats.skipped++;
        continue;
      }
    }

    // No match found — insert as new ward
    const newId = deterministicUuid('wards', row.id);
    try {
      await withSavepoint(client, `ward_${row.id}`, async () => {
        await client.query(
          `INSERT INTO wards (id, lga_id, code, name, name_ha, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [newId, lgaUuid, row.code, row.name, row.name, row.created_at || new Date(), row.created_at || new Date()],
        );
      });
      wardIdMap.set(row.id, newId);
      stats.inserted++;
    } catch (err) {
      stats.errors++;
      stats.errorDetails.push(`Ward id=${row.id} code=${row.code}: ${(err as Error).message}`);
    }
  }
  return stats;
}

async function migrateUsers(mvp: Pool, client: PoolClient): Promise<MigrationStats> {
  const stats: MigrationStats = { table: 'users', inserted: 0, skipped: 0, errors: 0, errorDetails: [] };
  const { rows } = await mvp.query('SELECT * FROM users ORDER BY id');

  const seenPhones = new Map<string, number>();

  for (const row of rows) {
    const phone = row.phone?.trim() || null;
    if (phone) {
      const existing = seenPhones.get(phone);
      if (existing !== undefined) {
        stats.skipped++;
        stats.errorDetails.push(
          `DUPLICATE PHONE: user id=${row.id} (${row.full_name}) has same phone as user id=${existing}. Skipping newer record.`,
        );
        continue;
      }
      seenPhones.set(phone, row.id);
    }

    const newId = deterministicUuid('users', row.id);
    const role = ROLE_MAP[row.role] || 'secretary';
    const wardId = row.ward_id ? (wardIdMap.get(row.ward_id) || null) : null;
    const lgaId = row.lga_id ? (lgaIdMap.get(row.lga_id) || null) : null;
    const status = row.is_active === false ? 'suspended' : 'active';

    const phoneForHash = phone || `MISSING_${row.id}`;
    const phoneHash = sha256Hex(phoneForHash);
    const phoneCiphertext = toBuffer(phoneForHash);
    const fullNameCiphertext = toBuffer(row.full_name || 'Unknown');
    const emailHash = row.email ? sha256Hex(row.email) : null;
    const emailCiphertext = row.email ? toBuffer(row.email) : null;

    const passwordHash = row.password_hash ? `$bcrypt$${row.password_hash}` : null;
    const pinHash = row.pin_hash || null;

    try {
      const res = await withSavepoint(client, `user_${row.id}`, async () => {
        return client.query(
          `INSERT INTO users (
            id, role, lga_id, ward_id,
            full_name_ciphertext, phone_hash, phone_ciphertext,
            email_hash, email_ciphertext,
            pin_hash, password_hash,
            key_id, status, must_reset_password,
            created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
          ON CONFLICT (id) DO NOTHING`,
          [
            newId, role, lgaId, wardId,
            fullNameCiphertext, phoneHash, phoneCiphertext,
            emailHash, emailCiphertext,
            pinHash, passwordHash,
            'mvp_plaintext_migration', status, true,
            row.created_at || new Date(), row.created_at || new Date(),
          ],
        );
      });
      if (res.rowCount && res.rowCount > 0) stats.inserted++;
      else stats.skipped++;
    } catch (err) {
      stats.errors++;
      stats.errorDetails.push(`User id=${row.id} (${row.full_name}): ${(err as Error).message}`);
    }
  }
  return stats;
}

async function migrateFormDefinitions(mvp: Pool, client: PoolClient): Promise<MigrationStats> {
  const stats: MigrationStats = { table: 'form_definitions', inserted: 0, skipped: 0, errors: 0, errorDetails: [] };
  const { rows } = await mvp.query('SELECT * FROM form_definitions ORDER BY id');

  for (const row of rows) {
    const formId = deterministicUuid('form_definitions', row.id);
    const slug = slugify(row.name);
    const createdBy = row.created_by ? deterministicUuid('users', row.created_by) : deterministicUuid('users', 1);
    const versionNumber = row.version || 1;
    const versionId = deterministicUuid('form_version', `${row.id}_${versionNumber}`);

    let schema: object;
    try {
      schema = JSON.parse(row.definition);
    } catch {
      schema = { raw: row.definition };
    }

    try {
      const inserted = await withSavepoint(client, `form_${row.id}`, async () => {
        const formRes = await client.query(
          `INSERT INTO forms (id, slug, title, title_ha, scope_kind, scope_ids, status, current_version_id, created_by, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8,$9,$10)
           ON CONFLICT (id) DO NOTHING`,
          [
            formId, slug, row.name, row.name, 'state', '[]',
            (row.status || 'draft').toLowerCase(),
            createdBy,
            row.created_at || new Date(), row.updated_at || new Date(),
          ],
        );

        const versionRes = await client.query(
          `INSERT INTO form_versions (id, form_id, version_number, schema, deployed_at, deployed_by, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO NOTHING`,
          [
            versionId, formId, versionNumber, JSON.stringify(schema),
            row.deployed_at || null, createdBy,
            row.created_at || new Date(),
          ],
        );

        if ((formRes.rowCount || 0) > 0 || (versionRes.rowCount || 0) > 0) {
          await client.query(
            `UPDATE forms SET current_version_id = $1 WHERE id = $2`,
            [versionId, formId],
          );
          return true;
        }
        return false;
      });
      if (inserted) stats.inserted++;
      else stats.skipped++;
    } catch (err) {
      stats.errors++;
      stats.errorDetails.push(`FormDef id=${row.id}: ${(err as Error).message}`);
    }
  }
  return stats;
}

async function migrateReports(mvp: Pool, client: PoolClient): Promise<MigrationStats> {
  const stats: MigrationStats = { table: 'reports', inserted: 0, skipped: 0, errors: 0, errorDetails: [] };
  const { rows } = await mvp.query('SELECT * FROM reports ORDER BY id');

  const { rows: formRows } = await mvp.query('SELECT id FROM form_definitions ORDER BY id LIMIT 1');
  const defaultFormId = formRows.length > 0 ? formRows[0].id : 1;
  const defaultFormVersionId = deterministicUuid('form_version', `${defaultFormId}_1`);

  const dataColumns = [
    'report_month', 'report_date', 'report_time', 'meeting_type',
    'agenda_opening_prayer', 'agenda_minutes', 'agenda_action_tracker',
    'agenda_reports', 'agenda_action_plan', 'agenda_aob', 'agenda_closing',
    'action_tracker', 'meetings_held', 'attendees_count',
    'issues_identified', 'actions_taken', 'challenges', 'recommendations',
    'additional_notes', 'health_penta1', 'health_bcg', 'health_penta3',
    'health_measles', 'health_malaria_under5', 'health_diarrhea_under5',
    'health_anc_first_visit', 'health_anc_fourth_visit', 'health_anc_eighth_visit',
    'health_deliveries', 'health_postnatal', 'health_fp_counselling',
    'health_fp_new_acceptors', 'health_hepb_tested', 'health_hepb_positive',
    'health_tb_presumptive', 'health_tb_on_treatment',
    'facilities_renovated_govt', 'facilities_renovated_partners',
    'facilities_renovated_wdc', 'items_donated_count', 'items_donated_types',
    'items_repaired_count', 'items_repaired_types',
    'women_transported_anc', 'women_transported_delivery',
    'children_transported_danger', 'women_supported_delivery_items',
    'maternal_deaths', 'perinatal_deaths', 'maternal_death_causes',
    'perinatal_death_causes', 'town_hall_conducted', 'community_feedback',
    'vdc_reports', 'awareness_theme', 'traditional_leaders_support',
    'religious_leaders_support', 'action_plan', 'support_required', 'aob',
    'attendance_total', 'attendance_male', 'attendance_female',
    'next_meeting_date', 'chairman_signature', 'secretary_signature',
    'custom_fields', 'group_photo_path', 'decline_reason', 'submission_id',
    'health_opd_total', 'health_opd_under5_total', 'health_anc_total',
    'items_donated_govt_count', 'items_donated_govt_types',
    'health_general_attendance_total', 'health_routine_immunization_total',
    'facility_renovated', 'facility_renovated_count', 'facility_renovations',
    'items_donated_other_specify', 'items_donated_govt_other_specify',
    'items_repaired_other_specify', 'awareness_topic',
    'items_donated_wdc_yn', 'items_donated_facility',
    'items_donated_govt_yn', 'items_donated_govt_facility',
    'items_repaired_yn', 'items_repaired_facility', 'attendance_photo_url',
  ];

  for (const row of rows) {
    const newId = deterministicUuid('reports', row.id);
    const wardId = wardIdMap.get(row.ward_id) || deterministicUuid('wards', row.ward_id);
    const submittedBy = deterministicUuid('users', row.user_id);
    const state = REPORT_STATUS_MAP[(row.status || 'SUBMITTED').toUpperCase()] || 'submitted';

    const canonical: Record<string, unknown> = {};
    for (const col of dataColumns) {
      if (row[col] !== null && row[col] !== undefined) {
        canonical[col] = row[col];
      }
    }
    if (row.reviewed_by) {
      canonical['reviewed_by_uuid'] = deterministicUuid('users', row.reviewed_by);
      canonical['reviewed_at'] = row.reviewed_at;
    }

    try {
      const res = await withSavepoint(client, `report_${row.id}`, async () => {
        return client.query(
          `INSERT INTO reports (id, form_version_id, ward_id, submitted_by, submission_method, state, canonical, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO NOTHING`,
          [
            newId, defaultFormVersionId, wardId, submittedBy,
            'wizard', state, JSON.stringify(canonical),
            row.submitted_at || new Date(), row.submitted_at || new Date(),
          ],
        );
      });
      if (res.rowCount && res.rowCount > 0) stats.inserted++;
      else stats.skipped++;
    } catch (err) {
      stats.errors++;
      stats.errorDetails.push(`Report id=${row.id}: ${(err as Error).message}`);
    }
  }
  return stats;
}

async function migrateVoiceNotes(mvp: Pool, client: PoolClient): Promise<MigrationStats> {
  const stats: MigrationStats = { table: 'voice_notes→attachments', inserted: 0, skipped: 0, errors: 0, errorDetails: [] };
  const { rows } = await mvp.query('SELECT vn.*, r.user_id FROM voice_notes vn JOIN reports r ON r.id = vn.report_id ORDER BY vn.id');

  for (const row of rows) {
    const newId = deterministicUuid('voice_notes', row.id);
    const reportId = deterministicUuid('reports', row.report_id);
    const uploadedBy = deterministicUuid('users', row.user_id);
    const processingState = TRANSCRIPTION_STATUS_MAP[(row.transcription_status || '').toUpperCase()] || 'pending';

    const ext = (row.file_name || '').split('.').pop()?.toLowerCase();
    let mimeType = 'audio/webm';
    if (ext === 'mp3') mimeType = 'audio/mpeg';
    else if (ext === 'wav') mimeType = 'audio/wav';
    else if (ext === 'ogg') mimeType = 'audio/ogg';
    else if (ext === 'm4a') mimeType = 'audio/mp4';

    const processingMeta: Record<string, unknown> = {};
    if (row.duration_seconds) processingMeta.duration_seconds = row.duration_seconds;
    if (row.field_name) processingMeta.field_name = row.field_name;
    if (row.transcribed_at) processingMeta.transcribed_at = row.transcribed_at;

    try {
      const res = await withSavepoint(client, `vn_${row.id}`, async () => {
        return client.query(
          `INSERT INTO attachments (id, report_id, kind, storage_key, bytes, mime_type, transcript, confidence, processing_state, processing_meta, uploaded_by, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (id) DO NOTHING`,
          [
            newId, reportId, 'audio', row.file_path || row.file_name,
            row.file_size || 0, mimeType,
            row.transcription_text || null, null,
            processingState, JSON.stringify(processingMeta),
            uploadedBy,
            row.uploaded_at || new Date(), row.uploaded_at || new Date(),
          ],
        );
      });
      if (res.rowCount && res.rowCount > 0) stats.inserted++;
      else stats.skipped++;
    } catch (err) {
      stats.errors++;
      stats.errorDetails.push(`VoiceNote id=${row.id}: ${(err as Error).message}`);
    }
  }
  return stats;
}

async function migrateNotifications(mvp: Pool, client: PoolClient): Promise<MigrationStats> {
  const stats: MigrationStats = { table: 'notifications→delivery_attempts', inserted: 0, skipped: 0, errors: 0, errorDetails: [] };
  const { rows } = await mvp.query('SELECT * FROM notifications ORDER BY id');

  for (const row of rows) {
    const newId = deterministicUuid('notifications', row.id);
    const recipientUserId = deterministicUuid('users', row.recipient_id);
    const status = row.is_read ? 'read' : 'delivered';

    const payload: Record<string, unknown> = {
      title: row.title,
      message: row.message,
      notification_type: row.notification_type,
    };
    if (row.sender_id) payload.sender_user_id = deterministicUuid('users', row.sender_id);
    if (row.related_entity_type) payload.related_entity_type = row.related_entity_type;
    if (row.related_entity_id) payload.related_entity_id = row.related_entity_id;

    try {
      const res = await withSavepoint(client, `notif_${row.id}`, async () => {
        return client.query(
          `INSERT INTO delivery_attempts (id, recipient_user_id, channel, status, payload, queued_at)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (id) DO NOTHING`,
          [newId, recipientUserId, 'in_app', status, JSON.stringify(payload), row.created_at || new Date()],
        );
      });
      if (res.rowCount && res.rowCount > 0) stats.inserted++;
      else stats.skipped++;
    } catch (err) {
      stats.errors++;
      stats.errorDetails.push(`Notification id=${row.id}: ${(err as Error).message}`);
    }
  }
  return stats;
}

async function migrateInvestigationNotes(mvp: Pool, client: PoolClient): Promise<MigrationStats> {
  const stats: MigrationStats = { table: 'investigation_notes→investigations', inserted: 0, skipped: 0, errors: 0, errorDetails: [] };
  const { rows } = await mvp.query('SELECT * FROM investigation_notes ORDER BY id');

  for (const row of rows) {
    const newId = deterministicUuid('investigation_notes', row.id);
    const openedBy = deterministicUuid('users', row.created_by);
    const status = INVESTIGATION_STATUS_MAP[(row.status || 'OPEN').toUpperCase()] || 'open';
    const priority = INVESTIGATION_PRIORITY_MAP[(row.priority || 'MEDIUM').toUpperCase()] || 'normal';

    try {
      const res = await withSavepoint(client, `inv_${row.id}`, async () => {
        return client.query(
          `INSERT INTO investigations (id, title, summary, status, priority, opened_by, closed_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO NOTHING`,
          [
            newId, row.title, row.description,
            status, priority, openedBy,
            row.closed_at || null,
            row.created_at || new Date(), row.updated_at || new Date(),
          ],
        );
      });
      if (res.rowCount && res.rowCount > 0) stats.inserted++;
      else stats.skipped++;
    } catch (err) {
      stats.errors++;
      stats.errorDetails.push(`InvestigationNote id=${row.id}: ${(err as Error).message}`);
    }
  }
  return stats;
}

async function runTableMigration(
  name: string,
  fn: (mvp: Pool, client: PoolClient) => Promise<MigrationStats>,
  mvp: Pool,
  newPool: Pool,
): Promise<MigrationStats> {
  const client = await newPool.connect();
  try {
    await client.query('BEGIN');
    const stats = await fn(mvp, client);
    await client.query('COMMIT');
    return stats;
  } catch (err) {
    await client.query('ROLLBACK');
    return {
      table: name,
      inserted: 0,
      skipped: 0,
      errors: 1,
      errorDetails: [`TRANSACTION ROLLED BACK: ${(err as Error).message}`],
    };
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  process.stdout.write('=== MVP Data Migration ===\n\n');
  process.stdout.write('WARNING: Migrated PII is stored as plaintext buffers.\n');
  process.stdout.write('Records with key_id=mvp_plaintext_migration MUST be re-encrypted before production.\n\n');

  const mvp = await getMvpPool();
  const newPool = getNewPool();

  const migrations: Array<{
    name: string;
    fn: (mvp: Pool, client: PoolClient) => Promise<MigrationStats>;
  }> = [
    { name: 'lgas', fn: migrateLgas },
    { name: 'wards', fn: migrateWards },
    { name: 'users', fn: migrateUsers },
    { name: 'form_definitions', fn: migrateFormDefinitions },
    { name: 'reports', fn: migrateReports },
    { name: 'voice_notes', fn: migrateVoiceNotes },
    { name: 'notifications', fn: migrateNotifications },
    { name: 'investigation_notes', fn: migrateInvestigationNotes },
  ];

  const allStats: MigrationStats[] = [];

  for (const { name, fn } of migrations) {
    process.stdout.write(`Migrating ${name}... `);
    const stats = await runTableMigration(name, fn, mvp, newPool);
    allStats.push(stats);
    process.stdout.write(`${stats.inserted} inserted, ${stats.skipped} skipped, ${stats.errors} errors\n`);
    if (stats.errorDetails.length > 0) {
      for (const detail of stats.errorDetails) {
        process.stderr.write(`  ⚠ ${detail}\n`);
      }
    }
  }

  process.stdout.write('\n=== Migration Summary ===\n');
  process.stdout.write('─'.repeat(60) + '\n');
  process.stdout.write(
    `${'Table'.padEnd(30)} ${'Inserted'.padEnd(10)} ${'Skipped'.padEnd(10)} ${'Errors'.padEnd(10)}\n`,
  );
  process.stdout.write('─'.repeat(60) + '\n');
  let totalInserted = 0, totalSkipped = 0, totalErrors = 0;
  for (const s of allStats) {
    process.stdout.write(
      `${s.table.padEnd(30)} ${String(s.inserted).padEnd(10)} ${String(s.skipped).padEnd(10)} ${String(s.errors).padEnd(10)}\n`,
    );
    totalInserted += s.inserted;
    totalSkipped += s.skipped;
    totalErrors += s.errors;
  }
  process.stdout.write('─'.repeat(60) + '\n');
  process.stdout.write(
    `${'TOTAL'.padEnd(30)} ${String(totalInserted).padEnd(10)} ${String(totalSkipped).padEnd(10)} ${String(totalErrors).padEnd(10)}\n`,
  );

  if (totalErrors > 0) {
    process.stdout.write('\n⚠ Migration completed with errors. Review output above.\n');
  } else {
    process.stdout.write('\n✓ Migration completed successfully.\n');
  }

  await mvp.end();
  await newPool.end();
}

main().catch((err) => {
  process.stderr.write(`Migration failed: ${(err as Error).stack ?? String(err)}\n`);
  process.exit(1);
});
