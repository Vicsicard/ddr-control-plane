/**
 * Meta DDR Generator Tests
 * Phase 5: Contract artifact generation tests
 */

import { generateContract, GenerateResult } from '../../../src/finalization/generator';
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
  test('returns ok:true with ContractArtifact on success', () => {
    const now = '2026-01-18T12:00:00.000Z';
    const s = readySession(now);

    const r1 = generateContract(s, '1.0.0', now);
    const r2 = generateContract(s, '1.0.0', now);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);

    if (r1.ok && r2.ok) {
      expect(r1.artifact.contract_id).toBe('age_gate@1.0.0');
      expect(r1.artifact.hash).toBe(r2.artifact.hash);
      expect(r1.artifact.canonical_json).toBeDefined();
    }
  });

  test('hash is deterministic for same inputs', () => {
    const now = '2026-01-18T12:00:00.000Z';
    const s1 = readySession(now);
    const s2 = readySession(now);

    const r1 = generateContract(s1, '1.0.0', now);
    const r2 = generateContract(s2, '1.0.0', now);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.artifact.hash).toBe(r2.artifact.hash);
    }
  });

  test('hash changes when version changes', () => {
    const now = '2026-01-18T12:00:00.000Z';
    const s = readySession(now);

    const r1 = generateContract(s, '1.0.0', now);
    const r2 = generateContract(s, '2.0.0', now);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.artifact.hash).not.toBe(r2.artifact.hash);
    }
  });

  test('hash changes when generatedAt changes', () => {
    const s = readySession('2026-01-18T12:00:00.000Z');

    const r1 = generateContract(s, '1.0.0', '2026-01-18T12:00:00.000Z');
    const r2 = generateContract(s, '1.0.0', '2026-01-18T13:00:00.000Z');

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.artifact.hash).not.toBe(r2.artifact.hash);
    }
  });

  test('returns MISSING_ARTIFACTS when FRAMING artifacts missing', () => {
    const now = '2026-01-18T12:00:00.000Z';
    const s = readySession(now);
    s.artifacts.FRAMING = null as unknown as Record<string, unknown>;

    const r = generateContract(s, '1.0.0', now);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.kind).toBe('MISSING_ARTIFACTS');
    }
  });

  test('returns MISSING_ARTIFACTS when RULES artifacts missing', () => {
    const now = '2026-01-18T12:00:00.000Z';
    const s = readySession(now);
    s.artifacts.RULES = null as unknown as Record<string, unknown>;

    const r = generateContract(s, '1.0.0', now);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.kind).toBe('MISSING_ARTIFACTS');
    }
  });

  test('canonical_json contains expected fields', () => {
    const now = '2026-01-18T12:00:00.000Z';
    const s = readySession(now);

    const r = generateContract(s, '1.0.0', now);

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.artifact.canonical_json).toHaveProperty('meta_contract_id');
      expect(r.artifact.canonical_json).toHaveProperty('contract_version');
      expect(r.artifact.canonical_json).toHaveProperty('decision_id');
      expect(r.artifact.canonical_json).toHaveProperty('framing');
      expect(r.artifact.canonical_json).toHaveProperty('inputs');
      expect(r.artifact.canonical_json).toHaveProperty('outputs');
      expect(r.artifact.canonical_json).toHaveProperty('policies');
      expect(r.artifact.canonical_json).toHaveProperty('rules');
      expect(r.artifact.canonical_json).toHaveProperty('generated_at');
    }
  });
});
