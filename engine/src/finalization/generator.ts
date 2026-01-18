/**
 * Meta DDR Contract Generator
 * Phase 5: Deterministic contract artifact generation
 */

import { IntakeSessionState } from '../types/session';
import { ContractArtifact } from '../types/simulation';
import { canonicalize, computeHash, isCanonicalizable } from './canonicalizer';

/**
 * Generate immutable contract artifact from validated session artifacts.
 *
 * Returns null if required artifacts are missing or cannot be canonicalized.
 * The engine will convert null -> FINALIZATION reason code (frozen taxonomy).
 */
export function generateContract(
  session: IntakeSessionState,
  version: string,
  generatedAt: string
): ContractArtifact | null {
  const framing = session.artifacts.FRAMING as Record<string, unknown> | null;
  const inputs = session.artifacts.INPUTS as Record<string, unknown> | null;
  const outputs = session.artifacts.OUTPUTS as Record<string, unknown> | null;
  const policies = session.artifacts.POLICIES as Record<string, unknown> | null;
  const rules = session.artifacts.RULES as Record<string, unknown> | null;

  // Defensive: required artifacts must exist
  if (!framing || !inputs || !outputs || !policies || !rules) return null;

  const canonical_json: Record<string, unknown> = {
    meta_contract_id: session.meta_contract_id,
    contract_version: version,
    decision_id: String(framing.decision_id ?? ''),

    framing,
    inputs,
    outputs,
    policies,
    rules,

    generated_at: generatedAt,
  };

  if (!isCanonicalizable(canonical_json)) return null;

  const canonicalText = canonicalize(canonical_json);
  const hash = computeHash(canonicalText);

  // For MVP: contract_id = `${decision_id}@${version}`
  const decisionId = String(framing.decision_id ?? 'decision');
  const contractId = `${decisionId}@${version}`;

  return {
    contract_id: contractId,
    version,
    hash,
    canonical_json,
  };
}
