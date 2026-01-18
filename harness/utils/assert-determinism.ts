/**
 * Determinism assertion utilities.
 */

export function assertEqual(actual: string, expected: string, label: string): void {
  if (actual !== expected) {
    console.error(`\n❌ Determinism failure: ${label}`);
    console.error(`   Expected: ${expected.slice(0, 100)}${expected.length > 100 ? '...' : ''}`);
    console.error(`   Actual:   ${actual.slice(0, 100)}${actual.length > 100 ? '...' : ''}`);
    throw new Error(`Determinism failure: ${label}`);
  }
  console.log(`✓ ${label}`);
}

export function assertHashMatch(actual: string, expected: string): void {
  assertEqual(actual, expected, `Hash match`);
}

export function assertJsonMatch(actual: unknown, expected: unknown, label: string): void {
  const actualStr = JSON.stringify(actual, null, 2);
  const expectedStr = JSON.stringify(expected, null, 2);
  assertEqual(actualStr, expectedStr, label);
}
