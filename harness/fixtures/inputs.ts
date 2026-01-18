/**
 * Frozen INPUTS artifacts for harness scenarios.
 * No functions. No randomness. No computed values.
 */

export const inputsArtifacts = {
  inputs: [
    {
      input_name: 'user_age',
      input_type: 'number',
      input_source: 'user_profile',
      trust_level: 'verified',
      required: true,
      missing_input_behavior: 'REFUSE',
    },
    {
      input_name: 'country_code',
      input_type: 'string',
      input_source: 'geo_lookup',
      trust_level: 'derived',
      required: false,
      missing_input_behavior: 'REFUSE',
    },
  ],
  no_undeclared_inputs_confirmed: true,
};
