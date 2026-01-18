/**
 * Frozen RULES artifacts for harness scenarios.
 * No functions. No randomness. No computed values.
 * 
 * Rule expression format (MVP):
 * - { "all": Expr[] } (AND)
 * - { "any": Expr[] } (OR)
 * - { "var": string, "op": "==" | "!=" | ">" | ">=" | "<" | "<=", "value": unknown }
 */

export const rulesArtifacts = {
  rules: [
    {
      rule_id: 'adult_access_rule',
      when: JSON.stringify({
        all: [
          { var: 'user_age', op: '>=', value: 18 },
        ],
      }),
      then: 'ALLOW',
    },
  ],
  coverage_confirmed: true,
  termination_confirmed: true,
};
