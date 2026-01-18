# Meta DDR State Machine (v0.1)

> **FROZEN FOR MVP** — Changes require invariant review and version bump.

This document defines the state machine governing Meta DDR intake sessions.

---

## 1. Session Status Transitions

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
              ┌───────────┐                               │
   CREATE ──▶ │IN_PROGRESS│◀──────────────────────────────┤
              └─────┬─────┘                               │
                    │                                     │
         ┌──────────┼──────────┐                          │
         │          │          │                          │
         ▼          ▼          ▼                          │
    ┌────────┐ ┌────────┐ ┌────────┐                      │
    │BLOCKED │ │ACCEPTED│ │REJECTED│                      │
    └────┬───┘ └────────┘ └────────┘                      │
         │         ▲          ▲                           │
         │         │          │                           │
         └─────────┴──────────┴───────────────────────────┘
              (resolve blocks)    (fatal violation)
```

### Transition Rules

| From | To | Trigger |
|------|----|---------|
| `IN_PROGRESS` | `BLOCKED` | Any stage returns `decision: BLOCK` |
| `BLOCKED` | `IN_PROGRESS` | All blocking findings resolved |
| `IN_PROGRESS` | `ACCEPTED` | `finalize()` succeeds |
| `IN_PROGRESS` | `REJECTED` | Fatal invariant violation |
| `BLOCKED` | `REJECTED` | Fatal invariant violation |
| `ACCEPTED` | — | **Terminal** — no further mutations |
| `REJECTED` | — | **Terminal** — no further mutations |

### Status Derivation

Status is **computed**, not stored independently:

```typescript
function deriveStatus(session: IntakeSessionState): IntakeStatus {
  // Terminal states take precedence (stored in terminal_status)
  if (session.terminal_status) {
    return session.terminal_status;
  }
  
  // Derived from stage states
  const hasBlockedStage = Object.values(session.stage_states).includes('BLOCKED');
  return hasBlockedStage ? 'BLOCKED' : 'IN_PROGRESS';
}
```

---

## 2. Stage Progression

### Linear, Gated Flow

```
FRAMING ──▶ INPUTS ──▶ OUTPUTS ──▶ POLICIES ──▶ RULES ──▶ SIMULATION_FINALIZATION
   │           │          │           │          │              │
   ▼           ▼          ▼           ▼          ▼              ▼
 READY?     READY?     READY?      READY?     READY?    READY + SIMULATED?
   │           │          │           │          │              │
   └───────────┴──────────┴───────────┴──────────┴──────────────┘
                                                                │
                                                                ▼
                                                           FINALIZE
```

### Stage Order (Canonical)

| Index | Stage | Description |
|-------|-------|-------------|
| 0 | `FRAMING` | Decision identity & authority envelope |
| 1 | `INPUTS` | Declared world model |
| 2 | `OUTPUTS` | Allowed termination states |
| 3 | `POLICIES` | Constraint layer |
| 4 | `RULES` | Deterministic logic |
| 5 | `SIMULATION_FINALIZATION` | Prove determinism, generate contract |

### Progression Rules

1. **Transition requires READY** — Cannot advance unless current stage `state = READY`
2. **No skipping** — Must progress through stages in order
3. **Forward-only** — Stage pointer is monotonic (cannot go backward)
4. **Patching allowed** — `evaluateStage()` may be called for any stage ≤ current stage

### Patching Example

```
┌─────────────────────────────────────────────────────────────┐
│  Stage Pointer: RULES                                       │
│                                                             │
│  evaluateStage(FRAMING, ...)   ✅ Allowed (patch)          │
│  evaluateStage(INPUTS, ...)    ✅ Allowed (patch)          │
│  evaluateStage(OUTPUTS, ...)   ✅ Allowed (patch)          │
│  evaluateStage(POLICIES, ...)  ✅ Allowed (patch)          │
│  evaluateStage(RULES, ...)     ✅ Allowed (current)        │
│  evaluateStage(SIMULATION_FINALIZATION, ...) ❌ Not allowed│
│                                                             │
│  requestTransition(RULES → SIMULATION_FINALIZATION) ✅     │
│  requestTransition(RULES → INPUTS) ❌ Backward not allowed │
└─────────────────────────────────────────────────────────────┘
```

### SIMULATION_FINALIZATION Special Rules

- **Not submittable** — `evaluateStage()` rejects with `META_GLOBAL_VIOLATION_simulation_stage_not_submittable`
- **Only modified by `runSimulation()`** — Simulation results determine stage state
- **Requires all prior stages READY** — Cannot run simulation until FRAMING through RULES are all READY

---

## 3. Stage State Transitions

```
              ┌────────────┐
   ENTER ──▶  │ INCOMPLETE │
              └─────┬──────┘
                    │ submit artifacts
                    ▼
              ┌─────────────┐
              │UNDER_REVIEW │  (transient, during evaluation)
              └─────┬───────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
    ┌─────────┐           ┌────────┐
    │ BLOCKED │           │ READY  │
    └────┬────┘           └────────┘
         │                     ▲
         │ resubmit            │
         └─────────────────────┘
```

### Stage State Definitions

| State | Meaning |
|-------|---------|
| `INCOMPLETE` | Required artifacts not yet submitted |
| `UNDER_REVIEW` | Internal/transient during evaluation (API returns BLOCKED or READY) |
| `BLOCKED` | One or more findings with severity `BLOCK` |
| `READY` | All required artifacts present, all invariants satisfied |

---

## 4. Simulation Eligibility

```typescript
function canRunSimulation(session: IntakeSessionState): boolean {
  return (
    isSessionMutable(session) &&
    session.stage_states.FRAMING === 'READY' &&
    session.stage_states.INPUTS === 'READY' &&
    session.stage_states.OUTPUTS === 'READY' &&
    session.stage_states.POLICIES === 'READY' &&
    session.stage_states.RULES === 'READY'
  );
}
```

### Simulation Stage State Determination

After `runSimulation()` executes:

```typescript
function determineSimulationStageState(results: SimulationCaseResult[]): StageState {
  const assertedCases = results.filter(r => r.assertion_passed !== null);
  const validCases = assertedCases.filter(r => r.trace.refusal === false && r.assertion_passed === true);
  const refusalCases = assertedCases.filter(r => r.trace.refusal === true && r.assertion_passed === true);
  const failedAssertions = assertedCases.filter(r => r.assertion_passed === false);
  
  if (failedAssertions.length > 0) {
    return 'BLOCKED'; // Assertion mismatch
  }
  
  if (validCases.length === 0) {
    return 'BLOCKED'; // No asserted valid case
  }
  
  if (refusalCases.length === 0) {
    return 'BLOCKED'; // No asserted refusal case
  }
  
  return 'READY';
}
```

---

## 5. Finalization Gate

### Prerequisites Checklist

```typescript
function canFinalize(session: IntakeSessionState): boolean {
  return (
    isSessionMutable(session) &&
    session.stage_states.FRAMING === 'READY' &&
    session.stage_states.INPUTS === 'READY' &&
    session.stage_states.OUTPUTS === 'READY' &&
    session.stage_states.POLICIES === 'READY' &&
    session.stage_states.RULES === 'READY' &&
    session.stage_states.SIMULATION_FINALIZATION === 'READY'
  );
}
```

### Finalization Outcomes

| Condition | Result |
|-----------|--------|
| All prerequisites met + `acceptance_confirmation: true` | `ACCEPTED` |
| Prerequisites not met | `BLOCK` with findings |
| `acceptance_confirmation: false` | `BLOCK` with `META_FINALIZATION_MISSING_acceptance_confirmation` |
| Session already terminal | `REJECT` with `META_GLOBAL_VIOLATION_session_already_finalized` |

---

## 6. Invariant Enforcement Points

| Invariant | Checked At | Fires When |
|-----------|------------|------------|
| `NO_AMBIGUITY_PERSISTS` | All stages | Vague/incomplete declarations |
| `AUTHORITY_NEVER_FLOWS_UPWARD` | FRAMING, POLICIES | Authority leak detected |
| `ALL_BEHAVIOR_DECLARED` | FRAMING, INPUTS, OUTPUTS, RULES | Missing required fields |
| `NO_IMPLICIT_DEFAULTS` | INPUTS, OUTPUTS | Optional without behavior |
| `REFUSAL_IS_MANDATORY` | OUTPUTS, SIMULATION | No refusal output/case |
| `ALL_PATHS_TERMINATE` | RULES | Fallthrough detected |
| `ONLY_DECLARED_INPUTS` | RULES, SIMULATION | Undeclared input referenced |
| `OUTPUTS_ARE_FINITE` | OUTPUTS, RULES | Open-ended or invalid output |
| `POLICIES_RESTRICT_NOT_GENERATE` | POLICIES | Policy generates outcome |
| `DETERMINISM_REQUIRED` | RULES, SIMULATION | Non-deterministic logic |
| `REPRODUCIBILITY_REQUIRED` | SIMULATION, FINALIZE | Trace mismatch |

---

## 7. Terminal State Handling

### Immutability

Once a session reaches `ACCEPTED` or `REJECTED`:

- `terminal_status` is set and cannot be changed
- All mutation methods return `REJECT` with `META_GLOBAL_VIOLATION_session_already_finalized`
- Session state is frozen for audit purposes

### Mutability Check

```typescript
function isSessionMutable(session: IntakeSessionState): boolean {
  return session.terminal_status === null;
}
```

---

## 8. Transition Validation

### Valid Transitions Table

| From Stage | To Stage | Valid? |
|------------|----------|--------|
| FRAMING | INPUTS | ✅ |
| INPUTS | OUTPUTS | ✅ |
| OUTPUTS | POLICIES | ✅ |
| POLICIES | RULES | ✅ |
| RULES | SIMULATION_FINALIZATION | ✅ |
| Any | Previous stage | ❌ |
| Any | Non-adjacent future stage | ❌ |

### Transition Validation Logic

```typescript
const STAGE_ORDER: Stage[] = [
  'FRAMING',
  'INPUTS',
  'OUTPUTS',
  'POLICIES',
  'RULES',
  'SIMULATION_FINALIZATION'
];

function isValidTransition(from: Stage, to: Stage): boolean {
  const fromIndex = STAGE_ORDER.indexOf(from);
  const toIndex = STAGE_ORDER.indexOf(to);
  return toIndex === fromIndex + 1;
}
```

---

## 9. Summary

| Component | Behavior |
|-----------|----------|
| **Session status** | Derived from stage states + terminal_status |
| **Stage pointer** | Monotonic (forward-only) |
| **Stage patching** | Allowed for stages ≤ current |
| **SIMULATION_FINALIZATION** | Not submittable; only modified by runSimulation() |
| **Terminal states** | ACCEPTED/REJECTED are immutable |
| **Finalization** | Requires all stages READY + simulation passed |

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| v0.1 | 2026-01-18 | Initial frozen MVP specification |
