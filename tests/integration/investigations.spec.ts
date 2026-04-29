/**
 * Investigations integration tests.
 *
 * Boots a real Nest app, signs in a director and a coordinator, drives the
 * investigations API end-to-end:
 *   - director creates, lists, gets, updates, closes, reopens investigations
 *   - director adds and removes evidence
 *   - director retrieves activity timeline
 *   - coordinator is denied all access (403)
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

integration('Investigations (CRUD + evidence + timeline + scope)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let pool: Pool;

  let directorId: string;
  let directorAccess: string;
  let coordinatorId: string;
  let coordinatorAccess: string;
  let lgaA: string;

  const directorPhone = `+2348021${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const coordPhone = `+2348022${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const directorPin = '123456';
  const coordPin = '654321';

  let investigationId: string;
  let evidenceId: string;

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

    directorId = (
      await pool.query<{ id: string }>(
        `INSERT INTO users (role, full_name_ciphertext, phone_hash, phone_ciphertext, pin_hash, key_id)
         VALUES ('director', pgp_sym_encrypt('Dir Inv', $1), $2, pgp_sym_encrypt($3, $1), $4, 'kid-test')
         RETURNING id`,
        [dek, sha256Buf(directorPhone), directorPhone, await argon.hash(directorPin)],
      )
    ).rows[0]!.id;

    coordinatorId = (
      await pool.query<{ id: string }>(
        `INSERT INTO users (role, lga_id, full_name_ciphertext, phone_hash, phone_ciphertext, pin_hash, key_id)
         VALUES ('coordinator', $1, pgp_sym_encrypt('Coord Inv', $2), $3, pgp_sym_encrypt($4, $2), $5, 'kid-test')
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
      await pool.query(`DELETE FROM investigation_evidence WHERE added_by = ANY($1::uuid[])`, [ids]).catch(() => undefined);
      await pool.query(`DELETE FROM investigations WHERE opened_by = ANY($1::uuid[])`, [ids]).catch(() => undefined);
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

  it('director creates an investigation', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/investigations')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ title: 'Test Investigation', summary: 'Initial summary', priority: 'high' })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Test Investigation');
    expect(res.body.summary).toBe('Initial summary');
    expect(res.body.status).toBe('open');
    expect(res.body.priority).toBe('high');
    expect(res.body.openedBy).toBe(directorId);
    investigationId = res.body.id;
  });

  it('coordinator cannot create an investigation', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/investigations')
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .send({ title: 'Coord Investigation' })
      .expect(403);
  });

  it('director lists investigations', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/investigations')
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0].id).toBe(investigationId);
    expect(res.body.nextCursor).toBeDefined();
  });

  it('director gets investigation with evidence', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/investigations/${investigationId}`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);

    expect(res.body.id).toBe(investigationId);
    expect(res.body.title).toBe('Test Investigation');
    expect(Array.isArray(res.body.evidence)).toBe(true);
    expect(res.body.evidence.length).toBe(0);
  });

  it('director updates investigation fields', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/investigations/${investigationId}`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ title: 'Updated Title', status: 'in_progress', priority: 'urgent' })
      .expect(200);

    expect(res.body.title).toBe('Updated Title');
    expect(res.body.status).toBe('in_progress');
    expect(res.body.priority).toBe('urgent');
  });

  it('director closes and reopens investigation', async () => {
    const closeRes = await request(app.getHttpServer())
      .post(`/api/v1/investigations/${investigationId}/close`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);

    expect(closeRes.body.status).toBe('closed');
    expect(closeRes.body.closedAt).not.toBeNull();

    const reopenRes = await request(app.getHttpServer())
      .post(`/api/v1/investigations/${investigationId}/reopen`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);

    expect(reopenRes.body.status).toBe('open');
    expect(reopenRes.body.closedAt).toBeNull();
  });

  it('director adds evidence to investigation', async () => {
    const noteRes = await request(app.getHttpServer())
      .post(`/api/v1/investigations/${investigationId}/evidence`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ kind: 'note', note: 'Field observation: suspicious activity' })
      .expect(201);

    expect(noteRes.body.id).toBeDefined();
    expect(noteRes.body.kind).toBe('note');
    expect(noteRes.body.note).toBe('Field observation: suspicious activity');
    evidenceId = noteRes.body.id;

    const refRes = await request(app.getHttpServer())
      .post(`/api/v1/investigations/${investigationId}/evidence`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ kind: 'report_ref', refTable: 'reports', refId: '00000000-0000-0000-0000-000000000001' })
      .expect(201);

    expect(refRes.body.kind).toBe('report_ref');
    expect(refRes.body.refTable).toBe('reports');
  });

  it('director removes evidence from investigation', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/investigations/${investigationId}/evidence/${evidenceId}`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(204);

    // Verify it's gone
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/investigations/${investigationId}`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);

    expect(getRes.body.evidence.length).toBe(1);
    expect(getRes.body.evidence.find((e: { id: string }) => e.id === evidenceId)).toBeUndefined();
  });

  it('director gets activity timeline', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/investigations/${investigationId}/timeline`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    // Should include investigation creation, update, close, reopen, evidence events
    const kinds = res.body.map((e: { eventKind: string }) => e.eventKind);
    expect(kinds).toContain('investigations.created');
    expect(kinds).toContain('investigations.updated');
    expect(kinds).toContain('investigations.closed');
    expect(kinds).toContain('investigations.reopened');
    expect(kinds).toContain('investigations.evidence_added_report_ref');
  });

  it('coordinator is denied all investigation endpoints', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/investigations')
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/v1/investigations/${investigationId}`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/investigations/${investigationId}`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .send({ title: 'Hacked' })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/investigations/${investigationId}/close`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/investigations/${investigationId}/evidence`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .send({ kind: 'note', note: 'x' })
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/v1/investigations/${investigationId}/timeline`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(403);
  });

  it('returns 404 for non-existent investigation', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await request(app.getHttpServer())
      .get(`/api/v1/investigations/${fakeId}`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/investigations/${fakeId}`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ title: 'X' })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/investigations/${fakeId}/evidence`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ kind: 'note', note: 'x' })
      .expect(404);
  });
});
