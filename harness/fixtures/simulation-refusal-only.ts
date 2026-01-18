/**
 * Frozen simulation cases for refusal-only scenario.
 * All cases expect REFUSE output.
 */

import { SimulationCase } from '../../engine/src/types/simulation';

export const refusalOnlyCases: SimulationCase[] = [
  {
    case_id: 'refusal_case_1',
    inputs: {
      user_age: 25,
    },
    expected_output: 'REFUSE',
  },
  {
    case_id: 'refusal_case_2',
    inputs: {
      user_age: 99,
    },
    expected_output: 'REFUSE',
  },
];
