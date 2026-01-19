/**
 * Health check endpoint
 */

import { Router } from 'express';
import { ENGINE_VERSION, ARTIFACT_SCHEMA_VERSION, API_VERSION, HASH_ALGORITHM } from '../index';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'dcg-engine-server',
    engine_version: ENGINE_VERSION,
    artifact_schema_version: ARTIFACT_SCHEMA_VERSION,
    api_version: API_VERSION,
    hash_algorithm: HASH_ALGORITHM,
    timestamp: new Date().toISOString(),
  });
});
