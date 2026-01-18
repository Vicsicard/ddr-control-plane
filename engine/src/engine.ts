/**
 * Meta DDR Engine
 * Frozen for MVP - v0.1
 *
 * Pure, deterministic, headless decision engine.
 * No HTTP, no persistence, no UI concerns.
 */

import { Stage, StageState, STAGE_ORDER } from './types/stage';
import { IntakeSessionState } from './types/session';
import { StageArtifacts, FramingArtifacts } from './types/artifacts';
import { Finding } from './types/findings';
import {
  EvaluationDecision,
  FinalizeDecision,
  IntakeStatus,
} from './types/decisions';
import {
  SimulationCase,
  SimulationCaseResult,
  ContractArtifact,
} from './types/simulation';
import { deriveStatus, isSessionMutable } from './state';
import { isValidTransition, getNextStage, canSubmitToStage } from './state/transitions';
import { validateStage } from './validators';
import { runSimulationCases } from './simulation';
import { generateContract } from './finalization';
import { FINDINGS, FINALIZATION_CODES } from './reason-codes';
import { INVARIANTS } from './invariants';

// =============================================================================
// Result Types
// =============================================================================

export interface EvaluationResult {
  decision: EvaluationDecision;
  status: IntakeStatus;
  stage: Stage;
  stage_state: StageState;
  can_proceed: boolean;
  next_stage: Stage | null;
  findings: Finding[];
  updated_session: IntakeSessionState;
  server_time: string;
}

export interface SimulationResult {
  decision: EvaluationDecision;
  stage_state: StageState;
  can_proceed: boolean;
  case_results: SimulationCaseResult[];
  findings: Finding[];
  updated_session: IntakeSessionState;
  server_time: string;
}

export interface FinalizeResult {
  decision: FinalizeDecision;
  status: IntakeStatus;
  findings: Finding[];
  contract_artifact: ContractArtifact | null;
  updated_session: IntakeSessionState;
  server_time: string;
}

// =============================================================================
// Engine Implementation
// =============================================================================

export class MetaDDREngine {
  /**
   * Evaluate submitted artifacts for a stage.
   *
   * Rules:
   * - May be called for any stage ≤ current stage (patching allowed)
   * - SIMULATION_FINALIZATION stage rejects submissions (use runSimulation)
   * - Does NOT advance stage pointer
   * - Returns all findings (exhaustive, not early-exit)
   */
  evaluateStage(
    session: IntakeSessionState,
    stage: Stage,
    artifacts: StageArtifacts,
    now: string
  ): EvaluationResult {
    // Guard: session must be mutable
    if (!isSessionMutable(session)) {
      return this.rejectTerminalSession(session, stage, now);
    }

    // Guard: SIMULATION_FINALIZATION cannot be submitted directly
    if (stage === 'SIMULATION_FINALIZATION') {
      return this.rejectSimulationStageSubmission(session, stage, now);
    }

    // Guard: cannot submit to stages ahead of current
    if (!canSubmitToStage(session.stage, stage)) {
      return this.rejectFutureStageSubmission(session, stage, now);
    }

    // Validate artifacts
    const findings = validateStage(stage, artifacts, session);
    const stageState: StageState = findings.some(
      (f) => f.severity === 'BLOCK' || f.severity === 'REJECT'
    )
      ? 'BLOCKED'
      : 'READY';

    // Update session
    const updatedSession = this.updateSessionAfterEvaluation(
      session,
      stage,
      artifacts,
      stageState
    );

    const decision: EvaluationDecision =
      findings.length === 0 ? 'ALLOW' : 'BLOCK';
    const canProceed = stageState === 'READY';
    const nextStage = canProceed ? getNextStage(stage) : null;

    return {
      decision,
      status: deriveStatus(updatedSession),
      stage,
      stage_state: stageState,
      can_proceed: canProceed,
      next_stage: nextStage,
      findings,
      updated_session: updatedSession,
      server_time: now,
    };
  }

  /**
   * Request transition from current stage to next stage.
   *
   * Rules:
   * - Only succeeds if current stage is READY
   * - Stage pointer is monotonic (forward-only)
   * - toStage must be exactly one stage ahead of fromStage
   */
  requestTransition(
    session: IntakeSessionState,
    fromStage: Stage,
    toStage: Stage,
    now: string
  ): EvaluationResult {
    // Guard: session must be mutable
    if (!isSessionMutable(session)) {
      return this.rejectTerminalSession(session, fromStage, now);
    }

    // Guard: fromStage must match current stage
    if (session.stage !== fromStage) {
      return this.rejectStageMismatch(session, fromStage, now);
    }

    // Guard: transition must be valid (forward by one)
    if (!isValidTransition(fromStage, toStage)) {
      return this.rejectInvalidTransition(session, fromStage, toStage, now);
    }

    // Guard: current stage must be READY
    if (session.stage_states[fromStage] !== 'READY') {
      return this.rejectStageNotReady(session, fromStage, now);
    }

    // Perform transition
    // TODO: Revision should only increment if state actually changes
    const updatedSession: IntakeSessionState = {
      ...session,
      stage: toStage,
      revision: session.revision + 1,
    };

    return {
      decision: 'ALLOW',
      status: deriveStatus(updatedSession),
      stage: toStage,
      stage_state: updatedSession.stage_states[toStage],
      can_proceed: false,
      next_stage: null,
      findings: [],
      updated_session: updatedSession,
      server_time: now,
    };
  }

  /**
   * Run simulation cases against current artifacts.
   *
   * Rules:
   * - Requires: FRAMING, INPUTS, OUTPUTS, POLICIES, RULES all READY
   * - Sets SIMULATION_FINALIZATION stage_state based on results
   * - Exploratory cases (expected_output: null) do not count toward finalization
   *
   * Note: WARN findings never block stage readiness (per taxonomy v1.0)
   */
  runSimulation(
    session: IntakeSessionState,
    cases: SimulationCase[],
    now: string
  ): SimulationResult {
    // Guard: session must be mutable
    if (!isSessionMutable(session)) {
      return this.rejectTerminalSessionSimulation(session, now);
    }

    // Guard: all prior stages must be READY
    const eligibilityFindings = this.checkSimulationEligibility(session);
    if (eligibilityFindings.length > 0) {
      return {
        decision: 'BLOCK',
        stage_state: 'BLOCKED',
        can_proceed: false,
        case_results: [],
        findings: eligibilityFindings,
        updated_session: session,
        server_time: now,
      };
    }

    // Run simulation
    const { caseResults, findings } = runSimulationCases(session, cases);

    // Determine stage state (WARN never blocks per taxonomy v1.0)
    const stageState = this.determineSimulationStageState(caseResults, findings);

    // Update session
    // TODO: Revision should only increment if state actually changes
    const updatedSession: IntakeSessionState = {
      ...session,
      stage: 'SIMULATION_FINALIZATION',
      stage_states: {
        ...session.stage_states,
        SIMULATION_FINALIZATION: stageState,
      },
      revision: session.revision + 1,
    };

    return {
      decision: findings.length === 0 ? 'ALLOW' : 'BLOCK',
      stage_state: stageState,
      can_proceed: stageState === 'READY',
      case_results: caseResults,
      findings,
      updated_session: updatedSession,
      server_time: now,
    };
  }

  /**
   * Attempt to finalize and generate contract artifact.
   *
   * Rules:
   * - Only endpoint that can return decision: ACCEPTED
   * - Requires all stages READY
   * - Sets terminal_status on success or fatal failure
   */
  finalize(
    session: IntakeSessionState,
    acceptanceConfirmation: boolean,
    requestedVersion: string | undefined,
    now: string
  ): FinalizeResult {
    // Guard: session must be mutable
    if (!isSessionMutable(session)) {
      return this.rejectTerminalSessionFinalize(session, now);
    }

    // Guard: acceptance must be confirmed
    if (!acceptanceConfirmation) {
      return this.rejectMissingAcceptance(session, now);
    }

    // Guard: all stages must be READY
    const readinessFindings = this.checkAllStagesReady(session);
    if (readinessFindings.length > 0) {
      return {
        decision: 'BLOCK',
        status: deriveStatus(session),
        findings: readinessFindings,
        contract_artifact: null,
        updated_session: session,
        server_time: now,
      };
    }

    // Generate contract
    const framingArtifacts = session.artifacts.FRAMING as FramingArtifacts | null;
    const version =
      requestedVersion || framingArtifacts?.contract_version || '1.0.0';
    const result = generateContract(session, version, now);

    if (!result.ok) {
      // Map failure modes to frozen FINALIZATION reason codes
      switch (result.kind) {
        case 'NOT_CANONICAL':
          return this.blockContractNotCanonical(session, now);
        case 'HASH_FAILED':
          return this.rejectContractHashMissing(session, now);
        case 'MISSING_ARTIFACTS':
        default:
          return this.rejectContractHashMissing(session, now);
      }
    }

    // Mark session as ACCEPTED
    // TODO: Revision should only increment if state actually changes
    const updatedSession: IntakeSessionState = {
      ...session,
      terminal_status: 'ACCEPTED',
      revision: session.revision + 1,
    };

    return {
      decision: 'ACCEPTED',
      status: 'ACCEPTED',
      findings: [],
      contract_artifact: result.artifact,
      updated_session: updatedSession,
      server_time: now,
    };
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private updateSessionAfterEvaluation(
    session: IntakeSessionState,
    stage: Stage,
    artifacts: StageArtifacts,
    stageState: StageState
  ): IntakeSessionState {
    // TODO: Revision should only increment if state actually changes
    return {
      ...session,
      stage_states: {
        ...session.stage_states,
        [stage]: stageState,
      },
      artifacts: {
        ...session.artifacts,
        [stage]: artifacts,
      },
      revision: session.revision + 1,
    };
  }

  private checkSimulationEligibility(session: IntakeSessionState): Finding[] {
    const findings: Finding[] = [];
    const requiredStages: Stage[] = [
      'FRAMING',
      'INPUTS',
      'OUTPUTS',
      'POLICIES',
      'RULES',
    ];

    for (const stage of requiredStages) {
      if (session.stage_states[stage] !== 'READY') {
        findings.push(FINDINGS.stagesNotReady(stage));
      }
    }

    return findings;
  }

  /**
   * Determine simulation stage state based on results.
   * WARN findings never block stage readiness (per taxonomy v1.0).
   */
  private determineSimulationStageState(
    caseResults: SimulationCaseResult[],
    findings: Finding[]
  ): StageState {
    // Only BLOCK and REJECT severity block readiness; WARN does not
    if (findings.some((f) => f.severity === 'BLOCK' || f.severity === 'REJECT')) {
      return 'BLOCKED';
    }

    const assertedCases = caseResults.filter((r) => r.assertion_passed !== null);
    const validCases = assertedCases.filter(
      (r) => !r.trace.refusal && r.assertion_passed === true
    );
    const refusalCases = assertedCases.filter(
      (r) => r.trace.refusal && r.assertion_passed === true
    );
    const failedAssertions = assertedCases.filter(
      (r) => r.assertion_passed === false
    );

    if (failedAssertions.length > 0) return 'BLOCKED';
    if (validCases.length === 0) return 'BLOCKED';
    if (refusalCases.length === 0) return 'BLOCKED';

    return 'READY';
  }

  /**
   * Check all stages are READY for finalization.
   * Uses frozen reason codes only - no dynamic code generation.
   * 
   * Per Phase 3 spec:
   * - FRAMING/INPUTS/OUTPUTS/POLICIES/RULES not READY: META_SIMULATION_INCOMPLETE_stages_not_ready
   * - SIMULATION_FINALIZATION not READY: META_FINALIZATION_INCOMPLETE_simulation_not_passed
   */
  private checkAllStagesReady(session: IntakeSessionState): Finding[] {
    const findings: Finding[] = [];
    const priorStages: Stage[] = [
      'FRAMING',
      'INPUTS',
      'OUTPUTS',
      'POLICIES',
      'RULES',
    ];

    // Check prior stages - use META_SIMULATION_INCOMPLETE_stages_not_ready
    for (const stage of priorStages) {
      if (session.stage_states[stage] !== 'READY') {
        findings.push(FINDINGS.stagesNotReady(stage));
      }
    }

    // Check simulation stage - use META_FINALIZATION_INCOMPLETE_simulation_not_passed
    if (session.stage_states.SIMULATION_FINALIZATION !== 'READY') {
      findings.push(
        FINDINGS.simulationNotPassed(
          'stage_states.SIMULATION_FINALIZATION',
          'SIMULATION_FINALIZATION'
        )
      );
    }

    return findings;
  }

  // ===========================================================================
  // Rejection Helpers
  // ===========================================================================

  private rejectTerminalSession(
    session: IntakeSessionState,
    stage: Stage,
    now: string
  ): EvaluationResult {
    return {
      decision: 'REJECT',
      status: deriveStatus(session),
      stage,
      stage_state: session.stage_states[stage],
      can_proceed: false,
      next_stage: null,
      findings: [FINDINGS.sessionAlreadyFinalized()],
      updated_session: session,
      server_time: now,
    };
  }

  private rejectSimulationStageSubmission(
    session: IntakeSessionState,
    stage: Stage,
    now: string
  ): EvaluationResult {
    return {
      decision: 'REJECT',
      status: deriveStatus(session),
      stage,
      stage_state: session.stage_states[stage],
      can_proceed: false,
      next_stage: null,
      findings: [FINDINGS.simulationStageNotSubmittable()],
      updated_session: session,
      server_time: now,
    };
  }

  private rejectFutureStageSubmission(
    session: IntakeSessionState,
    stage: Stage,
    now: string
  ): EvaluationResult {
    return {
      decision: 'REJECT',
      status: deriveStatus(session),
      stage,
      stage_state: 'INCOMPLETE',
      can_proceed: false,
      next_stage: null,
      findings: [
        FINDINGS.inconsistentStageState(
          `Cannot submit to stage ${stage} before reaching it.`
        ),
      ],
      updated_session: session,
      server_time: now,
    };
  }

  private rejectStageMismatch(
    session: IntakeSessionState,
    fromStage: Stage,
    now: string
  ): EvaluationResult {
    return {
      decision: 'REJECT',
      status: deriveStatus(session),
      stage: fromStage,
      stage_state: session.stage_states[fromStage],
      can_proceed: false,
      next_stage: null,
      findings: [
        FINDINGS.inconsistentStageState(
          `Current stage is ${session.stage}, not ${fromStage}.`
        ),
      ],
      updated_session: session,
      server_time: now,
    };
  }

  private rejectInvalidTransition(
    session: IntakeSessionState,
    fromStage: Stage,
    toStage: Stage,
    now: string
  ): EvaluationResult {
    return {
      decision: 'REJECT',
      status: deriveStatus(session),
      stage: fromStage,
      stage_state: session.stage_states[fromStage],
      can_proceed: false,
      next_stage: null,
      findings: [
        FINDINGS.inconsistentStageState(
          `Invalid transition from ${fromStage} to ${toStage}.`
        ),
      ],
      updated_session: session,
      server_time: now,
    };
  }

  private rejectStageNotReady(
    session: IntakeSessionState,
    stage: Stage,
    now: string
  ): EvaluationResult {
    return {
      decision: 'BLOCK',
      status: deriveStatus(session),
      stage,
      stage_state: session.stage_states[stage],
      can_proceed: false,
      next_stage: null,
      findings: [FINDINGS.stagesNotReady(stage)],
      updated_session: session,
      server_time: now,
    };
  }

  private rejectTerminalSessionSimulation(
    session: IntakeSessionState,
    now: string
  ): SimulationResult {
    return {
      decision: 'REJECT',
      stage_state: session.stage_states.SIMULATION_FINALIZATION,
      can_proceed: false,
      case_results: [],
      findings: [FINDINGS.sessionAlreadyFinalized()],
      updated_session: session,
      server_time: now,
    };
  }

  private rejectTerminalSessionFinalize(
    session: IntakeSessionState,
    now: string
  ): FinalizeResult {
    return {
      decision: 'REJECT',
      status: deriveStatus(session),
      findings: [FINDINGS.sessionAlreadyFinalized()],
      contract_artifact: null,
      updated_session: session,
      server_time: now,
    };
  }

  private rejectMissingAcceptance(
    session: IntakeSessionState,
    now: string
  ): FinalizeResult {
    return {
      decision: 'BLOCK',
      status: deriveStatus(session),
      findings: [FINDINGS.missingAcceptanceConfirmation()],
      contract_artifact: null,
      updated_session: session,
      server_time: now,
    };
  }

  /**
   * BLOCK: Contract not canonical (recoverable structural issue)
   * Uses frozen code: META_FINALIZATION_INVALID_contract_not_canonical
   */
  private blockContractNotCanonical(
    session: IntakeSessionState,
    now: string
  ): FinalizeResult {
    return {
      decision: 'BLOCK',
      status: deriveStatus(session),
      findings: [FINDINGS.contractNotCanonical()],
      contract_artifact: null,
      updated_session: session,
      server_time: now,
    };
  }

  /**
   * REJECT: Contract hash missing (unrecoverable integrity violation)
   * Uses frozen code: META_FINALIZATION_VIOLATION_contract_hash_missing
   */
  private rejectContractHashMissing(
    session: IntakeSessionState,
    now: string
  ): FinalizeResult {
    return {
      decision: 'REJECT',
      status: deriveStatus(session),
      findings: [FINDINGS.contractHashMissing()],
      contract_artifact: null,
      updated_session: session,
      server_time: now,
    };
  }
}

export const engine = new MetaDDREngine();
