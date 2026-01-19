/**
 * Inputs Stage Adapter
 * 
 * Translates Studio InputsData → Engine InputsArtifacts
 * 
 * TRANSITIONAL: This file should shrink over time as Studio
 * adopts engine types directly.
 */

import type { InputsData, InputEntry } from '../types';

/**
 * Engine InputsArtifacts shape (from engine/src/types/artifacts.ts)
 */
export interface EngineInputDefinition {
  input_name: string;
  input_type: string;
  input_source: string;
  trust_level: string;
  required: boolean;
  missing_input_behavior: string;
}

export interface EngineInputsArtifacts {
  inputs: EngineInputDefinition[];
  no_undeclared_inputs_confirmed: boolean;
}

export type AdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: AdapterError[] };

export interface AdapterError {
  field: string;
  message: string;
}

/**
 * Adapt Studio InputEntry to Engine InputDefinition.
 * 
 * Field Mapping:
 * - name → input_name
 * - type → input_type (Studio uses enum, engine uses string)
 * - (missing) → input_source (Studio does not collect this)
 * - (missing) → trust_level (Studio does not collect this)
 * - required → required (same)
 * - missing_behavior → missing_input_behavior
 */
function adaptInputEntry(
  entry: InputEntry,
  index: number
): { data: EngineInputDefinition | null; errors: AdapterError[] } {
  const errors: AdapterError[] = [];

  if (!entry.name || entry.name.trim() === '') {
    errors.push({
      field: `inputs[${index}].name`,
      message: 'Input name is required',
    });
  }

  if (!entry.type) {
    errors.push({
      field: `inputs[${index}].type`,
      message: 'Input type is required',
    });
  }

  if (!entry.missing_behavior) {
    errors.push({
      field: `inputs[${index}].missing_behavior`,
      message: 'Missing behavior is required',
    });
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  // MISSING FIELDS: input_source, trust_level
  // Studio does not collect these. Using placeholders that will fail engine validation.
  // This applies Option E pressure.
  const inputSource = 'UNKNOWN'; // Placeholder - Studio must be updated
  const trustLevel = 'UNKNOWN'; // Placeholder - Studio must be updated

  return {
    data: {
      input_name: entry.name,
      input_type: entry.type!, // Validated above
      input_source: inputSource,
      trust_level: trustLevel,
      required: entry.required,
      missing_input_behavior: entry.missing_behavior!, // Validated above
    },
    errors: [],
  };
}

/**
 * Adapt Studio InputsData to Engine InputsArtifacts.
 */
export function adaptInputsToEngine(
  studioData: InputsData
): AdapterResult<EngineInputsArtifacts> {
  const allErrors: AdapterError[] = [];
  const engineInputs: EngineInputDefinition[] = [];

  if (!studioData.inputs || studioData.inputs.length === 0) {
    allErrors.push({
      field: 'inputs',
      message: 'At least one input must be defined',
    });
  } else {
    for (let i = 0; i < studioData.inputs.length; i++) {
      const result = adaptInputEntry(studioData.inputs[i], i);
      if (result.data) {
        engineInputs.push(result.data);
      }
      allErrors.push(...result.errors);
    }
  }

  if (!studioData.completeness_confirmed) {
    allErrors.push({
      field: 'completeness_confirmed',
      message: 'Input completeness must be confirmed',
    });
  }

  if (allErrors.length > 0) {
    return { ok: false, errors: allErrors };
  }

  return {
    ok: true,
    data: {
      inputs: engineInputs,
      no_undeclared_inputs_confirmed: studioData.completeness_confirmed,
    },
  };
}
