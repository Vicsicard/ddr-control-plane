/**
 * Simulation endpoint
 * 
 * Calls engine runSimulationCases() and returns results.
 */

import { Router, Request, Response } from 'express';
import { runSimulationCases } from '@ddr/meta-engine';
import type { IntakeSessionState, SimulationCase } from '@ddr/meta-engine';
import { ENGINE_VERSION, ARTIFACT_SCHEMA_VERSION } from '../index';

export const simulateRouter = Router();

interface SimulateRequest {
  session: IntakeSessionState;
  cases: SimulationCase[];
}

/**
 * POST /api/simulate
 * 
 * Runs simulation cases against the contract definition.
 */
simulateRouter.post('/', (req: Request, res: Response) => {
  try {
    const { session, cases } = req.body as SimulateRequest;

    if (!session) {
      return res.status(400).json({
        error: 'MISSING_SESSION',
        message: 'Session is required',
      });
    }

    if (!cases || !Array.isArray(cases)) {
      return res.status(400).json({
        error: 'MISSING_CASES',
        message: 'Simulation cases array is required',
      });
    }

    console.log(`[SIMULATE] Running ${cases.length} cases`);

    const result = runSimulationCases(session, cases);
    const passedCount = result.caseResults.filter(r => r.assertion_passed === true).length;

    console.log(`[SIMULATE] Complete. Passed: ${passedCount}/${result.caseResults.length}`);

    return res.json({
      caseResults: result.caseResults,
      findings: result.findings,
      all_passed: result.findings.length === 0,
      total: result.caseResults.length,
      passed: passedCount,
      failed: result.caseResults.length - passedCount,
      engine_version: ENGINE_VERSION,
      artifact_schema_version: ARTIFACT_SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[SIMULATE] Error:', err);
    return res.status(500).json({
      error: 'SIMULATION_ERROR',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
