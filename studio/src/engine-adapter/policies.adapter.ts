/**
 * Policies Stage Adapter
 * 
 * Translates Studio PoliciesData → Engine PoliciesArtifacts
 * 
 * TRANSITIONAL: This file should shrink over time as Studio
 * adopts engine types directly.
 */

import type { PoliciesData, PolicyEntry } from '../types';

/**
 * Engine PoliciesArtifacts shape (from engine/src/types/artifacts.ts)
 */
export interface EnginePolicyDefinition {
  policy_id: string;
  statement: string;
  timing: 'pre_rule' | 'post_rule' | 'both';
  precedence: number;
}

export interface EnginePoliciesArtifacts {
  policies: EnginePolicyDefinition[];
}

export type AdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: AdapterError[] };

export interface AdapterError {
  field: string;
  message: string;
}

/**
 * Adapt Studio PolicyEntry to Engine PolicyDefinition.
 * 
 * Field Mapping:
 * - policy_id → policy_id (same)
 * - statement → statement (same)
 * - (missing) → timing (Studio does not collect this)
 * - (missing) → precedence (Studio does not collect this)
 * 
 * Studio has extra fields not in engine:
 * - constraint_type
 * - condition
 * - violation_outcome
 * - reason_code
 */
function adaptPolicyEntry(
  entry: PolicyEntry,
  index: number
): { data: EnginePolicyDefinition | null; errors: AdapterError[] } {
  const errors: AdapterError[] = [];

  if (!entry.policy_id || entry.policy_id.trim() === '') {
    errors.push({
      field: `policies[${index}].policy_id`,
      message: 'Policy ID is required',
    });
  }

  if (!entry.statement || entry.statement.trim() === '') {
    errors.push({
      field: `policies[${index}].statement`,
      message: 'Policy statement is required',
    });
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  // MISSING FIELDS: timing, precedence
  // Studio does not collect these. Using defaults.
  // This applies Option E pressure.
  const timing: 'pre_rule' | 'post_rule' | 'both' = 'pre_rule'; // Default
  const precedence = index; // Use array order as precedence

  return {
    data: {
      policy_id: entry.policy_id,
      statement: entry.statement,
      timing,
      precedence,
    },
    errors: [],
  };
}

/**
 * Adapt Studio PoliciesData to Engine PoliciesArtifacts.
 */
export function adaptPoliciesToEngine(
  studioData: PoliciesData
): AdapterResult<EnginePoliciesArtifacts> {
  const allErrors: AdapterError[] = [];
  const enginePolicies: EnginePolicyDefinition[] = [];

  // Policies can be empty (not all decisions have policies)
  if (studioData.policies && studioData.policies.length > 0) {
    for (let i = 0; i < studioData.policies.length; i++) {
      const result = adaptPolicyEntry(studioData.policies[i], i);
      if (result.data) {
        enginePolicies.push(result.data);
      }
      allErrors.push(...result.errors);
    }
  }

  if (!studioData.scope_confirmed) {
    allErrors.push({
      field: 'scope_confirmed',
      message: 'Policy scope must be confirmed',
    });
  }

  if (allErrors.length > 0) {
    return { ok: false, errors: allErrors };
  }

  return {
    ok: true,
    data: {
      policies: enginePolicies,
    },
  };
}
