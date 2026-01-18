/**
 * Meta DDR RULES Validator Tests
 * Phase 2e: One test per reason code + exhaustive collection test
 */

import { validateRules } from '../../../src/validators/rules';
import { createInitialSession } from '../../../src/types/session';

function baseSessionWithIO() {
  const session = createInitialSession(
    'session-1',
    'meta.ddr.intake.v0_1',
    new Date().toISOString(),
    null
  );

  session.artifacts.INPUTS = {
    inputs: [
      {
        input_name: 'age',
        input_type: 'number',
        input_source: 'request',
        trust_level: 'trusted',
        required: true,
        missing_input_behavior: 'reject',
      },
    ],
    no_undeclared_inputs_confirmed: true,
  };

  session.artifacts.OUTPUTS = {
    output_schema: {},
    allowed_outputs: ['ALLOW', 'DENY'],
    terminal_states: ['DENY'],
    refusal_output: 'DENY',
    output_authority_level: 'system',
  };

  return session;
}

function validRules() {
  return {
    rules: [
      {
        rule_id: 'r1',
        when: 'age >= 18',
        then: 'ALLOW',
      },
    ],
    coverage_confirmed: true,
    termination_confirmed: true,
  };
}

describe('RULES validator', () => {
  test('passes with valid rules', () => {
    const findings = validateRules(validRules(), baseSessionWithIO());
    expect(findings).toHaveLength(0);
  });

  test('missing rules', () => {
    const findings = validateRules({}, baseSessionWithIO());
    const f = findings.find(x => x.code === 'META_RULES_MISSING_rules');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing when clause', () => {
    const artifacts = {
      rules: [{ rule_id: 'r1', when: '', then: 'ALLOW' }],
      coverage_confirmed: true,
      termination_confirmed: true,
    };
    const findings = validateRules(artifacts, baseSessionWithIO());
    const f = findings.find(x => x.code === 'META_RULES_INVALID_rule_expression');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('non-deterministic operator', () => {
    const artifacts = {
      rules: [{ rule_id: 'r1', when: 'Math.random() > 0.5', then: 'ALLOW' }],
      coverage_confirmed: true,
      termination_confirmed: true,
    };
    const findings = validateRules(artifacts, baseSessionWithIO());
    const f = findings.find(x => x.code === 'META_RULES_VIOLATION_nondeterministic_operator');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('hidden state dependency', () => {
    const artifacts = {
      rules: [{ rule_id: 'r1', when: 'session.user_id == 1', then: 'ALLOW' }],
      coverage_confirmed: true,
      termination_confirmed: true,
    };
    const findings = validateRules(artifacts, baseSessionWithIO());
    const f = findings.find(x => x.code === 'META_RULES_VIOLATION_hidden_state_dependency');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('undeclared input reference', () => {
    const artifacts = {
      rules: [{ rule_id: 'r1', when: 'score > 10', then: 'ALLOW' }],
      coverage_confirmed: true,
      termination_confirmed: true,
    };
    const findings = validateRules(artifacts, baseSessionWithIO());
    const f = findings.find(x => x.code === 'META_RULES_VIOLATION_undeclared_input_reference');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('output not allowed', () => {
    const artifacts = {
      rules: [{ rule_id: 'r1', when: 'age >= 18', then: 'GRANT' }],
      coverage_confirmed: true,
      termination_confirmed: true,
    };
    const findings = validateRules(artifacts, baseSessionWithIO());
    const f = findings.find(x => x.code === 'META_RULES_INVALID_output_not_allowed');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing termination confirmation', () => {
    const artifacts = {
      rules: [{ rule_id: 'r1', when: 'age >= 18', then: 'ALLOW' }],
      coverage_confirmed: true,
    };
    const findings = validateRules(artifacts, baseSessionWithIO());
    const f = findings.find(x => x.code === 'META_RULES_VIOLATION_non_terminating_path');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing coverage confirmation', () => {
    const artifacts = {
      rules: [{ rule_id: 'r1', when: 'age >= 18', then: 'ALLOW' }],
      termination_confirmed: true,
    };
    const findings = validateRules(artifacts, baseSessionWithIO());
    const f = findings.find(x => x.code === 'META_RULES_INCOMPLETE_coverage_not_proven');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('mutates input', () => {
    const artifacts = {
      rules: [{ rule_id: 'r1', when: 'age >= 18', then: 'age = 0' }],
      coverage_confirmed: true,
      termination_confirmed: true,
    };
    const findings = validateRules(artifacts, baseSessionWithIO());
    const f = findings.find(x => x.code === 'META_RULES_VIOLATION_mutates_inputs');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('collects findings exhaustively', () => {
    const artifacts = {
      rules: [
        { rule_id: 'r1', when: 'Math.random()', then: 'UNKNOWN' },
      ],
      coverage_confirmed: false,
      termination_confirmed: false,
    };
    const findings = validateRules(artifacts, baseSessionWithIO());
    // At least: nondeterminism + output not allowed + coverage + termination
    expect(findings.length).toBeGreaterThan(2);
  });

  test('null artifacts returns finding', () => {
    const findings = validateRules(null, baseSessionWithIO());
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.code).toBe('META_RULES_MISSING_rules');
  });
});
