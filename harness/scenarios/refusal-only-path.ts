/**
 * Refusal-Only Path Scenario
 *
 * Demonstrates:
 * - Valid contract framing
 * - Deterministic refusal behavior
 * - Simulation proves refusal determinism
 * - Finalization is correctly BLOCKED (no valid case exists)
 *
 * This scenario MUST NEVER produce an ACCEPTED contract.
 * It proves the negative guarantee: a system that only refuses
 * must still be deterministic, traceable, and governable.
 */

import * as fs from 'fs';
import * as path from 'path';

import { engine } from '../../engine/src/engine';
import { createInitialSession } from '../../engine/src/types/session';
import { canonicalize } from '../../engine/src/finalization/canonicalizer';

import { framingArtifacts } from '../fixtures/framing';
import { inputsArtifacts } from '../fixtures/inputs';
import { outputsArtifacts } from '../fixtures/outputs';
import { policiesArtifacts } from '../fixtures/policies';
import { refusalOnlyRulesArtifacts } from '../fixtures/rules-refusal-only';
import { refusalOnlyCases } from '../fixtures/simulation-refusal-only';

import { NOW } from '../utils/now';
import { assertEqual } from '../utils/assert-determinism';
import { printHeader, printStep, printSuccess, printFindings } from '../utils/pretty-print';

const GOLDEN_DIR = path.join(__dirname, '..', 'golden', 'refusal-only');

export function runRefusalOnlyPath(): void {
  printHeader('REFUSAL-ONLY PATH SCENARIO');

  // ---------------------------------------------------------------------------
  // 1. Create session
  // ---------------------------------------------------------------------------

  printStep('Creating initial session');
  let session = createInitialSession(
    'harness-refusal-only',
    'meta.ddr',
    NOW,
    null
  );
  printSuccess(`Session created: ${session.intake_session_id}`);

  // ---------------------------------------------------------------------------
  // 2. FRAMING → RULES (same as happy path, but with refusal-only rules)
  // ---------------------------------------------------------------------------

  const stages: Array<{
    stage: 'FRAMING' | 'INPUTS' | 'OUTPUTS' | 'POLICIES' | 'RULES';
    artifacts: Record<string, unknown>;
    next?: 'INPUTS' | 'OUTPUTS' | 'POLICIES' | 'RULES' | 'SIMULATION_FINALIZATION';
  }> = [
    { stage: 'FRAMING', artifacts: framingArtifacts, next: 'INPUTS' },
    { stage: 'INPUTS', artifacts: inputsArtifacts, next: 'OUTPUTS' },
    { stage: 'OUTPUTS', artifacts: outputsArtifacts, next: 'POLICIES' },
    { stage: 'POLICIES', artifacts: policiesArtifacts, next: 'RULES' },
    { stage: 'RULES', artifacts: refusalOnlyRulesArtifacts, next: 'SIMULATION_FINALIZATION' },
  ];

  for (const step of stages) {
    printStep(`Submitting ${step.stage}`);
    const result = engine.evaluateStage(session, step.stage, step.artifacts, NOW);
    printFindings(result.findings);

    if (result.decision === 'REJECT') {
      throw new Error(`${step.stage} rejected: ${result.findings.map(f => f.code).join(', ')}`);
    }
    
    session = result.updated_session;
    printSuccess(`${step.stage}: ${result.decision} (stage_state: ${session.stage_states[step.stage]})`);

    if (step.next) {
      printStep(`Transitioning ${step.stage} → ${step.next}`);
      const t = engine.requestTransition(session, step.stage, step.next, NOW);
      if (t.decision !== 'ALLOW') {
        throw new Error(`Transition blocked: ${t.findings.map(f => f.code).join(', ')}`);
      }
      session = t.updated_session;
      printSuccess(`Transitioned to ${session.stage}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Simulation (refusal only - no valid case, only refusal cases)
  // ---------------------------------------------------------------------------

  printStep('Running refusal-only simulation');
  const simResult = engine.runSimulation(session, refusalOnlyCases, NOW);
  
  console.log(`\n  Decision: ${simResult.decision}`);
  printFindings(simResult.findings);

  // This simulation should be BLOCKED because there's no asserted valid case
  const hasValidCaseMissing = simResult.findings.some(
    f => f.code === 'META_SIMULATION_MISSING_valid_case'
  );

  if (!hasValidCaseMissing) {
    throw new Error('Expected META_SIMULATION_MISSING_valid_case finding');
  }
  printSuccess('Correctly blocked: META_SIMULATION_MISSING_valid_case');

  // Log simulation results
  console.log('\n  Simulation case results:');
  for (const cr of simResult.case_results) {
    const status = cr.assertion_passed === true ? '✓' : cr.assertion_passed === false ? '✗' : '?';
    console.log(`    ${status} ${cr.case_id}: ${cr.output} (refusal: ${cr.trace.refusal})`);
  }

  // All cases must be refusal
  for (const cr of simResult.case_results) {
    assertEqual(String(cr.trace.refusal), 'true', `Case ${cr.case_id} must refuse`);
  }
  printSuccess('All cases correctly refused');

  // ---------------------------------------------------------------------------
  // 4. Finalization (must BLOCK - simulation not ready)
  // ---------------------------------------------------------------------------

  printStep('Attempting finalization (expected BLOCK)');
  const finalResult = engine.finalize(session, true, '1.0.0', NOW);
  
  console.log(`\n  Decision: ${finalResult.decision}`);
  printFindings(finalResult.findings);

  if (finalResult.decision === 'ACCEPTED') {
    throw new Error('Finalization must NOT be ACCEPTED for refusal-only system');
  }
  printSuccess(`Finalization correctly blocked: ${finalResult.decision}`);

  if (finalResult.contract_artifact !== null) {
    throw new Error('No contract artifact should be produced');
  }
  printSuccess('No contract artifact produced (correct)');

  // ---------------------------------------------------------------------------
  // 5. Write Golden Outputs
  // ---------------------------------------------------------------------------

  printStep('Writing golden outputs');

  if (!fs.existsSync(GOLDEN_DIR)) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  }

  // Write trace.json
  const traceJson = canonicalize({
    case_results: simResult.case_results,
    findings: simResult.findings,
  } as Record<string, unknown>);
  fs.writeFileSync(path.join(GOLDEN_DIR, 'trace.json'), traceJson, 'utf8');
  printSuccess('Wrote trace.json');

  // Write metadata.json
  const metadata = {
    scenario: 'refusal-only',
    timestamp: NOW,
    session_id: session.intake_session_id,
    terminal_status: session.terminal_status,
    simulation_decision: simResult.decision,
    finalization_decision: finalResult.decision,
    contract_produced: false,
    blocked_reason: 'META_SIMULATION_MISSING_valid_case',
  };
  const metadataJson = canonicalize(metadata as Record<string, unknown>);
  fs.writeFileSync(path.join(GOLDEN_DIR, 'metadata.json'), metadataJson, 'utf8');
  printSuccess('Wrote metadata.json');

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  printHeader('REFUSAL-ONLY PATH COMPLETE');
  console.log('\n  Negative determinism verified:');
  console.log('    1. All stages submitted successfully');
  console.log('    2. Refusal-only rules accepted');
  console.log('    3. Simulation blocked (no valid case)');
  console.log('    4. Finalization blocked (simulation not ready)');
  console.log('    5. No contract artifact produced');
  console.log('\n  ✓ Refusal-only system correctly rejected\n');
}
