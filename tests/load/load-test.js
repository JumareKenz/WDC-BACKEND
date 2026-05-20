/**
 * Lightweight load / smoke test for the running WDC backend.
 *
 * Measures latency at P50 / P90 / P99 for the health endpoints and a
 * protected endpoint under increasing concurrency.
 */
const http = require('http');

const BASE = 'http://127.0.0.1:3100';
const CONCURRENCIES = [10, 50, 100, 200];
const DURATION_MS = 5_000;

function request(path, method = 'GET', body = undefined) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const req = http.request(
      `${BASE}${path}`,
      { method, headers: body ? { 'Content-Type': 'application/json' } : {} },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          const ms = Number(process.hrtime.bigint() - start) / 1e6;
          resolve({ status: res.statusCode, ms, data });
        });
      },
    );
    req.on('error', () => resolve({ status: 0, ms: 0, data: '' }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function flood(path, method, body, concurrency, durationMs) {
  const results = [];
  const start = Date.now();
  let done = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (Date.now() - start < durationMs) {
      const r = await request(path, method, body);
      results.push(r);
      done++;
    }
  });
  await Promise.all(workers);
  return results;
}

function stats(arr) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const p = (pct) => sorted[Math.floor((sorted.length - 1) * pct)];
  return {
    count: sorted.length,
    errors: arr.filter((s) => s === 0).length,
    p50: p(0.5),
    p90: p(0.9),
    p99: p(0.99),
    max: sorted[sorted.length - 1],
    min: sorted[0],
  };
}

async function main() {
  console.log('=== WDC Backend Load Test ===\n');

  // 1. Health smoke
  console.log('--- Health endpoints (single request) ---');
  const live = await request('/health/live');
  console.log(`GET /health/live  -> ${live.status} in ${live.ms.toFixed(2)} ms`);
  const ready = await request('/health/ready');
  console.log(`GET /health/ready -> ${ready.status} in ${ready.ms.toFixed(2)} ms`);

  if (live.status !== 200 || ready.status !== 200) {
    console.error('Health checks failed — aborting load test.');
    process.exit(1);
  }

  // 2. Increasing concurrency on /health/live
  for (const c of CONCURRENCIES) {
    const results = await flood('/health/live', 'GET', undefined, c, DURATION_MS);
    const latencies = results.map((r) => r.ms);
    const s = stats(latencies);
    console.log(
      `\n--- GET /health/live @ ${c} concurrent ---\n` +
        `  requests : ${s.count}\n` +
        `  errors   : ${s.errors}\n` +
        `  p50      : ${s.p50.toFixed(2)} ms\n` +
        `  p90      : ${s.p90.toFixed(2)} ms\n` +
        `  p99      : ${s.p99.toFixed(2)} ms\n` +
        `  max      : ${s.max.toFixed(2)} ms`,
    );
  }

  // 3. Auth endpoint brute-force simulation (10 rapid bad logins)
  console.log('\n--- POST /auth/sign-in/mobile (10 rapid bad logins) ---');
  const badLogins = Array.from({ length: 10 }, (_, i) =>
    request('/api/v1/auth/sign-in/mobile', 'POST', {
      phone: `+23480999999${i.toString().padStart(2, '0')}`,
      pin: '000000',
      deviceId: `load-test-${i}`,
    }),
  );
  const loginResults = await Promise.all(badLogins);
  const loginLats = loginResults.map((r) => r.ms);
  console.log(
    `  all 401  : ${loginResults.every((r) => r.status === 401)}\n` +
      `  p90 lat  : ${stats(loginLats).p90.toFixed(2)} ms`,
  );

  console.log('\n=== Load test complete ===');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
