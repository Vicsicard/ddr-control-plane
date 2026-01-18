/**
 * Meta DDR State Derivation Tests
 * Phase 3: Status derivation and session mutability
 */

import { deriveStatus, isSessionMutable } from '../../../src/state/derive-status';
import { createInitialSession } from '../../../src/types/session';

describe('deriveStatus / isSessionMutable', () => {
  test('IN_PROGRESS when no stages blocked and not terminal', () => {
    const s = createInitialSession('s1', 'meta.ddr', new Date().toISOString(), null);
    s.stage_states.FRAMING = 'READY';
    expect(deriveStatus(s)).toBe('IN_PROGRESS');
    expect(isSessionMutable(s)).toBe(true);
  });

  test('BLOCKED when any stage is BLOCKED', () => {
    const s = createInitialSession('s1', 'meta.ddr', new Date().toISOString(), null);
    s.stage_states.INPUTS = 'BLOCKED';
    expect(deriveStatus(s)).toBe('BLOCKED');
    expect(isSessionMutable(s)).toBe(true);
  });

  test('terminal_status ACCEPTED overrides everything', () => {
    const s = createInitialSession('s1', 'meta.ddr', new Date().toISOString(), null);
    s.stage_states.INPUTS = 'BLOCKED';
    s.terminal_status = 'ACCEPTED';
    expect(deriveStatus(s)).toBe('ACCEPTED');
    expect(isSessionMutable(s)).toBe(false);
  });

  test('terminal_status REJECTED overrides everything', () => {
    const s = createInitialSession('s1', 'meta.ddr', new Date().toISOString(), null);
    s.stage_states.FRAMING = 'READY';
    s.terminal_status = 'REJECTED';
    expect(deriveStatus(s)).toBe('REJECTED');
    expect(isSessionMutable(s)).toBe(false);
  });

  test('mutable when terminal_status is null', () => {
    const s = createInitialSession('s1', 'meta.ddr', new Date().toISOString(), null);
    expect(s.terminal_status).toBe(null);
    expect(isSessionMutable(s)).toBe(true);
  });

  test('IN_PROGRESS when all stages INCOMPLETE', () => {
    const s = createInitialSession('s1', 'meta.ddr', new Date().toISOString(), null);
    // All stages start as INCOMPLETE
    expect(deriveStatus(s)).toBe('IN_PROGRESS');
  });

  test('IN_PROGRESS when mix of READY and INCOMPLETE', () => {
    const s = createInitialSession('s1', 'meta.ddr', new Date().toISOString(), null);
    s.stage_states.FRAMING = 'READY';
    s.stage_states.INPUTS = 'READY';
    // Others still INCOMPLETE
    expect(deriveStatus(s)).toBe('IN_PROGRESS');
  });
});
