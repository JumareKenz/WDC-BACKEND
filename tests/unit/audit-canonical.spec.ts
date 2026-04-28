import { describe, it, expect } from 'vitest';
import { __test__ } from '../../src/modules/audit/audit.service';

const { canonicalJson, sha256Hex } = __test__;

describe('canonicalJson', () => {
  it('sorts object keys recursively', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalJson({ b: { y: 1, x: 2 } })).toBe('{"b":{"x":2,"y":1}}');
  });

  it('preserves array order', () => {
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]');
  });

  it('handles nulls and primitives', () => {
    expect(canonicalJson(null)).toBe('null');
    expect(canonicalJson(42)).toBe('42');
    expect(canonicalJson('hi')).toBe('"hi"');
  });

  it('produces identical output for two semantically equal objects', () => {
    expect(canonicalJson({ a: 1, b: { x: [1, 2], y: null } })).toBe(
      canonicalJson({ b: { y: null, x: [1, 2] }, a: 1 }),
    );
  });
});

describe('sha256Hex', () => {
  it('matches the known sha256 of an empty string', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});
