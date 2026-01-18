/**
 * Meta DDR OUTPUTS Stage Validator
 * Frozen for MVP - v0.1
 */

import { OutputsArtifacts } from '../types/artifacts';
import { IntakeSessionState } from '../types/session';
import { Finding } from '../types/findings';
import { INVARIANTS } from '../invariants';

export function validateOutputs(
  artifacts: unknown,
  _session: IntakeSessionState
): Finding[] {
  const findings: Finding[] = [];

  // ---------------------------------------------------------------------------
  // Type guard
  // ---------------------------------------------------------------------------
  if (!artifacts || typeof artifacts !== 'object') {
    findings.push({
      code: 'META_OUTPUTS_MISSING_output_schema',
      severity: 'BLOCK',
      invariant: INVARIANTS.OUTPUTS_ARE_FINITE,
      field_path: null,
      message: 'Output schema must be defined.',
      next_action: 'DEFINE_OUTPUT_SCHEMA',
      action_target: null,
    });
    return findings;
  }

  const outputs = artifacts as OutputsArtifacts;

  // ---------------------------------------------------------------------------
  // output_schema
  // ---------------------------------------------------------------------------
  if (!outputs.output_schema || typeof outputs.output_schema !== 'object') {
    findings.push({
      code: 'META_OUTPUTS_MISSING_output_schema',
      severity: 'BLOCK',
      invariant: INVARIANTS.OUTPUTS_ARE_FINITE,
      field_path: 'output_schema',
      message: 'Output schema must be defined.',
      next_action: 'DEFINE_OUTPUT_SCHEMA',
      action_target: 'output_schema',
    });
  }

  // ---------------------------------------------------------------------------
  // allowed_outputs
  // ---------------------------------------------------------------------------
  if (!Array.isArray(outputs.allowed_outputs)) {
    findings.push({
      code: 'META_OUTPUTS_MISSING_allowed_outputs',
      severity: 'BLOCK',
      invariant: INVARIANTS.OUTPUTS_ARE_FINITE,
      field_path: 'allowed_outputs',
      message: 'Allowed outputs must be explicitly defined.',
      next_action: 'DEFINE_ALLOWED_OUTPUTS',
      action_target: 'allowed_outputs',
    });
  } else {
    if (outputs.allowed_outputs.length === 0) {
      findings.push({
        code: 'META_OUTPUTS_INVALID_allowed_outputs_empty',
        severity: 'BLOCK',
        invariant: INVARIANTS.OUTPUTS_ARE_FINITE,
        field_path: 'allowed_outputs',
        message: 'Allowed outputs list cannot be empty.',
        next_action: 'ADD_ALLOWED_OUTPUT',
        action_target: 'allowed_outputs',
      });
    }

    const seen = new Set<string>();
    for (const value of outputs.allowed_outputs) {
      if (seen.has(value)) {
        findings.push({
          code: 'META_OUTPUTS_CONFLICT_duplicate_output_value',
          severity: 'BLOCK',
          invariant: INVARIANTS.OUTPUTS_ARE_FINITE,
          field_path: 'allowed_outputs',
          message: `Duplicate allowed output detected: ${value}.`,
          next_action: 'DEDUP_ALLOWED_OUTPUTS',
          action_target: value,
        });
      }
      seen.add(value);
    }
  }

  // ---------------------------------------------------------------------------
  // refusal_output
  // ---------------------------------------------------------------------------
  if (!outputs.refusal_output || outputs.refusal_output.trim() === '') {
    findings.push({
      code: 'META_OUTPUTS_MISSING_refusal_output',
      severity: 'BLOCK',
      invariant: INVARIANTS.REFUSAL_IS_MANDATORY,
      field_path: 'refusal_output',
      message: 'A refusal output must be defined.',
      next_action: 'SET_REFUSAL_OUTPUT',
      action_target: 'refusal_output',
    });
  } else if (
    Array.isArray(outputs.allowed_outputs) &&
    !outputs.allowed_outputs.includes(outputs.refusal_output)
  ) {
    findings.push({
      code: 'META_OUTPUTS_INVALID_refusal_output_not_allowed',
      severity: 'BLOCK',
      invariant: INVARIANTS.REFUSAL_IS_MANDATORY,
      field_path: 'refusal_output',
      message: 'Refusal output must be one of the allowed outputs.',
      next_action: 'CHOOSE_ALLOWED_REFUSAL_OUTPUT',
      action_target: outputs.refusal_output,
    });
  }

  // ---------------------------------------------------------------------------
  // output_authority_level
  // ---------------------------------------------------------------------------
  if (!outputs.output_authority_level || outputs.output_authority_level.trim() === '') {
    findings.push({
      code: 'META_OUTPUTS_MISSING_authority_level',
      severity: 'BLOCK',
      invariant: INVARIANTS.AUTHORITY_NEVER_FLOWS_UPWARD,
      field_path: 'output_authority_level',
      message: 'Output authority level must be declared.',
      next_action: 'SET_OUTPUT_AUTHORITY_LEVEL',
      action_target: 'output_authority_level',
    });
  }

  return findings;
}
