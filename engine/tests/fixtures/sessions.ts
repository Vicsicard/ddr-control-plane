/**
 * Test Fixtures - Session States
 */

import { IntakeSessionState, createInitialSession } from '../../src/types/session';
import { FramingArtifacts, InputsArtifacts, OutputsArtifacts, PoliciesArtifacts, RulesArtifacts } from '../../src/types/artifacts';

export const TEST_META_CONTRACT_ID = 'meta.ddr.intake.v0_1';
export const TEST_NOW = '2026-01-18T12:00:00Z';

/**
 * Create a fresh initial session for testing
 */
export function createTestSession(
  sessionId: string = 'test-session-001'
): IntakeSessionState {
  return createInitialSession(sessionId, TEST_META_CONTRACT_ID, TEST_NOW);
}

/**
 * Valid FRAMING artifacts for testing
 */
export const VALID_FRAMING_ARTIFACTS: FramingArtifacts = {
  decision_id: 'ddr.decision.eligibility.v1',
  decision_purpose: 'Determine eligibility for premium features.',
  execution_trigger: 'on_request',
  explicit_authority: ['set_eligibility_state', 'return_eligibility_reason'],
  explicit_non_authority: ['pricing', 'identity_verification', 'payment_processing'],
  refusal_conditions: ['missing_required_input', 'policy_conflict', 'invalid_input_type'],
  contract_version: '1.0.0',
};

/**
 * Valid INPUTS artifacts for testing
 */
export const VALID_INPUTS_ARTIFACTS: InputsArtifacts = {
  inputs: [
    {
      input_name: 'user_age',
      input_type: 'integer',
      input_source: 'first_party',
      trust_level: 'verified',
      required: true,
      missing_input_behavior: 'refuse',
    },
    {
      input_name: 'account_tenure_days',
      input_type: 'integer',
      input_source: 'first_party',
      trust_level: 'verified',
      required: true,
      missing_input_behavior: 'refuse',
    },
    {
      input_name: 'prior_purchases_30d',
      input_type: 'integer',
      input_source: 'warehouse',
      trust_level: 'reported',
      required: false,
      missing_input_behavior: 'default:0',
    },
  ],
  no_undeclared_inputs_confirmed: true,
};

/**
 * Valid OUTPUTS artifacts for testing
 */
export const VALID_OUTPUTS_ARTIFACTS: OutputsArtifacts = {
  output_schema: {
    type: 'object',
    properties: {
      decision: { type: 'string' },
      reason: { type: 'string' },
    },
    required: ['decision'],
  },
  allowed_outputs: ['ELIGIBLE', 'NOT_ELIGIBLE', 'REFUSE'],
  terminal_states: ['ELIGIBLE', 'NOT_ELIGIBLE', 'REFUSE'],
  refusal_output: 'REFUSE',
  output_authority_level: 'blocking',
};

/**
 * Valid POLICIES artifacts for testing
 */
export const VALID_POLICIES_ARTIFACTS: PoliciesArtifacts = {
  policies: [
    {
      policy_id: 'P01',
      statement: 'Refuse when required inputs are missing.',
      timing: 'pre_rule',
      precedence: 1,
    },
    {
      policy_id: 'P02',
      statement: 'User must be at least 18 years old.',
      timing: 'pre_rule',
      precedence: 2,
    },
  ],
};

/**
 * Valid RULES artifacts for testing
 */
export const VALID_RULES_ARTIFACTS: RulesArtifacts = {
  rules: [
    {
      rule_id: 'R00_REFUSE_MISSING',
      when: 'user_age is null OR account_tenure_days is null',
      then: 'REFUSE',
    },
    {
      rule_id: 'R01_AGE_CHECK',
      when: 'user_age < 18',
      then: 'NOT_ELIGIBLE',
    },
    {
      rule_id: 'R02_TENURE_CHECK',
      when: 'account_tenure_days < 30',
      then: 'NOT_ELIGIBLE',
    },
    {
      rule_id: 'R03_ELIGIBLE',
      when: 'user_age >= 18 AND account_tenure_days >= 30',
      then: 'ELIGIBLE',
    },
  ],
  coverage_confirmed: true,
  termination_confirmed: true,
};

/**
 * Create a session with all stages READY (for finalization testing)
 */
export function createReadySession(
  sessionId: string = 'test-session-ready'
): IntakeSessionState {
  return {
    intake_session_id: sessionId,
    meta_contract_id: TEST_META_CONTRACT_ID,
    stage: 'SIMULATION_FINALIZATION',
    stage_states: {
      FRAMING: 'READY',
      INPUTS: 'READY',
      OUTPUTS: 'READY',
      POLICIES: 'READY',
      RULES: 'READY',
      SIMULATION_FINALIZATION: 'READY',
    },
    artifacts: {
      FRAMING: VALID_FRAMING_ARTIFACTS,
      INPUTS: VALID_INPUTS_ARTIFACTS,
      OUTPUTS: VALID_OUTPUTS_ARTIFACTS,
      POLICIES: VALID_POLICIES_ARTIFACTS,
      RULES: VALID_RULES_ARTIFACTS,
      SIMULATION_FINALIZATION: null,
    },
    revision: 10,
    created_at: TEST_NOW,
    expires_at: null,
    terminal_status: null,
  };
}

/**
 * Create a terminal (ACCEPTED) session
 */
export function createAcceptedSession(
  sessionId: string = 'test-session-accepted'
): IntakeSessionState {
  const session = createReadySession(sessionId);
  return {
    ...session,
    terminal_status: 'ACCEPTED',
    revision: 11,
  };
}

/**
 * Create a terminal (REJECTED) session
 */
export function createRejectedSession(
  sessionId: string = 'test-session-rejected'
): IntakeSessionState {
  const session = createReadySession(sessionId);
  return {
    ...session,
    terminal_status: 'REJECTED',
    revision: 11,
  };
}
