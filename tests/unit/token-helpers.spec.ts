import { describe, it, expect } from 'vitest';
import { __test__ } from '../../src/modules/auth/token.service';

const { hashRefresh, parseDurationMs } = __test__;

describe('hashRefresh', () => {
  it('is deterministic and returns 64 hex chars', () => {
    const a = hashRefresh('alpha');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(hashRefresh('alpha'));
    expect(a).not.toBe(hashRefresh('beta'));
  });
});

describe('parseDurationMs', () => {
  it.each([
    ['15m', 15 * 60_000],
    ['7d', 7 * 86_400_000],
    ['30s', 30_000],
    ['2h', 2 * 3_600_000],
  ])('parses %s', (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected);
  });

  it('throws on garbage input', () => {
    expect(() => parseDurationMs('seven days')).toThrow(/invalid duration/);
    expect(() => parseDurationMs('15')).toThrow(/invalid duration/);
  });
});
