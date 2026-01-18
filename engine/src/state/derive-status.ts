/**
 * Meta DDR Status Derivation
 * Frozen for MVP - v0.1
 */

import { IntakeSessionState } from '../types/session';
import { IntakeStatus } from '../types/decisions';

/**
 * Derive session status from stage states and terminal status.
 * Status is computed, not stored independently.
 */
export function deriveStatus(session: IntakeSessionState): IntakeStatus {
  // Terminal states take precedence
  if (session.terminal_status) {
    return session.terminal_status;
  }

  // Derived from stage states
  const hasBlockedStage = Object.values(session.stage_states).includes('BLOCKED');
  return hasBlockedStage ? 'BLOCKED' : 'IN_PROGRESS';
}

/**
 * Check if session can accept mutations.
 * Returns false if terminal_status is set.
 */
export function isSessionMutable(session: IntakeSessionState): boolean {
  return session.terminal_status === null;
}
