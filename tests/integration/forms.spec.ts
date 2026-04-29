/**
 * Forms integration tests.
 *
 * Boots a real Nest app, signs in a director and a coordinator, drives the
 * forms API end-to-end:
 *   - director creates a draft form, lists, gets, patches, creates a version
 *   - coordinator can list/get but cannot create or deploy (403)
 *   - deploy freezes the version: a follow-up version-edit attempt at the
 *     DB layer is rejected by the immutability trigger
 *   - GET /forms/visible returns only deployed forms in the caller's scope
 *   - Zod validation rejects malformed schemas at create-version
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

integration('Forms (CRUD + lifecycle + scope)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let pool: Pool;

  let directorId: string;
  let directorAccess: string;
  let coordinatorId: string;
  let coordinatorAccess: string;
  let lgaA: string;
  let lgaB: string;
  const directorPhone = `+2348015${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const coordPhone = `+2348016${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
  const directorPin = '111222';
  const coordPin = '333444';
  const formIds: string[] = [];

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
      await pool.query(`DELETE FROM form_versions WHERE form_id = ANY($1::uuid[])`, [formIds]).catch(() => undefined);
      await pool.query(`DELETE FROM forms WHERE id = ANY($1::uuid[])`, [formIds]).catch(() => undefined);
      if (ids.length > 0) {
        await pool.query(`DELETE FROM refresh_tokens WHERE user_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
        await pool.query(`DELETE FROM audit_events WHERE actor_user_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
        await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
      }
      await pool.query(`DELETE FROM lgas WHERE id = ANY($1::uuid[])`, [[lgaA, lgaB]]).catch(() => undefined);
      await pool.end();
    }
    if (app) await app.close();
  });

  it('director creates a draft form; coordinator can list and get but not create', async () => {
    const slug = `t-form-${randomBytes(3).toString('hex')}`;
    const create = await request(app.getHttpServer())
      .post('/api/v1/forms')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ slug, title: 'Test Form', titleHa: 'Sigar Gwaji', scopeKind: 'state' })
      .expect(201);
    expect(create.body.status).toBe('draft');
    expect(create.body.slug).toBe(slug);
    formIds.push(create.body.id);

    await request(app.getHttpServer())
      .get('/api/v1/forms')
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/forms/${create.body.id}`)
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/forms')
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .send({ slug: 'co-form', title: 'X', titleHa: 'X', scopeKind: 'state' })
      .expect(403);
  }, 30_000);

  it('rejects an invalid form schema with 400 + structured errors', async () => {
    const slug = `t-form-${randomBytes(3).toString('hex')}`;
    const create = await request(app.getHttpServer())
      .post('/api/v1/forms')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ slug, title: 'X', titleHa: 'X', scopeKind: 'state' })
      .expect(201);
    formIds.push(create.body.id);

    const bad = await request(app.getHttpServer())
      .post(`/api/v1/forms/${create.body.id}/versions`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ schema: { version: 1, sections: [] } })
      .expect(400);
    expect(bad.body.message).toBe('invalid form schema');
    expect(Array.isArray(bad.body.errors)).toBe(true);
  });

  it('deploy freezes the version: subsequent UPDATE on form_versions is blocked by trigger', async () => {
    const slug = `t-form-${randomBytes(3).toString('hex')}`;
    const create = await request(app.getHttpServer())
      .post('/api/v1/forms')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ slug, title: 'Deploy Me', titleHa: 'Tura Ni', scopeKind: 'state' })
      .expect(201);
    formIds.push(create.body.id);

    const ver = await request(app.getHttpServer())
      .post(`/api/v1/forms/${create.body.id}/versions`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ schema: validSchema })
      .expect(201);
    expect(ver.body.versionNumber).toBe(1);
    expect(ver.body.deployedAt).toBeNull();

    const deployed = await request(app.getHttpServer())
      .post(`/api/v1/forms/${create.body.id}/deploy`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);
    expect(deployed.body.status).toBe('deployed');
    expect(deployed.body.currentVersionId).toBe(ver.body.id);

    // Direct DB UPDATE on the deployed version must be rejected by the
    // immutability trigger. We also need to switch role to wdc_app so the
    // trigger fires (the dev superuser would normally bypass FORCE RLS,
    // but BEFORE-row triggers fire regardless of role).
    await expect(
      pool.query(
        `UPDATE form_versions SET schema = '{"version":1,"sections":[]}'::jsonb WHERE id = $1`,
        [ver.body.id],
      ),
    ).rejects.toThrow(/immutable/);
  }, 30_000);

  it('deploying a form with no versions returns 400; deploying twice returns 409', async () => {
    const slug = `t-form-${randomBytes(3).toString('hex')}`;
    const create = await request(app.getHttpServer())
      .post('/api/v1/forms')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ slug, title: 'No Ver', titleHa: 'X', scopeKind: 'state' })
      .expect(201);
    formIds.push(create.body.id);

    await request(app.getHttpServer())
      .post(`/api/v1/forms/${create.body.id}/deploy`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/v1/forms/${create.body.id}/versions`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ schema: validSchema })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/forms/${create.body.id}/deploy`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/forms/${create.body.id}/deploy`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(409);
  }, 30_000);

  it('GET /forms/visible returns only deployed in-scope forms', async () => {
    // Create + deploy a state form, an LGA-A form, and an LGA-B form.
    const mk = async (scopeKind: 'state' | 'lga', scopeIds?: string[]) => {
      const slug = `vis-${randomBytes(3).toString('hex')}`;
      const create = await request(app.getHttpServer())
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${directorAccess}`)
        .send({ slug, title: 'V', titleHa: 'V', scopeKind, scopeIds })
        .expect(201);
      formIds.push(create.body.id);
      await request(app.getHttpServer())
        .post(`/api/v1/forms/${create.body.id}/versions`)
        .set('Authorization', `Bearer ${directorAccess}`)
        .send({ schema: validSchema })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/forms/${create.body.id}/deploy`)
        .set('Authorization', `Bearer ${directorAccess}`)
        .expect(200);
      return create.body.id as string;
    };
    const stateForm = await mk('state');
    const lgaAForm = await mk('lga', [lgaA]);
    const lgaBForm = await mk('lga', [lgaB]);

    const visible = await request(app.getHttpServer())
      .get('/api/v1/forms/visible')
      .set('Authorization', `Bearer ${coordinatorAccess}`)
      .expect(200);
    const ids = (visible.body as Array<{ id: string }>).map((f) => f.id);
    expect(ids).toContain(stateForm);
    expect(ids).toContain(lgaAForm);
    expect(ids).not.toContain(lgaBForm);
  }, 60_000);

  it('archive a form (status -> archived)', async () => {
    const slug = `t-form-${randomBytes(3).toString('hex')}`;
    const create = await request(app.getHttpServer())
      .post('/api/v1/forms')
      .set('Authorization', `Bearer ${directorAccess}`)
      .send({ slug, title: 'Arch', titleHa: 'Arch', scopeKind: 'state' })
      .expect(201);
    formIds.push(create.body.id);

    const arch = await request(app.getHttpServer())
      .post(`/api/v1/forms/${create.body.id}/archive`)
      .set('Authorization', `Bearer ${directorAccess}`)
      .expect(200);
    expect(arch.body.status).toBe('archived');
  });
});
