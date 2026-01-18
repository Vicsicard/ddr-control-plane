# Meta DDR Engine Interface (v0.1)

> **FROZEN FOR MVP** — Changes require invariant review and version bump.

This document defines the headless Meta DDR engine interface. The engine is a pure decision system with no HTTP, UI, or persistence concerns.

---

## Design Principles

| Principle | Implication |
|-----------|-------------|
| **Engine is authoritative** | All progression decisions come from here |
| **Stateless evaluation** | Engine receives state, returns decision + new state |
| **No side effects** | Engine doesn't persist; caller handles storage |
| **Deterministic** | Same inputs → same outputs, always |
| **Reason codes are first-class** | Every BLOCK/REJECT includes structured findings |

---

## Core Types

### Enums

```typescript
type Stage = 
  | 'FRAMING'
  | 'INPUTS'
  | 'OUTPUTS'
  | 'POLICIES'
  | 'RULES'
  | 'SIMULATION_FINALIZATION';

type IntakeStatus = 'IN_PROGRESS' | 'BLOCKED' | 'ACCEPTED' | 'REJECTED';

type StageState = 'INCOMPLETE' | 'UNDER_REVIEW' | 'BLOCKED' | 'READY';

// Non-terminal decisions (used by evaluateStage, requestTransition, runSimulation)
type EvaluationDecision = 'ALLOW' | 'BLOCK' | 'REJECT';

// Terminal-capable decisions (used only by finalize)
type FinalizeDecision = 'ACCEPTED' | 'BLOCK' | 'REJECT';

type Severity = 'BLOCK' | 'REJECT' | 'WARN';
```

### Core Structures

```typescript
interface Finding {
  code: string;           // e.g., META_INPUTS_MISSING_trust_level
  severity: Severity;
  invariant: string;      // e.g., NO_IMPLICIT_DEFAULTS
  field_path: string | null;
  message: string;
  next_action: string;    // e.g., SET_TRUST_LEVEL
  action_target: string | null;
}

interface Trace {
  contract_version: string;
  policy_checks: string[];
  rule_path: string[];
  refusal: boolean;
  [key: string]: unknown; // additionalProperties for engine metadata
}

interface StageArtifacts {
  [key: string]: unknown; // Stage-specific, validated by engine
}

interface IntakeSessionState {
  intake_session_id: string;
  meta_contract_id: string;
  stage: Stage;                                    // Current stage pointer (monotonic)
  stage_states: Record<Stage, StageState>;         // State of each stage
  artifacts: Record<Stage, StageArtifacts | null>; // Stored artifacts per stage
  revision: number;
  created_at: string;
  expires_at: string | null;
  terminal_status: 'ACCEPTED' | 'REJECTED' | null; // Set when session reaches terminal state
}
```

### Status Derivation

Status is **derived**, not stored independently (except for terminal states):

```typescript
function deriveStatus(session: IntakeSessionState): IntakeStatus {
  // Terminal states take precedence
  if (session.terminal_status) {
    return session.terminal_status;
  }
  
  // Derived from stage states
  const hasBlockedStage = Object.values(session.stage_states).includes('BLOCKED');
  return hasBlockedStage ? 'BLOCKED' : 'IN_PROGRESS';
}
```

---

## Engine Interface

```typescript
interface MetaDDREngine {
  
  /**
   * Evaluate submitted artifacts for a stage.
   * 
   * Rules:
   * - May be called for any stage ≤ current stage (patching allowed)
   * - SIMULATION_FINALIZATION stage rejects submissions (use runSimulation)
   * - Does NOT advance stage pointer
   * - Returns all findings (exhaustive, not early-exit)
   */
  evaluateStage(
    session: IntakeSessionState,
    stage: Stage,
    artifacts: StageArtifacts,
    now: string  // ISO timestamp, caller-supplied for determinism
  ): EvaluationResult;

  /**
   * Request transition from current stage to next stage.
   * 
   * Rules:
   * - Only succeeds if current stage is READY
   * - Stage pointer is monotonic (forward-only)
   * - toStage must be exactly one stage ahead of fromStage
   */
  requestTransition(
    session: IntakeSessionState,
    fromStage: Stage,
    toStage: Stage,
    now: string
  ): EvaluationResult;

  /**
   * Run simulation cases against current artifacts.
   * 
   * Rules:
   * - Requires: FRAMING, INPUTS, OUTPUTS, POLICIES, RULES all READY
   * - Sets SIMULATION_FINALIZATION stage_state based on results
   * - Exploratory cases (expected_output: null) do not count toward finalization requirements
   */
  runSimulation(
    session: IntakeSessionState,
    cases: SimulationCase[],
    now: string
  ): SimulationResult;

  /**
   * Attempt to finalize and generate contract artifact.
   * 
   * Rules:
   * - Only endpoint that can return decision: ACCEPTED
   * - Requires all stages READY
   * - Requires at least one asserted valid case passed
   * - Requires at least one asserted refusal case passed
   * - Sets terminal_status on success or fatal failure
   */
  finalize(
    session: IntakeSessionState,
    acceptanceConfirmation: boolean,
    requestedVersion: string | undefined,
    now: string
  ): FinalizeResult;

  /**
   * Check if session can accept mutations.
   * Returns false if terminal_status is set.
   */
  isSessionMutable(session: IntakeSessionState): boolean;
}
```

---

## Result Types

```typescript
interface EvaluationResult {
  decision: EvaluationDecision;  // ALLOW | BLOCK | REJECT (never ACCEPTED)
  status: IntakeStatus;          // Derived from session state
  stage: Stage;
  stage_state: StageState;
  can_proceed: boolean;
  next_stage: Stage | null;
  findings: Finding[];
  updated_session: IntakeSessionState;
  server_time: string;           // Copied from `now` parameter
}

interface SimulationCase {
  case_id: string;
  inputs: Record<string, unknown>;
  expected_output: string | null; // null = exploratory (no assertion)
}

interface SimulationCaseResult {
  case_id: string;
  output: string;
  trace: Trace;
  assertion_passed: boolean | null; // null if exploratory
}

interface SimulationResult {
  decision: EvaluationDecision;  // ALLOW | BLOCK | REJECT
  stage_state: StageState;
  can_proceed: boolean;
  case_results: SimulationCaseResult[];
  findings: Finding[];
  updated_session: IntakeSessionState;
  server_time: string;
}

interface ContractArtifact {
  contract_id: string;
  version: string;
  hash: string;
  canonical_json: Record<string, unknown>;
}

interface FinalizeResult {
  decision: FinalizeDecision;    // ACCEPTED | BLOCK | REJECT
  status: IntakeStatus;
  findings: Finding[];
  contract_artifact: ContractArtifact | null;
  updated_session: IntakeSessionState;
  server_time: string;
}
```

---

## Contract Generator Interface

```typescript
interface ContractGenerator {
  /**
   * Assemble validated artifacts into canonical contract.
   * Returns null if any stage is not READY.
   */
  generate(
    session: IntakeSessionState,
    requestedVersion: string
  ): ContractArtifact | null;

  /**
   * Compute deterministic hash of canonical JSON.
   */
  computeHash(canonicalJson: Record<string, unknown>): string;

  /**
   * Serialize to canonical JSON (stable key order, normalized whitespace).
   */
  canonicalize(artifact: Record<string, unknown>): string;
}
```

### Canonicalization Rules

- Keys sorted alphabetically (recursive)
- No trailing whitespace
- UTF-8 encoding
- No BOM
- Single newline at EOF (optional, but consistent)

---

## Implementation Notes

### Engine is Pure

```typescript
// GOOD: Engine returns new state
const result = engine.evaluateStage(session, 'INPUTS', artifacts, now);
const newSession = result.updated_session;
await store.save(newSession); // Caller persists

// BAD: Engine mutates or persists
engine.evaluateAndSave(session, 'INPUTS', artifacts); // NO
```

### Findings Are Exhaustive

When evaluating, collect **all** findings, not just the first:

```typescript
// GOOD
const findings: Finding[] = [];
if (!hasDecisionId(artifacts)) findings.push(MISSING_DECISION_ID);
if (!hasAuthority(artifacts)) findings.push(MISSING_AUTHORITY);
if (!hasNonAuthority(artifacts)) findings.push(MISSING_NON_AUTHORITY);
return { findings, decision: findings.length > 0 ? 'BLOCK' : 'ALLOW' };

// BAD: Early return on first error
if (!hasDecisionId(artifacts)) return { decision: 'BLOCK', ... };
```

### Revision Increment

Revision increments **only** when session state actually changes:

```typescript
if (stateChanged(oldSession, newSession)) {
  newSession.revision = oldSession.revision + 1;
}
```

### Session Mutability Guard

```typescript
function isSessionMutable(session: IntakeSessionState): boolean {
  return session.terminal_status === null;
}

// Used at entry of every mutation method:
if (!isSessionMutable(session)) {
  return {
    decision: 'REJECT',
    findings: [{
      code: 'META_GLOBAL_VIOLATION_session_already_finalized',
      severity: 'REJECT',
      invariant: 'REPRODUCIBILITY_REQUIRED',
      field_path: null,
      message: 'Session is terminal and cannot be modified.',
      next_action: 'CREATE_NEW_SESSION',
      action_target: null
    }],
    // ...
  };
}
```

### SIMULATION_FINALIZATION Stage Guard

```typescript
// In evaluateStage():
if (stage === 'SIMULATION_FINALIZATION') {
  return {
    decision: 'REJECT',
    findings: [{
      code: 'META_GLOBAL_VIOLATION_simulation_stage_not_submittable',
      severity: 'REJECT',
      invariant: 'DETERMINISM_REQUIRED',
      field_path: null,
      message: 'SIMULATION_FINALIZATION stage cannot be submitted directly. Use runSimulation().',
      next_action: 'RUN_SIMULATION',
      action_target: null
    }],
    // ...
  };
}
```

---

## Locked Invariants

| Invariant | Description |
|-----------|-------------|
| `decision: ACCEPTED` only from `finalize()` | All other methods return ALLOW, BLOCK, or REJECT |
| Stage pointer is monotonic | Forward-only progression |
| Patching allowed for stages ≤ current | `evaluateStage()` accepts previous stages |
| SIMULATION_FINALIZATION not submittable | Only `runSimulation()` modifies this stage |
| Terminal sessions are immutable | Once ACCEPTED or REJECTED, no mutations |
| Status is derived | Computed from stage_states + terminal_status |

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| v0.1 | 2026-01-18 | Initial frozen MVP specification |
