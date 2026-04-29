/**
 * Attachments integration tests.
 *
 * Covers:
 *   - multipart upload of image/audio to MinIO
 *   - metadata stored in attachments table
 *   - async OCR/ASR processing via BullMQ workers
 *   - listing attachments by report
 *   - sealed report rejects uploads
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

integration('Attachments (upload + OCR/ASR + listing)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let pool: Pool;

  let directorId: string;
  let directorAccess: string;
  let coordinatorId: string;
  let coordinatorAccess: string;
  let secretaryAId: string;
  let secretaryAAccess: string;
  let lgaA: string;
  let wardA: string;
  let formId: string;
  let formVersionId: string;
  let reportId: string;

  const directorPhone = `+2348031${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const coordPhone = `+2348032${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const secAPhone = `+2348033${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const directorPin = '555666';
  const coordPin = '777888';
  const secAPin = '999000';

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready'] });
    await app.init();

    pool = new Pool({ connectionString: DATABASE_URL });
    const argon = app.get(ArgonService);
    const dek = process.env.KMS_DEK!;

    const codeA = `A-${randomBytes(3).toString('hex').toUpperCase()}`;
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

    coordinatorId = (
      await pool.query<{ id: string }>(
        `INSERT INTO users (role, lga_id, full_name_ciphertext, phone_hash, phone_ciphertext, pin_hash, key_id)
         VALUES ('coordinator', $1, pgp_sym_encrypt('Coord', $2), $3, pgp_sym_encrypt($4, $2), $5, 'kid-test')
         RETURNING id`,
        [lgaA, dek, sha256Buf(coordPhone), coordPhone, await argon.hash(coordPin)],
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

    directorAccess = await signIn(directorPhone, directorPin, 'adev-d');
    coordinatorAccess = await signIn(coordPhone, coordPin, 'adev-c');
    secretaryAAccess = await signIn(secAPhone, secAPin, 'adev-sa');

    // Create and deploy form
    const form = await request(app.getHttpServer())
      .post('/api/v1/forms')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ slug: `attachments-${codeA.toLowerCase()}`, title: 'Attachments Test', titleHa: 'Jarabawar Haɗe-haɗe', scopeKind: 'state' })
      .expect(201);
    formId = form.body.id;

    const version = await request(app.getHttpServer())
      .post(`/api/v1/forms/${formId}/versions`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ schema: validSchema, labelEn: 'v1', labelHa: 'v1 ha' })
      .expect(201);
    formVersionId = version.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/forms/${formId}/deploy`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);

    // Create a report
    const rep = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ formVersionId, submissionMethod: 'wizard' })
      .expect(201);
    reportId = rep.body.id;
  }, 120_000);

  afterAll(async () => {
    if (pool) {
      const userIds = [directorId, coordinatorId, secretaryAId].filter(Boolean) as string[];
      if (reportId) {
        await pool.query(`DELETE FROM attachments WHERE report_id = $1`, [reportId]).catch(() => undefined);
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
      await pool.query(`DELETE FROM wards WHERE id = $1`, [wardA]).catch(() => undefined);
      await pool.query(`DELETE FROM lgas WHERE id = $1`, [lgaA]).catch(() => undefined);
      await pool.end();
    }
    if (app) await app.close();
  });

  it('uploads an image and queues OCR job', async () => {
    const buf = Buffer.from('fake-image-data');
    const res = await request(app.getHttpServer())
      .post('/api/v1/attachments/upload')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .field('reportId', reportId)
      .field('kind', 'image')
      .attach('file', buf, { filename: 'test.png', contentType: 'image/png' })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.reportId).toBe(reportId);
    expect(res.body.kind).toBe('image');
    expect(res.body.processingState).toBe('pending');
    expect(Number(res.body.bytes)).toBe(buf.length);
    expect(res.body.mimeType).toBe('image/png');
    expect(res.body.storageKey).toMatch(/^attachments\//);

    // Wait for worker to process (poll up to 20s)
    const attachmentId = res.body.id;
    let processed = false;
    for (let i = 0; i < 200; i++) {
      const row = await pool.query(
        `SELECT processing_state, transcript, confidence FROM attachments WHERE id = $1`,
        [attachmentId],
      );
      if (row.rows[0]?.processing_state === 'done') {
        processed = true;
        expect(row.rows[0].transcript).toContain('OCR_STUB');
        expect(parseFloat(row.rows[0].confidence)).toBeGreaterThan(0);
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(processed).toBe(true);

    // Cleanup
    await pool.query(`DELETE FROM attachments WHERE id = $1`, [attachmentId]);
    await pool.query(`DELETE FROM report_op_log WHERE report_id = $1 AND op_id = $2`, [reportId, `ocr-${attachmentId}`]).catch(() => undefined);
  }, 30_000);

  it('uploads an audio and queues ASR job', async () => {
    const buf = Buffer.from('fake-audio-data');
    const res = await request(app.getHttpServer())
      .post('/api/v1/attachments/upload')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .field('reportId', reportId)
      .field('kind', 'audio')
      .attach('file', buf, { filename: 'test.wav', contentType: 'audio/wav' })
      .expect(201);

    expect(res.body.kind).toBe('audio');
    expect(res.body.processingState).toBe('pending');

    const attachmentId = res.body.id;
    let processed = false;
    for (let i = 0; i < 200; i++) {
      const row = await pool.query(
        `SELECT processing_state, transcript, confidence FROM attachments WHERE id = $1`,
        [attachmentId],
      );
      if (row.rows[0]?.processing_state === 'done') {
        processed = true;
        expect(row.rows[0].transcript).toContain('ASR_STUB');
        expect(parseFloat(row.rows[0].confidence)).toBeGreaterThan(0);
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(processed).toBe(true);

    await pool.query(`DELETE FROM attachments WHERE id = $1`, [attachmentId]);
    await pool.query(`DELETE FROM report_op_log WHERE report_id = $1 AND op_id = $2`, [reportId, `asr-${attachmentId}`]).catch(() => undefined);
  }, 30_000);

  it('lists attachments for a report with signed URLs', async () => {
    // Upload two attachments
    const img = Buffer.from('list-image-data');
    const doc = Buffer.from('list-doc-data');

    const imgRes = await request(app.getHttpServer())
      .post('/api/v1/attachments/upload')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .field('reportId', reportId)
      .field('kind', 'image')
      .attach('file', img, { filename: 'list.png', contentType: 'image/png' })
      .expect(201);

    const docRes = await request(app.getHttpServer())
      .post('/api/v1/attachments/upload')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .field('reportId', reportId)
      .field('kind', 'document')
      .attach('file', doc, { filename: 'list.pdf', contentType: 'application/pdf' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/api/v1/attachments/report/${reportId}`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(200);

    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThanOrEqual(2);
    const ids = list.body.map((a: { id: string }) => a.id);
    expect(ids).toContain(imgRes.body.id);
    expect(ids).toContain(docRes.body.id);

    // Signed URL should be present
    const item = list.body.find((a: { id: string }) => a.id === imgRes.body.id);
    expect(item.signedUrl).toBeDefined();
    expect(item.signedUrl).toContain('X-Amz-');

    await pool.query(`DELETE FROM attachments WHERE report_id = $1`, [reportId]);
  }, 30_000);

  it('rejects upload to a sealed report', async () => {
    // Seal the report
    await request(app.getHttpServer())
      .post(`/api/v1/reports/${reportId}/submit`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/reports/${reportId}/open-review`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/reports/${reportId}/approve`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(200);

    // Backdate approved_at so seal-due will catch it
    await pool.query(
      `UPDATE reports SET approved_at = now() - interval '8 days' WHERE id = $1`,
      [reportId],
    );

    await request(app.getHttpServer())
      .post('/api/v1/reports/seal-due')
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);

    // Verify report is sealed
    const rep = await request(app.getHttpServer())
      .get(`/api/v1/reports/${reportId}`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(200);
    expect(rep.body.state).toBe('sealed');

    // Try to upload
    const buf = Buffer.from('should-fail');
    await request(app.getHttpServer())
      .post('/api/v1/attachments/upload')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .field('reportId', reportId)
      .field('kind', 'image')
      .attach('file', buf, { filename: 'fail.png', contentType: 'image/png' })
      .expect(400);
  }, 30_000);

  it('rejects mismatched mime kind', async () => {
    const buf = Buffer.from('fake-audio-data');
    await request(app.getHttpServer())
      .post('/api/v1/attachments/upload')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .field('reportId', reportId)
      .field('kind', 'image') // Declares image but sends audio/wav
      .attach('file', buf, { filename: 'test.wav', contentType: 'audio/wav' })
      .expect(400);
  }, 30_000);
});
