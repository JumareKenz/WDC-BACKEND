import { describe, it, expect } from 'vitest';
import { __test__ } from '../../src/modules/users/users.service';

const { encodeCursor, decodeCursor } = __test__;

describe('users cursor encoding', () => {
  it('round-trips a cursor', () => {
    const created = new Date('2026-04-28T10:00:00.000Z');
    const id = '0190f4e7-83a8-7a1c-9b23-7c4e2d1a9f88';
    const c = encodeCursor({ createdAt: created, id });
    const d = decodeCursor(c);
    expect(d?.id).toBe(id);
    expect(d?.createdAt.toISOString()).toBe('2026-04-28T10:00:00.000Z');
  });

  it('returns null on garbage input', () => {
    expect(decodeCursor('!!!')).toBeNull();
    expect(decodeCursor(Buffer.from('only-half').toString('base64url'))).toBeNull();
    expect(decodeCursor(Buffer.from('not-a-date|abc').toString('base64url'))).toBeNull();
  });
});
