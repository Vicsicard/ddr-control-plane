/**
 * Frozen FRAMING artifacts for harness scenarios.
 * No functions. No randomness. No computed values.
 */

export const framingArtifacts = {
  decision_id: 'age_gate_decision',
  decision_purpose: 'Determine whether a user is allowed access based on their age. This decision must be operational and enforceable.',
  execution_trigger: 'on_user_signup',
  explicit_authority: ['grant_access', 'deny_access'],
  explicit_non_authority: ['pricing', 'content_moderation'],
  refusal_conditions: ['user_age is missing', 'user_age < 18'],
  contract_version: '1.0.0',
};
