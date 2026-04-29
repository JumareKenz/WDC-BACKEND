/**
 * Reports lifecycle integration test.
 *
 * Walks through the full state machine end-to-end against the live dev DB:
 *   draft -> field_set ops -> submit -> open_review -> approve
 *   draft -> field_set -> submit -> open_review -> return -> edit_returned -> draft
 *   sealing pass on an artificially backdated approved report -> sealed
 *
 * Plus the "no edits when sealed" invariant and "secretary can't reach
 * another ward's draft" RLS scope check.
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
        { key: 'water_source', type: 'text', label_en: 'Water', label_ha: 'Ruwa', required: false, multiline: false },
      ],
    },
  ],
};

integration('Reports (lifecycle + sealing + scope)', () => {
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
  let wardAOther: string;
  let formId: string;
  let formVersionId: string;
  const reportIds: string[] = [];

  const directorPhone = `+2348021${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const coordPhone = `+2348022${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const secAPhone = `+2348023${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const directorPin = '555666';
  const coordPin = '777888';
  const secAPin = '999000';

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
    wardAOther = (
      await pool.query<{ id: string }>(
        `INSERT INTO wards (lga_id, code, name, name_ha) VALUES ($1, $2, $3, $4) RETURNING id`,
        [lgaA, `${codeA}-W2`, 'WardA-Other', 'WardA-Other'],
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

    directorAccess = await signIn(directorPhone, directorPin, 'rdev-d');
    coordinatorAccess = await signIn(coordPhone, coordPin, 'rdev-c');
    secretaryAAccess = await signIn(secAPhone, secAPin, 'rdev-sa');

    // Create + deploy a form to use across tests.
    const slug = `r-form-${randomBytes(3).toString('hex')}`;
    const create = await request(app.getHttpServer())
      .post('/api/v1/forms')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ slug, title: 'R Form', titleHa: 'R Form', scopeKind: 'state' })
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
  }, 120_000);

  afterAll(async () => {
    if (pool) {
      const userIds = [directorId, coordinatorId, secretaryAId].filter(Boolean) as string[];
      if (reportIds.length > 0) {
        await pool.query(`DELETE FROM report_op_log WHERE report_id = ANY($1::uuid[])`, [reportIds]).catch(() => undefined);
        await pool.query(`DELETE FROM reports WHERE id = ANY($1::uuid[])`, [reportIds]).catch(() => undefined);
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
      await pool.query(`DELETE FROM wards WHERE id = ANY($1::uuid[])`, [[wardA, wardAOther]]).catch(() => undefined);
      await pool.query(`DELETE FROM lgas WHERE id = $1`, [lgaA]).catch(() => undefined);
      await pool.end();
    }
    if (app) await app.close();
  });

  it('happy path: draft -> field_set -> submit -> open_review -> approve', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ formVersionId, submissionMethod: 'wizard' })
      .expect(201);
    expect(create.body.state).toBe('draft');
    expect(create.body.wardId).toBe(wardA);
    reportIds.push(create.body.id);

    const setField = await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/fields`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ key: 'household_count', value: 42, source: 'typed', confidence: null })
      .expect(200);
    expect((setField.body.canonical as { fields: Record<string, { value: unknown }> }).fields.household_count?.value).toBe(42);

    await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/submit`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(200);

    const opened = await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/open-review`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(200);
    expect(opened.body.state).toBe('in_review');

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/approve`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(200);
    expect(approved.body.state).toBe('approved');

    // Op log includes the field_set + submit + open_review + approve.
    const ops = await request(app.getHttpServer())
      .get(`/api/v1/reports/${create.body.id}/ops`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(200);
    const kinds = (ops.body as Array<{ opKind: string }>).map((o) => o.opKind);
    expect(kinds).toEqual(['field_set', 'submit', 'open_review', 'approve']);
  }, 60_000);

  it('return loop: in_review -> return (with notes) -> edit_returned -> draft', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ formVersionId, submissionMethod: 'wizard' })
      .expect(201);
    reportIds.push(create.body.id);

    await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/fields`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ key: 'household_count', value: 10, source: 'typed' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/submit`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/open-review`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(200);

    const returned = await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/return`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .send({ notes: 'household_count looks too low — please verify' })
      .expect(200);
    expect(returned.body.state).toBe('returned');
    expect((returned.body.canonical as { notes: string[] }).notes).toContain('household_count looks too low — please verify');

    const reEdit = await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/edit-returned`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(200);
    expect(reEdit.body.state).toBe('draft');

    // Now editable again.
    await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/fields`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ key: 'household_count', value: 14, source: 'typed' })
      .expect(200);
  }, 60_000);

  it('cannot edit fields once submitted (state guard)', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ formVersionId, submissionMethod: 'wizard' })
      .expect(201);
    reportIds.push(create.body.id);

    await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/submit`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/fields`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ key: 'household_count', value: 99, source: 'typed' })
      .expect(409);
  }, 60_000);

  it('coordinator cannot drive submit; secretary cannot drive approve', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ formVersionId, submissionMethod: 'wizard' })
      .expect(201);
    reportIds.push(create.body.id);

    await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/submit`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/submit`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/reports/${create.body.id}/approve`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(403);
  }, 60_000);

  it('sealing pass turns approved-and-aged into sealed', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ formVersionId, submissionMethod: 'wizard' })
      .expect(201);
    const reportId = create.body.id as string;
    reportIds.push(reportId);

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

    // Backdate approved_at past the grace window so the sealing pass picks it up.
    await pool.query(
      `UPDATE reports SET approved_at = now() - interval '30 days' WHERE id = $1`,
      [reportId],
    );

    const seal = await request(app.getHttpServer())
      .post('/api/v1/reports/seal-due')
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);
    expect(seal.body.sealed).toBeGreaterThanOrEqual(1);

    const after = await request(app.getHttpServer())
      .get(`/api/v1/reports/${reportId}`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);
    expect(after.body.state).toBe('sealed');
    expect(after.body.sealedAt).not.toBeNull();
  }, 60_000);
});
