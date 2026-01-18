/**
 * Meta DDR INPUTS Stage Validator
 * Frozen for MVP - v0.1
 */

import { InputsArtifacts, InputDefinition } from '../types/artifacts';
import { IntakeSessionState } from '../types/session';
import { Finding } from '../types/findings';
import { INVARIANTS } from '../invariants';

export function validateInputs(
  artifacts: unknown,
  _session: IntakeSessionState
): Finding[] {
  const findings: Finding[] = [];

  // ---------------------------------------------------------------------------
  // Type guard
  // ---------------------------------------------------------------------------
  if (!artifacts || typeof artifacts !== 'object') {
    findings.push({
      code: 'META_INPUTS_MISSING_inputs',
      severity: 'BLOCK',
      invariant: INVARIANTS.ONLY_DECLARED_INPUTS,
      field_path: null,
      message: 'At least one input must be declared.',
      next_action: 'ADD_INPUT',
      action_target: null,
    });
    return findings;
  }

  const inputsArtifacts = artifacts as InputsArtifacts;

  // ---------------------------------------------------------------------------
  // inputs array existence
  // ---------------------------------------------------------------------------
  if (!Array.isArray(inputsArtifacts.inputs) || inputsArtifacts.inputs.length === 0) {
    findings.push({
      code: 'META_INPUTS_MISSING_inputs',
      severity: 'BLOCK',
      invariant: INVARIANTS.ONLY_DECLARED_INPUTS,
      field_path: 'inputs',
      message: 'At least one input must be declared.',
      next_action: 'ADD_INPUT',
      action_target: 'inputs',
    });
  }

  // ---------------------------------------------------------------------------
  // no_undeclared_inputs_confirmed (governance checkpoint)
  // ---------------------------------------------------------------------------
  if (inputsArtifacts.no_undeclared_inputs_confirmed !== true) {
    findings.push({
      code: 'META_INPUTS_VIOLATION_implicit_input_detected',
      severity: 'BLOCK',
      invariant: INVARIANTS.ONLY_DECLARED_INPUTS,
      field_path: 'no_undeclared_inputs_confirmed',
      message: 'Implicit or undeclared inputs are not allowed.',
      next_action: 'DECLARE_REFERENCED_INPUT',
      action_target: null,
    });
  }

  // ---------------------------------------------------------------------------
  // Per-input validation (exhaustive)
  // ---------------------------------------------------------------------------
  if (Array.isArray(inputsArtifacts.inputs)) {
    const seenNames = new Set<string>();

    for (const input of inputsArtifacts.inputs) {
      validateSingleInput(input, findings, seenNames);
    }
  }

  return findings;
}

// ============================================================================
// Helpers
// ============================================================================

function validateSingleInput(
  input: InputDefinition,
  findings: Finding[],
  seenNames: Set<string>
): void {
  // -------------------------------------------------------------------------
  // input_name
  // -------------------------------------------------------------------------
  if (!input.input_name || input.input_name.trim() === '') {
    findings.push({
      code: 'META_INPUTS_MISSING_input_name',
      severity: 'BLOCK',
      invariant: INVARIANTS.ONLY_DECLARED_INPUTS,
      field_path: 'inputs[].input_name',
      message: 'Each input must have a name.',
      next_action: 'NAME_INPUT',
      action_target: null,
    });
  } else {
    if (seenNames.has(input.input_name)) {
      findings.push({
        code: 'META_INPUTS_CONFLICT_duplicate_input_name',
        severity: 'BLOCK',
        invariant: INVARIANTS.REPRODUCIBILITY_REQUIRED,
        field_path: 'inputs[].input_name',
        message: `Duplicate input name detected: ${input.input_name}.`,
        next_action: 'RENAME_DUPLICATE_INPUT',
        action_target: input.input_name,
      });
    }
    seenNames.add(input.input_name);
  }

  // -------------------------------------------------------------------------
  // input_type
  // -------------------------------------------------------------------------
  if (!input.input_type || input.input_type.trim() === '') {
    findings.push({
      code: 'META_INPUTS_MISSING_input_type',
      severity: 'BLOCK',
      invariant: INVARIANTS.ALL_BEHAVIOR_DECLARED,
      field_path: `inputs.${input.input_name}.input_type`,
      message: 'Input type must be specified.',
      next_action: 'SET_INPUT_TYPE',
      action_target: input.input_name ?? null,
    });
  }

  // -------------------------------------------------------------------------
  // input_source
  // -------------------------------------------------------------------------
  if (!input.input_source || input.input_source.trim() === '') {
    findings.push({
      code: 'META_INPUTS_MISSING_input_source',
      severity: 'BLOCK',
      invariant: INVARIANTS.ALL_BEHAVIOR_DECLARED,
      field_path: `inputs.${input.input_name}.input_source`,
      message: 'Input source must be specified.',
      next_action: 'SET_INPUT_SOURCE',
      action_target: input.input_name ?? null,
    });
  }

  // -------------------------------------------------------------------------
  // trust_level
  // -------------------------------------------------------------------------
  if (!input.trust_level || input.trust_level.trim() === '') {
    findings.push({
      code: 'META_INPUTS_MISSING_trust_level',
      severity: 'BLOCK',
      invariant: INVARIANTS.DETERMINISM_REQUIRED,
      field_path: `inputs.${input.input_name}.trust_level`,
      message: 'Trust level must be specified.',
      next_action: 'SET_TRUST_LEVEL',
      action_target: input.input_name ?? null,
    });
  }

  // -------------------------------------------------------------------------
  // required flag
  // -------------------------------------------------------------------------
  if (typeof input.required !== 'boolean') {
    findings.push({
      code: 'META_INPUTS_MISSING_required_flag',
      severity: 'BLOCK',
      invariant: INVARIANTS.ALL_BEHAVIOR_DECLARED,
      field_path: `inputs.${input.input_name}.required`,
      message: 'Each input must be marked as required or optional.',
      next_action: 'SET_REQUIRED_OPTIONAL',
      action_target: input.input_name ?? null,
    });
  }

  // -------------------------------------------------------------------------
  // missing_input_behavior
  // -------------------------------------------------------------------------
  if (!input.missing_input_behavior || input.missing_input_behavior.trim() === '') {
    findings.push({
      code: 'META_INPUTS_MISSING_missing_input_behavior',
      severity: 'BLOCK',
      invariant: INVARIANTS.NO_IMPLICIT_DEFAULTS,
      field_path: `inputs.${input.input_name}.missing_input_behavior`,
      message: 'Missing input behavior must be explicitly defined.',
      next_action: 'SET_MISSING_INPUT_BEHAVIOR',
      action_target: input.input_name ?? null,
    });
  }
}
