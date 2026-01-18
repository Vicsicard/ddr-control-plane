/**
 * Meta DDR Session State
 * Frozen for MVP - v0.1
 */

import { Stage, StageState } from './stage';
import { StageArtifacts } from './artifacts';

export interface IntakeSessionState {
  intake_session_id: string;
  meta_contract_id: string;
  stage: Stage;
  stage_states: Record<Stage, StageState>;
  artifacts: Record<Stage, StageArtifacts | null>;
  revision: number;
  created_at: string;
  expires_at: string | null;
  terminal_status: 'ACCEPTED' | 'REJECTED' | null;
}

export function createInitialSession(
  intakeSessionId: string,
  metaContractId: string,
  createdAt: string,
  expiresAt: string | null = null
): IntakeSessionState {
  return {
    intake_session_id: intakeSessionId,
    meta_contract_id: metaContractId,
    stage: 'FRAMING',
    stage_states: {
      FRAMING: 'INCOMPLETE',
      INPUTS: 'INCOMPLETE',
      OUTPUTS: 'INCOMPLETE',
      POLICIES: 'INCOMPLETE',
      RULES: 'INCOMPLETE',
      SIMULATION_FINALIZATION: 'INCOMPLETE',
    },
    artifacts: {
      FRAMING: null,
      INPUTS: null,
      OUTPUTS: null,
      POLICIES: null,
      RULES: null,
      SIMULATION_FINALIZATION: null,
    },
    revision: 0,
    created_at: createdAt,
    expires_at: expiresAt,
    terminal_status: null,
  };
}
