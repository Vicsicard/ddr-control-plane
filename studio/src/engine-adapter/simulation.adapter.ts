/**
 * Simulation Stage Adapter
 * 
 * Translates Studio SimulationData → Engine SimulationCase[]
 * 
 * TRANSITIONAL: This file should shrink over time as Studio
 * adopts engine types directly.
 */

import type { SimulationData, SimulationCase as StudioSimulationCase } from '../types';

/**
 * Engine SimulationCase shape (from engine/src/types/simulation.ts)
 */
export interface EngineSimulationCase {
  case_id: string;
  inputs: Record<string, unknown>;
  expected_output: string | null;
}

export type AdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: AdapterError[] };

export interface AdapterError {
  field: string;
  message: string;
}

/**
 * Adapt Studio SimulationCase to Engine SimulationCase.
 * 
 * Field Mapping:
 * - case_id → case_id (same)
 * - inputs[] → inputs (convert array to Record)
 * - expected_output → expected_output (same)
 * 
 * Studio has extra fields not in engine:
 * - id (internal UI id)
 * - expected_reason_code
 * - actual_output
 * - actual_reason_code
 * - case_type
 * - assertion_passed
 * - trace
 */
function adaptSimulationCase(
  studioCase: StudioSimulationCase,
  index: number
): { data: EngineSimulationCase | null; errors: AdapterError[] } {
  const errors: AdapterError[] = [];

  if (!studioCase.case_id || studioCase.case_id.trim() === '') {
    errors.push({
      field: `cases[${index}].case_id`,
      message: 'Case ID is required',
    });
  }

  if (!studioCase.inputs || studioCase.inputs.length === 0) {
    errors.push({
      field: `cases[${index}].inputs`,
      message: 'At least one input must be provided for simulation case',
    });
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  // Convert inputs array to Record
  const inputsRecord: Record<string, unknown> = {};
  for (const input of studioCase.inputs) {
    if (input.input_name && input.input_name.trim() !== '') {
      inputsRecord[input.input_name] = input.value;
    }
  }

  return {
    data: {
      case_id: studioCase.case_id,
      inputs: inputsRecord,
      expected_output: studioCase.expected_output || null,
    },
    errors: [],
  };
}

/**
 * Adapt Studio SimulationData to Engine SimulationCase[].
 */
export function adaptSimulationToEngine(
  studioData: SimulationData
): AdapterResult<EngineSimulationCase[]> {
  const allErrors: AdapterError[] = [];
  const engineCases: EngineSimulationCase[] = [];

  if (!studioData.cases || studioData.cases.length === 0) {
    allErrors.push({
      field: 'cases',
      message: 'At least one simulation case must be defined',
    });
  } else {
    for (let i = 0; i < studioData.cases.length; i++) {
      const result = adaptSimulationCase(studioData.cases[i], i);
      if (result.data) {
        engineCases.push(result.data);
      }
      allErrors.push(...result.errors);
    }
  }

  if (allErrors.length > 0) {
    return { ok: false, errors: allErrors };
  }

  return {
    ok: true,
    data: engineCases,
  };
}
