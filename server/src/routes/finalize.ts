/**
 * Finalization endpoint
 * 
 * Calls engine generateContract() and returns canonical contract with hash.
 * Supports lineage tracking via parent_hash and supersedes fields.
 */

import { Router, Request, Response } from 'express';
import { generateContract, canonicalize, computeHash } from '@ddr/meta-engine';
import type { IntakeSessionState } from '@ddr/meta-engine';
import { ENGINE_VERSION, ARTIFACT_SCHEMA_VERSION, HASH_ALGORITHM } from '../index';
import { contractRegistry } from '../store/contract-registry';

export const finalizeRouter = Router();

interface LineageRequest {
  parent_hash?: string;
  supersedes?: string;
}

interface FinalizeRequest {
  session: IntakeSessionState;
  acceptance_confirmed: boolean;
  requested_version?: string;
  lineage?: LineageRequest;
}

/**
 * POST /api/finalize
 * 
 * Finalizes a contract, generating canonical JSON and hash.
 */
finalizeRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { session, acceptance_confirmed, requested_version, lineage } = req.body as FinalizeRequest;

    if (!session) {
      return res.status(400).json({
        error: 'MISSING_SESSION',
        message: 'Session is required',
      });
    }

    if (!acceptance_confirmed) {
      return res.status(400).json({
        error: 'ACCEPTANCE_REQUIRED',
        message: 'Acceptance confirmation is required for finalization',
      });
    }

    console.log(`[FINALIZE] Generating contract...`);

    const now = new Date().toISOString();
    const version = requested_version || '1.0.0';
    const result = generateContract(session, version, now);

    if (!result.ok) {
      console.log(`[FINALIZE] Failed: ${result.kind}`);
      return res.status(400).json({
        error: 'FINALIZATION_FAILED',
        kind: result.kind,
        message: `Contract cannot be finalized: ${result.kind}`,
      });
    }

    const contractHash = result.artifact.hash;
    const parentHash = lineage?.parent_hash || null;
    const supersedes = lineage?.supersedes || null;

    // Validate lineage references
    const lineageValidation = contractRegistry.validateLineage(parentHash, supersedes, contractHash);
    if (!lineageValidation.valid) {
      console.log(`[FINALIZE] Lineage validation failed: ${lineageValidation.error}`);
      return res.status(400).json({
        error: 'LINEAGE_VALIDATION_FAILED',
        message: lineageValidation.error,
      });
    }

    // Register the contract in the registry
    contractRegistry.register({
      contract_id: result.artifact.contract_id,
      contract_hash: contractHash,
      finalized_at: now,
      engine_version: ENGINE_VERSION,
      artifact_schema_version: ARTIFACT_SCHEMA_VERSION,
      lineage: {
        parent_hash: parentHash,
        supersedes: supersedes,
      },
      canonical_json: result.artifact.canonical_json,
    });

    console.log(`[FINALIZE] Success. Hash: ${contractHash}`);
    if (parentHash) console.log(`[FINALIZE] Parent: ${parentHash}`);
    if (supersedes) console.log(`[FINALIZE] Supersedes: ${supersedes}`);

    return res.json({
      success: true,
      contract: result.artifact,
      canonical_json: canonicalize(result.artifact.canonical_json),
      hash: contractHash,
      hash_algorithm: HASH_ALGORITHM,
      engine_version: ENGINE_VERSION,
      artifact_schema_version: ARTIFACT_SCHEMA_VERSION,
      lineage: {
        parent_hash: parentHash,
        supersedes: supersedes,
      },
      timestamp: now,
    });
  } catch (err) {
    console.error('[FINALIZE] Error:', err);
    return res.status(500).json({
      error: 'FINALIZATION_ERROR',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * POST /api/finalize/hash
 * 
 * Computes hash for arbitrary data (utility endpoint).
 */
finalizeRouter.post('/hash', (req: Request, res: Response) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        error: 'MISSING_DATA',
        message: 'Data is required',
      });
    }

    const canonical = canonicalize(data);
    const hash = computeHash(canonical);

    return res.json({
      hash,
      canonical_size: canonical.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[HASH] Error:', err);
    return res.status(500).json({
      error: 'HASH_ERROR',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
