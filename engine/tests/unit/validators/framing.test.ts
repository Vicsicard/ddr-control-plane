/**
 * Meta DDR FRAMING Validator Tests
 * Phase 2a: One test per reason code + exhaustive collection test
 */

import { validateFraming } from '../../../src/validators/framing';
import { createInitialSession } from '../../../src/types/session';

const baseSession = createInitialSession(
  'session-1',
  'meta.ddr.intake.v0_1',
  new Date().toISOString(),
  null
);

function validFraming() {
  return {
    decision_id: 'user_access_decision',
    decision_purpose: 'Determine whether to allow user access.',
    execution_trigger: 'on_request',
    explicit_authority: ['allow_access', 'deny_access'],
    explicit_non_authority: ['billing', 'notifications'],
    refusal_conditions: ['missing_credentials'],
    contract_version: '1.0.0',
  };
}

describe('FRAMING validator', () => {
  test('passes with valid framing artifacts', () => {
    const findings = validateFraming(validFraming(), baseSession);
    expect(findings).toHaveLength(0);
  });

  test('missing contract_version', () => {
    const artifacts = { ...validFraming(), contract_version: '' };
    const findings = validateFraming(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_VERSIONING_MISSING_contract_version');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing decision_id', () => {
    const artifacts = { ...validFraming(), decision_id: '' };
    const findings = validateFraming(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_FRAMING_MISSING_decision_id');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('invalid decision_id format', () => {
    const artifacts = { ...validFraming(), decision_id: 'bad id!' };
    const findings = validateFraming(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_FRAMING_INVALID_decision_id_format');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing operational purpose', () => {
    const artifacts = { ...validFraming(), decision_purpose: '' };
    const findings = validateFraming(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_FRAMING_MISSING_operational_purpose');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('non-operational purpose', () => {
    const artifacts = { ...validFraming(), decision_purpose: 'Improve user happiness' };
    const findings = validateFraming(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_FRAMING_INVALID_purpose_non_operational');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing execution trigger', () => {
    const artifacts = { ...validFraming(), execution_trigger: '' };
    const findings = validateFraming(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_FRAMING_MISSING_execution_trigger');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing explicit authority', () => {
    const artifacts = { ...validFraming(), explicit_authority: [] };
    const findings = validateFraming(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_FRAMING_MISSING_explicit_authority');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing explicit non-authority', () => {
    const artifacts = { ...validFraming(), explicit_non_authority: [] };
    const findings = validateFraming(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_FRAMING_MISSING_explicit_non_authority');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('authority conflict detected reports all overlaps', () => {
    const artifacts = {
      ...validFraming(),
      explicit_authority: ['allow_access', 'deny_access'],
      explicit_non_authority: ['allow_access', 'deny_access'],
    };
    const findings = validateFraming(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_FRAMING_CONFLICT_authority_vs_non_authority');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
    expect(f?.action_target).toContain('allow_access');
    expect(f?.action_target).toContain('deny_access');
  });

  test('missing refusal conditions', () => {
    const artifacts = { ...validFraming(), refusal_conditions: [] };
    const findings = validateFraming(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_FRAMING_MISSING_refusal_conditions');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('collects all findings exhaustively', () => {
    const artifacts = {
      decision_id: '',
      decision_purpose: '',
      execution_trigger: '',
      explicit_authority: [],
      explicit_non_authority: [],
      refusal_conditions: [],
      contract_version: '',
    };
    const findings = validateFraming(artifacts, baseSession);
    // At least: missing contract_version + decision_id + purpose + trigger + authority + non-authority + refusal
    expect(findings.length).toBeGreaterThanOrEqual(7);
  });

  test('null artifacts returns finding', () => {
    const findings = validateFraming(null, baseSession);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.code).toBe('META_FRAMING_MISSING_decision_id');
  });
});
