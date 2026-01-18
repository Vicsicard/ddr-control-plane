/**
 * Happy Path Scenario
 * 
 * Demonstrates the complete successful flow:
 * 1. Create session
 * 2. Submit all stages (FRAMING → RULES)
 * 3. Run simulation with valid + refusal cases
 * 4. Finalize and generate contract
 * 5. Verify determinism against golden outputs
 */

import * as fs from 'fs';
import * as path from 'path';

import { engine } from '../../engine/src/engine';
import { createInitialSession } from '../../engine/src/types/session';
import { canonicalize } from '../../engine/src/finalization/canonicalizer';
import { toDownloadBytes } from '../../engine/src/finalization/download';

import { framingArtifacts } from '../fixtures/framing';
import { inputsArtifacts } from '../fixtures/inputs';
import { outputsArtifacts } from '../fixtures/outputs';
import { policiesArtifacts } from '../fixtures/policies';
import { rulesArtifacts } from '../fixtures/rules';
import { happyPathCases } from '../fixtures/simulation';

import { NOW } from '../utils/now';
import { assertEqual, assertHashMatch } from '../utils/assert-determinism';
import { printHeader, printStep, printSuccess, printFindings } from '../utils/pretty-print';

const GOLDEN_DIR = path.join(__dirname, '..', 'golden', 'happy-path');

export function runHappyPath(): void {
  printHeader('HAPPY PATH SCENARIO');

  // 1. Create session
  printStep('Creating initial session');
  let session = createInitialSession('harness-happy-path', 'meta.ddr', NOW, null);
  printSuccess(`Session created: ${session.intake_session_id}`);

  // 2. Submit FRAMING
  printStep('Submitting FRAMING stage');
  let result = engine.evaluateStage(session, 'FRAMING', framingArtifacts, NOW);
  if (result.decision === 'REJECT') {
    throw new Error(`FRAMING rejected: ${result.findings.map(f => f.code).join(', ')}`);
  }
  session = result.updated_session;
  printSuccess(`FRAMING: ${result.decision} (stage_state: ${session.stage_states.FRAMING})`);
  printFindings(result.findings);

  // Transition to INPUTS
  printStep('Transitioning FRAMING → INPUTS');
  const t1 = engine.requestTransition(session, 'FRAMING', 'INPUTS', NOW);
  if (t1.decision !== 'ALLOW') {
    throw new Error(`Transition blocked: ${t1.findings.map(f => f.code).join(', ')}`);
  }
  session = t1.updated_session;
  printSuccess(`Transitioned to ${session.stage}`);

  // 3. Submit INPUTS
  printStep('Submitting INPUTS stage');
  result = engine.evaluateStage(session, 'INPUTS', inputsArtifacts, NOW);
  if (result.decision === 'REJECT') {
    throw new Error(`INPUTS rejected: ${result.findings.map(f => f.code).join(', ')}`);
  }
  session = result.updated_session;
  printSuccess(`INPUTS: ${result.decision} (stage_state: ${session.stage_states.INPUTS})`);
  printFindings(result.findings);

  // Transition to OUTPUTS
  printStep('Transitioning INPUTS → OUTPUTS');
  const t2 = engine.requestTransition(session, 'INPUTS', 'OUTPUTS', NOW);
  if (t2.decision !== 'ALLOW') {
    throw new Error(`Transition blocked: ${t2.findings.map(f => f.code).join(', ')}`);
  }
  session = t2.updated_session;
  printSuccess(`Transitioned to ${session.stage}`);

  // 4. Submit OUTPUTS
  printStep('Submitting OUTPUTS stage');
  result = engine.evaluateStage(session, 'OUTPUTS', outputsArtifacts, NOW);
  if (result.decision === 'REJECT') {
    throw new Error(`OUTPUTS rejected: ${result.findings.map(f => f.code).join(', ')}`);
  }
  session = result.updated_session;
  printSuccess(`OUTPUTS: ${result.decision} (stage_state: ${session.stage_states.OUTPUTS})`);
  printFindings(result.findings);

  // Transition to POLICIES
  printStep('Transitioning OUTPUTS → POLICIES');
  const t3 = engine.requestTransition(session, 'OUTPUTS', 'POLICIES', NOW);
  if (t3.decision !== 'ALLOW') {
    throw new Error(`Transition blocked: ${t3.findings.map(f => f.code).join(', ')}`);
  }
  session = t3.updated_session;
  printSuccess(`Transitioned to ${session.stage}`);

  // 5. Submit POLICIES
  printStep('Submitting POLICIES stage');
  result = engine.evaluateStage(session, 'POLICIES', policiesArtifacts, NOW);
  if (result.decision === 'REJECT') {
    throw new Error(`POLICIES rejected: ${result.findings.map(f => f.code).join(', ')}`);
  }
  session = result.updated_session;
  printSuccess(`POLICIES: ${result.decision} (stage_state: ${session.stage_states.POLICIES})`);
  printFindings(result.findings);

  // Transition to RULES
  printStep('Transitioning POLICIES → RULES');
  const t4 = engine.requestTransition(session, 'POLICIES', 'RULES', NOW);
  if (t4.decision !== 'ALLOW') {
    throw new Error(`Transition blocked: ${t4.findings.map(f => f.code).join(', ')}`);
  }
  session = t4.updated_session;
  printSuccess(`Transitioned to ${session.stage}`);

  // 6. Submit RULES
  printStep('Submitting RULES stage');
  result = engine.evaluateStage(session, 'RULES', rulesArtifacts, NOW);
  if (result.decision === 'REJECT') {
    throw new Error(`RULES rejected: ${result.findings.map(f => f.code).join(', ')}`);
  }
  session = result.updated_session;
  printSuccess(`RULES: ${result.decision} (stage_state: ${session.stage_states.RULES})`);
  printFindings(result.findings);

  // Transition to SIMULATION_FINALIZATION
  printStep('Transitioning RULES → SIMULATION_FINALIZATION');
  const t5 = engine.requestTransition(session, 'RULES', 'SIMULATION_FINALIZATION', NOW);
  if (t5.decision !== 'ALLOW') {
    throw new Error(`Transition blocked: ${t5.findings.map(f => f.code).join(', ')}`);
  }
  session = t5.updated_session;
  printSuccess(`Transitioned to ${session.stage}`);

  // 7. Run simulation
  printStep('Running simulation');
  const simResult = engine.runSimulation(session, happyPathCases, NOW);
  if (simResult.decision === 'REJECT') {
    throw new Error(`Simulation rejected: ${simResult.findings.map(f => f.code).join(', ')}`);
  }
  session = simResult.updated_session;
  printSuccess(`Simulation: ${simResult.decision} (stage_state: ${session.stage_states.SIMULATION_FINALIZATION})`);
  printFindings(simResult.findings);

  // Log simulation results
  console.log('\n  Simulation case results:');
  for (const cr of simResult.case_results) {
    const status = cr.assertion_passed === true ? '✓' : cr.assertion_passed === false ? '✗' : '?';
    console.log(`    ${status} ${cr.case_id}: ${cr.output} (refusal: ${cr.trace.refusal})`);
  }

  // 8. Finalize
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

  // 9. Write golden outputs
  printStep('Writing golden outputs');

  // Ensure golden directory exists
  if (!fs.existsSync(GOLDEN_DIR)) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  }

  // Write contract.json
  const contractJson = canonicalize(contract.canonical_json as Record<string, unknown>);
  fs.writeFileSync(path.join(GOLDEN_DIR, 'contract.json'), contractJson, 'utf8');
  printSuccess('Wrote contract.json');

  // Write contract.hash
  fs.writeFileSync(path.join(GOLDEN_DIR, 'contract.hash'), contract.hash, 'utf8');
  printSuccess('Wrote contract.hash');

  // Write trace.json (simulation results)
  const traceJson = canonicalize({
    case_results: simResult.case_results,
    findings: simResult.findings,
  } as Record<string, unknown>);
  fs.writeFileSync(path.join(GOLDEN_DIR, 'trace.json'), traceJson, 'utf8');
  printSuccess('Wrote trace.json');

  // Write metadata.json
  const metadata = {
    scenario: 'happy-path',
    timestamp: NOW,
    session_id: session.intake_session_id,
    contract_id: contract.contract_id,
    contract_hash: contract.hash,
    terminal_status: session.terminal_status,
    stages_ready: Object.entries(session.stage_states)
      .filter(([_, state]) => state === 'READY')
      .map(([stage]) => stage),
  };
  const metadataJson = canonicalize(metadata as Record<string, unknown>);
  fs.writeFileSync(path.join(GOLDEN_DIR, 'metadata.json'), metadataJson, 'utf8');
  printSuccess('Wrote metadata.json');

  // Write download bytes
  const download = toDownloadBytes(contract);
  fs.writeFileSync(path.join(GOLDEN_DIR, download.filename), download.bytes);
  printSuccess(`Wrote ${download.filename}`);

  // 10. Verify determinism (run twice, compare)
  printStep('Verifying determinism');

  // Re-run the entire flow
  let session2 = createInitialSession('harness-happy-path', 'meta.ddr', NOW, null);
  
  const r1 = engine.evaluateStage(session2, 'FRAMING', framingArtifacts, NOW);
  session2 = r1.updated_session;
  session2 = engine.requestTransition(session2, 'FRAMING', 'INPUTS', NOW).updated_session;
  
  const r2 = engine.evaluateStage(session2, 'INPUTS', inputsArtifacts, NOW);
  session2 = r2.updated_session;
  session2 = engine.requestTransition(session2, 'INPUTS', 'OUTPUTS', NOW).updated_session;
  
  const r3 = engine.evaluateStage(session2, 'OUTPUTS', outputsArtifacts, NOW);
  session2 = r3.updated_session;
  session2 = engine.requestTransition(session2, 'OUTPUTS', 'POLICIES', NOW).updated_session;
  
  const r4 = engine.evaluateStage(session2, 'POLICIES', policiesArtifacts, NOW);
  session2 = r4.updated_session;
  session2 = engine.requestTransition(session2, 'POLICIES', 'RULES', NOW).updated_session;
  
  const r5 = engine.evaluateStage(session2, 'RULES', rulesArtifacts, NOW);
  session2 = r5.updated_session;
  session2 = engine.requestTransition(session2, 'RULES', 'SIMULATION_FINALIZATION', NOW).updated_session;
  
  const sim2 = engine.runSimulation(session2, happyPathCases, NOW);
  session2 = sim2.updated_session;
  
  const final2 = engine.finalize(session2, true, '1.0.0', NOW);
  const contract2 = final2.contract_artifact!;

  // Assert determinism
  assertHashMatch(contract2.hash, contract.hash);
  assertEqual(
    canonicalize(contract2.canonical_json as Record<string, unknown>),
    contractJson,
    'Contract JSON match'
  );

  printHeader('HAPPY PATH COMPLETE');
  console.log(`\n  Contract: ${contract.contract_id}`);
  console.log(`  Hash: ${contract.hash}`);
  console.log(`  Status: ${session.terminal_status}`);
  console.log('\n  ✓ Determinism verified\n');
}
