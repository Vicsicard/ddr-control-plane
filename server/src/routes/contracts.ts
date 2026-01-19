/**
 * Contracts endpoint
 * 
 * Query contract metadata and lineage information.
 * No traversal - one hop only.
 */

import { Router, Request, Response } from 'express';
import { ENGINE_VERSION, ARTIFACT_SCHEMA_VERSION } from '../index';
import { contractRegistry } from '../store/contract-registry';

export const contractsRouter = Router();

/**
 * GET /api/v1/contracts/:hash/lineage
 * 
 * Get lineage information for a specific contract.
 * Returns parent_hash, supersedes, and superseded_by (if applicable).
 * 
 * No traversal. One hop only.
 */
contractsRouter.get('/:hash/lineage', (req: Request, res: Response) => {
  try {
    const { hash } = req.params;

    if (!hash) {
      return res.status(400).json({
        error: 'MISSING_HASH',
        message: 'Contract hash is required',
        engine_version: ENGINE_VERSION,
        timestamp: new Date().toISOString(),
      });
    }

    const lineage = contractRegistry.getLineage(hash);

    if (!lineage) {
      return res.status(404).json({
        error: 'CONTRACT_NOT_FOUND',
        message: `No contract found with hash: ${hash}`,
        engine_version: ENGINE_VERSION,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[CONTRACTS] Lineage query for: ${hash.slice(0, 20)}...`);

    return res.json({
      ...lineage,
      engine_version: ENGINE_VERSION,
      artifact_schema_version: ARTIFACT_SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[CONTRACTS] Error:', err);
    return res.status(500).json({
      error: 'QUERY_ERROR',
      message: err instanceof Error ? err.message : String(err),
      engine_version: ENGINE_VERSION,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/contracts/:hash
 * 
 * Get contract metadata (without full canonical JSON).
 */
contractsRouter.get('/:hash', (req: Request, res: Response) => {
  try {
    const { hash } = req.params;

    if (!hash) {
      return res.status(400).json({
        error: 'MISSING_HASH',
        message: 'Contract hash is required',
        engine_version: ENGINE_VERSION,
        timestamp: new Date().toISOString(),
      });
    }

    const contract = contractRegistry.get(hash);

    if (!contract) {
      return res.status(404).json({
        error: 'CONTRACT_NOT_FOUND',
        message: `No contract found with hash: ${hash}`,
        engine_version: ENGINE_VERSION,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[CONTRACTS] Metadata query for: ${hash.slice(0, 20)}...`);

    // Return metadata without full canonical JSON
    return res.json({
      contract_id: contract.contract_id,
      contract_hash: contract.contract_hash,
      finalized_at: contract.finalized_at,
      engine_version: contract.engine_version,
      artifact_schema_version: contract.artifact_schema_version,
      lineage: contract.lineage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[CONTRACTS] Error:', err);
    return res.status(500).json({
      error: 'QUERY_ERROR',
      message: err instanceof Error ? err.message : String(err),
      engine_version: ENGINE_VERSION,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/contracts
 * 
 * List all registered contracts (for debugging/admin).
 */
contractsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const contracts = contractRegistry.getAll();
    
    console.log(`[CONTRACTS] Listing ${contracts.length} contracts`);

    return res.json({
      count: contracts.length,
      contracts: contracts.map(c => ({
        contract_id: c.contract_id,
        contract_hash: c.contract_hash,
        finalized_at: c.finalized_at,
        lineage: c.lineage,
      })),
      engine_version: ENGINE_VERSION,
      artifact_schema_version: ARTIFACT_SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[CONTRACTS] Error:', err);
    return res.status(500).json({
      error: 'QUERY_ERROR',
      message: err instanceof Error ? err.message : String(err),
      engine_version: ENGINE_VERSION,
      timestamp: new Date().toISOString(),
    });
  }
});
