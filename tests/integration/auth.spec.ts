/**
 * Auth integration tests.
 *
 * Boots a real Nest application context against the live dev DB, makes HTTP
 * requests via supertest, and asserts:
 *   - mobile sign-in happy path returns a token pair
 *   - wrong PIN rejects with 401 and writes an audit event
 *   - refresh rotation issues a fresh pair and revokes the old token
 *   - reusing a revoked refresh token revokes the whole device chain
 *   - sign-out revokes all refresh tokens for the device
 *   - protected endpoint requires a Bearer token
 *
 * Fixtures use a unique per-suite phone number so re-runs don't collide.
 * Cleanup is best-effort (DELETE in afterAll); RLS is bypassed for cleanup
 * by running as the wdc superuser without the wdc_app role switch.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Pool } from 'pg';
import { createHash, randomBytes } from 'node:crypto';
import { AppModule } from '../../src/app.module';
import { ArgonService } from '../../src/modules/auth/argon.service';

const DATABASE_URL = process.env.DATABASE_URL ?? '';
const integration = DATABASE_URL ? describe : describe.skip;

function sha256Buf(input: string): Buffer {
  return createHash('sha256').update(input).digest();
}

integration('Auth (mobile flow)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let pool: Pool;
  let userId: string;
  const phone = `+234801${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const pin = '987654';
  const deviceId = 'test-device-' + randomBytes(4).toString('hex');

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready'] });
    await app.init();

    pool = new Pool({ connectionString: DATABASE_URL });
    const argon = app.get(ArgonService);
    const pinHash = await argon.hash(pin);
    const buf = Buffer.from('x');
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO users
         (role, full_name_ciphertext, phone_hash, phone_ciphertext, pin_hash, key_id)
       VALUES ('secretary', $1, $2, $1, $3, 'kid-test') RETURNING id`,
      [buf, sha256Buf(phone), pinHash],
    );
    userId = inserted.rows[0]!.id;
  }, 60_000);

  afterAll(async () => {
    if (userId) {
      await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]).catch(() => undefined);
      await pool.query(`DELETE FROM audit_events WHERE actor_user_id = $1`, [userId]).catch(() => undefined);
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]).catch(() => undefined);
    }
    if (pool) await pool.end();
    if (app) await app.close();
  });

  it('signs in with correct phone+PIN, returns a token pair', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/mobile')
      .send({ phone, pin, deviceId })
      .expect(200);
    expect(res.body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(res.body.refreshToken).toBeTypeOf('string');
    expect(res.body.accessExpiresIn).toBeGreaterThan(0);

    const audit = await pool.query<{ event_kind: string }>(
      `SELECT event_kind FROM audit_events WHERE actor_user_id = $1 ORDER BY id DESC LIMIT 1`,
      [userId],
    );
    expect(audit.rows[0]?.event_kind).toBe('auth.sign_in.mobile.ok');
  }, 30_000);

  it('rejects a wrong PIN with 401 and logs a failed attempt', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/mobile')
      .send({ phone, pin: '000000', deviceId })
      .expect(401);

    const audit = await pool.query<{ event_kind: string; payload: { reason: string } }>(
      `SELECT event_kind, payload FROM audit_events
       WHERE actor_user_id = $1 AND event_kind = 'auth.sign_in.mobile.failed'
       ORDER BY id DESC LIMIT 1`,
      [userId],
    );
    expect(audit.rows[0]?.payload.reason).toBe('bad_pin');
  }, 30_000);

  it('rejects an unknown phone with 401 (no enumeration)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/mobile')
      .send({ phone: '+2348099999999', pin: '111111', deviceId })
      .expect(401);
  }, 30_000);

  it('rotates the refresh token and revokes the old one', async () => {
    const signIn = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/mobile')
      .send({ phone, pin, deviceId })
      .expect(200);
    const oldRefresh = signIn.body.refreshToken as string;

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh, deviceId })
      .expect(200);
    expect(refreshed.body.refreshToken).not.toBe(oldRefresh);

    // Re-presenting the old token should now fail and revoke the chain.
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh, deviceId })
      .expect(401);

    // After reuse-detection, the new token from the rotation is also revoked.
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshed.body.refreshToken, deviceId })
      .expect(401);
  }, 60_000);

  it('protected endpoint returns 401 without a bearer token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-out')
      .send({ deviceId })
      .expect(401);
  });

  it('sign-out with a valid token revokes all refresh tokens for the device', async () => {
    const signIn = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/mobile')
      .send({ phone, pin, deviceId })
      .expect(200);
    const access = signIn.body.accessToken as string;

    const out = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-out')
      .set('Authorization', `Bearer ${access}`)
      .send({ deviceId })
      .expect(200);
    expect(out.body.revoked).toBeGreaterThanOrEqual(1);

    // Rotation now must fail with the latest refresh token.
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: signIn.body.refreshToken, deviceId })
      .expect(401);
  }, 30_000);
});
