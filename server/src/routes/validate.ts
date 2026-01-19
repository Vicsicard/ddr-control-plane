/**
 * Stage validation endpoint
 * 
 * Calls engine validateStage() and returns findings.
 */

import { Router, Request, Response } from 'express';
import { validateStage } from '@ddr/meta-engine';
import type { Stage, IntakeSessionState } from '@ddr/meta-engine';
import { ENGINE_VERSION, ARTIFACT_SCHEMA_VERSION } from '../index';

export const validateRouter = Router();

interface ValidateStageRequest {
  stage: Stage;
  artifacts: unknown;
  session: IntakeSessionState;
}

/**
 * POST /api/validate/stage
 * 
 * Validates a single stage's artifacts against engine rules.
 */
validateRouter.post('/stage', (req: Request, res: Response) => {
  try {
    const { stage, artifacts, session } = req.body as ValidateStageRequest;

    if (!stage) {
      return res.status(400).json({
        error: 'MISSING_STAGE',
        message: 'Stage is required',
      });
    }

    console.log(`[VALIDATE] Stage: ${stage}`);

    const findings = validateStage(stage, artifacts as Record<string, unknown>, session);

    console.log(`[VALIDATE] Findings: ${findings.length}`);

    return res.json({
      stage,
      findings,
      is_valid: !findings.some(f => f.severity === 'BLOCK'),
      engine_version: ENGINE_VERSION,
      artifact_schema_version: ARTIFACT_SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[VALIDATE] Error:', err);
    return res.status(500).json({
      error: 'VALIDATION_ERROR',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
