/**
 * Meta DDR Contract Generator
 * Phase 5: Deterministic contract artifact generation
 */

import { IntakeSessionState } from '../types/session';
import { ContractArtifact } from '../types/simulation';
import { canonicalize, computeHash, isCanonicalizable } from './canonicalizer';

// =============================================================================
// Result Types (Internal - not exposed in public API)
// =============================================================================

export type GenerateFailureKind = 'MISSING_ARTIFACTS' | 'NOT_CANONICAL' | 'HASH_FAILED';

export type GenerateResult =
  | { ok: true; artifact: ContractArtifact }
  | { ok: false; kind: GenerateFailureKind };

// =============================================================================
// Generator
// =============================================================================

/**
 * Generate immutable contract artifact from validated session artifacts.
 *
 * Returns a discriminated union for precise failure mode handling:
 * - MISSING_ARTIFACTS: Required stage artifacts not present
 * - NOT_CANONICAL: Canonicalization failed (recoverable, BLOCK)
 * - HASH_FAILED: Hash computation failed (unrecoverable, REJECT)
 *
 * The engine maps these to frozen FINALIZATION reason codes.
 */
export function generateContract(
  session: IntakeSessionState,
  version: string,
  generatedAt: string
): GenerateResult {
  const framing = session.artifacts.FRAMING as Record<string, unknown> | null;
  const inputs = session.artifacts.INPUTS as Record<string, unknown> | null;
  const outputs = session.artifacts.OUTPUTS as Record<string, unknown> | null;
  const policies = session.artifacts.POLICIES as Record<string, unknown> | null;
  const rules = session.artifacts.RULES as Record<string, unknown> | null;

  // Defensive: required artifacts must exist
  if (!framing || !inputs || !outputs || !policies || !rules) {
    return { ok: false, kind: 'MISSING_ARTIFACTS' };
  }

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

  if (!isCanonicalizable(canonical_json)) {
    return { ok: false, kind: 'NOT_CANONICAL' };
  }

  let canonicalText: string;
  let hash: string;

  try {
    canonicalText = canonicalize(canonical_json);
  } catch {
    return { ok: false, kind: 'NOT_CANONICAL' };
  }

  try {
    hash = computeHash(canonicalText);
  } catch {
    return { ok: false, kind: 'HASH_FAILED' };
  }

  // For MVP: contract_id = `${decision_id}@${version}`
  const decisionId = String(framing.decision_id ?? 'decision');
  const contractId = `${decisionId}@${version}`;

  return {
    ok: true,
    artifact: {
      contract_id: contractId,
      version,
      hash,
      canonical_json,
    },
  };
}
