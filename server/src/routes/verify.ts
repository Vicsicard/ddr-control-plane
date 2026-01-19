/**
 * Verification endpoint
 * 
 * Deterministic replay verification: given canonical JSON and a hash,
 * verify that the hash matches what the engine would compute.
 * 
 * This enables:
 * - CI/CD pipeline verification
 * - Audit workflows
 * - External system validation
 * - Machine-to-machine trust
 */

import { Router, Request, Response } from 'express';
import { canonicalize, computeHash } from '@ddr/meta-engine';
import { ENGINE_VERSION, ARTIFACT_SCHEMA_VERSION, HASH_ALGORITHM } from '../index';

export const verifyRouter = Router();

interface VerifyRequest {
  canonical_json: string | Record<string, unknown>;
  hash: string;
}

interface VerifyResponse {
  valid: boolean;
  expected_hash: string;
  provided_hash: string;
  match: boolean;
  engine_version: string;
  artifact_schema_version: string;
  hash_algorithm: string;
  timestamp: string;
  reason?: string;
}

/**
 * POST /api/v1/verify
 * 
 * Verify that a canonical JSON artifact matches its claimed hash.
 * 
 * Request:
 * {
 *   "canonical_json": { ... } | "stringified JSON",
 *   "hash": "sha256:abc123..."
 * }
 * 
 * Response:
 * {
 *   "valid": true | false,
 *   "expected_hash": "sha256:...",
 *   "provided_hash": "sha256:...",
 *   "match": true | false,
 *   "engine_version": "1.0.0",
 *   "artifact_schema_version": "1.0.0",
 *   "hash_algorithm": "SHA-256",
 *   "timestamp": "...",
 *   "reason": "..." (only if invalid)
 * }
 */
verifyRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { canonical_json, hash } = req.body as VerifyRequest;

    // Validate request
    if (!canonical_json) {
      return res.status(400).json({
        valid: false,
        error: 'MISSING_CANONICAL_JSON',
        message: 'canonical_json is required',
        engine_version: ENGINE_VERSION,
        artifact_schema_version: ARTIFACT_SCHEMA_VERSION,
        timestamp: new Date().toISOString(),
      });
    }

    if (!hash) {
      return res.status(400).json({
        valid: false,
        error: 'MISSING_HASH',
        message: 'hash is required',
        engine_version: ENGINE_VERSION,
        artifact_schema_version: ARTIFACT_SCHEMA_VERSION,
        timestamp: new Date().toISOString(),
      });
    }

    // Normalize canonical JSON to string if object provided
    let canonicalString: string;
    if (typeof canonical_json === 'string') {
      canonicalString = canonical_json;
    } else {
      // Re-canonicalize to ensure consistent ordering
      canonicalString = canonicalize(canonical_json);
    }

    console.log(`[VERIFY] Verifying hash for artifact (${canonicalString.length} bytes)`);

    // Compute expected hash
    const expectedHash = await computeHash(canonicalString);

    // Normalize provided hash for comparison
    const normalizedProvidedHash = hash.toLowerCase();
    const normalizedExpectedHash = expectedHash.toLowerCase();

    const match = normalizedProvidedHash === normalizedExpectedHash;

    console.log(`[VERIFY] Expected: ${expectedHash}`);
    console.log(`[VERIFY] Provided: ${hash}`);
    console.log(`[VERIFY] Match: ${match}`);

    const response: VerifyResponse = {
      valid: match,
      expected_hash: expectedHash,
      provided_hash: hash,
      match,
      engine_version: ENGINE_VERSION,
      artifact_schema_version: ARTIFACT_SCHEMA_VERSION,
      hash_algorithm: HASH_ALGORITHM,
      timestamp: new Date().toISOString(),
    };

    if (!match) {
      response.reason = 'Hash mismatch: the provided hash does not match the computed hash of the canonical JSON';
    }

    return res.json(response);
  } catch (err) {
    console.error('[VERIFY] Error:', err);
    return res.status(500).json({
      valid: false,
      error: 'VERIFICATION_ERROR',
      message: err instanceof Error ? err.message : String(err),
      engine_version: ENGINE_VERSION,
      artifact_schema_version: ARTIFACT_SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/verify/info
 * 
 * Returns information about the verification endpoint and hash algorithm.
 */
verifyRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    endpoint: '/api/v1/verify',
    method: 'POST',
    description: 'Verify that a canonical JSON artifact matches its claimed hash',
    hash_algorithm: HASH_ALGORITHM,
    canonicalization: 'json-stable-stringify (alphabetical key ordering, no whitespace)',
    engine_version: ENGINE_VERSION,
    artifact_schema_version: ARTIFACT_SCHEMA_VERSION,
    request_schema: {
      canonical_json: 'string | object (the canonical contract JSON)',
      hash: 'string (the claimed hash, e.g., "sha256:abc123...")',
    },
    response_schema: {
      valid: 'boolean (true if hash matches)',
      expected_hash: 'string (hash computed by engine)',
      provided_hash: 'string (hash provided in request)',
      match: 'boolean (true if hashes match)',
      reason: 'string (explanation if invalid)',
    },
  });
});
