/**
 * Meta DDR Transitions Tests
 * Phase 3: Stage ordering and patching rules
 */

import {
  isValidTransition,
  getNextStage,
  canSubmitToStage,
  canSubmitToStagePointer,
} from '../../../src/state/transitions';

describe('transitions', () => {
  test('valid transition is forward by one', () => {
    expect(isValidTransition('FRAMING', 'INPUTS')).toBe(true);
    expect(isValidTransition('INPUTS', 'OUTPUTS')).toBe(true);
    expect(isValidTransition('OUTPUTS', 'POLICIES')).toBe(true);
    expect(isValidTransition('POLICIES', 'RULES')).toBe(true);
    expect(isValidTransition('RULES', 'SIMULATION_FINALIZATION')).toBe(true);
  });

  test('invalid transition - skip stages', () => {
    expect(isValidTransition('FRAMING', 'OUTPUTS')).toBe(false);
    expect(isValidTransition('FRAMING', 'RULES')).toBe(false);
    expect(isValidTransition('INPUTS', 'POLICIES')).toBe(false);
  });

  test('invalid transition - backward', () => {
    expect(isValidTransition('INPUTS', 'FRAMING')).toBe(false);
    expect(isValidTransition('RULES', 'FRAMING')).toBe(false);
    expect(isValidTransition('SIMULATION_FINALIZATION', 'RULES')).toBe(false);
  });

  test('invalid transition - same stage', () => {
    expect(isValidTransition('FRAMING', 'FRAMING')).toBe(false);
    expect(isValidTransition('RULES', 'RULES')).toBe(false);
  });

  test('getNextStage returns correct next stage', () => {
    expect(getNextStage('FRAMING')).toBe('INPUTS');
    expect(getNextStage('INPUTS')).toBe('OUTPUTS');
    expect(getNextStage('OUTPUTS')).toBe('POLICIES');
    expect(getNextStage('POLICIES')).toBe('RULES');
    expect(getNextStage('RULES')).toBe('SIMULATION_FINALIZATION');
  });

  test('getNextStage returns null at end', () => {
    expect(getNextStage('SIMULATION_FINALIZATION')).toBe(null);
  });

  test('patching allowed only for stage <= pointer', () => {
    expect(canSubmitToStage('RULES', 'FRAMING')).toBe(true);
    expect(canSubmitToStage('RULES', 'INPUTS')).toBe(true);
    expect(canSubmitToStage('RULES', 'OUTPUTS')).toBe(true);
    expect(canSubmitToStage('RULES', 'POLICIES')).toBe(true);
    expect(canSubmitToStage('RULES', 'RULES')).toBe(true);
    expect(canSubmitToStage('RULES', 'SIMULATION_FINALIZATION')).toBe(false);
  });

  test('canSubmitToStagePointer is alias for canSubmitToStage', () => {
    expect(canSubmitToStagePointer('OUTPUTS', 'FRAMING')).toBe(true);
    expect(canSubmitToStagePointer('OUTPUTS', 'OUTPUTS')).toBe(true);
    expect(canSubmitToStagePointer('OUTPUTS', 'POLICIES')).toBe(false);
  });

  test('cannot submit to future stages', () => {
    expect(canSubmitToStage('FRAMING', 'INPUTS')).toBe(false);
    expect(canSubmitToStage('FRAMING', 'RULES')).toBe(false);
    expect(canSubmitToStage('INPUTS', 'SIMULATION_FINALIZATION')).toBe(false);
  });
});
