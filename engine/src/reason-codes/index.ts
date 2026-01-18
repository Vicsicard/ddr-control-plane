/**
 * Meta DDR Reason Codes
 * Frozen for MVP - v1.0
 * 
 * IMPORTANT: Reason codes are identifiers, not strings to interpolate.
 * Never construct reason codes dynamically.
 */

import { Finding } from '../types/findings';
import { INVARIANTS } from '../invariants';

// =============================================================================
// GLOBAL Reason Codes
// =============================================================================

export const GLOBAL_CODES = {
  INVALID_PAYLOAD_SCHEMA: 'META_GLOBAL_INVALID_payload_schema',
  UNSUPPORTED_FEATURE_FLAG: 'META_GLOBAL_UNSUPPORTED_feature_flag',
  VIOLATION_AUTHORITY_LEAK: 'META_GLOBAL_VIOLATION_authority_leak',
  INCONSISTENT_STAGE_STATE: 'META_GLOBAL_INCONSISTENT_stage_state',
  VIOLATION_SESSION_ALREADY_FINALIZED: 'META_GLOBAL_VIOLATION_session_already_finalized',
  VIOLATION_SIMULATION_STAGE_NOT_SUBMITTABLE: 'META_GLOBAL_VIOLATION_simulation_stage_not_submittable',
} as const;

// =============================================================================
// FRAMING Reason Codes
// =============================================================================

export const FRAMING_CODES = {
  MISSING_DECISION_ID: 'META_FRAMING_MISSING_decision_id',
  INVALID_DECISION_ID_FORMAT: 'META_FRAMING_INVALID_decision_id_format',
  MISSING_OPERATIONAL_PURPOSE: 'META_FRAMING_MISSING_operational_purpose',
  INVALID_PURPOSE_NON_OPERATIONAL: 'META_FRAMING_INVALID_purpose_non_operational',
  MISSING_EXECUTION_TRIGGER: 'META_FRAMING_MISSING_execution_trigger',
  MISSING_EXPLICIT_AUTHORITY: 'META_FRAMING_MISSING_explicit_authority',
  MISSING_EXPLICIT_NON_AUTHORITY: 'META_FRAMING_MISSING_explicit_non_authority',
  MISSING_REFUSAL_CONDITIONS: 'META_FRAMING_MISSING_refusal_conditions',
  CONFLICT_AUTHORITY_VS_NON_AUTHORITY: 'META_FRAMING_CONFLICT_authority_vs_non_authority',
} as const;

// =============================================================================
// VERSIONING Reason Codes
// =============================================================================

export const VERSIONING_CODES = {
  MISSING_CONTRACT_VERSION: 'META_VERSIONING_MISSING_contract_version',
  INVALID_VERSION_FORMAT: 'META_VERSIONING_INVALID_version_format',
  INVALID_SUPERSEDES_REFERENCE: 'META_VERSIONING_INVALID_supersedes_reference',
  INCONSISTENT_EFFECTIVE_DATE: 'META_VERSIONING_INCONSISTENT_effective_date',
} as const;

// =============================================================================
// INPUTS Reason Codes
// =============================================================================

export const INPUTS_CODES = {
  MISSING_INPUTS: 'META_INPUTS_MISSING_inputs',
  MISSING_INPUT_NAME: 'META_INPUTS_MISSING_input_name',
  INVALID_INPUT_NAME_FORMAT: 'META_INPUTS_INVALID_input_name_format',
  MISSING_INPUT_TYPE: 'META_INPUTS_MISSING_input_type',
  INVALID_INPUT_TYPE: 'META_INPUTS_INVALID_input_type',
  MISSING_INPUT_SOURCE: 'META_INPUTS_MISSING_input_source',
  MISSING_TRUST_LEVEL: 'META_INPUTS_MISSING_trust_level',
  INVALID_TRUST_LEVEL: 'META_INPUTS_INVALID_trust_level',
  MISSING_REQUIRED_FLAG: 'META_INPUTS_MISSING_required_flag',
  MISSING_MISSING_INPUT_BEHAVIOR: 'META_INPUTS_MISSING_missing_input_behavior',
  INVALID_MISSING_INPUT_BEHAVIOR: 'META_INPUTS_INVALID_missing_input_behavior',
  VIOLATION_IMPLICIT_INPUT_DETECTED: 'META_INPUTS_VIOLATION_implicit_input_detected',
  CONFLICT_DUPLICATE_INPUT_NAME: 'META_INPUTS_CONFLICT_duplicate_input_name',
} as const;

// =============================================================================
// OUTPUTS Reason Codes
// =============================================================================

export const OUTPUTS_CODES = {
  MISSING_OUTPUT_SCHEMA: 'META_OUTPUTS_MISSING_output_schema',
  INVALID_OUTPUT_SCHEMA: 'META_OUTPUTS_INVALID_output_schema',
  MISSING_ALLOWED_OUTPUTS: 'META_OUTPUTS_MISSING_allowed_outputs',
  INVALID_ALLOWED_OUTPUTS_EMPTY: 'META_OUTPUTS_INVALID_allowed_outputs_empty',
  CONFLICT_DUPLICATE_OUTPUT_VALUE: 'META_OUTPUTS_CONFLICT_duplicate_output_value',
  MISSING_REFUSAL_OUTPUT: 'META_OUTPUTS_MISSING_refusal_output',
  INVALID_REFUSAL_OUTPUT_NOT_ALLOWED: 'META_OUTPUTS_INVALID_refusal_output_not_allowed',
  MISSING_AUTHORITY_LEVEL: 'META_OUTPUTS_MISSING_authority_level',
  INVALID_AUTHORITY_LEVEL: 'META_OUTPUTS_INVALID_authority_level',
} as const;

// =============================================================================
// POLICIES Reason Codes
// =============================================================================

export const POLICIES_CODES = {
  MISSING_POLICIES: 'META_POLICIES_MISSING_policies',
  MISSING_POLICY_STATEMENT: 'META_POLICIES_MISSING_policy_statement',
  INVALID_POLICY_UNBOUNDED: 'META_POLICIES_INVALID_policy_unbounded',
  VIOLATION_POLICY_GENERATES_OUTCOME: 'META_POLICIES_VIOLATION_policy_generates_outcome',
  CONFLICT_POLICY_CONFLICT: 'META_POLICIES_CONFLICT_policy_conflict',
  MISSING_PRECEDENCE: 'META_POLICIES_MISSING_precedence',
  INVALID_PRECEDENCE_CYCLE: 'META_POLICIES_INVALID_precedence_cycle',
  VIOLATION_EXCEEDS_AUTHORITY_ENVELOPE: 'META_POLICIES_VIOLATION_exceeds_authority_envelope',
} as const;

// =============================================================================
// RULES Reason Codes
// =============================================================================

export const RULES_CODES = {
  MISSING_RULES: 'META_RULES_MISSING_rules',
  INVALID_RULE_EXPRESSION: 'META_RULES_INVALID_rule_expression',
  VIOLATION_NONDETERMINISTIC_OPERATOR: 'META_RULES_VIOLATION_nondeterministic_operator',
  VIOLATION_HIDDEN_STATE_DEPENDENCY: 'META_RULES_VIOLATION_hidden_state_dependency',
  VIOLATION_UNDECLARED_INPUT_REFERENCE: 'META_RULES_VIOLATION_undeclared_input_reference',
  INVALID_OUTPUT_NOT_ALLOWED: 'META_RULES_INVALID_output_not_allowed',
  VIOLATION_NON_TERMINATING_PATH: 'META_RULES_VIOLATION_non_terminating_path',
  INCOMPLETE_COVERAGE_NOT_PROVEN: 'META_RULES_INCOMPLETE_coverage_not_proven',
  VIOLATION_MUTATES_INPUTS: 'META_RULES_VIOLATION_mutates_inputs',
} as const;

// =============================================================================
// SIMULATION Reason Codes
// =============================================================================

export const SIMULATION_CODES = {
  MISSING_VALID_CASE: 'META_SIMULATION_MISSING_valid_case',
  MISSING_REFUSAL_CASE: 'META_SIMULATION_MISSING_refusal_case',
  INVALID_INPUT_VALUES: 'META_SIMULATION_INVALID_input_values',
  INVALID_OUTPUT_MISMATCH: 'META_SIMULATION_INVALID_output_mismatch',
  VIOLATION_NON_REPRODUCIBLE_TRACE: 'META_SIMULATION_VIOLATION_non_reproducible_trace',
  INCONSISTENT_POLICY_TRACE: 'META_SIMULATION_INCONSISTENT_policy_trace',
  INCOMPLETE_STAGES_NOT_READY: 'META_SIMULATION_INCOMPLETE_stages_not_ready',
} as const;

// =============================================================================
// FINALIZATION Reason Codes
// =============================================================================

export const FINALIZATION_CODES = {
  MISSING_ACCEPTANCE_CONFIRMATION: 'META_FINALIZATION_MISSING_acceptance_confirmation',
  VIOLATION_CONTRACT_HASH_MISSING: 'META_FINALIZATION_VIOLATION_contract_hash_missing',
  INVALID_CONTRACT_NOT_CANONICAL: 'META_FINALIZATION_INVALID_contract_not_canonical',
  REJECTED_INVARIANTS_NOT_SATISFIED: 'META_FINALIZATION_REJECTED_invariants_not_satisfied',
  INCOMPLETE_SIMULATION_NOT_PASSED: 'META_FINALIZATION_INCOMPLETE_simulation_not_passed',
} as const;

// =============================================================================
// Finding Factory Functions
// =============================================================================

export function createFinding(
  code: string,
  severity: 'BLOCK' | 'REJECT' | 'WARN',
  invariant: string,
  message: string,
  nextAction: string,
  fieldPath: string | null = null,
  actionTarget: string | null = null
): Finding {
  return {
    code,
    severity,
    invariant,
    field_path: fieldPath,
    message,
    next_action: nextAction,
    action_target: actionTarget,
  };
}

// =============================================================================
// Pre-built Finding Templates (for common cases)
// =============================================================================

export const FINDINGS = {
  sessionAlreadyFinalized: (): Finding =>
    createFinding(
      GLOBAL_CODES.VIOLATION_SESSION_ALREADY_FINALIZED,
      'REJECT',
      INVARIANTS.REPRODUCIBILITY_REQUIRED,
      'Session is terminal and cannot be modified.',
      'CREATE_NEW_SESSION'
    ),

  simulationStageNotSubmittable: (): Finding =>
    createFinding(
      GLOBAL_CODES.VIOLATION_SIMULATION_STAGE_NOT_SUBMITTABLE,
      'REJECT',
      INVARIANTS.DETERMINISM_REQUIRED,
      'SIMULATION_FINALIZATION stage cannot be submitted directly. Use runSimulation().',
      'RUN_SIMULATION'
    ),

  inconsistentStageState: (message: string): Finding =>
    createFinding(
      GLOBAL_CODES.INCONSISTENT_STAGE_STATE,
      'REJECT',
      INVARIANTS.REPRODUCIBILITY_REQUIRED,
      message,
      'RESET_TO_LAST_VALID_STAGE'
    ),

  missingAcceptanceConfirmation: (): Finding =>
    createFinding(
      FINALIZATION_CODES.MISSING_ACCEPTANCE_CONFIRMATION,
      'BLOCK',
      INVARIANTS.ALL_BEHAVIOR_DECLARED,
      'Acceptance confirmation is required to finalize.',
      'CONFIRM_FINAL_ACCEPTANCE',
      'acceptance_confirmation'
    ),

  contractHashMissing: (): Finding =>
    createFinding(
      FINALIZATION_CODES.VIOLATION_CONTRACT_HASH_MISSING,
      'REJECT',
      INVARIANTS.REPRODUCIBILITY_REQUIRED,
      'Failed to generate contract artifact.',
      'FIX_CONTRACT_CANONICALIZATION'
    ),

  simulationNotPassed: (fieldPath: string, actionTarget: string): Finding =>
    createFinding(
      FINALIZATION_CODES.INCOMPLETE_SIMULATION_NOT_PASSED,
      'BLOCK',
      INVARIANTS.ALL_BEHAVIOR_DECLARED,
      'All stages must be READY before finalization.',
      'RETURN_TO_BLOCKED_STAGE',
      fieldPath,
      actionTarget
    ),

  stagesNotReady: (stageName: string): Finding =>
    createFinding(
      SIMULATION_CODES.INCOMPLETE_STAGES_NOT_READY,
      'BLOCK',
      INVARIANTS.ALL_BEHAVIOR_DECLARED,
      `Stage ${stageName} must be READY before simulation.`,
      'COMPLETE_PRIOR_STAGES',
      `stage_states.${stageName}`,
      stageName
    ),
} as const;
