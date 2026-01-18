/**
 * Refusal Path Scenario
 * 
 * Demonstrates governance enforcement:
 * 1. Submit all stages successfully
 * 2. Run simulation WITHOUT required refusal case → BLOCK
 * 3. Correct by adding refusal case
 * 4. Re-run simulation → ALLOW
 * 5. Finalize successfully
 * 
 * This proves the engine enforces the refusal requirement.
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
import { rulesArtifacts } from '../fixtures/rules';
import { refusalPathCases_incomplete, refusalPathCases_corrected } from '../fixtures/simulation';

import { NOW } from '../utils/now';
import { printHeader, printStep, printSuccess, printError, printFindings } from '../utils/pretty-print';

const GOLDEN_DIR = path.join(__dirname, '..', 'golden', 'refusal-path');

export function runRefusalPath(): void {
  printHeader('REFUSAL PATH SCENARIO');

  // 1. Create session and submit all stages
  printStep('Creating session and submitting all stages');
  let session = createInitialSession('harness-refusal-path', 'meta.ddr', NOW, null);

  // Submit all stages (abbreviated)
  session = engine.evaluateStage(session, 'FRAMING', framingArtifacts, NOW).updated_session;
  session = engine.requestTransition(session, 'FRAMING', 'INPUTS', NOW).updated_session;
  
  session = engine.evaluateStage(session, 'INPUTS', inputsArtifacts, NOW).updated_session;
  session = engine.requestTransition(session, 'INPUTS', 'OUTPUTS', NOW).updated_session;
  
  session = engine.evaluateStage(session, 'OUTPUTS', outputsArtifacts, NOW).updated_session;
  session = engine.requestTransition(session, 'OUTPUTS', 'POLICIES', NOW).updated_session;
  
  session = engine.evaluateStage(session, 'POLICIES', policiesArtifacts, NOW).updated_session;
  session = engine.requestTransition(session, 'POLICIES', 'RULES', NOW).updated_session;
  
  session = engine.evaluateStage(session, 'RULES', rulesArtifacts, NOW).updated_session;
  session = engine.requestTransition(session, 'RULES', 'SIMULATION_FINALIZATION', NOW).updated_session;

  printSuccess('All stages submitted and transitioned to SIMULATION_FINALIZATION');

  // 2. Run simulation WITHOUT refusal case
  printStep('Running simulation WITHOUT required refusal case');
  const simResult1 = engine.runSimulation(session, refusalPathCases_incomplete, NOW);
  
  console.log(`\n  Decision: ${simResult1.decision}`);
  printFindings(simResult1.findings);

  // Verify we got BLOCK with the expected finding
  const hasRefusalMissing = simResult1.findings.some(
    f => f.code === 'META_SIMULATION_MISSING_refusal_case'
  );

  if (!hasRefusalMissing) {
    throw new Error('Expected META_SIMULATION_MISSING_refusal_case finding');
  }
  printSuccess('Correctly blocked: META_SIMULATION_MISSING_refusal_case');

  // Session should NOT be updated to READY
  if (session.stage_states.SIMULATION_FINALIZATION === 'READY') {
    throw new Error('SIMULATION_FINALIZATION should NOT be READY after blocked simulation');
  }
  printSuccess('SIMULATION_FINALIZATION stage correctly NOT READY');

  // 3. Correct by running with proper cases
  printStep('Running simulation WITH required refusal case');
  const simResult2 = engine.runSimulation(session, refusalPathCases_corrected, NOW);
  
  console.log(`\n  Decision: ${simResult2.decision}`);
  printFindings(simResult2.findings);

  if (simResult2.decision === 'REJECT') {
    throw new Error(`Simulation rejected: ${simResult2.findings.map(f => f.code).join(', ')}`);
  }

  session = simResult2.updated_session;
  printSuccess(`Simulation: ${simResult2.decision} (stage_state: ${session.stage_states.SIMULATION_FINALIZATION})`);

  // Log simulation results
  console.log('\n  Simulation case results:');
  for (const cr of simResult2.case_results) {
    const status = cr.assertion_passed === true ? '✓' : cr.assertion_passed === false ? '✗' : '?';
    console.log(`    ${status} ${cr.case_id}: ${cr.output} (refusal: ${cr.trace.refusal})`);
  }

  // 4. Finalize
  printStep('Finalizing contract');
  const finalResult = engine.finalize(session, true, '1.0.0', NOW);
  if (finalResult.decision !== 'ACCEPTED') {
    throw new Error(`Finalization failed: ${finalResult.decision} - ${finalResult.findings.map(f => f.code).join(', ')}`);
  }
  session = finalResult.updated_session;
  printSuccess(`Finalization: ${finalResult.decision}`);
  printSuccess(`Terminal status: ${session.terminal_status}`);

  const contract = finalResult.contract_artifact!;
  printSuccess(`Contract ID: ${contract.contract_id}`);
  printSuccess(`Contract Hash: ${contract.hash}`);

  // 5. Write golden outputs
  printStep('Writing golden outputs');

  if (!fs.existsSync(GOLDEN_DIR)) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  }

  // Write findings from the blocked simulation
  const findingsJson = canonicalize({
    scenario: 'refusal-path',
    blocked_simulation: {
      decision: simResult1.decision,
      findings: simResult1.findings,
    },
    corrected_simulation: {
      decision: simResult2.decision,
      findings: simResult2.findings,
      case_results: simResult2.case_results,
    },
  } as Record<string, unknown>);
  fs.writeFileSync(path.join(GOLDEN_DIR, 'findings.json'), findingsJson, 'utf8');
  printSuccess('Wrote findings.json');

  // Write metadata
  const metadata = {
    scenario: 'refusal-path',
    timestamp: NOW,
    governance_enforced: true,
    blocked_reason: 'META_SIMULATION_MISSING_refusal_case',
    final_status: session.terminal_status,
    contract_id: contract.contract_id,
    contract_hash: contract.hash,
  };
  const metadataJson = canonicalize(metadata as Record<string, unknown>);
  fs.writeFileSync(path.join(GOLDEN_DIR, 'metadata.json'), metadataJson, 'utf8');
  printSuccess('Wrote metadata.json');

  printHeader('REFUSAL PATH COMPLETE');
  console.log('\n  Governance enforcement verified:');
  console.log('    1. Simulation blocked without refusal case');
  console.log('    2. Simulation allowed after correction');
  console.log('    3. Contract finalized successfully');
  console.log(`\n  Contract: ${contract.contract_id}`);
  console.log(`  Hash: ${contract.hash}`);
  console.log('\n  ✓ Governance enforced correctly\n');
}
