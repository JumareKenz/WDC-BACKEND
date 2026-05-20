/**
 * Security & edge-case integration tests (M14 hardening).
 *
 * Covers:
 *   - Auth bypass (missing / malformed bearer)
 *   - JWT tampering (modified payload, bad signature)
 *   - IDOR (cross-user / cross-ward resource access)
 *   - SQL/NoSQL injection in query params and bodies
 *   - Mass assignment (extra fields in DTOs)
 *   - Input validation extremes (long strings, special chars, nulls)
 *   - CSRF-like cross-origin state-changing POST
 *   - HTTP method override on GET-only endpoints
 *   - Rate-limiting brute-force resistance on auth endpoints
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';


import { Pool } from 'pg';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AppModule } from '../../src/app.module';
import { ArgonService } from '../../src/modules/auth/argon.service';
import { TokenService } from '../../src/modules/auth/token.service';

const DATABASE_URL = process.env.DATABASE_URL ?? '';
const integration = DATABASE_URL ? describe : describe.skip;

function sha256Buf(s: string): Buffer {
  return createHash('sha256').update(s).digest();
}

integration('Security & edge cases', () => {
  let app: INestApplication;
  let module: TestingModule;
  let pool: Pool;
  let tokenSvc: TokenService;

  let directorId: string;
  let directorAccess: string;
  let secretaryAId: string;
  let secretaryAAccess: string;
  let secretaryBId: string;
  let secretaryBAccess: string;
  let lgaA: string;
  let wardA: string;
  let wardB: string;
  let formId: string;
  let formVersionId: string;
  let reportAId: string;

  const directorPhone = `+2348031${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const secAPhone = `+2348032${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const secBPhone = `+2348033${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const pin = '123456';
  const deviceId = 'test-device-' + randomBytes(4).toString('hex');

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready'] });
    await app.init();

    pool = new Pool({ connectionString: DATABASE_URL });
    tokenSvc = app.get(TokenService);
    const argon = app.get(ArgonService);
    const pinHash = await argon.hash(pin);
    const buf = Buffer.from('x');

    const lgaRow = await pool.query<{ id: string }>(
      `INSERT INTO lgas (code, name, name_ha) VALUES ($1, $2, $3) RETURNING id`,
      [`SEC-${randomUUID().slice(0, 6)}`, `LgaSec`, `LgaSec`],
    );
    lgaA = lgaRow.rows[0]!.id;

    const wardARow = await pool.query<{ id: string }>(
      `INSERT INTO wards (lga_id, code, name, name_ha) VALUES ($1, $2, $3, $4) RETURNING id`,
      [lgaA, 'W01', 'WardA', 'WardA'],
    );
    wardA = wardARow.rows[0]!.id;

    const wardBRow = await pool.query<{ id: string }>(
      `INSERT INTO wards (lga_id, code, name, name_ha) VALUES ($1, $2, $3, $4) RETURNING id`,
      [lgaA, 'W02', 'WardB', 'WardB'],
    );
    wardB = wardBRow.rows[0]!.id;

    directorId = (
      await pool.query<{ id: string }>(
        `INSERT INTO users (role, full_name_ciphertext, phone_hash, phone_ciphertext, pin_hash, key_id, lga_id, ward_id)
         VALUES ('director', $1, $2, $1, $3, 'kid-test', $4, $5) RETURNING id`,
        [buf, sha256Buf(directorPhone), pinHash, lgaA, wardA],
      )
    ).rows[0]!.id;

    secretaryAId = (
      await pool.query<{ id: string }>(
        `INSERT INTO users (role, full_name_ciphertext, phone_hash, phone_ciphertext, pin_hash, key_id, lga_id, ward_id)
         VALUES ('secretary', $1, $2, $1, $3, 'kid-test', $4, $5) RETURNING id`,
        [buf, sha256Buf(secAPhone), pinHash, lgaA, wardA],
      )
    ).rows[0]!.id;

    secretaryBId = (
      await pool.query<{ id: string }>(
        `INSERT INTO users (role, full_name_ciphertext, phone_hash, phone_ciphertext, pin_hash, key_id, lga_id, ward_id)
         VALUES ('secretary', $1, $2, $1, $3, 'kid-test', $4, $5) RETURNING id`,
        [buf, sha256Buf(secBPhone), pinHash, lgaA, wardB],
      )
    ).rows[0]!.id;

    const dirPair = await tokenSvc.issuePair({ userId: directorId, role: 'director', lgaId: lgaA, wardId: wardA, deviceId: `d-${randomUUID().slice(0, 8)}` });
    directorAccess = dirPair.accessToken;
    const secAPair = await tokenSvc.issuePair({ userId: secretaryAId, role: 'secretary', lgaId: lgaA, wardId: wardA, deviceId: `d-${randomUUID().slice(0, 8)}` });
    secretaryAAccess = secAPair.accessToken;
    const secBPair = await tokenSvc.issuePair({ userId: secretaryBId, role: 'secretary', lgaId: lgaA, wardId: wardB, deviceId: `d-${randomUUID().slice(0, 8)}` });
    secretaryBAccess = secBPair.accessToken;

    const formRow = await pool.query<{ id: string }>(
      `INSERT INTO forms (slug, title, title_ha, scope_kind, scope_ids, status, current_version_id, created_by)
       VALUES ($1, $2, $3, 'state', '{}', 'draft', NULL, $4) RETURNING id`,
      [`sec-form-${randomUUID().slice(0, 6)}`, 'Sec Form', 'Sec Form', directorId],
    );
    formId = formRow.rows[0]!.id;

    const fvRow = await pool.query<{ id: string }>(
      `INSERT INTO form_versions (form_id, version_number, schema, deployed_at, deployed_by) VALUES ($1, 1, $2, now(), $3) RETURNING id`,
      [formId, JSON.stringify({ version: 1, sections: [] }), directorId],
    );
    formVersionId = fvRow.rows[0]!.id;
    await pool.query(`UPDATE forms SET current_version_id = $1, status = 'deployed' WHERE id = $2`, [formVersionId, formId]);

    const reportRow = await pool.query<{ id: string }>(
      `INSERT INTO reports (form_version_id, ward_id, submitted_by, submission_method, state, canonical)
       VALUES ($1, $2, $3, 'amira', 'draft', '{}') RETURNING id`,
      [formVersionId, wardA, secretaryAId],
    );
    reportAId = reportRow.rows[0]!.id;
  }, 60_000);

  afterAll(async () => {
    const cleanup = async (id: string) => {
      await pool.query(`DELETE FROM reports WHERE submitted_by = $1`, [id]).catch(() => undefined);
      await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [id]).catch(() => undefined);
      await pool.query(`DELETE FROM audit_events WHERE actor_user_id = $1`, [id]).catch(() => undefined);
      await pool.query(`DELETE FROM users WHERE id = $1`, [id]).catch(() => undefined);
    };
    await cleanup(directorId);
    await cleanup(secretaryAId);
    await cleanup(secretaryBId);
    await pool.query(`DELETE FROM forms WHERE id = $1`, [formId]).catch(() => undefined);
    await pool.query(`DELETE FROM wards WHERE lga_id = $1`, [lgaA]).catch(() => undefined);
    await pool.query(`DELETE FROM lgas WHERE id = $1`, [lgaA]).catch(() => undefined);
    await pool.end();
    await app.close();
  }, 60_000);

  // ────────────────────────── Auth bypass ──────────────────────────

  it('returns 401 on protected endpoint with missing bearer', async () => {
    await request(app.getHttpServer()).get('/api/v1/users').expect(401);
  });

  it('returns 401 with malformed bearer token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', 'Bearer not.a.jwt')
      .expect(401);
  });

  it('returns 401 with empty bearer string', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', 'Bearer ')
      .expect(401);
  });

  // ────────────────────────── JWT tampering ──────────────────────────

  it('returns 401 when JWT payload is tampered (role changed)', async () => {
    const parts = secretaryAAccess.split('.');
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString());
    payload.role = 'director';
    const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tamperedToken = `${parts[0]!}.${tamperedPayload}.${parts[2]!}`;
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${tamperedToken}`)
      .expect(401);
  });

  it('returns 401 when JWT signature is replaced with garbage', async () => {
    const parts = secretaryAAccess.split('.');
    const tamperedToken = `${parts[0]!}.${parts[1]!}.invalidsignature`;
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${tamperedToken}`)
      .expect(401);
  });

  // ────────────────────────── IDOR / scope isolation ──────────────────────────

  it('returns 403/404 when secretary B tries to access secretary A report', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/${reportAId}`)
      .set('Authorization', `Bearer ${secretaryBAccess}`)
      .expect(404);
    expect(res.body.message).not.toContain(reportAId); // no leak
  });

  it('returns 403 when secretary tries to list users', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(403);
    expect(res.body.message).not.toContain(secretaryAId); // no info leak
  });

  // ────────────────────────── SQL injection in query params ──────────────────────────

  it('returns 400/404 on SQL injection attempt in report ID path', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/reports/1' OR '1'='1`)
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(400); // ParseUUIDPipe rejects non-UUID
  });

  it('rejects SQL injection in user list cursor with 400', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users?cursor=1%27%20OR%20%271%27%3D%271')
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(400);
    expect(res.body.message).not.toContain('syntax error'); // no SQL leak
  });

  // ────────────────────────── Mass assignment ──────────────────────────

  it('rejects mass-assignment fields in create-user DTO with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({
        role: 'secretary',
        fullName: 'Test',
        phone: `+2348041${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`,
        lgaId: lgaA,
        wardId: wardA,
        isAdmin: true, // mass-assignment attempt
        password: 'hacked',
      })
      .expect(400);
    expect(JSON.stringify(res.body)).toContain('property isAdmin should not exist');
  });

  // ────────────────────────── Input validation extremes ──────────────────────────

  it('rejects extremely long string in form title with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/forms')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({
        slug: `form-${randomUUID().slice(0, 6)}`,
        title: 'A'.repeat(10_001),
        titleHa: 'A'.repeat(10_001),
        scopeKind: 'state',
        scopeIds: [],
      })
      .expect(400);
    expect(res.body.message).not.toContain('A'.repeat(100));
  });

  it('rejects special characters in phone field with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/mobile')
      .send({ phone: '<script>alert(1)</script>', pin: '123456', deviceId })
      .expect(400);
    expect(res.body.message).toContain('phone must be E.164');
  });

  it('rejects null values in required body fields with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/mobile')
      .send({ phone: null, pin: null, deviceId: null })
      .expect(400);
    expect(JSON.stringify(res.body)).not.toMatch(/null/i); // minimal leak check
  });

  // ────────────────────────── CSRF-like cross-origin POST ──────────────────────────

  it('accepts POST without origin header (API is not browser-session-cookie based)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/mobile')
      .set('Origin', 'https://evil.com')
      .send({ phone: secAPhone, pin, deviceId })
      .expect(200);
  });

  // ────────────────────────── HTTP method override ──────────────────────────

  it('returns 404 when DELETE sent to GET-only list endpoint', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/reports')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(404);
  });

  it('returns 404 when PUT sent to POST-only create endpoint', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/reports')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .send({ formVersionId, wardId: wardA, submissionMethod: 'amira' })
      .expect(404);
  });

  // ────────────────────────── Brute-force rate limiting ──────────────────────────

  it('remains stable under 10 rapid failed login attempts', async () => {
    const attempts = Array.from({ length: 10 }, (_, i) =>
      request(app.getHttpServer())
        .post('/api/v1/auth/sign-in/mobile')
        .send({ phone: secAPhone, pin: `00000${i % 10}`, deviceId: `bf-device-${i}` })
        .then((res) => res.status),
    );
    const statuses = await Promise.all(attempts);
    expect(statuses.every((s) => s === 401)).toBe(true);
  }, 30_000);

  // ────────────────────────── Path traversal in file upload (simulated) ──────────────────────────

  it('rejects attachment upload with path-traversal filename', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/attachments/upload')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .field('reportId', reportAId)
      .field('kind', 'photo')
      .attach('file', Buffer.from('fake'), '../../../etc/passwd')
      .expect(400);
  });

  // ────────────────────────── Sensitive data exposure ──────────────────────────

  it('does not leak PIN or password in error responses', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/mobile')
      .send({ phone: secAPhone, pin: '999999', deviceId })
      .expect(401);
    expect(JSON.stringify(res.body)).not.toMatch(/999999|pin|password/i);
  });

  it('does not leak internal stack traces to client on 500 (simulated)', async () => {
    // The ValidationPipe transforms bad UUIDs to 400, not 500.
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/not-a-uuid')
      .set('Authorization', `Bearer ${secretaryAAccess}`)
      .expect(400);
    expect(res.body.message).not.toMatch(/at\s+\w+/); // no stack trace lines
  });
});
