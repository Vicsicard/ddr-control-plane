/**
 * Meta DDR FRAMING Stage Validator
 * Frozen for MVP - v0.1
 */

import { FramingArtifacts } from '../types/artifacts';
import { IntakeSessionState } from '../types/session';
import { Finding } from '../types/findings';
import { INVARIANTS } from '../invariants';

export function validateFraming(
  artifacts: unknown,
  _session: IntakeSessionState
): Finding[] {
  const findings: Finding[] = [];

  // Type guard
  if (!artifacts || typeof artifacts !== 'object') {
    findings.push({
      code: 'META_FRAMING_MISSING_decision_id',
      severity: 'BLOCK',
      invariant: INVARIANTS.ALL_BEHAVIOR_DECLARED,
      field_path: null,
      message: 'Decision framing artifacts must be provided.',
      next_action: 'SET_DECISION_ID',
      action_target: null,
    });
    return findings;
  }

  const framing = artifacts as FramingArtifacts;

  // ---------------------------------------------------------------------------
  // contract_version (VERSIONING code, validated here because it is in FramingArtifacts)
  // ---------------------------------------------------------------------------
  if (!framing.contract_version || framing.contract_version.trim() === '') {
    findings.push({
      code: 'META_VERSIONING_MISSING_contract_version',
      severity: 'BLOCK',
      invariant: INVARIANTS.REPRODUCIBILITY_REQUIRED,
      field_path: 'contract_version',
      message: 'Contract version must be specified.',
      next_action: 'SET_CONTRACT_VERSION',
      action_target: 'contract_version',
    });
  }

  // ---------------------------------------------------------------------------
  // decision_id
  // ---------------------------------------------------------------------------
  if (!framing.decision_id || framing.decision_id.trim() === '') {
    findings.push({
      code: 'META_FRAMING_MISSING_decision_id',
      severity: 'BLOCK',
      invariant: INVARIANTS.ALL_BEHAVIOR_DECLARED,
      field_path: 'decision_id',
      message: 'Decision identifier is required.',
      next_action: 'SET_DECISION_ID',
      action_target: 'decision_id',
    });
  } else if (!/^[a-zA-Z0-9._-]+$/.test(framing.decision_id)) {
    findings.push({
      code: 'META_FRAMING_INVALID_decision_id_format',
      severity: 'BLOCK',
      invariant: INVARIANTS.REPRODUCIBILITY_REQUIRED,
      field_path: 'decision_id',
      message: 'Decision identifier contains invalid characters.',
      next_action: 'FIX_DECISION_ID',
      action_target: 'decision_id',
    });
  }

  // ---------------------------------------------------------------------------
  // decision_purpose
  // ---------------------------------------------------------------------------
  if (!framing.decision_purpose || framing.decision_purpose.trim() === '') {
    findings.push({
      code: 'META_FRAMING_MISSING_operational_purpose',
      severity: 'BLOCK',
      invariant: INVARIANTS.NO_AMBIGUITY_PERSISTS,
      field_path: 'decision_purpose',
      message: 'Operational purpose must be defined.',
      next_action: 'DEFINE_OPERATIONAL_PURPOSE',
      action_target: 'decision_purpose',
    });
  } else if (!isOperational(framing.decision_purpose)) {
    findings.push({
      code: 'META_FRAMING_INVALID_purpose_non_operational',
      severity: 'BLOCK',
      invariant: INVARIANTS.NO_AMBIGUITY_PERSISTS,
      field_path: 'decision_purpose',
      message: 'Purpose must describe an actionable decision outcome.',
      next_action: 'MAKE_PURPOSE_OPERATIONAL',
      action_target: 'decision_purpose',
    });
  }

  // ---------------------------------------------------------------------------
  // execution_trigger
  // ---------------------------------------------------------------------------
  if (!framing.execution_trigger || framing.execution_trigger.trim() === '') {
    findings.push({
      code: 'META_FRAMING_MISSING_execution_trigger',
      severity: 'BLOCK',
      invariant: INVARIANTS.ALL_BEHAVIOR_DECLARED,
      field_path: 'execution_trigger',
      message: 'Execution trigger must be defined.',
      next_action: 'DEFINE_EXECUTION_TRIGGER',
      action_target: 'execution_trigger',
    });
  }

  // ---------------------------------------------------------------------------
  // authority / non-authority
  // ---------------------------------------------------------------------------
  if (!Array.isArray(framing.explicit_authority) || framing.explicit_authority.length === 0) {
    findings.push({
      code: 'META_FRAMING_MISSING_explicit_authority',
      severity: 'BLOCK',
      invariant: INVARIANTS.AUTHORITY_NEVER_FLOWS_UPWARD,
      field_path: 'explicit_authority',
      message: 'Explicit authority must be declared.',
      next_action: 'DECLARE_AUTHORITY',
      action_target: 'explicit_authority',
    });
  }

  if (!Array.isArray(framing.explicit_non_authority) || framing.explicit_non_authority.length === 0) {
    findings.push({
      code: 'META_FRAMING_MISSING_explicit_non_authority',
      severity: 'BLOCK',
      invariant: INVARIANTS.AUTHORITY_NEVER_FLOWS_UPWARD,
      field_path: 'explicit_non_authority',
      message: 'Explicit non-authority must be declared.',
      next_action: 'DECLARE_NON_AUTHORITY',
      action_target: 'explicit_non_authority',
    });
  }

  if (Array.isArray(framing.explicit_authority) && Array.isArray(framing.explicit_non_authority)) {
    const overlap = framing.explicit_authority.filter(a => framing.explicit_non_authority.includes(a));
    if (overlap.length > 0) {
      findings.push({
        code: 'META_FRAMING_CONFLICT_authority_vs_non_authority',
        severity: 'BLOCK',
        invariant: INVARIANTS.NO_AMBIGUITY_PERSISTS,
        field_path: 'explicit_authority',
        message: 'Authority and non-authority sets must not overlap.',
        next_action: 'RESOLVE_AUTHORITY_CONFLICT',
        action_target: overlap.join(', '),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // refusal_conditions
  // ---------------------------------------------------------------------------
  if (!Array.isArray(framing.refusal_conditions) || framing.refusal_conditions.length === 0) {
    findings.push({
      code: 'META_FRAMING_MISSING_refusal_conditions',
      severity: 'BLOCK',
      invariant: INVARIANTS.REFUSAL_IS_MANDATORY,
      field_path: 'refusal_conditions',
      message: 'Refusal conditions must be defined.',
      next_action: 'DEFINE_REFUSAL_CONDITIONS',
      action_target: 'refusal_conditions',
    });
  }

  return findings;
}

/**
 * MVP heuristic: checks for action-indicating keywords.
 * This is structural validation, not semantic understanding.
 * False negatives are possible; users must use explicit action verbs.
 */
function isOperational(text: string): boolean {
  const operationalKeywords = [
    'decide',
    'determine',
    'allow',
    'deny',
    'select',
    'route',
    'approve',
    'reject',
    'return',
    'calculate',
  ];
  const lower = text.toLowerCase();
  return operationalKeywords.some(k => lower.includes(k));
}
