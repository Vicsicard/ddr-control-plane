/**
 * Meta DDR Engine - Unit Tests
 * Phase 1: Skeleton verification tests
 */

import { MetaDDREngine } from '../../src/engine';
import { createTestSession, createAcceptedSession, TEST_NOW, VALID_FRAMING_ARTIFACTS } from '../fixtures/sessions';
import { GLOBAL_CODES } from '../../src/reason-codes';

describe('MetaDDREngine', () => {
  let engine: MetaDDREngine;

  beforeEach(() => {
    engine = new MetaDDREngine();
  });

  describe('evaluateStage', () => {
    it('should reject submissions to terminal sessions', () => {
      const session = createAcceptedSession();
      const result = engine.evaluateStage(session, 'FRAMING', VALID_FRAMING_ARTIFACTS, TEST_NOW);

      expect(result.decision).toBe('REJECT');
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]?.code).toBe(GLOBAL_CODES.VIOLATION_SESSION_ALREADY_FINALIZED);
    });

    it('should reject direct submissions to SIMULATION_FINALIZATION', () => {
      const session = createTestSession();
      const result = engine.evaluateStage(session, 'SIMULATION_FINALIZATION', {}, TEST_NOW);

      expect(result.decision).toBe('REJECT');
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]?.code).toBe(GLOBAL_CODES.VIOLATION_SIMULATION_STAGE_NOT_SUBMITTABLE);
    });

    it('should reject submissions to future stages', () => {
      const session = createTestSession(); // Stage is FRAMING
      const result = engine.evaluateStage(session, 'OUTPUTS', {}, TEST_NOW);

      expect(result.decision).toBe('REJECT');
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]?.code).toBe(GLOBAL_CODES.INCONSISTENT_STAGE_STATE);
    });

    it('should allow submissions to current stage', () => {
      const session = createTestSession();
      const result = engine.evaluateStage(session, 'FRAMING', VALID_FRAMING_ARTIFACTS, TEST_NOW);

      // With stub validators, this should return ALLOW
      expect(result.decision).toBe('ALLOW');
      expect(result.stage_state).toBe('READY');
      expect(result.can_proceed).toBe(true);
    });

    it('should include server_time in result', () => {
      const session = createTestSession();
      const result = engine.evaluateStage(session, 'FRAMING', VALID_FRAMING_ARTIFACTS, TEST_NOW);

      expect(result.server_time).toBe(TEST_NOW);
    });
  });

  describe('requestTransition', () => {
    it('should reject transitions on terminal sessions', () => {
      const session = createAcceptedSession();
      const result = engine.requestTransition(session, 'FRAMING', 'INPUTS', TEST_NOW);

      expect(result.decision).toBe('REJECT');
      expect(result.findings[0]?.code).toBe(GLOBAL_CODES.VIOLATION_SESSION_ALREADY_FINALIZED);
    });

    it('should reject transitions when fromStage does not match current stage', () => {
      const session = createTestSession(); // Stage is FRAMING
      const result = engine.requestTransition(session, 'INPUTS', 'OUTPUTS', TEST_NOW);

      expect(result.decision).toBe('REJECT');
      expect(result.findings[0]?.code).toBe(GLOBAL_CODES.INCONSISTENT_STAGE_STATE);
    });

    it('should reject backward transitions', () => {
      const session = { ...createTestSession(), stage: 'OUTPUTS' as const };
      const result = engine.requestTransition(session, 'OUTPUTS', 'INPUTS', TEST_NOW);

      expect(result.decision).toBe('REJECT');
    });

    it('should reject skip transitions', () => {
      const session = createTestSession();
      const result = engine.requestTransition(session, 'FRAMING', 'OUTPUTS', TEST_NOW);

      expect(result.decision).toBe('REJECT');
    });
  });

  describe('runSimulation', () => {
    it('should reject simulation on terminal sessions', () => {
      const session = createAcceptedSession();
      const result = engine.runSimulation(session, [], TEST_NOW);

      expect(result.decision).toBe('REJECT');
      expect(result.findings[0]?.code).toBe(GLOBAL_CODES.VIOLATION_SESSION_ALREADY_FINALIZED);
    });

    it('should block simulation when prior stages are not ready', () => {
      const session = createTestSession(); // All stages INCOMPLETE
      const result = engine.runSimulation(session, [], TEST_NOW);

      expect(result.decision).toBe('BLOCK');
      expect(result.findings.length).toBeGreaterThan(0);
    });
  });

  describe('finalize', () => {
    it('should reject finalization on terminal sessions', () => {
      const session = createAcceptedSession();
      const result = engine.finalize(session, true, '1.0.0', TEST_NOW);

      expect(result.decision).toBe('REJECT');
      expect(result.findings[0]?.code).toBe(GLOBAL_CODES.VIOLATION_SESSION_ALREADY_FINALIZED);
    });

    it('should block finalization without acceptance confirmation', () => {
      const session = createTestSession();
      const result = engine.finalize(session, false, '1.0.0', TEST_NOW);

      expect(result.decision).toBe('BLOCK');
      expect(result.contract_artifact).toBeNull();
    });

    it('should block finalization when stages are not ready', () => {
      const session = createTestSession(); // All stages INCOMPLETE
      const result = engine.finalize(session, true, '1.0.0', TEST_NOW);

      expect(result.decision).toBe('BLOCK');
      expect(result.contract_artifact).toBeNull();
    });
  });
});
