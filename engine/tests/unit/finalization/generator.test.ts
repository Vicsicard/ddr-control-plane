/**
 * Meta DDR Generator Tests
 * Phase 5: Contract artifact generation tests
 */

import { generateContract } from '../../../src/finalization/generator';
import { createInitialSession } from '../../../src/types/session';

function readySession(now: string) {
  const s = createInitialSession('s1', 'meta.ddr', now, null);

  s.stage_states.FRAMING = 'READY';
  s.stage_states.INPUTS = 'READY';
  s.stage_states.OUTPUTS = 'READY';
  s.stage_states.POLICIES = 'READY';
  s.stage_states.RULES = 'READY';
  s.stage_states.SIMULATION_FINALIZATION = 'READY';

  s.artifacts.FRAMING = {
    decision_id: 'age_gate',
    decision_purpose: 'Allow or refuse based on age.',
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
    policies: [{ policy_id: 'p1', statement: 'Do not allow under 18', timing: 'pre_rule', precedence: 1 }],
  };

  s.artifacts.RULES = {
    rules: [{ rule_id: 'r1', when: '{"all":[{"var":"user_age","op":">=","value":18}]}', then: 'ALLOW' }],
    coverage_confirmed: true,
    termination_confirmed: true,
  };

  return s;
}

describe('generateContract', () => {
  test('returns ContractArtifact with stable contract_id and hash', () => {
    const now = '2026-01-18T12:00:00.000Z';
    const s = readySession(now);

    const a1 = generateContract(s, '1.0.0', now);
    const a2 = generateContract(s, '1.0.0', now);

    expect(a1).not.toBeNull();
    expect(a2).not.toBeNull();

    expect(a1!.contract_id).toBe('age_gate@1.0.0');
    expect(a1!.hash).toBe(a2!.hash);
    expect(a1!.canonical_json).toBeDefined();
  });

  test('hash is deterministic for same inputs', () => {
    const now = '2026-01-18T12:00:00.000Z';
    const s1 = readySession(now);
    const s2 = readySession(now);

    const a1 = generateContract(s1, '1.0.0', now);
    const a2 = generateContract(s2, '1.0.0', now);

    expect(a1!.hash).toBe(a2!.hash);
  });

  test('hash changes when version changes', () => {
    const now = '2026-01-18T12:00:00.000Z';
    const s = readySession(now);

    const a1 = generateContract(s, '1.0.0', now);
    const a2 = generateContract(s, '2.0.0', now);

    expect(a1!.hash).not.toBe(a2!.hash);
  });

  test('hash changes when generatedAt changes', () => {
    const s = readySession('2026-01-18T12:00:00.000Z');

    const a1 = generateContract(s, '1.0.0', '2026-01-18T12:00:00.000Z');
    const a2 = generateContract(s, '1.0.0', '2026-01-18T13:00:00.000Z');

    expect(a1!.hash).not.toBe(a2!.hash);
  });

  test('returns null when FRAMING artifacts missing', () => {
    const now = '2026-01-18T12:00:00.000Z';
    const s = readySession(now);
    s.artifacts.FRAMING = null as unknown as Record<string, unknown>;

    const a = generateContract(s, '1.0.0', now);
    expect(a).toBeNull();
  });

  test('returns null when RULES artifacts missing', () => {
    const now = '2026-01-18T12:00:00.000Z';
    const s = readySession(now);
    s.artifacts.RULES = null as unknown as Record<string, unknown>;

    const a = generateContract(s, '1.0.0', now);
    expect(a).toBeNull();
  });

  test('canonical_json contains expected fields', () => {
    const now = '2026-01-18T12:00:00.000Z';
    const s = readySession(now);

    const a = generateContract(s, '1.0.0', now);

    expect(a!.canonical_json).toHaveProperty('meta_contract_id');
    expect(a!.canonical_json).toHaveProperty('contract_version');
    expect(a!.canonical_json).toHaveProperty('decision_id');
    expect(a!.canonical_json).toHaveProperty('framing');
    expect(a!.canonical_json).toHaveProperty('inputs');
    expect(a!.canonical_json).toHaveProperty('outputs');
    expect(a!.canonical_json).toHaveProperty('policies');
    expect(a!.canonical_json).toHaveProperty('rules');
    expect(a!.canonical_json).toHaveProperty('generated_at');
  });
});
