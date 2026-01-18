/**
 * Meta DDR Simulation Runner
 * Phase 4: MVP deterministic simulation engine
 */

import { IntakeSessionState } from '../types/session';
import { SimulationCase, SimulationCaseResult, Trace } from '../types/simulation';
import { Finding } from '../types/findings';
import { INVARIANTS } from '../invariants';
import {
  hasAssertedValidCase,
  hasAssertedRefusalCase,
  detectNonReproducibleOutputs,
} from './assertions';
import stableStringify from 'json-stable-stringify';

// =============================================================================
// Types
// =============================================================================

export interface SimulationRunResult {
  caseResults: SimulationCaseResult[];
  findings: Finding[];
}

type Expr =
  | { all: Expr[] }
  | { any: Expr[] }
  | { var: string; op: '==' | '!=' | '>' | '>=' | '<' | '<='; value: unknown };

// =============================================================================
// Expression Evaluation (MVP)
// =============================================================================

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseExpr(json: string): Expr | null {
  try {
    const parsed = JSON.parse(json);
    return parsed as Expr;
  } catch {
    return null;
  }
}

function evalExpr(expr: Expr, ctx: Record<string, unknown>): boolean {
  if (isObject(expr) && Array.isArray((expr as Record<string, unknown>).all)) {
    return ((expr as Record<string, unknown>).all as Expr[]).every((e: Expr) => evalExpr(e, ctx));
  }
  if (isObject(expr) && Array.isArray((expr as Record<string, unknown>).any)) {
    return ((expr as Record<string, unknown>).any as Expr[]).some((e: Expr) => evalExpr(e, ctx));
  }

  const leaf = expr as { var: string; op: string; value: unknown };
  const v = ctx[leaf.var];

  switch (leaf.op) {
    case '==': return v === leaf.value;
    case '!=': return v !== leaf.value;
    case '>':  return typeof v === 'number' && typeof leaf.value === 'number' && v > leaf.value;
    case '>=': return typeof v === 'number' && typeof leaf.value === 'number' && v >= leaf.value;
    case '<':  return typeof v === 'number' && typeof leaf.value === 'number' && v < leaf.value;
    case '<=': return typeof v === 'number' && typeof leaf.value === 'number' && v <= leaf.value;
    default:   return false;
  }
}

// =============================================================================
// Input Validation
// =============================================================================

function validateCaseInputs(
  session: IntakeSessionState,
  simCase: SimulationCase,
  caseIndex: number
): { findings: Finding[]; normalizedInputs: string } {
  const findings: Finding[] = [];

  const inputsArtifacts = session.artifacts.INPUTS as Record<string, unknown> | null;
  const declared = Array.isArray(inputsArtifacts?.inputs) ? inputsArtifacts.inputs : [];
  const declaredNames = new Set<string>(declared.map((d: Record<string, unknown>) => String(d.input_name)));

  // normalized inputs for reproducibility check (stable key ordering)
  const normalizedInputs = stableStringify(simCase.inputs || {}) || '{}';

  // No undeclared keys
  for (const key of Object.keys(simCase.inputs || {})) {
    if (!declaredNames.has(key)) {
      findings.push({
        code: 'META_SIMULATION_INVALID_input_values',
        severity: 'BLOCK',
        invariant: INVARIANTS.ONLY_DECLARED_INPUTS,
        field_path: `cases[${caseIndex}].inputs.${key}`,
        message: 'Simulation inputs must match declared input schema.',
        next_action: 'FIX_SIM_INPUT_VALUES',
        action_target: key,
      });
    }
  }

  // Minimal type checking against declared input_type
  for (const def of declared) {
    const name = String((def as Record<string, unknown>).input_name);
    const required = Boolean((def as Record<string, unknown>).required);
    const present = Object.prototype.hasOwnProperty.call(simCase.inputs || {}, name);

    if (!present && required) {
      findings.push({
        code: 'META_SIMULATION_INVALID_input_values',
        severity: 'BLOCK',
        invariant: INVARIANTS.ALL_BEHAVIOR_DECLARED,
        field_path: `cases[${caseIndex}].inputs.${name}`,
        message: 'Simulation inputs must match declared input schema.',
        next_action: 'FIX_SIM_INPUT_VALUES',
        action_target: name,
      });
      continue;
    }

    if (!present) continue;

    const value = (simCase.inputs as Record<string, unknown>)[name];
    const t = String((def as Record<string, unknown>).input_type);

    const ok =
      (t === 'string' && typeof value === 'string') ||
      (t === 'number' && typeof value === 'number') ||
      (t === 'boolean' && typeof value === 'boolean') ||
      (t === 'json' && typeof value === 'object') ||
      (t === 'enum' && (typeof value === 'string' || typeof value === 'number'));

    if (!ok) {
      findings.push({
        code: 'META_SIMULATION_INVALID_input_values',
        severity: 'BLOCK',
        invariant: INVARIANTS.ONLY_DECLARED_INPUTS,
        field_path: `cases[${caseIndex}].inputs.${name}`,
        message: 'Simulation inputs must match declared input schema.',
        next_action: 'FIX_SIM_INPUT_VALUES',
        action_target: name,
      });
    }
  }

  return { findings, normalizedInputs };
}

// =============================================================================
// Policy Trace
// =============================================================================

function buildPolicyTrace(session: IntakeSessionState): string[] {
  const policiesArtifacts = session.artifacts.POLICIES as Record<string, unknown> | null;
  const policies = Array.isArray(policiesArtifacts?.policies) ? [...policiesArtifacts.policies] : [];

  // deterministic order: precedence asc, then policy_id asc
  policies.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const pa = Number(a.precedence ?? 0);
    const pb = Number(b.precedence ?? 0);
    if (pa !== pb) return pa - pb;
    return String(a.policy_id).localeCompare(String(b.policy_id));
  });

  return policies.map((p: Record<string, unknown>) => String(p.policy_id));
}

// =============================================================================
// Rule Evaluation
// =============================================================================

function evaluateRules(session: IntakeSessionState, inputs: Record<string, unknown>): {
  output: string;
  rulePath: string[];
} {
  const rulesArtifacts = session.artifacts.RULES as Record<string, unknown> | null;
  const rules = Array.isArray(rulesArtifacts?.rules) ? rulesArtifacts.rules : [];

  const outputsArtifacts = session.artifacts.OUTPUTS as Record<string, unknown> | null;
  const refusalOutput = String(outputsArtifacts?.refusal_output ?? 'REFUSE');

  for (const r of rules) {
    const rule = r as Record<string, unknown>;
    const ruleId = String(rule.rule_id ?? 'rule');
    const whenStr = String(rule.when ?? '');
    const thenStr = String(rule.then ?? '');

    const expr = parseExpr(whenStr);
    if (!expr) {
      // Invalid rule expression should have been blocked earlier, but fail closed to refusal
      continue;
    }
    if (evalExpr(expr, inputs)) {
      return { output: thenStr, rulePath: [ruleId] };
    }
  }

  // no match -> refusal
  return { output: refusalOutput, rulePath: [] };
}

function isAllowedOutput(session: IntakeSessionState, output: string): boolean {
  const outputsArtifacts = session.artifacts.OUTPUTS as Record<string, unknown> | null;
  const allowed = Array.isArray(outputsArtifacts?.allowed_outputs) ? outputsArtifacts.allowed_outputs : [];
  return allowed.includes(output);
}

// =============================================================================
// Main Runner
// =============================================================================

/**
 * Run simulation cases against current session artifacts.
 * 
 * - Validates inputs against declared schema/types
 * - Evaluates rules deterministically (top-to-bottom, first match wins)
 * - Computes trace: policy order + rule path + refusal boolean
 * - Evaluates assertions and emits simulation reason codes
 * - Enforces required asserted cases (valid + refusal)
 */
export function runSimulationCases(
  session: IntakeSessionState,
  cases: SimulationCase[]
): SimulationRunResult {
  const findings: Finding[] = [];
  const caseResults: SimulationCaseResult[] = [];

  const framing = session.artifacts.FRAMING as Record<string, unknown> | null;
  const contractVersion = String(framing?.contract_version ?? '');

  const policyChecks = buildPolicyTrace(session);

  const normalizedInputsByCaseId: Record<string, string> = {};

  cases.forEach((simCase, i) => {
    // Validate inputs
    const inputValidation = validateCaseInputs(session, simCase, i);
    normalizedInputsByCaseId[simCase.case_id] = inputValidation.normalizedInputs;
    findings.push(...inputValidation.findings);

    // If case has blocking input issues, fail closed to refusal output deterministically
    const outputsArtifacts = session.artifacts.OUTPUTS as Record<string, unknown> | null;
    const refusalOutput = String(outputsArtifacts?.refusal_output ?? 'REFUSE');

    let output = refusalOutput;
    let rulePath: string[] = [];
    if (inputValidation.findings.length === 0) {
      const evalRes = evaluateRules(session, simCase.inputs);
      output = evalRes.output;
      rulePath = evalRes.rulePath;
    }

    // Validate output is allowed
    if (!isAllowedOutput(session, output)) {
      findings.push({
        code: 'META_SIMULATION_INVALID_output_mismatch',
        severity: 'BLOCK',
        invariant: INVARIANTS.OUTPUTS_ARE_FINITE,
        field_path: `cases[${i}].expected_output`,
        message: 'Simulation output must be one of the allowed outputs.',
        next_action: 'FIX_RULES_OR_OUTPUTS',
        action_target: simCase.case_id,
      });
      // Fail closed to refusal for result shape determinism
      output = refusalOutput;
      rulePath = [];
    }

    const refusal = output === refusalOutput;

    const trace: Trace = {
      contract_version: contractVersion,
      policy_checks: policyChecks,
      rule_path: rulePath,
      refusal,
      // additionalProperties escape hatch:
      matched_rule: rulePath[0] ?? null,
    };

    // Assertion handling
    let assertionPassed: boolean | null = null;
    if (simCase.expected_output !== null) {
      assertionPassed = output === simCase.expected_output;
      if (!assertionPassed) {
        findings.push({
          code: 'META_SIMULATION_INVALID_output_mismatch',
          severity: 'BLOCK',
          invariant: INVARIANTS.OUTPUTS_ARE_FINITE,
          field_path: `cases[${i}].expected_output`,
          message: 'Simulation output did not match expected_output.',
          next_action: 'FIX_RULES_OR_OUTPUTS',
          action_target: simCase.case_id,
        });
      }
    }

    caseResults.push({
      case_id: simCase.case_id,
      output,
      trace,
      assertion_passed: assertionPassed,
    });
  });

  // Required asserted cases (only asserted count; exploratory do not)
  if (!hasAssertedValidCase(caseResults)) {
    findings.push({
      code: 'META_SIMULATION_MISSING_valid_case',
      severity: 'BLOCK',
      invariant: INVARIANTS.REPRODUCIBILITY_REQUIRED,
      field_path: 'cases',
      message: 'At least one asserted valid case is required.',
      next_action: 'ADD_VALID_CASE',
      action_target: null,
    });
  }

  if (!hasAssertedRefusalCase(caseResults)) {
    findings.push({
      code: 'META_SIMULATION_MISSING_refusal_case',
      severity: 'BLOCK',
      invariant: INVARIANTS.REFUSAL_IS_MANDATORY,
      field_path: 'cases',
      message: 'At least one asserted refusal case is required.',
      next_action: 'ADD_REFUSAL_CASE',
      action_target: null,
    });
  }

  // Non-reproducibility check
  findings.push(...detectNonReproducibleOutputs(caseResults, normalizedInputsByCaseId));

  return { caseResults, findings };
}
