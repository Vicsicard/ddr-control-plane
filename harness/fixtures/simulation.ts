/**
 * Frozen simulation cases for harness scenarios.
 * No functions. No randomness. No computed values.
 */

import { SimulationCase } from '../../engine/src/types/simulation';

/**
 * Happy path simulation cases:
 * - At least one asserted valid case (adult allowed)
 * - At least one asserted refusal case (minor refused)
 */
export const happyPathCases: SimulationCase[] = [
  {
    case_id: 'adult_21_allowed',
    inputs: { user_age: 21 },
    expected_output: 'ALLOW',
  },
  {
    case_id: 'adult_18_allowed',
    inputs: { user_age: 18 },
    expected_output: 'ALLOW',
  },
  {
    case_id: 'minor_17_refused',
    inputs: { user_age: 17 },
    expected_output: 'REFUSE',
  },
  {
    case_id: 'minor_10_refused',
    inputs: { user_age: 10 },
    expected_output: 'REFUSE',
  },
];

/**
 * Refusal path simulation cases:
 * Missing the required refusal case initially.
 */
export const refusalPathCases_incomplete: SimulationCase[] = [
  {
    case_id: 'adult_21_allowed',
    inputs: { user_age: 21 },
    expected_output: 'ALLOW',
  },
  {
    case_id: 'adult_25_allowed',
    inputs: { user_age: 25 },
    expected_output: 'ALLOW',
  },
  // Missing refusal case - will trigger META_SIMULATION_MISSING_refusal_case
];

/**
 * Refusal path simulation cases (corrected):
 * After adding the required refusal case.
 */
export const refusalPathCases_corrected: SimulationCase[] = [
  {
    case_id: 'adult_21_allowed',
    inputs: { user_age: 21 },
    expected_output: 'ALLOW',
  },
  {
    case_id: 'minor_16_refused',
    inputs: { user_age: 16 },
    expected_output: 'REFUSE',
  },
];
