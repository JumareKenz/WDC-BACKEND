/**
 * Load test harness — boots a local Nest app and floods it concurrently.
 *
 * Run with: node tests/load/load-test-harness.js
 */
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m && !m[1].startsWith('#')) {
    process.env[m[1]] = m[2];
  }
}

const { Test } = require('@nestjs/testing');
const { ValidationPipe, INestApplication } = require('@nestjs/common');
const request = require('supertest');
const { Pool } = require('pg');
const { createHash, randomBytes } = require('node:crypto');

const { AppModule } = require('../../dist/app.module');
const { ArgonService } = require('../../dist/modules/auth/argon.service');
const { TokenService } = require('../../dist/modules/auth/token.service');

async function main() {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready'] });
  await app.init();

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const argon = app.get(ArgonService);
  const tokenSvc = app.get(TokenService);

  // Create a test user for authenticated load tests
  const pin = '123456';
  const pinHash = await argon.hash(pin);
  const buf = Buffer.from('x');
  const phone = `+234801${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;

  const userRow = await pool.query(
    `INSERT INTO users (role, full_name_ciphertext, phone_hash, phone_ciphertext, pin_hash, key_id)
     VALUES ('secretary', $1, $2, $1, $3, 'kid-test') RETURNING id`,
    [buf, createHash('sha256').update(phone).digest(), pinHash],
  );
  const userId = userRow.rows[0].id;
  const pair = await tokenSvc.issuePair({ userId, role: 'secretary', lgaId: null, wardId: null, deviceId: 'load-device' });
  const accessToken = pair.accessToken;

  console.log('=== WDC Backend Load Test ===\n');

  // Helper — use keep-alive agents per worker to avoid Windows ephemeral-port
  // exhaustion under high concurrency.
  const flood = async (method, path, body, concurrency, durationMs, auth = false) => {
    const results = [];
    const start = Date.now();
    const workers = Array.from({ length: concurrency }, async () => {
      const agent = request.agent(app.getHttpServer());
      while (Date.now() - start < durationMs) {
        const req = agent[method](path).set('Connection', 'keep-alive');
        if (auth) req.set('Authorization', `Bearer ${accessToken}`);
        if (body) req.send(body);
        const t0 = process.hrtime.bigint();
        try {
          const res = await req;
          const ms = Number(process.hrtime.bigint() - t0) / 1e6;
          results.push({ status: res.status, ms });
        } catch (e) {
          const ms = Number(process.hrtime.bigint() - t0) / 1e6;
          results.push({ status: 0, ms, error: e.code || e.message || 'UNKNOWN' });
        }
      }
    });
    await Promise.all(workers);
    const ok = results.filter((r) => r.status > 0 && r.status < 500);
    const errors = results.filter((r) => r.status >= 500 || r.status === 0);
    const sorted = ok.map((r) => r.ms).sort((a, b) => a - b);
    const p = (pct) => sorted[Math.floor((sorted.length - 1) * pct)] || 0;
    return {
      count: results.length,
      errors: errors.length,
      connErrors: results.filter((r) => r.error).length,
      rps: ((results.length / (durationMs / 1000))).toFixed(1),
      p50: p(0.5).toFixed(2),
      p90: p(0.9).toFixed(2),
      p99: p(0.99).toFixed(2),
      max: (sorted[sorted.length - 1] || 0).toFixed(2),
    };
  };

  // 1. Health endpoints
  for (const c of [10, 50, 100, 200]) {
    const s = await flood('get', '/health/live', undefined, c, 3000);
    console.log(`GET /health/live  @ ${c} concurrent -> ${s.count} req, ${s.rps} rps, p50=${s.p50}ms p90=${s.p90}ms p99=${s.p99}ms max=${s.max}ms errors=${s.errors} (conn=${s.connErrors})`);
  }

  // 2. Ready endpoint (touches DB + Redis)
  for (const c of [10, 50, 100, 200]) {
    const s = await flood('get', '/health/ready', undefined, c, 3000);
    console.log(`GET /health/ready @ ${c} concurrent -> ${s.count} req, ${s.rps} rps, p50=${s.p50}ms p90=${s.p90}ms p99=${s.p99}ms max=${s.max}ms errors=${s.errors} (conn=${s.connErrors})`);
  }

  // 3. Auth endpoint (login)
  for (const c of [10, 50, 100, 200]) {
    const s = await flood('post', '/api/v1/auth/sign-in/mobile', { phone, pin, deviceId: 'load-device' }, c, 3000);
    console.log(`POST /auth/sign-in/mobile @ ${c} concurrent -> ${s.count} req, ${s.rps} rps, p50=${s.p50}ms p90=${s.p90}ms p99=${s.p99}ms max=${s.max}ms errors=${s.errors} (conn=${s.connErrors})`);
  }

  // 4. Protected endpoint (reports list)
  for (const c of [10, 50, 100, 200]) {
    const s = await flood('get', '/api/v1/reports', undefined, c, 3000, true);
    console.log(`GET /reports        @ ${c} concurrent -> ${s.count} req, ${s.rps} rps, p50=${s.p50}ms p90=${s.p90}ms p99=${s.p99}ms max=${s.max}ms errors=${s.errors} (conn=${s.connErrors})`);
  }

  // Cleanup
  await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]).catch(() => undefined);
  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]).catch(() => undefined);
  await pool.end();
  await app.close();
  console.log('\n=== Load test complete ===');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
