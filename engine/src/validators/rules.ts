/**
 * Meta DDR RULES Stage Validator
 * Frozen for MVP - v0.1
 */

import { RulesArtifacts, RuleDefinition, InputsArtifacts, OutputsArtifacts } from '../types/artifacts';
import { IntakeSessionState } from '../types/session';
import { Finding } from '../types/findings';
import { INVARIANTS } from '../invariants';

export function validateRules(
  artifacts: unknown,
  session: IntakeSessionState
): Finding[] {
  const findings: Finding[] = [];

  // ---------------------------------------------------------------------------
  // Type guard
  // ---------------------------------------------------------------------------
  if (!artifacts || typeof artifacts !== 'object') {
    findings.push({
      code: 'META_RULES_MISSING_rules',
      severity: 'BLOCK',
      invariant: INVARIANTS.ALL_BEHAVIOR_DECLARED,
      field_path: null,
      message: 'At least one rule must be defined.',
      next_action: 'ADD_RULE',
      action_target: null,
    });
    return findings;
  }

  const rulesArtifacts = artifacts as RulesArtifacts;

  // ---------------------------------------------------------------------------
  // Rules array existence
  // ---------------------------------------------------------------------------
  if (!Array.isArray(rulesArtifacts.rules) || rulesArtifacts.rules.length === 0) {
    findings.push({
      code: 'META_RULES_MISSING_rules',
      severity: 'BLOCK',
      invariant: INVARIANTS.ALL_BEHAVIOR_DECLARED,
      field_path: 'rules',
      message: 'At least one rule must be defined.',
      next_action: 'ADD_RULE',
      action_target: 'rules',
    });
    return findings;
  }

  // Gather declared inputs & outputs from prior stages
  const inputsArtifacts = session.artifacts.INPUTS as InputsArtifacts | null;
  const outputsArtifacts = session.artifacts.OUTPUTS as OutputsArtifacts | null;

  const declaredInputs =
    inputsArtifacts && Array.isArray(inputsArtifacts.inputs)
      ? inputsArtifacts.inputs.map(i => i.input_name)
      : [];

  const allowedOutputs =
    outputsArtifacts && Array.isArray(outputsArtifacts.allowed_outputs)
      ? outputsArtifacts.allowed_outputs
      : [];

  // ---------------------------------------------------------------------------
  // Per-rule validation
  // ---------------------------------------------------------------------------
  for (const rule of rulesArtifacts.rules) {
    validateSingleRule(rule, declaredInputs, allowedOutputs, findings);
  }

  // ---------------------------------------------------------------------------
  // Governance confirmations
  // ---------------------------------------------------------------------------
  if (rulesArtifacts.termination_confirmed !== true) {
    findings.push({
      code: 'META_RULES_VIOLATION_non_terminating_path',
      severity: 'BLOCK',
      invariant: INVARIANTS.ALL_PATHS_TERMINATE,
      field_path: 'termination_confirmed',
      message: 'Rule termination must be explicitly confirmed.',
      next_action: 'ADD_TERMINATION_RULE',
      action_target: 'rules',
    });
  }

  if (rulesArtifacts.coverage_confirmed !== true) {
    findings.push({
      code: 'META_RULES_INCOMPLETE_coverage_not_proven',
      severity: 'BLOCK',
      invariant: INVARIANTS.ALL_PATHS_TERMINATE,
      field_path: 'coverage_confirmed',
      message: 'Rule coverage must be explicitly confirmed.',
      next_action: 'ADD_COVERAGE_RULES',
      action_target: 'rules',
    });
  }

  return findings;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function validateSingleRule(
  rule: RuleDefinition,
  declaredInputs: string[],
  allowedOutputs: string[],
  findings: Finding[]
): void {
  // WHEN clause presence
  if (!rule.when || rule.when.trim() === '') {
    findings.push({
      code: 'META_RULES_INVALID_rule_expression',
      severity: 'BLOCK',
      invariant: INVARIANTS.DETERMINISM_REQUIRED,
      field_path: 'rules.when',
      message: 'Rule condition must be defined.',
      next_action: 'FIX_RULE_EXPRESSION',
      action_target: rule.rule_id,
    });
  }

  // THEN clause presence
  if (!rule.then || rule.then.trim() === '') {
    findings.push({
      code: 'META_RULES_INVALID_rule_expression',
      severity: 'BLOCK',
      invariant: INVARIANTS.DETERMINISM_REQUIRED,
      field_path: 'rules.then',
      message: 'Rule outcome must be defined.',
      next_action: 'FIX_RULE_EXPRESSION',
      action_target: rule.rule_id,
    });
  }

  // Non-deterministic operators (structural heuristic)
  if (rule.when && containsNonDeterminism(rule.when)) {
    findings.push({
      code: 'META_RULES_VIOLATION_nondeterministic_operator',
      severity: 'BLOCK',
      invariant: INVARIANTS.DETERMINISM_REQUIRED,
      field_path: 'rules.when',
      message: 'Rule condition contains non-deterministic operator.',
      next_action: 'REMOVE_NONDETERMINISM',
      action_target: rule.rule_id,
    });
  }

  // Hidden state references
  if (rule.when && referencesHiddenState(rule.when)) {
    findings.push({
      code: 'META_RULES_VIOLATION_hidden_state_dependency',
      severity: 'BLOCK',
      invariant: INVARIANTS.DETERMINISM_REQUIRED,
      field_path: 'rules.when',
      message: 'Rule condition references undeclared or hidden state.',
      next_action: 'DECLARE_STATE_AS_INPUT',
      action_target: rule.rule_id,
    });
  }

  // Undeclared input references
  if (rule.when) {
    const referencedInputs = extractReferencedInputs(rule.when);
    for (const input of referencedInputs) {
      if (!declaredInputs.includes(input)) {
        findings.push({
          code: 'META_RULES_VIOLATION_undeclared_input_reference',
          severity: 'BLOCK',
          invariant: INVARIANTS.ONLY_DECLARED_INPUTS,
          field_path: 'rules.when',
          message: 'Rule references an undeclared input.',
          next_action: 'DECLARE_REFERENCED_INPUT',
          action_target: input,
        });
      }
    }
  }

  // Output must be allowed
  if (rule.then && allowedOutputs.length > 0 && !allowedOutputs.includes(rule.then)) {
    findings.push({
      code: 'META_RULES_INVALID_output_not_allowed',
      severity: 'BLOCK',
      invariant: INVARIANTS.OUTPUTS_ARE_FINITE,
      field_path: 'rules.then',
      message: 'Rule output must be one of the allowed outputs.',
      next_action: 'SELECT_ALLOWED_OUTPUT',
      action_target: rule.then,
    });
  }

  // Input mutation attempt
  if (rule.then && mutatesInput(rule.then)) {
    findings.push({
      code: 'META_RULES_VIOLATION_mutates_inputs',
      severity: 'BLOCK',
      invariant: INVARIANTS.DETERMINISM_REQUIRED,
      field_path: 'rules.then',
      message: 'Rules must not mutate input values.',
      next_action: 'REMOVE_INPUT_MUTATION',
      action_target: rule.rule_id,
    });
  }
}

/**
 * MVP heuristic: detects randomness, time, or environment calls.
 */
function containsNonDeterminism(expr: string): boolean {
  const tokens = ['random', 'now()', 'Date()', 'Math.random', 'uuid'];
  return tokens.some(t => expr.includes(t));
}

/**
 * MVP heuristic: detects implicit state references.
 */
function referencesHiddenState(expr: string): boolean {
  const tokens = ['session.', 'context.', 'env.', 'state.'];
  return tokens.some(t => expr.includes(t));
}

/**
 * Extracts candidate input identifiers from condition string.
 * Structural only; assumes identifiers are space- or symbol-delimited.
 * Filters out numeric literals, common keywords, and JSON expression structure.
 */
function extractReferencedInputs(expr: string): string[] {
  const tokens = expr.split(/[^a-zA-Z0-9_]/).filter(Boolean);
  // Keywords to filter out: boolean literals, control flow, logic operators,
  // and MVP rule expression structure keys (var, op, value, all, any)
  const keywords = [
    'true', 'false', 'null', 'undefined', 'if', 'else', 'and', 'or', 'not',
    'var', 'op', 'value', 'all', 'any', // MVP expression structure
  ];
  return Array.from(new Set(tokens)).filter(t => 
    !keywords.includes(t.toLowerCase()) && !/^\d+$/.test(t)
  );
}

/**
 * MVP heuristic: detects assignment / mutation attempts.
 */
function mutatesInput(expr: string): boolean {
  return expr.includes('=') || expr.includes('++') || expr.includes('--');
}
