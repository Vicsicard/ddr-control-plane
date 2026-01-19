/**
 * DCG Engine Adapter
 * 
 * Public API for Studio → Engine communication.
 * 
 * TRANSITIONAL: This adapter exists to bridge the current Studio UI schema
 * to the DCG Engine schema. The long-term goal is to delete this directory
 * entirely when Studio adopts engine types directly.
 * 
 * Rules:
 * 1. This module exposes ONLY engine-shaped interfaces
 * 2. All translation happens internally
 * 3. No validation logic here - engine owns all validation
 * 4. No decisions - engine decides, Studio displays
 */

// Session adapter (full session translation)
export {
  adaptSessionToEngine,
  type EngineIntakeSessionState,
  type EngineStage,
  type EngineStageState,
} from './session.adapter';

// Stage adapters (individual stage translation)
export {
  adaptFramingToEngine,
  type EngineFramingArtifacts,
} from './framing.adapter';

export {
  adaptInputsToEngine,
  type EngineInputsArtifacts,
  type EngineInputDefinition,
} from './inputs.adapter';

export {
  adaptOutputsToEngine,
  type EngineOutputsArtifacts,
} from './outputs.adapter';

export {
  adaptPoliciesToEngine,
  type EnginePoliciesArtifacts,
  type EnginePolicyDefinition,
} from './policies.adapter';

export {
  adaptRulesToEngine,
  type EngineRulesArtifacts,
  type EngineRuleDefinition,
} from './rules.adapter';

export {
  adaptSimulationToEngine,
  type EngineSimulationCase,
} from './simulation.adapter';

// Findings adapter (engine → studio display)
export {
  adaptFindingsToValidationErrors,
  adaptFindingToValidationError,
  hasBlockingFindings,
  type EngineFinding,
} from './findings.adapter';

// Common types
export type { AdapterResult, AdapterError } from './framing.adapter';

// Engine bridge (unified interface for Studio → Engine calls)
export {
  // Async API (primary - use these)
  validateStageViaEngine,
  runSimulationViaEngine,
  finalizeViaEngine,
  checkEngineHealth,
  isEngineAvailable,
  // Response types
  type EngineValidationResponse,
  type EngineSimulationResponse,
  type EngineFinalizeResponse,
  type EngineHealthResponse,
  type EngineSimulationCaseResult,
  // Legacy sync API (deprecated - for backward compatibility)
  evaluateStage,
  runEngineSimulation,
  finalizeWithEngine,
  type EngineEvaluationResult,
  type EngineSimulationResult,
  type EngineFinalizeResult,
} from './engine-bridge';
