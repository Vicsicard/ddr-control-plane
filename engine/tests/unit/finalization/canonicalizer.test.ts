/**
 * Meta DDR Canonicalizer Tests
 * Phase 5: Deterministic serialization and hashing tests
 */

import { canonicalize, computeHash, isCanonicalizable } from '../../../src/finalization/canonicalizer';

describe('canonicalizer', () => {
  test('canonicalize sorts keys deterministically', () => {
    const a = { b: 1, a: 2, nested: { z: 1, y: 2 } };
    const b = { nested: { y: 2, z: 1 }, a: 2, b: 1 };

    const ca = canonicalize(a as Record<string, unknown>);
    const cb = canonicalize(b as Record<string, unknown>);

    expect(ca).toBe(cb);
  });

  test('canonicalize produces stable output for same object', () => {
    const obj = { c: 3, a: 1, b: 2 };
    const c1 = canonicalize(obj as Record<string, unknown>);
    const c2 = canonicalize(obj as Record<string, unknown>);
    expect(c1).toBe(c2);
  });

  test('canonicalize handles nested objects', () => {
    const obj = {
      level1: {
        level2: {
          z: 'last',
          a: 'first',
        },
      },
    };
    const c = canonicalize(obj as Record<string, unknown>);
    // "a" should appear before "z" in the output
    expect(c.indexOf('"a"')).toBeLessThan(c.indexOf('"z"'));
  });

  test('canonicalize handles arrays (preserves order)', () => {
    const obj = { arr: [3, 1, 2] };
    const c = canonicalize(obj as Record<string, unknown>);
    expect(c).toContain('[3,1,2]');
  });

  test('canonicalize adds trailing newline', () => {
    const obj = { a: 1 };
    const c = canonicalize(obj as Record<string, unknown>);
    expect(c.endsWith('\n')).toBe(true);
  });

  test('computeHash is stable for same canonical string', () => {
    const obj = { a: 1, b: 2 };
    const c = canonicalize(obj as Record<string, unknown>);
    const h1 = computeHash(c);
    const h2 = computeHash(c);
    expect(h1).toBe(h2);
  });

  test('computeHash returns sha256 prefixed string', () => {
    const obj = { a: 1 };
    const c = canonicalize(obj as Record<string, unknown>);
    const h = computeHash(c);
    expect(h.startsWith('sha256:')).toBe(true);
    expect(h.length).toBe(7 + 64); // "sha256:" + 64 hex chars
  });

  test('computeHash produces different hashes for different inputs', () => {
    const c1 = canonicalize({ a: 1 } as Record<string, unknown>);
    const c2 = canonicalize({ a: 2 } as Record<string, unknown>);
    const h1 = computeHash(c1);
    const h2 = computeHash(c2);
    expect(h1).not.toBe(h2);
  });

  test('isCanonicalizable returns true for valid objects', () => {
    expect(isCanonicalizable({ a: 1, b: 'test' })).toBe(true);
  });

  test('isCanonicalizable returns true for nested objects', () => {
    expect(isCanonicalizable({ nested: { deep: { value: 123 } } })).toBe(true);
  });
});
