/**
 * Meta DDR Stage Definitions
 * Frozen for MVP - v0.1
 */

export const STAGES = [
  'FRAMING',
  'INPUTS',
  'OUTPUTS',
  'POLICIES',
  'RULES',
  'SIMULATION_FINALIZATION',
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_ORDER: Record<Stage, number> = {
  FRAMING: 0,
  INPUTS: 1,
  OUTPUTS: 2,
  POLICIES: 3,
  RULES: 4,
  SIMULATION_FINALIZATION: 5,
};

export type StageState = 'INCOMPLETE' | 'UNDER_REVIEW' | 'BLOCKED' | 'READY';
