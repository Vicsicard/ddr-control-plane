/**
 * Framing Stage Adapter
 * 
 * Translates Studio FramingData → Engine FramingArtifacts
 * 
 * TRANSITIONAL: This file should shrink over time as Studio
 * adopts engine types directly.
 */

import type { FramingData } from '../types';

/**
 * Engine FramingArtifacts shape (from engine/src/types/artifacts.ts)
 * Duplicated here to avoid import path issues during transition.
 * TODO: Import directly from engine when build is configured.
 */
export interface EngineFramingArtifacts {
  decision_id: string;
  decision_purpose: string;
  execution_trigger: string;
  explicit_authority: string[];
  explicit_non_authority: string[];
  refusal_conditions: string[];
  contract_version: string;
}

export type AdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: AdapterError[] };

export interface AdapterError {
  field: string;
  message: string;
}

/**
 * Adapt Studio FramingData to Engine FramingArtifacts.
 * 
 * Field Mapping:
 * - decision_name → decision_id (Studio uses "name", engine uses "id")
 * - decision_purpose → decision_purpose (same)
 * - authority_type → (not mapped - engine uses explicit_authority array)
 * - permitted_actions → explicit_authority
 * - prohibited_actions → explicit_non_authority
 * - escalation_requirement → (not mapped - engine handles differently)
 * - contract_version → contract_version (same)
 * 
 * Missing in Studio (must fail loudly):
 * - execution_trigger: Studio does not collect this
 * - refusal_conditions: Studio handles in outputs stage
 */
export function adaptFramingToEngine(
  studioData: FramingData
): AdapterResult<EngineFramingArtifacts> {
  const errors: AdapterError[] = [];

  // Required field: decision_id (from decision_name)
  if (!studioData.decision_name || studioData.decision_name.trim() === '') {
    errors.push({
      field: 'decision_name',
      message: 'decision_name is required to map to engine decision_id',
    });
  }

  // Required field: decision_purpose
  if (!studioData.decision_purpose || studioData.decision_purpose.trim() === '') {
    errors.push({
      field: 'decision_purpose',
      message: 'decision_purpose is required',
    });
  }

  // Required field: contract_version
  if (!studioData.contract_version || studioData.contract_version.trim() === '') {
    errors.push({
      field: 'contract_version',
      message: 'contract_version is required',
    });
  }

  // Required field: explicit_authority (from permitted_actions)
  if (!studioData.permitted_actions || studioData.permitted_actions.length === 0) {
    errors.push({
      field: 'permitted_actions',
      message: 'permitted_actions is required to map to engine explicit_authority',
    });
  }

  // Required field: explicit_non_authority (from prohibited_actions)
  if (!studioData.prohibited_actions || studioData.prohibited_actions.length === 0) {
    errors.push({
      field: 'prohibited_actions',
      message: 'prohibited_actions is required to map to engine explicit_non_authority',
    });
  }

  // MISSING FIELD: execution_trigger
  // Studio does not collect this field. This is an intentional gap.
  // For now, we use a placeholder that will cause engine validation to fail.
  // This applies Option E pressure: Studio must be updated to collect this.
  const executionTrigger = ''; // Empty - will fail engine validation

  // MISSING FIELD: refusal_conditions
  // Studio collects refusal in the Outputs stage, not Framing.
  // For now, we use an empty array that will cause engine validation to fail.
  // This applies Option E pressure: Studio must be updated to collect this in Framing.
  const refusalConditions: string[] = []; // Empty - will fail engine validation

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Generate decision_id from decision_name
  // Engine expects: alphanumeric, dots, underscores, hyphens only
  const decisionId = studioData.decision_name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');

  return {
    ok: true,
    data: {
      decision_id: decisionId,
      decision_purpose: studioData.decision_purpose,
      execution_trigger: executionTrigger,
      explicit_authority: studioData.permitted_actions,
      explicit_non_authority: studioData.prohibited_actions,
      refusal_conditions: refusalConditions,
      contract_version: studioData.contract_version,
    },
  };
}
