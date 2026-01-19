export type Stage = 
  | 'FRAMING'
  | 'INPUTS'
  | 'OUTPUTS'
  | 'POLICIES'
  | 'RULES'
  | 'SIMULATION_FINALIZATION';

export type StageState = 'LOCKED' | 'EMPTY' | 'DRAFT' | 'INVALID' | 'READY';

export type AuthorityType = 
  | 'RECOMMEND_ONLY'
  | 'DECIDE_BUT_NOT_EXECUTE'
  | 'DECIDE_AND_TRIGGER_EXTERNAL_ACTION';

export type EscalationRequirement =
  | 'NONE'
  | 'REQUIRED_ON_REFUSAL'
  | 'REQUIRED_ON_UNCERTAINTY'
  | 'ALWAYS_REQUIRED';

export interface FramingData {
  decision_name: string;
  decision_purpose: string;
  authority_type: AuthorityType | null;
  permitted_actions: string[];
  prohibited_actions: string[];
  escalation_requirement: EscalationRequirement | null;
  contract_version: string;
}

export type InputType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'ENUM';

export type MissingBehavior = 'REFUSE' | 'DEFAULT' | 'PROCEED_WITHOUT';

export interface InputEntry {
  id: string;
  name: string;
  type: InputType | null;
  required: boolean;
  missing_behavior: MissingBehavior | null;
  default_value: string;
  enum_values: string[];
  description: string;
}

export interface InputsData {
  inputs: InputEntry[];
  completeness_confirmed: boolean;
}

export type OutputCategory = 'APPROVAL' | 'REFUSAL' | 'DEFERRAL';

export interface OutputEntry {
  id: string;
  code: string;
  category: OutputCategory | null;
  requires_reason_code: boolean;
  description: string;
}

export type RefusalRequirement = 'REQUIRED' | 'OPTIONAL';

export type PolicyConstraintType = 'REQUIRE' | 'FORBID';

export type PolicyViolationOutcome = 'FORCE_REFUSE' | 'ESCALATE' | 'BLOCK';

export interface PolicyCondition {
  left_operand: string;
  operator: 'IS_PRESENT' | 'IS_ABSENT' | 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN';
  right_operand?: string;
}

export interface PolicyEntry {
  id: string;
  policy_id: string;
  statement: string;
  constraint_type: PolicyConstraintType | null;
  condition: PolicyCondition | null;
  violation_outcome: PolicyViolationOutcome | null;
  reason_code: string;
}

export interface OutputsData {
  outputs: OutputEntry[];
  refusal_requirement: RefusalRequirement;
  completeness_confirmed: boolean;
}

export interface PoliciesData {
  policies: PolicyEntry[];
  scope_confirmed: boolean;
}

export interface RuleCondition {
  left_operand: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_THAN_OR_EQUALS' | 'LESS_THAN_OR_EQUALS' | 'IS_PRESENT' | 'IS_ABSENT' | 'IN' | 'NOT_IN';
  right_operand?: string;
}

export interface RuleEntry {
  id: string;
  rule_id: string;
  condition: RuleCondition | null;
  output: string;
  reason_code: string;
  description: string;
}

export interface RulesData {
  rules: RuleEntry[];
  completeness_confirmed: boolean;
}

export type SimulationCaseType = 'VALID' | 'REFUSAL';

export interface SimulationCaseInput {
  input_name: string;
  value: string;
}

export interface SimulationTrace {
  policies_checked: string[];
  rule_matched: string | null;
  refusal_flag: boolean;
  engine_version: string;
  contract_hash: string;
}

export interface SimulationCase {
  id: string;
  case_id: string;
  inputs: SimulationCaseInput[];
  expected_output: string;
  expected_reason_code: string;
  actual_output: string | null;
  actual_reason_code: string | null;
  case_type: SimulationCaseType | null;
  assertion_passed: boolean | null;
  trace: SimulationTrace | null;
}

export interface SimulationData {
  cases: SimulationCase[];
  all_cases_passed: boolean;
  proof_confirmed: boolean;
}

export interface AuditMetadata {
  contract_id: string;
  version: string;
  engine_version: string;
  created_at: string;
  finalized_at: string | null;
  stage_readiness: Record<Stage, StageState>;
  simulation_trace_refs: string[];
  reason_code_inventory: string[];
  author_identity: string | null;
}

export interface FinalizationResult {
  decision: 'ACCEPTED' | 'REJECTED';
  contract_id: string;
  hash: string;
  hash_algorithm: string;
  canonical_byte_length: number;
  hash_timestamp: string;
  exports: {
    canonical_json: boolean;
    pdf: boolean;
    markdown: boolean;
  };
  audit_metadata: AuditMetadata;
}

export interface FinalizationData {
  approval_confirmed: boolean;
  is_finalized: boolean;
  result: FinalizationResult | null;
}

export interface ValidationError {
  code: string;
  field_path: string | null;
  message: string;
  severity: 'BLOCK' | 'WARN';
}

export interface StageValidationResult {
  stage: Stage;
  state: StageState;
  errors: ValidationError[];
}

export interface ContractSession {
  id: string;
  name: string;
  created_at: string;
  current_stage: Stage;
  stage_states: Record<Stage, StageState>;
  framing: FramingData;
  inputs: InputsData;
  outputs: OutputsData;
  policies: PoliciesData;
  rules: RulesData;
  simulation: SimulationData;
  finalization: FinalizationData;
}
