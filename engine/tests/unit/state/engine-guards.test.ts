/**
 * Meta DDR Engine Guards Tests
 * Phase 3: Engine-level enforcement with frozen reason codes
 */

import { engine } from '../../../src/engine';
import { createInitialSession } from '../../../src/types/session';

const now = new Date().toISOString();

describe('engine guards', () => {
  test('rejects mutation on terminal session (ACCEPTED)', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    s.terminal_status = 'ACCEPTED';

    const res = engine.evaluateStage(s, 'FRAMING', {}, now);
    expect(res.decision).toBe('REJECT');
    expect(res.findings.length).toBeGreaterThan(0);
    expect(res.findings[0]?.code).toBe('META_GLOBAL_VIOLATION_session_already_finalized');
  });

  test('rejects mutation on terminal session (REJECTED)', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    s.terminal_status = 'REJECTED';

    const res = engine.evaluateStage(s, 'FRAMING', {}, now);
    expect(res.decision).toBe('REJECT');
    expect(res.findings.length).toBeGreaterThan(0);
    expect(res.findings[0]?.code).toBe('META_GLOBAL_VIOLATION_session_already_finalized');
  });

  test('rejects submission to future stage', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    // pointer at FRAMING
    const res = engine.evaluateStage(s, 'OUTPUTS', {}, now);
    expect(res.decision).toBe('REJECT');
    expect(res.findings.some(f => f.code === 'META_GLOBAL_INCONSISTENT_stage_state')).toBe(true);
  });

  test('rejects direct submission to SIMULATION_FINALIZATION', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    s.stage = 'SIMULATION_FINALIZATION'; // pointer there
    const res = engine.evaluateStage(s, 'SIMULATION_FINALIZATION', {}, now);
    expect(res.decision).toBe('REJECT');
    expect(res.findings.length).toBeGreaterThan(0);
    expect(res.findings[0]?.code).toBe('META_GLOBAL_VIOLATION_simulation_stage_not_submittable');
  });

  test('allows patching earlier stages', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    s.stage = 'OUTPUTS'; // pointer at OUTPUTS

    // Should allow submission to FRAMING (earlier stage)
    const res = engine.evaluateStage(s, 'FRAMING', {
      decision_id: 'test_decision',
      decision_purpose: 'Test purpose that must be operational.',
      execution_trigger: 'on_request',
      explicit_authority: ['allow'],
      explicit_non_authority: ['deny'],
      refusal_conditions: ['missing_data'],
      contract_version: '1.0.0',
    }, now);

    // Should not be REJECT for stage ordering
    expect(res.decision).not.toBe('REJECT');
    expect(res.findings.every(f => f.code !== 'META_GLOBAL_INCONSISTENT_stage_state')).toBe(true);
  });

  test('rejects transition if fromStage != current stage', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    // Current stage is FRAMING, but trying to transition from INPUTS
    const res = engine.requestTransition(s, 'INPUTS', 'OUTPUTS', now);
    expect(res.decision).toBe('REJECT');
    expect(res.findings.some(f => f.code === 'META_GLOBAL_INCONSISTENT_stage_state')).toBe(true);
  });

  test('rejects invalid transition (skip)', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    s.stage_states.FRAMING = 'READY';
    const res = engine.requestTransition(s, 'FRAMING', 'OUTPUTS', now);
    expect(res.decision).toBe('REJECT');
    expect(res.findings.some(f => f.code === 'META_GLOBAL_INCONSISTENT_stage_state')).toBe(true);
  });

  test('rejects invalid transition (backward)', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    s.stage = 'OUTPUTS';
    s.stage_states.OUTPUTS = 'READY';
    const res = engine.requestTransition(s, 'OUTPUTS', 'FRAMING', now);
    expect(res.decision).toBe('REJECT');
    expect(res.findings.some(f => f.code === 'META_GLOBAL_INCONSISTENT_stage_state')).toBe(true);
  });

  test('blocks transition when current stage not READY', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    s.stage_states.FRAMING = 'INCOMPLETE';
    const res = engine.requestTransition(s, 'FRAMING', 'INPUTS', now);
    expect(res.decision).toBe('BLOCK');
  });

  test('allows valid transition when stage is READY', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    s.stage_states.FRAMING = 'READY';
    const res = engine.requestTransition(s, 'FRAMING', 'INPUTS', now);
    expect(res.decision).toBe('ALLOW');
    expect(res.updated_session.stage).toBe('INPUTS');
  });

  test('rejects simulation on terminal session', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    s.terminal_status = 'REJECTED';
    const res = engine.runSimulation(s, [], now);
    expect(res.decision).toBe('REJECT');
    expect(res.findings.length).toBeGreaterThan(0);
    expect(res.findings[0]?.code).toBe('META_GLOBAL_VIOLATION_session_already_finalized');
  });

  test('blocks simulation when prior stages not ready', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    // All stages INCOMPLETE
    const res = engine.runSimulation(s, [], now);
    expect(res.decision).toBe('BLOCK');
    expect(res.findings.some(f => f.code === 'META_SIMULATION_INCOMPLETE_stages_not_ready')).toBe(true);
  });

  test('rejects finalization on terminal session', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    s.terminal_status = 'ACCEPTED';
    const res = engine.finalize(s, true, undefined, now);
    expect(res.decision).toBe('REJECT');
    expect(res.findings.length).toBeGreaterThan(0);
    expect(res.findings[0]?.code).toBe('META_GLOBAL_VIOLATION_session_already_finalized');
  });

  test('blocks finalization without acceptance confirmation', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    const res = engine.finalize(s, false, undefined, now);
    expect(res.decision).toBe('BLOCK');
    expect(res.findings.length).toBeGreaterThan(0);
    expect(res.findings[0]?.code).toBe('META_FINALIZATION_MISSING_acceptance_confirmation');
  });

  test('blocks finalization when stages not ready - uses frozen codes', () => {
    const s = createInitialSession('s1', 'meta.ddr', now, null);
    // All stages INCOMPLETE
    const res = engine.finalize(s, true, undefined, now);
    expect(res.decision).toBe('BLOCK');
    // Should use META_SIMULATION_INCOMPLETE_stages_not_ready for prior stages
    expect(res.findings.some(f => f.code === 'META_SIMULATION_INCOMPLETE_stages_not_ready')).toBe(true);
    // Should use META_FINALIZATION_INCOMPLETE_simulation_not_passed for simulation stage
    expect(res.findings.some(f => f.code === 'META_FINALIZATION_INCOMPLETE_simulation_not_passed')).toBe(true);
  });
});
