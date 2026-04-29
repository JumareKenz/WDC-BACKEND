/**
 * Users CRUD + RLS scope integration tests.
 *
 * Boots a real Nest app, creates a director and a coordinator via the same
 * direct-DB shortcut as the auth tests (fixture seeding under role=system),
 * signs both in via the public auth flow to obtain access tokens, then drives
 * the full users API via supertest.
 *
 * Coverage:
 *   - director can create, list, get, reassign, suspend, reactivate, delete
 *   - create returns a one-time enrolment token + expiry
 *   - enrolment token redemption sets a PIN that allows sign-in
 *   - re-using a redeemed enrolment token returns 401
 *   - coordinator can list users in own LGA only (RLS-scoped)
 *   - coordinator cannot create (Roles guard, 403)
 *   - phone uniqueness collision returns 409
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

integration('Users CRUD + RLS scope', () => {
  let app: INestApplication;
  let module: TestingModule;
  let pool: Pool;

  let directorId: string;
  let directorAccess: string;
  let coordinatorId: string;
  let coordinatorAccess: string;
  let lgaA: string;
  let lgaB: string;
  let createdUserId: string | undefined;
  const directorPhone = `+2348011${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const coordPhone = `+2348012${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const directorPin = '424242';
  const coordPin = '737737';

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

    // Two LGAs.
    const codeA = `T-${randomBytes(3).toString('hex').toUpperCase()}`;
    const codeB = `T-${randomBytes(3).toString('hex').toUpperCase()}`;
    lgaA = (
      await pool.query<{ id: string }>(
        `INSERT INTO lgas (code, name, name_ha) VALUES ($1, $2, $3) RETURNING id`,
        [codeA, `LgaA ${codeA}`, `LgaA ${codeA}`],
      )
    ).rows[0]!.id;
    lgaB = (
      await pool.query<{ id: string }>(
        `INSERT INTO lgas (code, name, name_ha) VALUES ($1, $2, $3) RETURNING id`,
        [codeB, `LgaB ${codeB}`, `LgaB ${codeB}`],
      )
    ).rows[0]!.id;

    // Director + coordinator fixtures. Names and phone-ciphertext are
    // produced via real pgp_sym_encrypt against the dev DEK so that the
    // list/get paths (which decrypt) work for these rows.
    const dek = process.env.KMS_DEK!;
    const dirHash = await argon.hash(directorPin);
    directorId = (
      await pool.query<{ id: string }>(
        `INSERT INTO users (role, full_name_ciphertext, phone_hash, phone_ciphertext, pin_hash, key_id)
         VALUES ('director', pgp_sym_encrypt('Director Test', $1), $2,
                 pgp_sym_encrypt($3, $1), $4, 'kid-test')
         RETURNING id`,
        [dek, sha256Buf(directorPhone), directorPhone, dirHash],
      )
    ).rows[0]!.id;
    const coordHash = await argon.hash(coordPin);
    coordinatorId = (
      await pool.query<{ id: string }>(
        `INSERT INTO users (role, lga_id, full_name_ciphertext, phone_hash, phone_ciphertext, pin_hash, key_id)
         VALUES ('coordinator', $1, pgp_sym_encrypt('Coord Test', $2), $3,
                 pgp_sym_encrypt($4, $2), $5, 'kid-test')
         RETURNING id`,
        [lgaA, dek, sha256Buf(coordPhone), coordPhone, coordHash],
      )
    ).rows[0]!.id;

    // Sign both in.
    const dirResp = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/mobile')
      .send({ phone: directorPhone, pin: directorPin, deviceId: 'dev-d-' + randomBytes(2).toString('hex') })
      .expect(200);
    directorAccess = dirResp.body.accessToken;

    const coResp = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/mobile')
      .send({ phone: coordPhone, pin: coordPin, deviceId: 'dev-c-' + randomBytes(2).toString('hex') })
      .expect(200);
    coordinatorAccess = coResp.body.accessToken;
  }, 120_000);

  afterAll(async () => {
    if (pool) {
      const ids = [directorId, coordinatorId, createdUserId].filter(Boolean) as string[];
      if (ids.length > 0) {
        await pool
          .query(`DELETE FROM refresh_tokens WHERE user_id = ANY($1::uuid[])`, [ids])
          .catch(() => undefined);
        await pool
          .query(`DELETE FROM audit_events WHERE actor_user_id = ANY($1::uuid[])`, [ids])
          .catch(() => undefined);
        await pool
          .query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [ids])
          .catch(() => undefined);
      }
      await pool.query(`DELETE FROM lgas WHERE id = ANY($1::uuid[])`, [[lgaA, lgaB]]).catch(() => undefined);
      await pool.end();
    }
    if (app) await app.close();
  });

  it('director creates a user; response carries an enrolment token', async () => {
    const phone = `+2348019${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({
        role: 'coordinator',
        fullName: 'Test Coordinator',
        phone,
        lgaId: lgaB,
      })
      .expect(201);
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.phone).toBe(phone);
    expect(res.body.fullName).toBe('Test Coordinator');
    expect(res.body.enrolmentToken).toBeTypeOf('string');
    expect(new Date(res.body.enrolmentExpiresAt).getTime()).toBeGreaterThan(Date.now());
    createdUserId = res.body.id;

    // Audit event.
    const audit = await pool.query<{ event_kind: string }>(
      `SELECT event_kind FROM audit_events WHERE target_id = $1 ORDER BY id DESC LIMIT 1`,
      [createdUserId],
    );
    expect(audit.rows[0]?.event_kind).toBe('users.created');
  }, 30_000);

  it('coordinator cannot create a user (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .send({
        role: 'secretary',
        fullName: 'No One',
        phone: '+2348019999999',
        lgaId: lgaA,
        wardId: '00000000-0000-0000-0000-000000000000',
      })
      .expect(403);
  });

  it('phone uniqueness — second create with same phone returns 409', async () => {
    const phone = `+2348018${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ role: 'coordinator', fullName: 'A', phone, lgaId: lgaA })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ role: 'coordinator', fullName: 'B', phone, lgaId: lgaB })
      .expect(409);
  }, 30_000);

  it('coordinator lists users in own LGA only (RLS scope)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(200);
    const lgas = new Set((res.body.items as Array<{ lgaId: string | null }>).map((u) => u.lgaId).filter(Boolean));
    // Coordinator should never see lgaB rows; whatever's in the result is
    // either lgaA or null (director / state-wide).
    for (const id of lgas) expect(id === lgaA).toBe(true);
  });

  it('director updates assignment, suspend, reactivate, delete', async () => {
    expect(createdUserId).toBeDefined();
    // assignment
    let res = await request(app.getHttpServer())
      .patch(`/api/v1/users/${createdUserId}/assignment`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ lgaId: lgaA })
      .expect(200);
    expect(res.body.lgaId).toBe(lgaA);

    // suspend
    res = await request(app.getHttpServer())
      .post(`/api/v1/users/${createdUserId}/suspend`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);
    expect(res.body.status).toBe('suspended');

    // reactivate
    res = await request(app.getHttpServer())
      .post(`/api/v1/users/${createdUserId}/reactivate`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);
    expect(res.body.status).toBe('active');

    // delete
    await request(app.getHttpServer())
      .delete(`/api/v1/users/${createdUserId}`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(204);

    // GET after delete returns 404 (RLS would normally hide a soft-deleted
    // row anyway; here the service excludes deleted_at IS NOT NULL).
    await request(app.getHttpServer())
      .get(`/api/v1/users/${createdUserId}`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(404);
  }, 30_000);

  it('enrolment token: create user, redeem token, sign in with new PIN', async () => {
    const phone = `+2348017${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
    const create = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ role: 'coordinator', fullName: 'Enrol Tester', phone, lgaId: lgaA })
      .expect(201);
    const userId = create.body.id as string;
    const token = create.body.enrolmentToken as string;
    const newPin = '314159';

    await request(app.getHttpServer())
      .post('/api/v1/auth/set-credentials')
      .send({ enrolmentToken: token, pin: newPin })
      .expect(200);

    // Now the user can sign in.
    const signIn = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/mobile')
      .send({ phone, pin: newPin, deviceId: 'dev-e-' + randomBytes(2).toString('hex') })
      .expect(200);
    expect(signIn.body.accessToken).toBeTypeOf('string');

    // Re-using the redeemed enrolment token now fails.
    await request(app.getHttpServer())
      .post('/api/v1/auth/set-credentials')
      .send({ enrolmentToken: token, pin: newPin })
      .expect(401);

    // Cleanup.
    await pool
      .query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId])
      .catch(() => undefined);
    await pool.query(`DELETE FROM audit_events WHERE target_id = $1`, [userId]).catch(() => undefined);
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]).catch(() => undefined);
  }, 30_000);
});
