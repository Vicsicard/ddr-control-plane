/**
 * Pretty printing utilities for harness output.
 */

export function printHeader(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

export function printStep(step: string): void {
  console.log(`\n→ ${step}`);
}

export function printSuccess(message: string): void {
  console.log(`✓ ${message}`);
}

export function printError(message: string): void {
  console.error(`✗ ${message}`);
}

export function printFindings(findings: Array<{ code: string; severity: string; message: string }>): void {
  if (findings.length === 0) {
    console.log('  (no findings)');
    return;
  }
  for (const f of findings) {
    console.log(`  [${f.severity}] ${f.code}: ${f.message}`);
  }
}

export function printJson(label: string, obj: unknown): void {
  console.log(`\n${label}:`);
  console.log(JSON.stringify(obj, null, 2));
}
