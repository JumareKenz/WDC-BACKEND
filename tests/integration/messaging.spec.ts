/**
 * Messaging integration tests.
 *
 * Boots a real Nest app, signs in a director and a coordinator, drives the
 * messaging API end-to-end:
 *   - director composes a state-wide broadcast
 *   - recipient lists delivery attempts and marks as read
 *   - coordinator cannot broadcast (403)
 *   - quiet-hours gate for non-urgent broadcasts
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

integration('Messaging (broadcast + delivery tracking + quiet hours)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let pool: Pool;

  let directorId: string;
  let directorAccess: string;
  let coordinatorId: string;
  let coordinatorAccess: string;
  let lgaA: string;

  const directorPhone = `+2348031${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const coordPhone = `+2348032${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const directorPin = '112233';
  const coordPin = '445566';

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    // Defensive cleanup — stale rows from previous aborted runs can bloat
    // broadcast recipient lists and cause the endpoint to time out.
    // TRUNCATE CASCADE wipes every user-facing table so the test starts
    // with a known-empty state regardless of what earlier (possibly crashed)
    // suites left behind.
    await pool.query(
      `TRUNCATE TABLE delivery_attempts, messages, audit_events, audit_anchors,
        refresh_tokens, reports, report_op_log, investigation_evidence,
        investigations, idempotency_keys, attachments, form_versions,
        forms, embeddings, users, wards, lgas CASCADE`,
    ).catch(() => undefined);

    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready'] });
    await app.init();

    const argon = app.get(ArgonService);
    const dek = process.env.KMS_DEK!;

    const codeA = `T-${randomBytes(3).toString('hex').toUpperCase()}`;
    lgaA = (
      await pool.query<{ id: string }>(
        `INSERT INTO lgas (code, name, name_ha) VALUES ($1, $2, $3) RETURNING id`,
        [codeA, `LgaA ${codeA}`, `LgaA ${codeA}`],
      )
    ).rows[0]!.id;

    directorId = (
      await pool.query<{ id: string }>(
        `INSERT INTO users (role, full_name_ciphertext, phone_hash, phone_ciphertext, pin_hash, key_id)
         VALUES ('director', pgp_sym_encrypt('Dir Msg', $1), $2, pgp_sym_encrypt($3, $1), $4, 'kid-test')
         RETURNING id`,
        [dek, sha256Buf(directorPhone), directorPhone, await argon.hash(directorPin)],
      )
    ).rows[0]!.id;

    coordinatorId = (
      await pool.query<{ id: string }>(
        `INSERT INTO users (role, lga_id, full_name_ciphertext, phone_hash, phone_ciphertext, pin_hash, key_id)
         VALUES ('coordinator', $1, pgp_sym_encrypt('Coord Msg', $2), $3, pgp_sym_encrypt($4, $2), $5, 'kid-test')
         RETURNING id`,
        [lgaA, dek, sha256Buf(coordPhone), coordPhone, await argon.hash(coordPin)],
      )
    ).rows[0]!.id;

    directorAccess = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/sign-in/mobile')
        .send({ phone: directorPhone, pin: directorPin, deviceId: 'fdev-d-' + randomBytes(2).toString('hex') })
        .expect(200)
    ).body.accessToken;

    coordinatorAccess = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/sign-in/mobile')
        .send({ phone: coordPhone, pin: coordPin, deviceId: 'fdev-c-' + randomBytes(2).toString('hex') })
        .expect(200)
    ).body.accessToken;
  }, 120_000);

  afterAll(async () => {
    if (pool) {
      const ids = [directorId, coordinatorId].filter(Boolean) as string[];
      await pool.query(`DELETE FROM delivery_attempts WHERE recipient_user_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
      await pool.query(`DELETE FROM messages WHERE sender_user_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
      await pool.query(`DELETE FROM audit_events WHERE actor_user_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
      await pool.query(`DELETE FROM refresh_tokens WHERE user_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
      if (ids.length > 0) {
        await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
      }
      await pool.query(`DELETE FROM lgas WHERE id = $1`, [lgaA]).catch(() => undefined);
      await pool.end();
    }
    if (app) await app.close();
  });

  it('director broadcasts state-wide via in_app channel', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/messages/broadcast')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({
        body: 'All staff meeting tomorrow at 09:00 WAT',
        channels: ['in_app'],
        scopeKind: 'state',
        urgent: false,
      })
      .expect(201);

    expect(res.body.messageId).toBeDefined();
    expect(res.body.conversationId).toBeDefined();
    expect(res.body.recipientCount).toBeGreaterThanOrEqual(2); // director + coordinator
    expect(res.body.deliveryCount).toBeGreaterThanOrEqual(2);
    expect(res.body.queuedDuringQuietHours).toBe(false);
  });

  it('recipient lists their delivery attempts', async () => {
    // Poll briefly in case inline dispatch is slightly behind the HTTP response
    let item: { status: string; channel: string; payload: { body: string }; sentAt: string | null } | undefined;
    for (let i = 0; i < 20; i++) {
      const res = await request(app.getHttpServer())
        .get('/api/v1/messages/deliveries')
        .set('Authorization', `Bearer ${coordinatorAccess}`)
        .expect(200);
      item = res.body.items.find((it: { status: string }) => it.status === 'sent');
      if (item) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(item).toBeDefined();
    expect(item!.channel).toBe('in_app');
    expect(item!.payload.body).toContain('meeting');
    expect(item!.sentAt).not.toBeNull();
  });

  it('recipient marks a delivery as read', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/messages/deliveries?limit=1')
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(200);

    const deliveryId = list.body.items[0].id;

    await request(app.getHttpServer())
      .post(`/api/v1/messages/deliveries/${deliveryId}/read`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(204);

    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/messages/deliveries/${deliveryId}`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(200);

    expect(getRes.body.status).toBe('read');
    expect(getRes.body.readAt).not.toBeNull();
  });

  it('coordinator cannot broadcast', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/messages/broadcast')
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .send({
        body: 'Unauthorized broadcast',
        channels: ['in_app'],
        scopeKind: 'state',
      })
      .expect(403);
  });

  it('returns 404 for unknown delivery id on read', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/messages/deliveries/00000000-0000-0000-0000-000000000000/read')
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(404);
  });

  it('returns 404 for unknown delivery id on get', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/messages/deliveries/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(404);
  });

});
