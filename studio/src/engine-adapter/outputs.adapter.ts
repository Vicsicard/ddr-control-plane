/**
 * Outputs Stage Adapter
 * 
 * Translates Studio OutputsData → Engine OutputsArtifacts
 * 
 * TRANSITIONAL: This file should shrink over time as Studio
 * adopts engine types directly.
 */

import type { OutputsData } from '../types';

/**
 * Engine OutputsArtifacts shape (from engine/src/types/artifacts.ts)
 */
export interface EngineOutputsArtifacts {
  output_schema: Record<string, unknown>;
  allowed_outputs: string[];
  terminal_states: string[];
  refusal_output: string;
  output_authority_level: string;
}

export type AdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: AdapterError[] };

export interface AdapterError {
  field: string;
  message: string;
}

/**
 * Adapt Studio OutputsData to Engine OutputsArtifacts.
 * 
 * Field Mapping:
 * - outputs[].code → allowed_outputs (extract codes)
 * - outputs[].category → terminal_states (extract REFUSAL category codes)
 * - refusal_requirement → (determines if refusal_output is required)
 * 
 * Missing in Studio (must derive or fail):
 * - output_schema: Studio does not define JSON schema
 * - refusal_output: Must derive from outputs with category REFUSAL
 * - output_authority_level: Studio does not collect this
 */
export function adaptOutputsToEngine(
  studioData: OutputsData
): AdapterResult<EngineOutputsArtifacts> {
  const errors: AdapterError[] = [];

  if (!studioData.outputs || studioData.outputs.length === 0) {
    errors.push({
      field: 'outputs',
      message: 'At least one output must be defined',
    });
  }

  if (!studioData.completeness_confirmed) {
    errors.push({
      field: 'completeness_confirmed',
      message: 'Output completeness must be confirmed',
    });
  }

  // Extract allowed outputs (all output codes)
  const allowedOutputs = studioData.outputs.map((o) => o.code).filter((c) => c && c.trim() !== '');

  // Extract terminal states (outputs that end the decision)
  // In Studio, REFUSAL and APPROVAL are terminal
  const terminalStates = studioData.outputs
    .filter((o) => o.category === 'REFUSAL' || o.category === 'APPROVAL')
    .map((o) => o.code)
    .filter((c) => c && c.trim() !== '');

  // Find refusal output
  const refusalOutputs = studioData.outputs.filter((o) => o.category === 'REFUSAL');
  if (studioData.refusal_requirement === 'REQUIRED' && refusalOutputs.length === 0) {
    errors.push({
      field: 'outputs',
      message: 'At least one REFUSAL output is required when refusal_requirement is REQUIRED',
    });
  }
  const refusalOutput = refusalOutputs.length > 0 ? refusalOutputs[0].code : '';

  // Validate each output has required fields
  studioData.outputs.forEach((output, index) => {
    if (!output.code || output.code.trim() === '') {
      errors.push({
        field: `outputs[${index}].code`,
        message: 'Output code is required',
      });
    }
    if (!output.category) {
      errors.push({
        field: `outputs[${index}].category`,
        message: 'Output category is required',
      });
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // MISSING FIELD: output_schema
  // Studio does not define JSON schema for outputs. Using empty object.
  // This applies Option E pressure.
  const outputSchema: Record<string, unknown> = {};

  // MISSING FIELD: output_authority_level
  // Studio does not collect this. Using placeholder.
  // This applies Option E pressure.
  const outputAuthorityLevel = 'UNKNOWN';

  return {
    ok: true,
    data: {
      output_schema: outputSchema,
      allowed_outputs: allowedOutputs,
      terminal_states: terminalStates,
      refusal_output: refusalOutput,
      output_authority_level: outputAuthorityLevel,
    },
  };
}
