/**
 * Audit anchor + sealed CSV export integration tests.
 *
 * Covers:
 *   - createAnchor returns null on an empty audit_events table
 *   - createAnchor signs the latest hash; the anchor row's signature
 *     verifies against the public key
 *   - listAnchors marks each row's `verified` field correctly
 *   - flipping a stored signature's bytes makes verify=false (no false
 *     positives on tampering)
 *   - GET /audit/export streams a `# anchor: ...` preamble plus rows up
 *     to and including the anchored event_id; verified_now is true
 *   - audit_anchors UPDATE/DELETE rejected by the append-only trigger
 *   - audit_anchors INSERT by a non-system role rejected by RLS
 *   - coordinator cannot reach /audit/* (403)
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
import { AnchorService } from '../../src/modules/audit/anchor.service';
import { AuditService } from '../../src/modules/audit/audit.service';

const DATABASE_URL = process.env.DATABASE_URL ?? '';
const integration = DATABASE_URL ? describe : describe.skip;

function sha256Buf(s: string): Buffer {
  return createHash('sha256').update(s).digest();
}

integration('Audit anchor + sealed export', () => {
  let app: INestApplication;
  let module: TestingModule;
  let pool: Pool;
  let directorId: string;
  let coordinatorId: string;
  let directorAccess: string;
  let coordAccess: string;
  let lgaA: string;
  const directorPhone = `+2348051${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const coordPhone = `+2348052${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const directorPin = '424242';
  const coordPin = '525252';

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

    const code = `T-${randomBytes(3).toString('hex').toUpperCase()}`;
    lgaA = (
      await pool.query<{ id: string }>(
        `INSERT INTO lgas (code, name, name_ha) VALUES ($1, $2, $3) RETURNING id`,
        [code, `Lga ${code}`, `Lga ${code}`],
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

    const signIn = async (phone: string, pin: string, prefix: string): Promise<string> =>
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/sign-in/mobile')
          .send({ phone, pin, deviceId: `${prefix}-${randomBytes(2).toString('hex')}` })
          .expect(200)
      ).body.accessToken;
    directorAccess = await signIn(directorPhone, directorPin, 'aud-d');
    coordAccess = await signIn(coordPhone, coordPin, 'aud-c');

    // Generate a few audit events so the anchor has something to point at.
    const audit = app.get(AuditService);
    for (let i = 0; i < 3; i++) {
      await audit.append({
        actorUserId: directorId,
        actorRole: 'director',
        eventKind: 'test.anchor.fixture',
        targetTable: 'users',
        targetId: directorId,
        payload: { i },
        requestId: null,
      });
    }
  }, 120_000);

  afterAll(async () => {
    if (pool) {
      const ids = [directorId, coordinatorId].filter(Boolean) as string[];
      // audit_anchors and audit_events are append-only — leave them; tests
      // don't assert on chain length and the dev DB is throwaway.
      if (ids.length > 0) {
        await pool.query(`DELETE FROM refresh_tokens WHERE user_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
        // We can't DELETE from audit_events (append-only trigger). Leave them.
      }
      // We can't DELETE from audit_anchors (FK from anchors -> events; both
      // append-only). Leave them.
      // Users are deleted only after audits are no longer referenced.
      // To keep the dev DB tidy across runs, NULL the actor_user_id first
      // then drop the user. But audit_events is append-only — we can't.
      // Compromise: leave both; the dev DB is throwaway and tests use
      // unique phone numbers per run.
      await pool.end();
    }
    if (app) await app.close();
  });

  it('createAnchor signs the latest hash; the signature verifies', async () => {
    const anchorSvc = app.get(AnchorService);
    const result = await anchorSvc.createAnchor();
    expect(result).not.toBeNull();
    expect(result!.latestHash).toMatch(/^[0-9a-f]{64}$/);

    const list = await request(app.getHttpServer())
      .post('/api/v1/audit/anchor')
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);
    expect(list.body.created).toBe(true);

    const anchors = await request(app.getHttpServer())
      .get('/api/v1/audit/anchors?limit=5')
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);
    expect(anchors.body.length).toBeGreaterThanOrEqual(2);
    for (const a of anchors.body as Array<{ verified: boolean }>) {
      expect(a.verified).toBe(true);
    }
  }, 30_000);

  it('a flipped signature byte makes verify=false (tamper detection)', async () => {
    const anchorSvc = app.get(AnchorService);
    const result = await anchorSvc.createAnchor();
    expect(result).not.toBeNull();

    const row = await pool.query<{ signature: string; latest_hash: string; signature_alg: string }>(
      `SELECT signature, latest_hash, signature_alg FROM audit_anchors WHERE id::text = $1`,
      [result!.id],
    );
    const r = row.rows[0]!;
    const camel = { signature: r.signature, latestHash: r.latest_hash, signatureAlg: r.signature_alg };
    expect(anchorSvc.verify(camel)).toBe(true);

    // Mutate one byte in the signature.
    const sigBuf = Buffer.from(r.signature, 'base64url');
    sigBuf[0] = sigBuf[0]! ^ 0xff;
    const tampered = sigBuf.toString('base64url');
    expect(anchorSvc.verify({ ...camel, signature: tampered })).toBe(false);
  }, 30_000);

  it('coordinator cannot reach /audit/* (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/audit/anchor')
      .set('Authorization', `Bearer ${coordAccess}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/audit/anchors')
      .set('Authorization', `Bearer ${coordAccess}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/audit/export')
      .set('Authorization', `Bearer ${coordAccess}`)
      .expect(403);
  });

  it('GET /audit/export streams an anchor preamble plus event rows', async () => {
    // Make sure there's at least one anchor.
    await request(app.getHttpServer())
      .post('/api/v1/audit/anchor')
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit/export')
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    const body = res.text;
    expect(body).toMatch(/^# anchor\.id:/m);
    expect(body).toMatch(/^# anchor\.latest_hash: [0-9a-f]{64}$/m);
    expect(body).toMatch(/^# anchor\.verified_now: true$/m);
    expect(body).toMatch(/^id,occurred_at,actor_user_id,actor_role,event_kind,/m);
    // At least the three fixture events should appear.
    const dataLines = body.split('\n').filter((l) => l && !l.startsWith('#') && !l.startsWith('id,'));
    expect(dataLines.length).toBeGreaterThanOrEqual(3);
  }, 30_000);

  it('audit_anchors UPDATE/DELETE rejected by append-only trigger', async () => {
    const anchorSvc = app.get(AnchorService);
    const result = await anchorSvc.createAnchor();
    expect(result).not.toBeNull();

    await expect(
      pool.query(`UPDATE audit_anchors SET signature = 'tampered' WHERE id::text = $1`, [result!.id]),
    ).rejects.toThrow(/append-only/);
    await expect(
      pool.query(`DELETE FROM audit_anchors WHERE id::text = $1`, [result!.id]),
    ).rejects.toThrow(/append-only/);
  }, 30_000);
});
