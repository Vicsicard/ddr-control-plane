/**
 * Meta DDR Reference Harness
 * Single entry point for all scenarios.
 * 
 * Usage:
 *   npx ts-node harness/run.ts happy-path
 *   npx ts-node harness/run.ts refusal-path
 *   npx ts-node harness/run.ts blocked-path
 */

import { runHappyPath } from './scenarios/happy-path';
import { runRefusalPath } from './scenarios/refusal-path';
import { runBlockedPath } from './scenarios/blocked-path';
import { runRefusalOnlyPath } from './scenarios/refusal-only-path';

const scenario = process.argv[2];

if (!scenario) {
  console.log('Meta DDR Reference Harness');
  console.log('');
  console.log('Usage: npx ts-node harness/run.ts <scenario>');
  console.log('');
  console.log('Available scenarios:');
  console.log('  happy-path       - Complete successful flow with contract generation');
  console.log('  refusal-path     - Governance enforcement (missing refusal case)');
  console.log('  blocked-path     - Stage gating (invalid submission → correction)');
  console.log('  refusal-only     - Negative determinism (system that only refuses)');
  console.log('');
  process.exit(1);
}

switch (scenario) {
  case 'happy-path':
    runHappyPath();
    break;
  case 'refusal-path':
    runRefusalPath();
    break;
  case 'blocked-path':
    runBlockedPath();
    break;
  case 'refusal-only':
    runRefusalOnlyPath();
    break;
  default:
    console.error(`Unknown scenario: ${scenario}`);
    console.error('');
    console.error('Available scenarios: happy-path, refusal-path, blocked-path, refusal-only');
    process.exit(1);
}
