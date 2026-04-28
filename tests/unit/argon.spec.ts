import { describe, it, expect, beforeEach } from 'vitest';
import { ArgonService } from '../../src/modules/auth/argon.service';

function makeConfig(pepper: string): { get: () => { argon2Pepper: string } } {
  return { get: () => ({ argon2Pepper: pepper }) };
}

describe('ArgonService', () => {
  let svc: ArgonService;
  beforeEach(() => {
    svc = new ArgonService(makeConfig('a'.repeat(32)) as never);
  });

  it('hashes and verifies a PIN', async () => {
    const h = await svc.hash('123456');
    expect(h).toMatch(/^\$argon2id\$/);
    expect(await svc.verify(h, '123456')).toBe(true);
    expect(await svc.verify(h, '654321')).toBe(false);
  });

  it('returns false for a malformed encoded hash rather than throwing', async () => {
    expect(await svc.verify('not-a-hash', '123456')).toBe(false);
  });

  it('produces different hashes for the same PIN due to per-call salt', async () => {
    const a = await svc.hash('hunter2hunter2');
    const b = await svc.hash('hunter2hunter2');
    expect(a).not.toBe(b);
    expect(await svc.verify(a, 'hunter2hunter2')).toBe(true);
    expect(await svc.verify(b, 'hunter2hunter2')).toBe(true);
  });

  it('different peppers yield non-cross-verifying hashes', async () => {
    const svcA = new ArgonService(makeConfig('a'.repeat(32)) as never);
    const svcB = new ArgonService(makeConfig('b'.repeat(32)) as never);
    const h = await svcA.hash('shared-pin');
    expect(await svcA.verify(h, 'shared-pin')).toBe(true);
    expect(await svcB.verify(h, 'shared-pin')).toBe(false);
  }, 10_000);
}, 30_000);
