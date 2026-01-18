/**
 * Meta DDR POLICIES Validator Tests
 * Phase 2d: One test per reason code + exhaustive collection test
 */

import { validatePolicies } from '../../../src/validators/policies';
import { createInitialSession } from '../../../src/types/session';

const baseSession = createInitialSession(
  'session-1',
  'meta.ddr.intake.v0_1',
  new Date().toISOString(),
  null
);

function validPolicies() {
  return {
    policies: [
      {
        policy_id: 'p1',
        statement: 'Access must not be granted if risk score exceeds threshold.',
        timing: 'pre_rule',
        precedence: 1,
      },
    ],
  };
}

describe('POLICIES validator', () => {
  test('passes with valid policies', () => {
    const findings = validatePolicies(validPolicies(), baseSession);
    expect(findings).toHaveLength(0);
  });

  test('missing policies array', () => {
    const findings = validatePolicies({}, baseSession);
    const f = findings.find(x => x.code === 'META_POLICIES_MISSING_policies');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing policy statement', () => {
    const artifacts = {
      policies: [
        { policy_id: 'p1', statement: '', timing: 'pre_rule', precedence: 1 },
      ],
    };
    const findings = validatePolicies(artifacts, baseSession);
    const f = findings.find(x =>
      x.code === 'META_POLICIES_MISSING_policy_statement'
    );
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('unbounded policy statement', () => {
    const artifacts = {
      policies: [
        {
          policy_id: 'p1',
          statement: 'Ensure fairness at all times.',
          timing: 'pre_rule',
          precedence: 1,
        },
      ],
    };
    const findings = validatePolicies(artifacts, baseSession);
    const f = findings.find(x =>
      x.code === 'META_POLICIES_INVALID_policy_unbounded'
    );
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('policy generates outcome', () => {
    const artifacts = {
      policies: [
        {
          policy_id: 'p1',
          statement: 'If age < 18 then deny access.',
          timing: 'pre_rule',
          precedence: 1,
        },
      ],
    };
    const findings = validatePolicies(artifacts, baseSession);
    const f = findings.find(x =>
      x.code === 'META_POLICIES_VIOLATION_policy_generates_outcome'
    );
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('missing precedence', () => {
    const artifacts = {
      policies: [
        {
          policy_id: 'p1',
          statement: 'Access must not be granted if flagged.',
          timing: 'pre_rule',
        },
      ],
    };
    const findings = validatePolicies(artifacts, baseSession);
    const f = findings.find(x =>
      x.code === 'META_POLICIES_MISSING_precedence'
    );
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('conflicting precedence', () => {
    const artifacts = {
      policies: [
        {
          policy_id: 'p1',
          statement: 'Access must not be granted if flagged.',
          timing: 'pre_rule',
          precedence: 1,
        },
        {
          policy_id: 'p2',
          statement: 'Access must not be granted if blacklisted.',
          timing: 'pre_rule',
          precedence: 1,
        },
      ],
    };
    const findings = validatePolicies(artifacts, baseSession);
    const f = findings.find(x =>
      x.code === 'META_POLICIES_CONFLICT_policy_conflict'
    );
    expect(f).toBeDefined();
    expect(f?.severity).toBe('BLOCK');
  });

  test('collects findings exhaustively', () => {
    const artifacts = {
      policies: [
        {
          policy_id: 'p1',
          statement: '',
          timing: 'pre_rule',
          precedence: undefined,
        },
      ],
    };
    const findings = validatePolicies(artifacts, baseSession);
    // At least: missing statement + missing precedence
    expect(findings.length).toBeGreaterThanOrEqual(2);
  });

  test('null artifacts returns finding', () => {
    const findings = validatePolicies(null, baseSession);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.code).toBe('META_POLICIES_MISSING_policies');
  });
});
