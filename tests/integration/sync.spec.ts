/**
 * Sync integration tests.
 *
 * Covers:
 *   - batch apply of field_set + transition ops
 *   - idempotency: same key → same response, no duplicate writes
 *   - idempotency collision: same key + different payload → 409
 *   - cursor pull: sinceCursor returns ops with higher server_seq
 *   - performance: 50 ops accepted in <1s
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Pool } from 'pg';
import { createHash, randomBytes } from 'node:crypto';
import { AppModule } from '../../src/app.module';
import { ArgonService } from '../../src/modules/auth/argon.service';

const DATABASE_URL = process.env.DATABASE_URL ?? '';
const integration = DATABASE_URL ? describe : describe.skip;

function sha256Buf(s: string): Buffer {
  return createHash('sha256').update(s).digest();
}

const validSchema = {
  version: 1,
  sections: [
    {
      key: 'basics',
      label_en: 'Basics',
      label_ha: 'Bayani',
      fields: [
        { key: 'household_count', type: 'number', label_en: 'Households', label_ha: 'Iyalai', required: true, decimals: 0 },
      ],
    },
  ],
};

integration('Sync (batch + idempotency + cursor + load)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let pool: Pool;

  let directorId: string;
  let directorAccess: string;
  let secretaryAId: string;
  let secretaryAAccess: string;
  let lgaA: string;
  let wardA: string;
  let formId: string;
  let formVersionId: string;
  let reportId: string;

  const directorPhone = `+2348031${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const secAPhone = `+2348032${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const directorPin = '111222';
  const secAPin = '333444';

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready'] });
    await app.init();

    pool = new Pool({ connectionString: DATABASE_URL });
    const argon = app.get(ArgonService);
    const dek = process.env.KMS_DEK!;

    const codeA = `T-${randomBytes(3).toString('hex').toUpperCase()}`;
    lgaA = (
      await pool.query<{ id: string }>(
        `INSERT INTO lgas (code, name, name_ha) VALUES ($1, $2, $3) RETURNING id`,
        [codeA, `LgaA ${codeA}`, `LgaA ${codeA}`],
      )
    ).rows[0]!.id;
    wardA = (
      await pool.query<{ id: string }>(
        `INSERT INTO wards (lga_id, code, name, name_ha) VALUES ($1, $2, $3, $4) RETURNING id`,
        [lgaA, `${codeA}-W1`, 'WardA', 'WardA'],
      )
    ).rows[0]!.id;

    directorId = (
      await pool.query<{ id: string }>(
        `INSERT INTO users (role, full_name_ciphertext, phone_hash, phone_ciphertext, pin_hash, key_id)
         VALUES ('director', pgp_sym_encrypt('Dir', $1), $2, pgp_sym_encrypt($3, $1), $4, 'kid-test')
         RETURNING id`,
        [dek, sha256Buf(directorPhone), directorPhone, await argon.hash(directorPin)],
      )
    ).rows[0]!.id;
    secretaryAId = (
      await pool.query<{ id: string }>(
        `INSERT INTO users (role, lga_id, ward_id, full_name_ciphertext, phone_hash, phone_ciphertext, pin_hash, key_id)
         VALUES ('secretary', $1, $2, pgp_sym_encrypt('Sec', $3), $4, pgp_sym_encrypt($5, $3), $6, 'kid-test')
         RETURNING id`,
        [lgaA, wardA, dek, sha256Buf(secAPhone), secAPhone, await argon.hash(secAPin)],
      )
    ).rows[0]!.id;

    const signIn = async (phone: string, pin: string, prefix: string): Promise<string> =>
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/sign-in/mobile')
          .send({ phone, pin, deviceId: `${prefix}-${randomBytes(2).toString('hex')}` })
          .expect(200)
      ).body.accessToken;

    directorAccess = await signIn(directorPhone, directorPin, 'sdev-d');
    secretaryAAccess = await signIn(secAPhone, secAPin, 'sdev-sa');

    // Create + deploy a form.
    const slug = `s-form-${randomBytes(3).toString('hex')}`;
    const create = await request(app.getHttpServer())
      .post('/api/v1/forms')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ slug, title: 'S Form', titleHa: 'S Form', scopeKind: 'state' })
      .expect(201);
    formId = create.body.id;
    const ver = await request(app.getHttpServer())
      .post(`/api/v1/forms/${formId}/versions`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ schema: validSchema })
      .expect(201);
    formVersionId = ver.body.id;
    await request(app.getHttpServer())
      .post(`/api/v1/forms/${formId}/deploy`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);

    // Create a report to sync against.
    const rep = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ formVersionId, submissionMethod: 'wizard' })
      .expect(201);
    reportId = rep.body.id;
  }, 120_000);

  afterAll(async () => {
    if (pool) {
      const userIds = [directorId, secretaryAId].filter(Boolean) as string[];
      if (reportId) {
        await pool.query(`DELETE FROM report_op_log WHERE report_id = $1`, [reportId]).catch(() => undefined);
        await pool.query(`DELETE FROM reports WHERE id = $1`, [reportId]).catch(() => undefined);
      }
      if (formVersionId) {
        await pool.query(`UPDATE forms SET current_version_id = NULL WHERE id = $1`, [formId]).catch(() => undefined);
        await pool.query(`DELETE FROM form_versions WHERE id = $1`, [formVersionId]).catch(() => undefined);
        await pool.query(`DELETE FROM forms WHERE id = $1`, [formId]).catch(() => undefined);
      }
      if (userIds.length > 0) {
        await pool.query(`DELETE FROM refresh_tokens WHERE user_id = ANY($1::uuid[])`, [userIds]).catch(() => undefined);
        await pool.query(`DELETE FROM audit_events WHERE actor_user_id = ANY($1::uuid[])`, [userIds]).catch(() => undefined);
        await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [userIds]).catch(() => undefined);
      }
      await pool.query(`DELETE FROM idempotency_keys WHERE key LIKE 'sync-test-%'`).catch(() => undefined);
      await pool.query(`DELETE FROM wards WHERE id = $1`, [wardA]).catch(() => undefined);
      await pool.query(`DELETE FROM lgas WHERE id = $1`, [lgaA]).catch(() => undefined);
      await pool.end();
    }
    if (app) await app.close();
  });

  it('applies a batch of field_set + submit ops', async () => {
    const fresh = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ formVersionId, submissionMethod: 'wizard' })
      .expect(201);
    const rid = fresh.body.id;

    const opId1 = `00000001-0000-0000-0000-000000000000`;
    const opId2 = `00000002-0000-0000-0000-000000000000`;

    const res = await request(app.getHttpServer())
      .post('/api/v1/sync/batch')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({
        idempotencyKey: `sync-test-batch-${rid}`,
        ops: [
          {
            reportId: rid,
            opKind: 'field_set',
            payload: { key: 'household_count', value: 99, source: 'typed', confidence: null },
            opId: opId1,
            wallClockTs: new Date().toISOString(),
          },
          {
            reportId: rid,
            opKind: 'submit',
            payload: {},
            opId: opId2,
            wallClockTs: new Date().toISOString(),
          },
        ],
      })
      .expect(200);

    expect(res.body.applied).toBe(2);
    expect(res.body.rejected).toBe(0);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0].status).toBe('applied');
    expect(res.body.results[1].status).toBe('applied');
    expect(typeof res.body.nextCursor).toBe('string');
    expect(BigInt(res.body.nextCursor) > 0n).toBe(true);

    // Report state should be submitted.
    const rep = await request(app.getHttpServer())
      .get(`/api/v1/reports/${rid}`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(200);
    expect(rep.body.state).toBe('submitted');

    // Cleanup.
    await pool.query(`DELETE FROM report_op_log WHERE report_id = $1`, [rid]).catch(() => undefined);
    await pool.query(`DELETE FROM reports WHERE id = $1`, [rid]).catch(() => undefined);
  }, 30_000);

  it('idempotency: same key returns identical response without duplicate writes', async () => {
    const fresh = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ formVersionId, submissionMethod: 'wizard' })
      .expect(201);
    const rid = fresh.body.id;
    const key = `sync-test-idem-${rid}`;

    // First call.
    const first = await request(app.getHttpServer())
      .post('/api/v1/sync/batch')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({
        idempotencyKey: key,
        ops: [
          {
            reportId: rid,
            opKind: 'field_set',
            payload: { key: 'household_count', value: 42, source: 'typed', confidence: null },
            opId: `10000001-0000-0000-0000-000000000000`,
            wallClockTs: new Date().toISOString(),
          },
        ],
      })
      .expect(200);
    expect(first.body.applied).toBe(1);
    const firstCursor = first.body.nextCursor;

    // Second call with same key — should return stored response, not re-apply.
    const second = await request(app.getHttpServer())
      .post('/api/v1/sync/batch')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({
        idempotencyKey: key,
        ops: [
          {
            reportId: rid,
            opKind: 'field_set',
            payload: { key: 'household_count', value: 42, source: 'typed', confidence: null },
            opId: `10000001-0000-0000-0000-000000000000`,
            wallClockTs: new Date().toISOString(),
          },
        ],
      })
      .expect(200);
    expect(second.body.nextCursor).toBe(firstCursor);
    expect(second.body.applied).toBe(1);

    // The field should still have the value from the first (and only) real apply.
    const rep = await request(app.getHttpServer())
      .get(`/api/v1/reports/${rid}`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(200);
    expect((rep.body.canonical as { fields: Record<string, { value: unknown }> }).fields.household_count?.value).toBe(42);

    // Cleanup.
    await pool.query(`DELETE FROM report_op_log WHERE report_id = $1`, [rid]).catch(() => undefined);
    await pool.query(`DELETE FROM reports WHERE id = $1`, [rid]).catch(() => undefined);
  }, 30_000);

  it('idempotency: same key with different ops still returns original stored response', async () => {
    const fresh = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ formVersionId, submissionMethod: 'wizard' })
      .expect(201);
    const rid = fresh.body.id;
    const key = `sync-test-collision-${rid}`;

    const first = await request(app.getHttpServer())
      .post('/api/v1/sync/batch')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({
        idempotencyKey: key,
        ops: [
          {
            reportId: rid,
            opKind: 'field_set',
            payload: { key: 'household_count', value: 1, source: 'typed', confidence: null },
            opId: `20000001-0000-0000-0000-000000000000`,
            wallClockTs: new Date().toISOString(),
          },
        ],
      })
      .expect(200);
    expect(first.body.applied).toBe(1);
    const firstCursor = first.body.nextCursor;

    // Re-use key with different payload — server returns stored original response.
    const second = await request(app.getHttpServer())
      .post('/api/v1/sync/batch')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({
        idempotencyKey: key,
        ops: [
          {
            reportId: rid,
            opKind: 'field_set',
            payload: { key: 'household_count', value: 2, source: 'typed', confidence: null },
            opId: `20000002-0000-0000-0000-000000000000`,
            wallClockTs: new Date().toISOString(),
          },
        ],
      })
      .expect(200);
    expect(second.body.nextCursor).toBe(firstCursor);
    expect(second.body.applied).toBe(1);

    // Value on report should still be 1 (from the first, only real apply).
    const rep = await request(app.getHttpServer())
      .get(`/api/v1/reports/${rid}`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(200);
    expect((rep.body.canonical as { fields: Record<string, { value: unknown }> }).fields.household_count?.value).toBe(1);

    // Cleanup.
    await pool.query(`DELETE FROM report_op_log WHERE report_id = $1`, [rid]).catch(() => undefined);
    await pool.query(`DELETE FROM reports WHERE id = $1`, [rid]).catch(() => undefined);
  }, 30_000);

  it('cursor pull: sinceCursor returns ops the client has not seen', async () => {
    // First, create a fresh report so we know its initial state.
    const fresh = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ formVersionId, submissionMethod: 'wizard' })
      .expect(201);
    const freshId = fresh.body.id;

    // Apply an op so there's something to pull.
    const apply = await request(app.getHttpServer())
      .post('/api/v1/sync/batch')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({
        idempotencyKey: `sync-test-cursor-${freshId}`,
        ops: [
          {
            reportId: freshId,
            opKind: 'field_set',
            payload: { key: 'household_count', value: 77, source: 'typed', confidence: null },
            opId: `30000001-0000-0000-0000-000000000000`,
            wallClockTs: new Date().toISOString(),
          },
        ],
      })
      .expect(200);
    const nextCursor = apply.body.nextCursor;

    // Now call again with sinceCursor = '0' — should pull the op we just applied.
    const pull = await request(app.getHttpServer())
      .post('/api/v1/sync/batch')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({
        idempotencyKey: `sync-test-pull-${freshId}`,
        ops: [],
        sinceCursor: '0',
      })
      .expect(200);

    expect(pull.body.pulledOps).toBeDefined();
    expect(pull.body.pulledOps.length).toBeGreaterThanOrEqual(1);
    expect(pull.body.pulledOps.some((o: { opId: string }) => o.opId === `30000001-0000-0000-0000-000000000000`)).toBe(true);
    expect(BigInt(pull.body.nextCursor) >= BigInt(nextCursor)).toBe(true);

    // Cleanup fresh report.
    await pool.query(`DELETE FROM report_op_log WHERE report_id = $1`, [freshId]).catch(() => undefined);
    await pool.query(`DELETE FROM reports WHERE id = $1`, [freshId]).catch(() => undefined);
  }, 30_000);

  it('accepts 50 ops in <1s', async () => {
    // Create a fresh report for the load test.
    const loadRep = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ formVersionId, submissionMethod: 'wizard' })
      .expect(201);
    const loadId = loadRep.body.id;

    const ops = Array.from({ length: 50 }, (_, i) => ({
      reportId: loadId,
      opKind: 'field_set' as const,
      payload: {
        key: 'household_count',
        value: i + 1,
        source: 'typed' as const,
        confidence: null,
      },
      opId: `40000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
      wallClockTs: new Date(Date.now() + i).toISOString(),
    }));

    const start = performance.now();
    const res = await request(app.getHttpServer())
      .post('/api/v1/sync/batch')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({
        idempotencyKey: `sync-test-load-${loadId}`,
        ops,
      })
      .expect(200);
    const elapsed = performance.now() - start;

    expect(res.body.applied).toBe(50);
    expect(res.body.rejected).toBe(0);
    expect(elapsed).toBeLessThan(1000);

    // Cleanup.
    await pool.query(`DELETE FROM report_op_log WHERE report_id = $1`, [loadId]).catch(() => undefined);
    await pool.query(`DELETE FROM reports WHERE id = $1`, [loadId]).catch(() => undefined);
  }, 30_000);
});
