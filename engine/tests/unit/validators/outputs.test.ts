/**
 * Meta DDR OUTPUTS Validator Tests
 * Phase 2c: One test per reason code + exhaustive collection test
 */

import { validateOutputs } from '../../../src/validators/outputs';
import { createInitialSession } from '../../../src/types/session';

const baseSession = createInitialSession(
  'session-1',
  'meta.ddr.intake.v0_1',
  new Date().toISOString(),
  null
);

function validOutputs() {
  return {
    output_schema: { type: 'string' },
    allowed_outputs: ['APPROVE', 'DENY'],
    refusal_output: 'DENY',
    output_authority_level: 'system',
  };
}

describe('OUTPUTS validator', () => {
  test('passes with valid outputs', () => {
    const findings = validateOutputs(validOutputs(), baseSession);
    expect(findings).toHaveLength(0);
  });

  test('missing output schema', () => {
    const findings = validateOutputs({}, baseSession);
    const f = findings.find(x =>
      x.code === 'META_OUTPUTS_MISSING_output_schema'
    );
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing allowed outputs', () => {
    const artifacts = { ...validOutputs(), allowed_outputs: undefined };
    const findings = validateOutputs(artifacts, baseSession);
    const f = findings.find(x =>
      x.code === 'META_OUTPUTS_MISSING_allowed_outputs'
    );
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('empty allowed outputs', () => {
    const artifacts = { ...validOutputs(), allowed_outputs: [] };
    const findings = validateOutputs(artifacts, baseSession);
    const f = findings.find(x =>
      x.code === 'META_OUTPUTS_INVALID_allowed_outputs_empty'
    );
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('duplicate allowed outputs', () => {
    const artifacts = {
      ...validOutputs(),
      allowed_outputs: ['APPROVE', 'APPROVE'],
    };
    const findings = validateOutputs(artifacts, baseSession);
    const f = findings.find(x =>
      x.code === 'META_OUTPUTS_CONFLICT_duplicate_output_value'
    );
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing refusal output', () => {
    const artifacts = { ...validOutputs(), refusal_output: '' };
    const findings = validateOutputs(artifacts, baseSession);
    const f = findings.find(x =>
      x.code === 'META_OUTPUTS_MISSING_refusal_output'
    );
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('refusal output not allowed', () => {
    const artifacts = {
      ...validOutputs(),
      refusal_output: 'ESCALATE',
    };
    const findings = validateOutputs(artifacts, baseSession);
    const f = findings.find(x =>
      x.code === 'META_OUTPUTS_INVALID_refusal_output_not_allowed'
    );
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing authority level', () => {
    const artifacts = { ...validOutputs(), output_authority_level: '' };
    const findings = validateOutputs(artifacts, baseSession);
    const f = findings.find(x =>
      x.code === 'META_OUTPUTS_MISSING_authority_level'
    );
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('collects findings exhaustively', () => {
    const artifacts = {
      output_schema: null,
      allowed_outputs: [],
      refusal_output: '',
      output_authority_level: '',
    };
    const findings = validateOutputs(artifacts, baseSession);
    // At least: schema + empty outputs + refusal + authority
    expect(findings.length).toBeGreaterThanOrEqual(4);
  });

  test('null artifacts returns finding', () => {
    const findings = validateOutputs(null, baseSession);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.code).toBe('META_OUTPUTS_MISSING_output_schema');
  });
});
