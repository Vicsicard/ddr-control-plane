/**
 * Meta DDR Stage Transitions
 * Frozen for MVP - v0.1
 */

import { Stage, STAGE_ORDER, STAGES } from '../types/stage';

/**
 * Check if a transition from one stage to another is valid.
 * Transitions must be forward by exactly one stage.
 */
export function isValidTransition(fromStage: Stage, toStage: Stage): boolean {
  const fromIndex = STAGE_ORDER[fromStage];
  const toIndex = STAGE_ORDER[toStage];
  return toIndex === fromIndex + 1;
}

/**
 * Get the next stage after the current stage.
 * Returns null if at the final stage.
 */
export function getNextStage(currentStage: Stage): Stage | null {
  const currentIndex = STAGE_ORDER[currentStage];
  const nextIndex = currentIndex + 1;

  if (nextIndex >= STAGES.length) {
    return null;
  }

  return STAGES[nextIndex] ?? null;
}

/**
 * Check if a stage can be submitted to (patching allowed for stages <= current).
 */
export function canSubmitToStage(currentStage: Stage, targetStage: Stage): boolean {
  return STAGE_ORDER[targetStage] <= STAGE_ORDER[currentStage];
}
