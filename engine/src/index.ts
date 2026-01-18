/**
 * Meta DDR Engine - Public API
 * Frozen for MVP - v0.1
 *
 * Pure, deterministic, headless decision engine for DDR Control Plane.
 */

// Engine
export { MetaDDREngine, engine } from './engine';
export type { EvaluationResult, SimulationResult, FinalizeResult } from './engine';

// Types
export * from './types';

// State
export { deriveStatus, isSessionMutable } from './state';
export { isValidTransition, getNextStage, canSubmitToStage } from './state/transitions';

// Invariants
export { INVARIANTS } from './invariants';
export type { Invariant } from './invariants';

// Reason Codes
export {
  GLOBAL_CODES,
  FRAMING_CODES,
  VERSIONING_CODES,
  INPUTS_CODES,
  OUTPUTS_CODES,
  POLICIES_CODES,
  RULES_CODES,
  SIMULATION_CODES,
  FINALIZATION_CODES,
  createFinding,
  FINDINGS,
} from './reason-codes';

// Validators
export { validateStage } from './validators';

// Simulation
export { runSimulationCases } from './simulation';

// Finalization
export { generateContract, canonicalize, computeHash } from './finalization';
