import { describe, it, expect, beforeEach } from 'vitest';
import { authenticator } from 'otplib';
import { TotpService } from '../../src/modules/auth/totp.service';

function makeConfig(): { get: () => { totpIssuer: string } } {
  return { get: () => ({ totpIssuer: 'Test Issuer' }) };
}

describe('TotpService', () => {
  let svc: TotpService;
  beforeEach(() => {
    svc = new TotpService(makeConfig() as never);
  });

  it('generates a valid base32 secret', () => {
    const s = svc.generateSecret();
    expect(s).toMatch(/^[A-Z2-7]+$/);
  });

  it('verifies a freshly generated token', () => {
    const s = svc.generateSecret();
    const t = authenticator.generate(s);
    expect(svc.verify(s, t)).toBe(true);
  });

  it('rejects a malformed token (non-6-digit)', () => {
    const s = svc.generateSecret();
    expect(svc.verify(s, 'abcdef')).toBe(false);
    expect(svc.verify(s, '12345')).toBe(false);
    expect(svc.verify(s, '1234567')).toBe(false);
  });

  it('rejects a wrong token', () => {
    const s = svc.generateSecret();
    expect(svc.verify(s, '000000')).toBe(false);
  });

  it('produces an otpauth enrolment URI', () => {
    const uri = svc.enrolmentUri('user@example.com', 'JBSWY3DPEHPK3PXP');
    expect(uri).toMatch(/^otpauth:\/\/totp\/Test%20Issuer:user(@|%40)example\.com\?secret=JBSWY3DPEHPK3PXP/);
  });
});
