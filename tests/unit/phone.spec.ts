import { describe, it, expect } from 'vitest';
import { normalisePhone, phoneHash, emailHash } from '../../src/common/crypto/phone';

describe('normalisePhone', () => {
  it('passes through valid E.164 unchanged', () => {
    expect(normalisePhone('+2348012345678')).toBe('+2348012345678');
    expect(normalisePhone('+12025550123')).toBe('+12025550123');
  });

  it('strips spaces, hyphens, parentheses', () => {
    expect(normalisePhone('+234 (801) 234-5678')).toBe('+2348012345678');
  });

  it('upgrades Nigerian national format to E.164', () => {
    expect(normalisePhone('08012345678')).toBe('+2348012345678');
  });

  it('rejects malformed numbers', () => {
    expect(() => normalisePhone('not-a-number')).toThrow(/E\.164/);
    expect(() => normalisePhone('+0123')).toThrow(/E\.164/);
    expect(() => normalisePhone('1234567890')).toThrow(/E\.164/);
  });
});

describe('phoneHash / emailHash', () => {
  it('phoneHash is deterministic and 32 bytes', () => {
    const a = phoneHash('+2348012345678');
    expect(a).toBeInstanceOf(Buffer);
    expect(a.length).toBe(32);
    expect(a.equals(phoneHash('+2348012345678'))).toBe(true);
  });

  it('emailHash normalises case and trims', () => {
    expect(emailHash(' Foo@Example.org ').equals(emailHash('foo@example.org'))).toBe(true);
  });
});
