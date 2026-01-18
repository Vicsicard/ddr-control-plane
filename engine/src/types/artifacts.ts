/**
 * Meta DDR Stage Artifacts
 * Frozen for MVP - v0.1
 */

export interface FramingArtifacts {
  decision_id: string;
  decision_purpose: string;
  execution_trigger: string;
  explicit_authority: string[];
  explicit_non_authority: string[];
  refusal_conditions: string[];
  contract_version: string;
}

export interface InputDefinition {
  input_name: string;
  input_type: string;
  input_source: string;
  trust_level: string;
  required: boolean;
  missing_input_behavior: string;
}

export interface InputsArtifacts {
  inputs: InputDefinition[];
  no_undeclared_inputs_confirmed: boolean;
}

export interface OutputsArtifacts {
  output_schema: Record<string, unknown>;
  allowed_outputs: string[];
  terminal_states: string[];
  refusal_output: string;
  output_authority_level: string;
}

export interface PolicyDefinition {
  policy_id: string;
  statement: string;
  timing: 'pre_rule' | 'post_rule' | 'both';
  precedence: number;
}

export interface PoliciesArtifacts {
  policies: PolicyDefinition[];
}

export interface RuleDefinition {
  rule_id: string;
  when: string;
  then: string;
}

export interface RulesArtifacts {
  rules: RuleDefinition[];
  coverage_confirmed: boolean;
  termination_confirmed: boolean;
}

export type StageArtifacts =
  | FramingArtifacts
  | InputsArtifacts
  | OutputsArtifacts
  | PoliciesArtifacts
  | RulesArtifacts
  | Record<string, unknown>;
