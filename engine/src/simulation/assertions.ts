/**
 * Meta DDR Simulation Assertions
 * Phase 4: MVP assertion helpers for simulation results
 */

import { SimulationCaseResult } from '../types/simulation';
import { Finding } from '../types/findings';
import { INVARIANTS } from '../invariants';

/**
 * Check if at least one asserted valid (non-refusal) case passed.
 */
export function hasAssertedValidCase(results: SimulationCaseResult[]): boolean {
  return results.some(r => r.assertion_passed === true && r.trace.refusal === false);
}

/**
 * Check if at least one asserted refusal case passed.
 */
export function hasAssertedRefusalCase(results: SimulationCaseResult[]): boolean {
  return results.some(r => r.assertion_passed === true && r.trace.refusal === true);
}

/**
 * Check if all asserted cases (non-exploratory) passed.
 */
export function allAssertedCasesPassed(results: SimulationCaseResult[]): boolean {
  return results
    .filter(r => r.assertion_passed !== null)
    .every(r => r.assertion_passed === true);
}

/**
 * Detect non-reproducible evaluation:
 * same normalized input set -> different output
 */
export function detectNonReproducibleOutputs(
  results: SimulationCaseResult[],
  normalizedInputsByCaseId: Record<string, string>
): Finding[] {
  const findings: Finding[] = [];
  const seen = new Map<string, string>(); // normalizedInputs -> output

  for (const r of results) {
    const key = normalizedInputsByCaseId[r.case_id];
    if (!key) continue;

    const prior = seen.get(key);
    if (!prior) {
      seen.set(key, r.output);
      continue;
    }
    if (prior !== r.output) {
      findings.push({
        code: 'META_SIMULATION_VIOLATION_non_reproducible_trace',
        severity: 'BLOCK',
        invariant: INVARIANTS.REPRODUCIBILITY_REQUIRED,
        field_path: `cases[case_id=${r.case_id}]`,
        message: 'Same inputs must yield the same output.',
        next_action: 'REMOVE_NONDETERMINISM',
        action_target: r.case_id,
      });
      // exhaustive: do not early-exit
    }
  }

  return findings;
}
