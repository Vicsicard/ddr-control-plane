/**
 * Meta DDR INPUTS Validator Tests
 * Phase 2b: One test per reason code + exhaustive collection test
 */

import { validateInputs } from '../../../src/validators/inputs';
import { createInitialSession } from '../../../src/types/session';

const baseSession = createInitialSession(
  'session-1',
  'meta.ddr.intake.v0_1',
  new Date().toISOString(),
  null
);

function validInputs() {
  return {
    inputs: [
      {
        input_name: 'user_id',
        input_type: 'string',
        input_source: 'request',
        trust_level: 'trusted',
        required: true,
        missing_input_behavior: 'refuse',
      },
    ],
    no_undeclared_inputs_confirmed: true,
  };
}

describe('INPUTS validator', () => {
  test('passes with valid inputs', () => {
    const findings = validateInputs(validInputs(), baseSession);
    expect(findings).toHaveLength(0);
  });

  test('missing inputs array', () => {
    const findings = validateInputs({}, baseSession);
    const f = findings.find(x => x.code === 'META_INPUTS_MISSING_inputs');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('implicit inputs not confirmed', () => {
    const artifacts = { ...validInputs(), no_undeclared_inputs_confirmed: false };
    const findings = validateInputs(artifacts, baseSession);
    const f = findings.find(x =>
      x.code === 'META_INPUTS_VIOLATION_implicit_input_detected'
    );
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('duplicate input names', () => {
    const artifacts = {
      inputs: [
        { ...validInputs().inputs[0] },
        { ...validInputs().inputs[0] },
      ],
      no_undeclared_inputs_confirmed: true,
    };
    const findings = validateInputs(artifacts, baseSession);
    const f = findings.find(x =>
      x.code === 'META_INPUTS_CONFLICT_duplicate_input_name'
    );
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing input name', () => {
    const artifacts = {
      inputs: [
        {
          ...validInputs().inputs[0],
          input_name: '',
        },
      ],
      no_undeclared_inputs_confirmed: true,
    };
    const findings = validateInputs(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_INPUTS_MISSING_input_name');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing input type', () => {
    const artifacts = {
      inputs: [
        {
          ...validInputs().inputs[0],
          input_type: '',
        },
      ],
      no_undeclared_inputs_confirmed: true,
    };
    const findings = validateInputs(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_INPUTS_MISSING_input_type');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing input source', () => {
    const artifacts = {
      inputs: [
        {
          ...validInputs().inputs[0],
          input_source: '',
        },
      ],
      no_undeclared_inputs_confirmed: true,
    };
    const findings = validateInputs(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_INPUTS_MISSING_input_source');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing trust level', () => {
    const artifacts = {
      inputs: [
        {
          ...validInputs().inputs[0],
          trust_level: '',
        },
      ],
      no_undeclared_inputs_confirmed: true,
    };
    const findings = validateInputs(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_INPUTS_MISSING_trust_level');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing required flag', () => {
    const artifacts = {
      inputs: [
        {
          ...validInputs().inputs[0],
          required: undefined,
        },
      ],
      no_undeclared_inputs_confirmed: true,
    };
    const findings = validateInputs(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_INPUTS_MISSING_required_flag');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing missing_input_behavior', () => {
    const artifacts = {
      inputs: [
        {
          ...validInputs().inputs[0],
          missing_input_behavior: '',
        },
      ],
      no_undeclared_inputs_confirmed: true,
    };
    const findings = validateInputs(artifacts, baseSession);
    const f = findings.find(x => x.code === 'META_INPUTS_MISSING_missing_input_behavior');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('collects findings exhaustively', () => {
    const artifacts = {
      inputs: [
        {
          input_name: '',
          input_type: '',
          input_source: '',
          trust_level: '',
          required: undefined,
          missing_input_behavior: '',
        },
      ],
      no_undeclared_inputs_confirmed: false,
    };
    const findings = validateInputs(artifacts, baseSession);
    // At least: implicit input + missing name + type + source + trust + required + behavior
    expect(findings.length).toBeGreaterThanOrEqual(7);
  });

  test('null artifacts returns finding', () => {
    const findings = validateInputs(null, baseSession);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.code).toBe('META_INPUTS_MISSING_inputs');
  });
});
