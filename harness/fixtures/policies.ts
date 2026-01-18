/**
 * Frozen POLICIES artifacts for harness scenarios.
 * No functions. No randomness. No computed values.
 */

export const policiesArtifacts = {
  policies: [
    {
      policy_id: 'age_restriction_policy',
      statement: 'Users under 18 years of age must be refused access.',
      timing: 'pre_rule',
      precedence: 1,
    },
    {
      policy_id: 'data_completeness_policy',
      statement: 'Missing required inputs must result in refusal.',
      timing: 'pre_rule',
      precedence: 2,
    },
  ],
};
