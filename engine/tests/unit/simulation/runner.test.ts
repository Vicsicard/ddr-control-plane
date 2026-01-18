/**
 * Meta DDR Simulation Runner Tests
 * Phase 4: Deterministic simulation engine tests
 */

import { runSimulationCases } from '../../../src/simulation/runner';
import { createInitialSession } from '../../../src/types/session';

function readySession() {
  const now = new Date().toISOString();
  const s = createInitialSession('s1', 'meta.ddr', now, null);

  // Mark required stages READY
  s.stage_states.FRAMING = 'READY';
  s.stage_states.INPUTS = 'READY';
  s.stage_states.OUTPUTS = 'READY';
  s.stage_states.POLICIES = 'READY';
  s.stage_states.RULES = 'READY';

  s.artifacts.FRAMING = {
    decision_id: 'age_gate',
    decision_purpose: 'Allow or refuse access based on age.',
    execution_trigger: 'on_signup',
    explicit_authority: ['access'],
    explicit_non_authority: ['pricing'],
    refusal_conditions: ['age missing', 'age < 18'],
    contract_version: '1.0.0',
  };

  s.artifacts.INPUTS = {
    inputs: [
      {
        input_name: 'user_age',
        input_type: 'number',
        input_source: 'user_profile',
        trust_level: 'verified',
        required: true,
        missing_input_behavior: 'REFUSE',
      },
    ],
    no_undeclared_inputs_confirmed: true,
  };

  s.artifacts.OUTPUTS = {
    output_schema: { type: 'string' },
    allowed_outputs: ['ALLOW', 'REFUSE'],
    terminal_states: ['ALLOW', 'REFUSE'],
    refusal_output: 'REFUSE',
    output_authority_level: 'system',
  };

  s.artifacts.POLICIES = {
    policies: [
      { policy_id: 'p1', statement: 'Do not allow under 18', timing: 'pre_rule', precedence: 1 },
    ],
  };

  // Rule: if user_age >= 18 => ALLOW else => REFUSE
  s.artifacts.RULES = {
    rules: [
      {
        rule_id: 'r1',
        when: JSON.stringify({ all: [{ var: 'user_age', op: '>=', value: 18 }] }),
        then: 'ALLOW',
      },
    ],
    coverage_confirmed: true,
    termination_confirmed: true,
  };

  return s;
}

describe('simulation runner', () => {
  test('happy path: asserted valid + asserted refusal pass', () => {
    const s = readySession();
    const { caseResults, findings } = runSimulationCases(s, [
      { case_id: 'c1', inputs: { user_age: 21 }, expected_output: 'ALLOW' },
      { case_id: 'c2', inputs: { user_age: 16 }, expected_output: 'REFUSE' },
    ]);

    expect(findings.length).toBe(0);
    expect(caseResults.length).toBe(2);
    expect(caseResults[0]?.assertion_passed).toBe(true);
    expect(caseResults[1]?.assertion_passed).toBe(true);
    expect(caseResults[0]?.trace.refusal).toBe(false);
    expect(caseResults[1]?.trace.refusal).toBe(true);
  });

  test('exploratory case does not satisfy asserted requirements', () => {
    const s = readySession();
    const { findings } = runSimulationCases(s, [
      { case_id: 'c1', inputs: { user_age: 21 }, expected_output: null }, // exploratory
      { case_id: 'c2', inputs: { user_age: 16 }, expected_output: 'REFUSE' }, // asserted refusal only
    ]);

    expect(findings.some(f => f.code === 'META_SIMULATION_MISSING_valid_case')).toBe(true);
  });

  test('missing refusal case triggers META_SIMULATION_MISSING_refusal_case', () => {
    const s = readySession();
    const { findings } = runSimulationCases(s, [
      { case_id: 'c1', inputs: { user_age: 21 }, expected_output: 'ALLOW' },
      { case_id: 'c2', inputs: { user_age: 25 }, expected_output: 'ALLOW' },
    ]);

    expect(findings.some(f => f.code === 'META_SIMULATION_MISSING_refusal_case')).toBe(true);
  });

  test('invalid input key triggers META_SIMULATION_INVALID_input_values', () => {
    const s = readySession();
    const { findings } = runSimulationCases(s, [
      { case_id: 'c1', inputs: { unknown_field: 1 }, expected_output: 'REFUSE' },
      { case_id: 'c2', inputs: { user_age: 16 }, expected_output: 'REFUSE' },
    ]);

    expect(findings.some(f => f.code === 'META_SIMULATION_INVALID_input_values')).toBe(true);
  });

  test('missing required input triggers META_SIMULATION_INVALID_input_values', () => {
    const s = readySession();
    const { findings } = runSimulationCases(s, [
      { case_id: 'c1', inputs: {}, expected_output: 'REFUSE' }, // missing required user_age
      { case_id: 'c2', inputs: { user_age: 16 }, expected_output: 'REFUSE' },
    ]);

    expect(findings.some(f => f.code === 'META_SIMULATION_INVALID_input_values')).toBe(true);
  });

  test('invalid type triggers META_SIMULATION_INVALID_input_values', () => {
    const s = readySession();
    const { findings } = runSimulationCases(s, [
      { case_id: 'c1', inputs: { user_age: '21' }, expected_output: 'ALLOW' }, // string instead of number
      { case_id: 'c2', inputs: { user_age: 16 }, expected_output: 'REFUSE' },
    ]);

    expect(findings.some(f => f.code === 'META_SIMULATION_INVALID_input_values')).toBe(true);
  });

  test('assertion mismatch triggers META_SIMULATION_INVALID_output_mismatch', () => {
    const s = readySession();
    const { findings, caseResults } = runSimulationCases(s, [
      { case_id: 'c1', inputs: { user_age: 21 }, expected_output: 'REFUSE' }, // wrong expectation
      { case_id: 'c2', inputs: { user_age: 16 }, expected_output: 'REFUSE' },
    ]);

    expect(findings.some(f => f.code === 'META_SIMULATION_INVALID_output_mismatch')).toBe(true);
    expect(caseResults[0]?.assertion_passed).toBe(false);
  });

  test('trace includes contract_version and policy_checks', () => {
    const s = readySession();
    const { caseResults } = runSimulationCases(s, [
      { case_id: 'c1', inputs: { user_age: 21 }, expected_output: 'ALLOW' },
      { case_id: 'c2', inputs: { user_age: 16 }, expected_output: 'REFUSE' },
    ]);

    expect(caseResults[0]?.trace.contract_version).toBe('1.0.0');
    expect(caseResults[0]?.trace.policy_checks).toEqual(['p1']);
    expect(caseResults[0]?.trace.rule_path).toEqual(['r1']);
  });

  test('rule evaluation is deterministic - first match wins', () => {
    const s = readySession();
    // Add a second rule that also matches
    (s.artifacts.RULES as any).rules.push({
      rule_id: 'r2',
      when: JSON.stringify({ all: [{ var: 'user_age', op: '>=', value: 18 }] }),
      then: 'REFUSE', // different output
    });

    const { caseResults } = runSimulationCases(s, [
      { case_id: 'c1', inputs: { user_age: 21 }, expected_output: 'ALLOW' },
      { case_id: 'c2', inputs: { user_age: 16 }, expected_output: 'REFUSE' },
    ]);

    // First rule should win
    expect(caseResults[0]?.output).toBe('ALLOW');
    expect(caseResults[0]?.trace.rule_path).toEqual(['r1']);
  });

  test('no matching rule results in refusal', () => {
    const s = readySession();
    const { caseResults } = runSimulationCases(s, [
      { case_id: 'c1', inputs: { user_age: 21 }, expected_output: 'ALLOW' },
      { case_id: 'c2', inputs: { user_age: 16 }, expected_output: 'REFUSE' },
    ]);

    // user_age 16 doesn't match the >= 18 rule, so refusal
    expect(caseResults[1]?.output).toBe('REFUSE');
    expect(caseResults[1]?.trace.rule_path).toEqual([]);
  });

  test('empty cases triggers missing valid and refusal case findings', () => {
    const s = readySession();
    const { findings } = runSimulationCases(s, []);

    expect(findings.some(f => f.code === 'META_SIMULATION_MISSING_valid_case')).toBe(true);
    expect(findings.some(f => f.code === 'META_SIMULATION_MISSING_refusal_case')).toBe(true);
  });
});
