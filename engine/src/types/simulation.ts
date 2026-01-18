/**
 * Meta DDR Simulation Types
 * Frozen for MVP - v0.1
 */

export interface SimulationCase {
  case_id: string;
  inputs: Record<string, unknown>;
  expected_output: string | null;
}

export interface Trace {
  contract_version: string;
  policy_checks: string[];
  rule_path: string[];
  refusal: boolean;
  [key: string]: unknown;
}

export interface SimulationCaseResult {
  case_id: string;
  output: string;
  trace: Trace;
  assertion_passed: boolean | null;
}

export interface ContractArtifact {
  contract_id: string;
  version: string;
  hash: string;
  canonical_json: Record<string, unknown>;
}
