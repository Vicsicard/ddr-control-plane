/**
 * Blocked Path Scenario
 * 
 * Demonstrates stage blocking:
 * 1. Submit FRAMING with invalid data → BLOCKED
 * 2. Attempt transition → BLOCKED (stage not READY)
 * 3. Correct FRAMING → READY
 * 4. Transition succeeds
 * 
 * This proves stage gating works correctly.
 */

import * as fs from 'fs';
import * as path from 'path';

import { engine } from '../../engine/src/engine';
import { createInitialSession } from '../../engine/src/types/session';
import { canonicalize } from '../../engine/src/finalization/canonicalizer';

import { framingArtifacts } from '../fixtures/framing';

import { NOW } from '../utils/now';
import { printHeader, printStep, printSuccess, printFindings } from '../utils/pretty-print';

const GOLDEN_DIR = path.join(__dirname, '..', 'golden', 'blocked-path');

export function runBlockedPath(): void {
  printHeader('BLOCKED PATH SCENARIO');

  // 1. Create session
  printStep('Creating initial session');
  let session = createInitialSession('harness-blocked-path', 'meta.ddr', NOW, null);
  printSuccess('Session created');

  // 2. Submit FRAMING with invalid data (missing decision_purpose)
  printStep('Submitting FRAMING with invalid data (empty decision_purpose)');
  const invalidFraming = {
    ...framingArtifacts,
    decision_purpose: '', // Invalid: empty purpose
  };

  const result1 = engine.evaluateStage(session, 'FRAMING', invalidFraming, NOW);
  console.log(`\n  Decision: ${result1.decision}`);
  printFindings(result1.findings);

  // Verify we got findings
  if (result1.findings.length === 0) {
    throw new Error('Expected findings for invalid FRAMING');
  }
  printSuccess(`FRAMING blocked with ${result1.findings.length} finding(s)`);

  session = result1.updated_session;

  // Verify stage is BLOCKED
  if (session.stage_states.FRAMING !== 'BLOCKED') {
    throw new Error(`Expected FRAMING to be BLOCKED, got ${session.stage_states.FRAMING}`);
  }
  printSuccess('FRAMING stage correctly BLOCKED');

  // 3. Attempt transition while BLOCKED
  printStep('Attempting transition while FRAMING is BLOCKED');
  const transitionResult = engine.requestTransition(session, 'FRAMING', 'INPUTS', NOW);
  
  console.log(`\n  Decision: ${transitionResult.decision}`);
  printFindings(transitionResult.findings);

  if (transitionResult.decision === 'ALLOW') {
    throw new Error('Transition should NOT be allowed when stage is BLOCKED');
  }
  printSuccess('Transition correctly blocked');

  // 4. Correct FRAMING
  printStep('Correcting FRAMING with valid data');
  const result2 = engine.evaluateStage(session, 'FRAMING', framingArtifacts, NOW);
  
  console.log(`\n  Decision: ${result2.decision}`);
  printFindings(result2.findings);

  session = result2.updated_session;

  // Verify stage is now READY
  if (session.stage_states.FRAMING !== 'READY') {
    throw new Error(`Expected FRAMING to be READY, got ${session.stage_states.FRAMING}`);
  }
  printSuccess('FRAMING stage now READY');

  // 5. Transition should now succeed
  printStep('Attempting transition after correction');
  const transitionResult2 = engine.requestTransition(session, 'FRAMING', 'INPUTS', NOW);
  
  console.log(`\n  Decision: ${transitionResult2.decision}`);

  if (transitionResult2.decision !== 'ALLOW') {
    throw new Error(`Transition should be allowed, got ${transitionResult2.decision}`);
  }
  session = transitionResult2.updated_session;
  printSuccess(`Transitioned to ${session.stage}`);

  // 6. Write golden outputs
  printStep('Writing golden outputs');

  if (!fs.existsSync(GOLDEN_DIR)) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  }

  const findingsJson = canonicalize({
    scenario: 'blocked-path',
    blocked_submission: {
      decision: result1.decision,
      findings: result1.findings,
      stage_state: 'BLOCKED',
    },
    blocked_transition: {
      decision: transitionResult.decision,
      findings: transitionResult.findings,
    },
    corrected_submission: {
      decision: result2.decision,
      findings: result2.findings,
      stage_state: 'READY',
    },
    successful_transition: {
      decision: transitionResult2.decision,
      new_stage: session.stage,
    },
  } as Record<string, unknown>);
  fs.writeFileSync(path.join(GOLDEN_DIR, 'findings.json'), findingsJson, 'utf8');
  printSuccess('Wrote findings.json');

  const metadata = {
    scenario: 'blocked-path',
    timestamp: NOW,
    stage_gating_enforced: true,
    blocked_reason: result1.findings[0]?.code || 'unknown',
    final_stage: session.stage,
  };
  const metadataJson = canonicalize(metadata as Record<string, unknown>);
  fs.writeFileSync(path.join(GOLDEN_DIR, 'metadata.json'), metadataJson, 'utf8');
  printSuccess('Wrote metadata.json');

  printHeader('BLOCKED PATH COMPLETE');
  console.log('\n  Stage gating verified:');
  console.log('    1. Invalid submission → BLOCKED');
  console.log('    2. Transition blocked while stage BLOCKED');
  console.log('    3. Corrected submission → READY');
  console.log('    4. Transition allowed after correction');
  console.log('\n  ✓ Stage gating enforced correctly\n');
}
