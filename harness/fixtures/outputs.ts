/**
 * Frozen OUTPUTS artifacts for harness scenarios.
 * No functions. No randomness. No computed values.
 */

export const outputsArtifacts = {
  output_schema: { type: 'string', enum: ['ALLOW', 'REFUSE'] },
  allowed_outputs: ['ALLOW', 'REFUSE'],
  terminal_states: ['ALLOW', 'REFUSE'],
  refusal_output: 'REFUSE',
  output_authority_level: 'system',
};
