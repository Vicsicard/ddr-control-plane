/**
 * Meta DDR Canonicalization
 * Phase 5: Deterministic serialization and hashing
 */

import stableStringify from 'json-stable-stringify';
import { createHash } from 'crypto';

/**
 * Canonicalize an object to a deterministic JSON string.
 *
 * Rules (MVP):
 * - Stable key ordering (recursive) via json-stable-stringify
 * - UTF-8 string
 * - No BOM
 * - No trailing whitespace
 * - Single newline at EOF for consistent file bytes
 */
export function canonicalize(obj: Record<string, unknown>): string {
  const s = stableStringify(obj, { space: 0 }) ?? '';
  // Ensure a single trailing newline for consistent file bytes
  return s.endsWith('\n') ? s : s + '\n';
}

/**
 * Compute sha256 over canonical JSON bytes (UTF-8).
 * Returns a stable, prefixed hash string.
 */
export function computeHash(canonicalJson: string): string {
  const hash = createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
  return `sha256:${hash}`;
}

/**
 * Helper: verify canonicalization is stable (non-empty, parseable).
 * This is an optional guard; the engine should treat failures as FINALIZATION errors.
 */
export function isCanonicalizable(obj: Record<string, unknown>): boolean {
  try {
    const s = canonicalize(obj);
    if (!s || s.trim().length === 0) return false;
    JSON.parse(s); // parse must succeed (newline is ok)
    return true;
  } catch {
    return false;
  }
}
