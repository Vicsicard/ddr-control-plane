/**
 * Engine Bridge
 * 
 * SINGLE CHOKE POINT for all Studio → DCG Engine communication.
 * 
 * GOLDEN RULES:
 * - Studio must NOT import engine code
 * - Studio must NOT compute hashes
 * - Studio must NOT validate rules locally
 * - Studio must NEVER "re-interpret" results
 * 
 * Studio ONLY:
 * - Sends artifacts
 * - Renders findings
 * - Advances stages based on engine responses
 * 
 * The DCG Engine server is the SOLE AUTHORITY.
 */

import type { ContractSession, Stage, ValidationError } from '../types';
import { adaptSessionToEngine } from './session.adapter';
import { adaptFindingsToValidationErrors, type EngineFinding } from './findings.adapter';

// =============================================================================
// Configuration
// =============================================================================

const ENGINE_BASE_URL =
  import.meta.env.VITE_DCG_ENGINE_URL ?? 'http://localhost:3001/api/v1';

const ENGINE_API_KEY =
  import.meta.env.VITE_DCG_ENGINE_API_KEY ?? 'dcg_studio_dev_key_12345';

// =============================================================================
// Types (Engine Response Shapes)
// =============================================================================

export interface EngineValidationResponse {
  stage: string;
  findings: EngineFinding[];
  is_valid: boolean;
  timestamp: string;
}

export interface EngineSimulationResponse {
  caseResults: EngineSimulationCaseResult[];
  findings: EngineFinding[];
  all_passed: boolean;
  total: number;
  passed: number;
  failed: number;
  timestamp: string;
}

export interface EngineSimulationCaseResult {
  case_id: string;
  output: string;
  trace: {
    contract_version: string;
    policy_checks: string[];
    rule_path: string[];
    refusal: boolean;
    matched_rule?: string | null;
  };
  assertion_passed: boolean | null;
}

export interface EngineFinalizeResponse {
  success: boolean;
  contract: {
    contract_id: string;
    version: string;
    hash: string;
    canonical_json: Record<string, unknown>;
  } | null;
  canonical_json: string | null;
  hash: string | null;
  timestamp: string;
}

export interface EngineHealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
}

// =============================================================================
// Engine API Client
// =============================================================================

/**
 * Check if the DCG Engine server is reachable.
 */
export async function checkEngineHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${ENGINE_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return false;
    const data: EngineHealthResponse = await res.json();
    return data.status === 'ok';
  } catch {
    console.warn('[ENGINE-BRIDGE] Engine server not reachable');
    return false;
  }
}

/**
 * Validate a stage's artifacts via the DCG Engine server.
 * 
 * This is the ONLY way Studio validates stages.
 * The server response is AUTHORITATIVE.
 */
export async function validateStageViaEngine(
  session: ContractSession,
  stage: Stage
): Promise<{ errors: ValidationError[]; stageState: 'READY' | 'INVALID' }> {
  console.log(`[ENGINE-BRIDGE] validateStageViaEngine called for stage: ${stage}`);

  // Adapt session to engine format
  const sessionResult = adaptSessionToEngine(session);
  if (!sessionResult.ok) {
    console.error('[ENGINE-BRIDGE] Adapter translation failed:', sessionResult.errors);
    return {
      errors: sessionResult.errors.map((e) => ({
        code: 'ADAPTER_ERROR',
        field_path: e.field,
        message: e.message,
        severity: 'BLOCK' as const,
      })),
      stageState: 'INVALID',
    };
  }

  const engineSession = sessionResult.data;
  const engineStage = mapStudioStageToEngine(stage);
  const artifacts = engineSession.artifacts[engineStage];

  try {
    const res = await fetch(`${ENGINE_BASE_URL}/validate/stage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ENGINE_API_KEY}`,
      },
      body: JSON.stringify({
        stage: engineStage,
        artifacts,
        session: engineSession,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[ENGINE-BRIDGE] Engine validation failed (${res.status}):`, errorText);
      return {
        errors: [{
          code: 'ENGINE_ERROR',
          field_path: null,
          message: `Engine validation failed: ${res.status}`,
          severity: 'BLOCK',
        }],
        stageState: 'INVALID',
      };
    }

    const data: EngineValidationResponse = await res.json();
    console.log(`[ENGINE-BRIDGE] Engine response:`, data);

    const errors = adaptFindingsToValidationErrors(data.findings);
    const stageState = data.is_valid ? 'READY' : 'INVALID';

    return { errors, stageState };
  } catch (err) {
    console.error('[ENGINE-BRIDGE] Network error:', err);
    return {
      errors: [{
        code: 'NETWORK_ERROR',
        field_path: null,
        message: `Failed to reach engine server: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'BLOCK',
      }],
      stageState: 'INVALID',
    };
  }
}

/**
 * Run simulation cases via the DCG Engine server.
 * 
 * The server executes rules deterministically and returns traces.
 * Studio ONLY renders results — never computes.
 */
export async function runSimulationViaEngine(
  session: ContractSession
): Promise<EngineSimulationResponse> {
  console.log('[ENGINE-BRIDGE] runSimulationViaEngine called');

  // Adapt session to engine format
  const sessionResult = adaptSessionToEngine(session);
  if (!sessionResult.ok) {
    console.error('[ENGINE-BRIDGE] Adapter translation failed:', sessionResult.errors);
    return {
      caseResults: [],
      findings: sessionResult.errors.map((e) => ({
        code: 'ADAPTER_ERROR',
        severity: 'BLOCK' as const,
        invariant: 'ADAPTER',
        field_path: e.field,
        message: e.message,
        next_action: 'FIX_INPUT',
        action_target: e.field,
      })),
      all_passed: false,
      total: 0,
      passed: 0,
      failed: 0,
      timestamp: new Date().toISOString(),
    };
  }

  const engineSession = sessionResult.data;
  const simArtifacts = engineSession.artifacts.SIMULATION_FINALIZATION as { cases?: unknown[] } | null;
  const cases = simArtifacts?.cases ?? [];

  try {
    const res = await fetch(`${ENGINE_BASE_URL}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: engineSession,
        cases,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[ENGINE-BRIDGE] Simulation failed (${res.status}):`, errorText);
      return {
        caseResults: [],
        findings: [{
          code: 'ENGINE_ERROR',
          severity: 'BLOCK',
          invariant: 'ENGINE',
          field_path: null,
          message: `Simulation failed: ${res.status}`,
          next_action: 'CHECK_ENGINE',
          action_target: null,
        }],
        all_passed: false,
        total: 0,
        passed: 0,
        failed: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const data: EngineSimulationResponse = await res.json();
    console.log(`[ENGINE-BRIDGE] Simulation response:`, data);

    return data;
  } catch (err) {
    console.error('[ENGINE-BRIDGE] Network error:', err);
    return {
      caseResults: [],
      findings: [{
        code: 'NETWORK_ERROR',
        severity: 'BLOCK',
        invariant: 'ENGINE',
        field_path: null,
        message: `Failed to reach engine server: ${err instanceof Error ? err.message : String(err)}`,
        next_action: 'CHECK_ENGINE',
        action_target: null,
      }],
      all_passed: false,
      total: 0,
      passed: 0,
      failed: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Finalize contract via the DCG Engine server.
 * 
 * CRITICAL BOUNDARY:
 * - The server generates the canonical JSON
 * - The server computes the cryptographic hash
 * - Studio NEVER computes — only renders
 */
export async function finalizeViaEngine(
  session: ContractSession,
  version?: string
): Promise<EngineFinalizeResponse> {
  console.log('[ENGINE-BRIDGE] finalizeViaEngine called');

  // Adapt session to engine format
  const sessionResult = adaptSessionToEngine(session);
  if (!sessionResult.ok) {
    console.error('[ENGINE-BRIDGE] Adapter translation failed:', sessionResult.errors);
    return {
      success: false,
      contract: null,
      canonical_json: null,
      hash: null,
      timestamp: new Date().toISOString(),
    };
  }

  const engineSession = sessionResult.data;

  try {
    const res = await fetch(`${ENGINE_BASE_URL}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ENGINE_API_KEY}`,
      },
      body: JSON.stringify({
        session: engineSession,
        acceptance_confirmed: true,
        requested_version: version ?? '1.0.0',
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[ENGINE-BRIDGE] Finalization failed (${res.status}):`, errorData);
      return {
        success: false,
        contract: null,
        canonical_json: null,
        hash: null,
        timestamp: new Date().toISOString(),
      };
    }

    const data: EngineFinalizeResponse = await res.json();
    console.log(`[ENGINE-BRIDGE] Finalization response:`, data);

    return data;
  } catch (err) {
    console.error('[ENGINE-BRIDGE] Network error:', err);
    return {
      success: false,
      contract: null,
      canonical_json: null,
      hash: null,
      timestamp: new Date().toISOString(),
    };
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Map Studio stage names to Engine stage names.
 */
type EngineStage = 'FRAMING' | 'INPUTS' | 'OUTPUTS' | 'POLICIES' | 'RULES' | 'SIMULATION_FINALIZATION';

function mapStudioStageToEngine(studioStage: Stage): EngineStage {
  if (studioStage === 'FINALIZATION') {
    return 'SIMULATION_FINALIZATION';
  }
  return studioStage as EngineStage;
}

/**
 * Check if engine integration is available.
 * 
 * Returns true — the engine server is now the authority.
 */
export function isEngineAvailable(): boolean {
  return true;
}

// =============================================================================
// Legacy Exports (for backward compatibility during transition)
// =============================================================================

export { type EngineFinding } from './findings.adapter';

export interface EngineEvaluationResult {
  decision: 'ALLOW' | 'BLOCK' | 'REJECT';
  stage_state: 'INCOMPLETE' | 'UNDER_REVIEW' | 'BLOCKED' | 'READY';
  can_proceed: boolean;
  findings: EngineFinding[];
}

export interface EngineSimulationResult {
  decision: 'ALLOW' | 'BLOCK' | 'REJECT';
  stage_state: 'INCOMPLETE' | 'UNDER_REVIEW' | 'BLOCKED' | 'READY';
  can_proceed: boolean;
  case_results: EngineSimulationCaseResult[];
  findings: EngineFinding[];
}

export interface EngineFinalizeResult {
  decision: 'ACCEPTED' | 'BLOCK' | 'REJECT';
  findings: EngineFinding[];
  contract_artifact: {
    contract_id: string;
    version: string;
    hash: string;
    canonical_json: Record<string, unknown>;
  } | null;
}

export function evaluateStage(
  _session: ContractSession,
  _stage: Stage
): { errors: ValidationError[]; stageState: 'READY' | 'INVALID' } {
  console.warn('[ENGINE-BRIDGE] DEPRECATED: evaluateStage is synchronous. Use validateStageViaEngine instead.');
  return { errors: [], stageState: 'READY' };
}

export function runEngineSimulation(
  _session: ContractSession
): EngineSimulationResult | null {
  console.warn('[ENGINE-BRIDGE] DEPRECATED: runEngineSimulation is synchronous. Use runSimulationViaEngine instead.');
  return null;
}

export function finalizeWithEngine(
  _session: ContractSession
): EngineFinalizeResult | null {
  console.warn('[ENGINE-BRIDGE] DEPRECATED: finalizeWithEngine is synchronous. Use finalizeViaEngine instead.');
  return null;
}
