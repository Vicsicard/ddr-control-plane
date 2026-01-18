/**
 * Meta DDR Simulation Assertions Tests
 * Phase 4: Assertion helper tests
 */

import {
  hasAssertedValidCase,
  hasAssertedRefusalCase,
  allAssertedCasesPassed,
  detectNonReproducibleOutputs,
} from '../../../src/simulation/assertions';
import { SimulationCaseResult } from '../../../src/types/simulation';

describe('simulation assertions', () => {
  describe('hasAssertedValidCase', () => {
    test('returns true when asserted valid case exists', () => {
      const results: SimulationCaseResult[] = [
        { case_id: 'c1', output: 'ALLOW', trace: { contract_version: '1.0', policy_checks: [], rule_path: ['r1'], refusal: false }, assertion_passed: true },
      ];
      expect(hasAssertedValidCase(results)).toBe(true);
    });

    test('returns false when only exploratory cases exist', () => {
      const results: SimulationCaseResult[] = [
        { case_id: 'c1', output: 'ALLOW', trace: { contract_version: '1.0', policy_checks: [], rule_path: ['r1'], refusal: false }, assertion_passed: null },
      ];
      expect(hasAssertedValidCase(results)).toBe(false);
    });

    test('returns false when only refusal cases exist', () => {
      const results: SimulationCaseResult[] = [
        { case_id: 'c1', output: 'REFUSE', trace: { contract_version: '1.0', policy_checks: [], rule_path: [], refusal: true }, assertion_passed: true },
      ];
      expect(hasAssertedValidCase(results)).toBe(false);
    });
  });

  describe('hasAssertedRefusalCase', () => {
    test('returns true when asserted refusal case exists', () => {
      const results: SimulationCaseResult[] = [
        { case_id: 'c1', output: 'REFUSE', trace: { contract_version: '1.0', policy_checks: [], rule_path: [], refusal: true }, assertion_passed: true },
      ];
      expect(hasAssertedRefusalCase(results)).toBe(true);
    });

    test('returns false when only valid cases exist', () => {
      const results: SimulationCaseResult[] = [
        { case_id: 'c1', output: 'ALLOW', trace: { contract_version: '1.0', policy_checks: [], rule_path: ['r1'], refusal: false }, assertion_passed: true },
      ];
      expect(hasAssertedRefusalCase(results)).toBe(false);
    });
  });

  describe('allAssertedCasesPassed', () => {
    test('returns true when all asserted cases pass', () => {
      const results: SimulationCaseResult[] = [
        { case_id: 'c1', output: 'ALLOW', trace: { contract_version: '1.0', policy_checks: [], rule_path: ['r1'], refusal: false }, assertion_passed: true },
        { case_id: 'c2', output: 'REFUSE', trace: { contract_version: '1.0', policy_checks: [], rule_path: [], refusal: true }, assertion_passed: true },
      ];
      expect(allAssertedCasesPassed(results)).toBe(true);
    });

    test('returns false when any asserted case fails', () => {
      const results: SimulationCaseResult[] = [
        { case_id: 'c1', output: 'ALLOW', trace: { contract_version: '1.0', policy_checks: [], rule_path: ['r1'], refusal: false }, assertion_passed: true },
        { case_id: 'c2', output: 'ALLOW', trace: { contract_version: '1.0', policy_checks: [], rule_path: ['r1'], refusal: false }, assertion_passed: false },
      ];
      expect(allAssertedCasesPassed(results)).toBe(false);
    });

    test('ignores exploratory cases', () => {
      const results: SimulationCaseResult[] = [
        { case_id: 'c1', output: 'ALLOW', trace: { contract_version: '1.0', policy_checks: [], rule_path: ['r1'], refusal: false }, assertion_passed: null },
      ];
      expect(allAssertedCasesPassed(results)).toBe(true);
    });
  });

  describe('detectNonReproducibleOutputs', () => {
    test('fires META_SIMULATION_VIOLATION_non_reproducible_trace when same inputs yield different outputs', () => {
      const results: SimulationCaseResult[] = [
        { case_id: 'c1', output: 'ALLOW', trace: { contract_version: '1.0', policy_checks: [], rule_path: ['r1'], refusal: false }, assertion_passed: true },
        { case_id: 'c2', output: 'REFUSE', trace: { contract_version: '1.0', policy_checks: [], rule_path: [], refusal: true }, assertion_passed: true },
      ];
      const normalized = {
        c1: '{"user_age":21}',
        c2: '{"user_age":21}', // same inputs as c1
      };
      const findings = detectNonReproducibleOutputs(results, normalized);
      expect(findings.some(f => f.code === 'META_SIMULATION_VIOLATION_non_reproducible_trace')).toBe(true);
    });

    test('no finding when same inputs yield same outputs', () => {
      const results: SimulationCaseResult[] = [
        { case_id: 'c1', output: 'ALLOW', trace: { contract_version: '1.0', policy_checks: [], rule_path: ['r1'], refusal: false }, assertion_passed: true },
        { case_id: 'c2', output: 'ALLOW', trace: { contract_version: '1.0', policy_checks: [], rule_path: ['r1'], refusal: false }, assertion_passed: true },
      ];
      const normalized = {
        c1: '{"user_age":21}',
        c2: '{"user_age":21}',
      };
      const findings = detectNonReproducibleOutputs(results, normalized);
      expect(findings.length).toBe(0);
    });

    test('no finding when different inputs yield different outputs', () => {
      const results: SimulationCaseResult[] = [
        { case_id: 'c1', output: 'ALLOW', trace: { contract_version: '1.0', policy_checks: [], rule_path: ['r1'], refusal: false }, assertion_passed: true },
        { case_id: 'c2', output: 'REFUSE', trace: { contract_version: '1.0', policy_checks: [], rule_path: [], refusal: true }, assertion_passed: true },
      ];
      const normalized = {
        c1: '{"user_age":21}',
        c2: '{"user_age":16}', // different inputs
      };
      const findings = detectNonReproducibleOutputs(results, normalized);
      expect(findings.length).toBe(0);
    });
  });
});
