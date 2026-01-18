/**
 * Meta DDR POLICIES Stage Validator
 * Frozen for MVP - v0.1
 */

import { PoliciesArtifacts, PolicyDefinition } from '../types/artifacts';
import { IntakeSessionState } from '../types/session';
import { Finding } from '../types/findings';
import { INVARIANTS } from '../invariants';

export function validatePolicies(
  artifacts: unknown,
  _session: IntakeSessionState
): Finding[] {
  const findings: Finding[] = [];

  // ---------------------------------------------------------------------------
  // Type guard
  // ---------------------------------------------------------------------------
  if (!artifacts || typeof artifacts !== 'object') {
    findings.push({
      code: 'META_POLICIES_MISSING_policies',
      severity: 'BLOCK',
      invariant: INVARIANTS.POLICIES_RESTRICT_NOT_GENERATE,
      field_path: null,
      message: 'At least one policy must be defined.',
      next_action: 'ADD_POLICY',
      action_target: null,
    });
    return findings;
  }

  const policiesArtifacts = artifacts as PoliciesArtifacts;

  // ---------------------------------------------------------------------------
  // policies array existence
  // ---------------------------------------------------------------------------
  if (!Array.isArray(policiesArtifacts.policies) || policiesArtifacts.policies.length === 0) {
    findings.push({
      code: 'META_POLICIES_MISSING_policies',
      severity: 'BLOCK',
      invariant: INVARIANTS.POLICIES_RESTRICT_NOT_GENERATE,
      field_path: 'policies',
      message: 'At least one policy must be defined.',
      next_action: 'ADD_POLICY',
      action_target: 'policies',
    });
    return findings;
  }

  // ---------------------------------------------------------------------------
  // Per-policy validation
  // ---------------------------------------------------------------------------
  const precedenceValues: number[] = [];

  for (const policy of policiesArtifacts.policies) {
    validateSinglePolicy(policy, findings);
    if (typeof policy.precedence === 'number') {
      precedenceValues.push(policy.precedence);
    }
  }

  // ---------------------------------------------------------------------------
  // Precedence checks
  // ---------------------------------------------------------------------------
  const uniquePrecedence = new Set(precedenceValues);
  if (uniquePrecedence.size !== precedenceValues.length) {
    findings.push({
      code: 'META_POLICIES_CONFLICT_policy_conflict',
      severity: 'BLOCK',
      invariant: INVARIANTS.NO_AMBIGUITY_PERSISTS,
      field_path: 'policies.precedence',
      message: 'Conflicting policies detected without unique precedence.',
      next_action: 'SET_POLICY_PRECEDENCE',
      action_target: 'policies',
    });
  }

  // Detect precedence cycles (simple numeric cycle detection for MVP)
  const sorted = [...precedenceValues].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]) {
      findings.push({
        code: 'META_POLICIES_INVALID_precedence_cycle',
        severity: 'BLOCK',
        invariant: INVARIANTS.NO_AMBIGUITY_PERSISTS,
        field_path: 'policies.precedence',
        message: 'Policy precedence contains a cycle or duplicate.',
        next_action: 'FIX_PRECEDENCE_ORDER',
        action_target: 'policies',
      });
      break;
    }
  }

  return findings;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function validateSinglePolicy(
  policy: PolicyDefinition,
  findings: Finding[]
): void {
  // policy statement
  if (!policy.statement || policy.statement.trim() === '') {
    findings.push({
      code: 'META_POLICIES_MISSING_policy_statement',
      severity: 'BLOCK',
      invariant: INVARIANTS.NO_AMBIGUITY_PERSISTS,
      field_path: 'policies.statement',
      message: 'Policy statement must be defined.',
      next_action: 'DEFINE_POLICY',
      action_target: policy.policy_id,
    });
  }

  // unbounded / non-operational heuristic
  if (policy.statement && !isOperationalPolicy(policy.statement)) {
    findings.push({
      code: 'META_POLICIES_INVALID_policy_unbounded',
      severity: 'BLOCK',
      invariant: INVARIANTS.NO_AMBIGUITY_PERSISTS,
      field_path: 'policies.statement',
      message: 'Policy statement must be operational and enforceable.',
      next_action: 'MAKE_POLICY_OPERATIONAL',
      action_target: policy.policy_id,
    });
  }

  // policy generating outcomes (heuristic)
  if (policy.statement && appearsToGenerateOutcome(policy.statement)) {
    findings.push({
      code: 'META_POLICIES_VIOLATION_policy_generates_outcome',
      severity: 'BLOCK',
      invariant: INVARIANTS.POLICIES_RESTRICT_NOT_GENERATE,
      field_path: 'policies.statement',
      message: 'Policies may restrict behavior but must not generate outcomes.',
      next_action: 'MOVE_LOGIC_TO_RULES',
      action_target: policy.policy_id,
    });
  }

  // precedence
  if (typeof policy.precedence !== 'number') {
    findings.push({
      code: 'META_POLICIES_MISSING_precedence',
      severity: 'BLOCK',
      invariant: INVARIANTS.NO_AMBIGUITY_PERSISTS,
      field_path: 'policies.precedence',
      message: 'Policy precedence must be defined.',
      next_action: 'SET_POLICY_PRECEDENCE',
      action_target: policy.policy_id,
    });
  }
}

/**
 * MVP heuristic: checks for restrictive language.
 * Structural validation only — not semantic analysis.
 */
function isOperationalPolicy(text: string): boolean {
  const keywords = ['must', 'must not', 'cannot', 'only if', 'restricted'];
  return keywords.some(k => text.toLowerCase().includes(k));
}

/**
 * MVP heuristic: detects outcome generation attempts.
 * Looks for verbs implying outputs or decisions.
 */
function appearsToGenerateOutcome(text: string): boolean {
  const forbidden = ['return', 'output', 'decide', 'set result', 'approve', 'deny'];
  return forbidden.some(k => text.toLowerCase().includes(k));
}
