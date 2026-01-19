/**
 * Session Adapter
 * 
 * Translates Studio ContractSession → Engine IntakeSessionState
 * 
 * TRANSITIONAL: This file should shrink over time as Studio
 * adopts engine types directly.
 */

import type { ContractSession, Stage as StudioStage, StageState as StudioStageState } from '../types';
import { adaptFramingToEngine, type EngineFramingArtifacts } from './framing.adapter';
import { adaptInputsToEngine, type EngineInputsArtifacts } from './inputs.adapter';
import { adaptOutputsToEngine, type EngineOutputsArtifacts } from './outputs.adapter';
import { adaptPoliciesToEngine, type EnginePoliciesArtifacts } from './policies.adapter';
import { adaptRulesToEngine, type EngineRulesArtifacts } from './rules.adapter';

/**
 * Engine types (from engine/src/types/)
 */
export type EngineStage =
  | 'FRAMING'
  | 'INPUTS'
  | 'OUTPUTS'
  | 'POLICIES'
  | 'RULES'
  | 'SIMULATION_FINALIZATION';

export type EngineStageState = 'INCOMPLETE' | 'UNDER_REVIEW' | 'BLOCKED' | 'READY';

export type EngineStageArtifacts =
  | EngineFramingArtifacts
  | EngineInputsArtifacts
  | EngineOutputsArtifacts
  | EnginePoliciesArtifacts
  | EngineRulesArtifacts
  | Record<string, unknown>;

export interface EngineIntakeSessionState {
  intake_session_id: string;
  meta_contract_id: string;
  stage: EngineStage;
  stage_states: Record<EngineStage, EngineStageState>;
  artifacts: Record<EngineStage, EngineStageArtifacts | null>;
  revision: number;
  created_at: string;
  expires_at: string | null;
  terminal_status: 'ACCEPTED' | 'REJECTED' | null;
}

export type AdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: AdapterError[] };

export interface AdapterError {
  field: string;
  message: string;
}

/**
 * Map Studio StageState to Engine StageState.
 * 
 * Studio states: LOCKED, EMPTY, DRAFT, INVALID, READY
 * Engine states: INCOMPLETE, UNDER_REVIEW, BLOCKED, READY
 */
function mapStageState(studioState: StudioStageState): EngineStageState {
  switch (studioState) {
    case 'READY':
      return 'READY';
    case 'INVALID':
      return 'BLOCKED';
    case 'DRAFT':
      return 'UNDER_REVIEW';
    case 'EMPTY':
    case 'LOCKED':
    default:
      return 'INCOMPLETE';
  }
}

/**
 * Map Studio Stage to Engine Stage.
 * 
 * Studio has FINALIZATION as separate stage, engine does not.
 */
function mapStage(studioStage: StudioStage): EngineStage {
  if (studioStage === 'FINALIZATION') {
    return 'SIMULATION_FINALIZATION';
  }
  return studioStage as EngineStage;
}

/**
 * Adapt Studio ContractSession to Engine IntakeSessionState.
 * 
 * This is the main translation function that converts the entire
 * Studio session to engine format.
 */
export function adaptSessionToEngine(
  studioSession: ContractSession
): AdapterResult<EngineIntakeSessionState> {
  const allErrors: AdapterError[] = [];

  // Adapt each stage's artifacts
  let framingArtifacts: EngineFramingArtifacts | null = null;
  let inputsArtifacts: EngineInputsArtifacts | null = null;
  let outputsArtifacts: EngineOutputsArtifacts | null = null;
  let policiesArtifacts: EnginePoliciesArtifacts | null = null;
  let rulesArtifacts: EngineRulesArtifacts | null = null;

  // Only adapt stages that have data
  if (studioSession.framing.decision_name) {
    const framingResult = adaptFramingToEngine(studioSession.framing);
    if (framingResult.ok) {
      framingArtifacts = framingResult.data;
    } else {
      allErrors.push(...framingResult.errors.map((e) => ({ ...e, field: `framing.${e.field}` })));
    }
  }

  if (studioSession.inputs.inputs.length > 0) {
    const inputsResult = adaptInputsToEngine(studioSession.inputs);
    if (inputsResult.ok) {
      inputsArtifacts = inputsResult.data;
    } else {
      allErrors.push(...inputsResult.errors.map((e) => ({ ...e, field: `inputs.${e.field}` })));
    }
  }

  if (studioSession.outputs.outputs.length > 0) {
    const outputsResult = adaptOutputsToEngine(studioSession.outputs);
    if (outputsResult.ok) {
      outputsArtifacts = outputsResult.data;
    } else {
      allErrors.push(...outputsResult.errors.map((e) => ({ ...e, field: `outputs.${e.field}` })));
    }
  }

  if (studioSession.policies.policies.length > 0 || studioSession.policies.scope_confirmed) {
    const policiesResult = adaptPoliciesToEngine(studioSession.policies);
    if (policiesResult.ok) {
      policiesArtifacts = policiesResult.data;
    } else {
      allErrors.push(...policiesResult.errors.map((e) => ({ ...e, field: `policies.${e.field}` })));
    }
  }

  if (studioSession.rules.rules.length > 0) {
    const rulesResult = adaptRulesToEngine(studioSession.rules);
    if (rulesResult.ok) {
      rulesArtifacts = rulesResult.data;
    } else {
      allErrors.push(...rulesResult.errors.map((e) => ({ ...e, field: `rules.${e.field}` })));
    }
  }

  // Map stage states
  const engineStageStates: Record<EngineStage, EngineStageState> = {
    FRAMING: mapStageState(studioSession.stage_states.FRAMING),
    INPUTS: mapStageState(studioSession.stage_states.INPUTS),
    OUTPUTS: mapStageState(studioSession.stage_states.OUTPUTS),
    POLICIES: mapStageState(studioSession.stage_states.POLICIES),
    RULES: mapStageState(studioSession.stage_states.RULES),
    SIMULATION_FINALIZATION: mapStageState(studioSession.stage_states.SIMULATION_FINALIZATION),
  };

  // Determine terminal status
  let terminalStatus: 'ACCEPTED' | 'REJECTED' | null = null;
  if (studioSession.finalization.is_finalized && studioSession.finalization.result) {
    terminalStatus = studioSession.finalization.result.decision === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED';
  }

  // Generate meta_contract_id from decision name
  const metaContractId = studioSession.framing.decision_name
    ? studioSession.framing.decision_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
    : studioSession.id;

  return {
    ok: true,
    data: {
      intake_session_id: studioSession.id,
      meta_contract_id: metaContractId,
      stage: mapStage(studioSession.current_stage),
      stage_states: engineStageStates,
      artifacts: {
        FRAMING: framingArtifacts,
        INPUTS: inputsArtifacts,
        OUTPUTS: outputsArtifacts,
        POLICIES: policiesArtifacts,
        RULES: rulesArtifacts,
        SIMULATION_FINALIZATION: null,
      },
      revision: 0, // Studio doesn't track revision
      created_at: studioSession.created_at,
      expires_at: null,
      terminal_status: terminalStatus,
    },
  };
}
