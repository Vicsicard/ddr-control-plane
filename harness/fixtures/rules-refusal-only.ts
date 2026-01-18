/**
 * Frozen RULES artifacts for refusal-only scenario.
 * This rule always refuses - no valid path exists.
 */

export const refusalOnlyRulesArtifacts = {
  rules: [
    {
      rule_id: 'always_refuse',
      when: 'true',
      then: 'REFUSE',
    },
  ],
  coverage_confirmed: true,
  termination_confirmed: true,
};
