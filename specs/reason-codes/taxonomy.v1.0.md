# Meta DDR Reason Code Taxonomy (v1.0)

> **FROZEN FOR MVP** — Changes require invariant review and version bump.

This document defines the complete reason code system for Meta DDR intake validation.

---

## 1. Naming & Stability Rules

### 1.1 Code Format

```
META_<STAGE>_<CATEGORY>_<DETAIL>
```

- `META` — Fixed prefix
- `STAGE` — One of: `GLOBAL`, `FRAMING`, `VERSIONING`, `INPUTS`, `OUTPUTS`, `POLICIES`, `RULES`, `SIMULATION`, `FINALIZATION`
- `CATEGORY` — One of: `MISSING`, `INVALID`, `CONFLICT`, `VIOLATION`, `UNSUPPORTED`, `INCONSISTENT`, `INCOMPLETE`

**Category Semantics:**
- `INVALID` — Malformed or syntactically incorrect input
- `MISSING` — Required field or artifact not provided
- `CONFLICT` — Two valid items contradict each other
- `VIOLATION` — Structurally valid input that breaks an invariant
- `UNSUPPORTED` — Feature or capability not available
- `INCONSISTENT` — State or data does not match expected conditions
- `INCOMPLETE` — Partial data that cannot be evaluated

- `DETAIL` — Short, stable token (snake_case)

**Example:** `META_INPUTS_MISSING_missing_input_behavior`

### 1.2 Code Immutability

- Codes never change meaning
- If semantics must change, create a new code and deprecate the old one
- Deprecated codes remain in documentation with `[DEPRECATED]` marker

### 1.3 Severity Levels

| Severity | Meaning | Effect |
|----------|---------|--------|
| `BLOCK` | Cannot proceed to next stage | Stage state = BLOCKED |
| `REJECT` | Cannot continue; intake aborted or action refused | May set terminal_status |
| `WARN` | Can proceed but not recommended | MVP treats as informational |

**Important:** `WARN` findings never block stage readiness or finalization in MVP. Do not use `WARN` as a "soft block."

---

## 2. Global Invariants

These invariant identifiers are referenced by reason codes:

| ID | Invariant | Description |
|----|-----------|-------------|
| 1 | `NO_AMBIGUITY_PERSISTS` | All declarations must be unambiguous |
| 2 | `AUTHORITY_NEVER_FLOWS_UPWARD` | Lower layers cannot override higher layers |
| 3 | `ALL_BEHAVIOR_DECLARED` | No implicit behavior; everything explicit |
| 4 | `NO_IMPLICIT_DEFAULTS` | Optional items must define missing behavior |
| 5 | `REFUSAL_IS_MANDATORY` | Every decision must have a refusal path |
| 6 | `ALL_PATHS_TERMINATE` | No fallthrough; all logic paths end explicitly |
| 7 | `ONLY_DECLARED_INPUTS` | Cannot reference undeclared inputs |
| 8 | `OUTPUTS_ARE_FINITE` | Output set must be finite and enumerated |
| 9 | `POLICIES_RESTRICT_NOT_GENERATE` | Policies constrain; they don't create outcomes |
| 10 | `DETERMINISM_REQUIRED` | No randomness or non-deterministic logic |
| 11 | `REPRODUCIBILITY_REQUIRED` | Same inputs must yield same outputs |

---

## 3. Standard Response Envelope

Every Meta DDR evaluation returns findings in this structure:

```json
{
  "code": "META_INPUTS_MISSING_missing_input_behavior",
  "severity": "BLOCK",
  "invariant": "NO_IMPLICIT_DEFAULTS",
  "field_path": "inputs[2].missing_input_behavior",
  "message": "Optional inputs must define missing_input_behavior.",
  "next_action": "SET_MISSING_INPUT_BEHAVIOR",
  "action_target": "inputs[2]"
}
```

**UI must render `message` verbatim** and use `next_action` for CTA labels/links.

---

## 4. Reason Code Taxonomy by Stage

### A) GLOBAL (applies at any stage)

| Code | Severity | Invariant | When it fires | Next Action |
|------|----------|-----------|---------------|-------------|
| `META_GLOBAL_INVALID_payload_schema` | REJECT | ALL_BEHAVIOR_DECLARED | Payload not parseable / wrong schema | `FIX_REQUEST_PAYLOAD` |
| `META_GLOBAL_UNSUPPORTED_feature_flag` | REJECT | DETERMINISM_REQUIRED | User attempts disabled capability | `DISABLE_FEATURE` |
| `META_GLOBAL_VIOLATION_authority_leak` | BLOCK | AUTHORITY_NEVER_FLOWS_UPWARD | Authority delegated to unspecified mechanism | `RESTATE_AUTHORITY_BOUNDARY` |
| `META_GLOBAL_INCONSISTENT_stage_state` | REJECT | REPRODUCIBILITY_REQUIRED | Stage progression out of order / state mismatch | `RESET_TO_LAST_VALID_STAGE` |
| `META_GLOBAL_VIOLATION_session_already_finalized` | REJECT | REPRODUCIBILITY_REQUIRED | Mutation attempted on terminal session | `CREATE_NEW_SESSION` |
| `META_GLOBAL_VIOLATION_simulation_stage_not_submittable` | REJECT | DETERMINISM_REQUIRED | Direct submission to SIMULATION_FINALIZATION | `RUN_SIMULATION` |

---

### B) FRAMING (Runtime Requirements 1–6)

| Code | Severity | Invariant | When it fires | Next Action |
|------|----------|-----------|---------------|-------------|
| `META_FRAMING_MISSING_decision_id` | BLOCK | ALL_BEHAVIOR_DECLARED | Missing decision identifier | `SET_DECISION_ID` |
| `META_FRAMING_INVALID_decision_id_format` | BLOCK | REPRODUCIBILITY_REQUIRED | Not unique / invalid chars | `FIX_DECISION_ID` |
| `META_FRAMING_MISSING_operational_purpose` | BLOCK | NO_AMBIGUITY_PERSISTS | Purpose empty | `DEFINE_OPERATIONAL_PURPOSE` |
| `META_FRAMING_INVALID_purpose_non_operational` | BLOCK | NO_AMBIGUITY_PERSISTS | Purpose is aspirational without action | `MAKE_PURPOSE_OPERATIONAL` |
| `META_FRAMING_MISSING_execution_trigger` | BLOCK | ALL_BEHAVIOR_DECLARED | Trigger not defined | `DEFINE_EXECUTION_TRIGGER` |
| `META_FRAMING_MISSING_explicit_authority` | BLOCK | AUTHORITY_NEVER_FLOWS_UPWARD | Allowed decision scope not defined | `DECLARE_AUTHORITY` |
| `META_FRAMING_MISSING_explicit_non_authority` | BLOCK | AUTHORITY_NEVER_FLOWS_UPWARD | Non-authority missing | `DECLARE_NON_AUTHORITY` |
| `META_FRAMING_MISSING_refusal_conditions` | BLOCK | REFUSAL_IS_MANDATORY | No refusal conditions | `DEFINE_REFUSAL_CONDITIONS` |
| `META_FRAMING_CONFLICT_authority_vs_non_authority` | BLOCK | NO_AMBIGUITY_PERSISTS | Same item in both authority lists | `RESOLVE_AUTHORITY_CONFLICT` |

---

### C) VERSIONING (Runtime Requirements 7–10)

| Code | Severity | Invariant | When it fires | Next Action |
|------|----------|-----------|---------------|-------------|
| `META_VERSIONING_MISSING_contract_version` | BLOCK | REPRODUCIBILITY_REQUIRED | Version missing | `SET_CONTRACT_VERSION` |
| `META_VERSIONING_INVALID_version_format` | BLOCK | REPRODUCIBILITY_REQUIRED | Not semver / not canonical | `FIX_VERSION_FORMAT` |
| `META_VERSIONING_INVALID_supersedes_reference` | BLOCK | REPRODUCIBILITY_REQUIRED | Supersedes points to unknown | `FIX_SUPERSEDES_REFERENCE` |
| `META_VERSIONING_INCONSISTENT_effective_date` | WARN | REPRODUCIBILITY_REQUIRED | Effective date anomaly | `CONFIRM_EFFECTIVE_DATE` |

---

### D) INPUTS (Runtime Requirements 11–19)

| Code | Severity | Invariant | When it fires | Next Action |
|------|----------|-----------|---------------|-------------|
| `META_INPUTS_MISSING_inputs` | BLOCK | ONLY_DECLARED_INPUTS | No inputs defined | `ADD_INPUT` |
| `META_INPUTS_MISSING_input_name` | BLOCK | ONLY_DECLARED_INPUTS | Input missing name | `NAME_INPUT` |
| `META_INPUTS_INVALID_input_name_format` | BLOCK | REPRODUCIBILITY_REQUIRED | Bad chars / duplicates | `FIX_INPUT_NAME` |
| `META_INPUTS_MISSING_input_type` | BLOCK | ALL_BEHAVIOR_DECLARED | Missing type | `SET_INPUT_TYPE` |
| `META_INPUTS_INVALID_input_type` | BLOCK | ALL_BEHAVIOR_DECLARED | Type not in enum | `SELECT_VALID_INPUT_TYPE` |
| `META_INPUTS_MISSING_input_source` | BLOCK | ALL_BEHAVIOR_DECLARED | Missing source | `SET_INPUT_SOURCE` |
| `META_INPUTS_MISSING_trust_level` | BLOCK | DETERMINISM_REQUIRED | Missing trust level | `SET_TRUST_LEVEL` |
| `META_INPUTS_INVALID_trust_level` | BLOCK | DETERMINISM_REQUIRED | Not in enum | `SELECT_VALID_TRUST_LEVEL` |
| `META_INPUTS_MISSING_required_flag` | BLOCK | ALL_BEHAVIOR_DECLARED | Required/optional not specified | `SET_REQUIRED_OPTIONAL` |
| `META_INPUTS_MISSING_missing_input_behavior` | BLOCK | NO_IMPLICIT_DEFAULTS | Optional input lacks missing behavior | `SET_MISSING_INPUT_BEHAVIOR` |
| `META_INPUTS_INVALID_missing_input_behavior` | BLOCK | NO_IMPLICIT_DEFAULTS | Behavior not in enum | `SELECT_VALID_MISSING_BEHAVIOR` |
| `META_INPUTS_VIOLATION_implicit_input_detected` | BLOCK | ONLY_DECLARED_INPUTS | Rule/policy references undeclared input | `DECLARE_REFERENCED_INPUT` |
| `META_INPUTS_CONFLICT_duplicate_input_name` | BLOCK | REPRODUCIBILITY_REQUIRED | Duplicate names | `RENAME_DUPLICATE_INPUT` |

---

### E) OUTPUTS (Runtime Requirements 20–24)

| Code | Severity | Invariant | When it fires | Next Action |
|------|----------|-----------|---------------|-------------|
| `META_OUTPUTS_MISSING_output_schema` | BLOCK | OUTPUTS_ARE_FINITE | Schema missing | `DEFINE_OUTPUT_SCHEMA` |
| `META_OUTPUTS_INVALID_output_schema` | BLOCK | OUTPUTS_ARE_FINITE | Not parseable / invalid type | `FIX_OUTPUT_SCHEMA` |
| `META_OUTPUTS_MISSING_allowed_outputs` | BLOCK | OUTPUTS_ARE_FINITE | No allowed outputs | `DEFINE_ALLOWED_OUTPUTS` |
| `META_OUTPUTS_INVALID_allowed_outputs_empty` | BLOCK | OUTPUTS_ARE_FINITE | Empty list | `ADD_ALLOWED_OUTPUT` |
| `META_OUTPUTS_CONFLICT_duplicate_output_value` | BLOCK | OUTPUTS_ARE_FINITE | Duplicates | `DEDUP_ALLOWED_OUTPUTS` |
| `META_OUTPUTS_MISSING_refusal_output` | BLOCK | REFUSAL_IS_MANDATORY | Refusal output not defined | `SET_REFUSAL_OUTPUT` |
| `META_OUTPUTS_INVALID_refusal_output_not_allowed` | BLOCK | REFUSAL_IS_MANDATORY | Refusal output not in allowed list | `CHOOSE_ALLOWED_REFUSAL_OUTPUT` |
| `META_OUTPUTS_MISSING_authority_level` | BLOCK | AUTHORITY_NEVER_FLOWS_UPWARD | Authority level not declared | `SET_OUTPUT_AUTHORITY_LEVEL` |
| `META_OUTPUTS_INVALID_authority_level` | BLOCK | AUTHORITY_NEVER_FLOWS_UPWARD | Not in enum | `SELECT_VALID_AUTHORITY_LEVEL` |

---

### F) POLICIES (Runtime Requirements 25–27)

| Code | Severity | Invariant | When it fires | Next Action |
|------|----------|-----------|---------------|-------------|
| `META_POLICIES_MISSING_policies` | BLOCK | POLICIES_RESTRICT_NOT_GENERATE | No policies defined | `ADD_POLICY` |
| `META_POLICIES_MISSING_policy_statement` | BLOCK | NO_AMBIGUITY_PERSISTS | Empty policy | `DEFINE_POLICY` |
| `META_POLICIES_INVALID_policy_unbounded` | BLOCK | NO_AMBIGUITY_PERSISTS | Policy too vague | `MAKE_POLICY_OPERATIONAL` |
| `META_POLICIES_VIOLATION_policy_generates_outcome` | BLOCK | POLICIES_RESTRICT_NOT_GENERATE | Policy returns/sets outputs | `MOVE_LOGIC_TO_RULES` |
| `META_POLICIES_CONFLICT_policy_conflict` | BLOCK | NO_AMBIGUITY_PERSISTS | Two policies conflict | `RESOLVE_POLICY_CONFLICT` |
| `META_POLICIES_MISSING_precedence` | BLOCK | NO_AMBIGUITY_PERSISTS | Conflict exists without precedence | `SET_POLICY_PRECEDENCE` |
| `META_POLICIES_INVALID_precedence_cycle` | BLOCK | NO_AMBIGUITY_PERSISTS | Precedence loop/cycle | `FIX_PRECEDENCE_ORDER` |
| `META_POLICIES_VIOLATION_exceeds_authority_envelope` | BLOCK | AUTHORITY_NEVER_FLOWS_UPWARD | Policy violates contract non-authority | `RESTATE_POLICY_WITHIN_AUTHORITY` |

---

### G) RULES (Runtime Requirements 28–33)

| Code | Severity | Invariant | When it fires | Next Action |
|------|----------|-----------|---------------|-------------|
| `META_RULES_MISSING_rules` | BLOCK | ALL_BEHAVIOR_DECLARED | No rules defined | `ADD_RULE` |
| `META_RULES_INVALID_rule_expression` | BLOCK | DETERMINISM_REQUIRED | Condition not parseable | `FIX_RULE_EXPRESSION` |
| `META_RULES_VIOLATION_nondeterministic_operator` | BLOCK | DETERMINISM_REQUIRED | Uses randomness / time without declared input | `REMOVE_NONDETERMINISM` |
| `META_RULES_VIOLATION_hidden_state_dependency` | BLOCK | DETERMINISM_REQUIRED | References undeclared state | `DECLARE_STATE_AS_INPUT` |
| `META_RULES_VIOLATION_undeclared_input_reference` | BLOCK | ONLY_DECLARED_INPUTS | References missing input | `DECLARE_REFERENCED_INPUT` |
| `META_RULES_INVALID_output_not_allowed` | BLOCK | OUTPUTS_ARE_FINITE | Rule output not in allowed outputs | `SELECT_ALLOWED_OUTPUT` |
| `META_RULES_VIOLATION_non_terminating_path` | BLOCK | ALL_PATHS_TERMINATE | Fallthrough / missing else | `ADD_TERMINATION_RULE` |
| `META_RULES_INCOMPLETE_coverage_not_proven` | BLOCK | ALL_PATHS_TERMINATE | Coverage cannot be proven | `ADD_COVERAGE_RULES` |
| `META_RULES_VIOLATION_mutates_inputs` | BLOCK | DETERMINISM_REQUIRED | Rules attempt to mutate inputs | `REMOVE_INPUT_MUTATION` |

---

### H) SIMULATION (Runtime Requirements 38–46)

| Code | Severity | Invariant | When it fires | Next Action |
|------|----------|-----------|---------------|-------------|
| `META_SIMULATION_MISSING_valid_case` | BLOCK | REPRODUCIBILITY_REQUIRED | No valid case provided | `ADD_VALID_CASE` |
| `META_SIMULATION_MISSING_refusal_case` | BLOCK | REFUSAL_IS_MANDATORY | No refusal case | `ADD_REFUSAL_CASE` |
| `META_SIMULATION_INVALID_input_values` | BLOCK | ONLY_DECLARED_INPUTS | Values don't match schema/types | `FIX_SIM_INPUT_VALUES` |
| `META_SIMULATION_INVALID_output_mismatch` | BLOCK | OUTPUTS_ARE_FINITE | Output not allowed | `FIX_RULES_OR_OUTPUTS` |
| `META_SIMULATION_VIOLATION_non_reproducible_trace` | BLOCK | REPRODUCIBILITY_REQUIRED | Same inputs yield different outputs | `REMOVE_NONDETERMINISM` |
| `META_SIMULATION_INCONSISTENT_policy_trace` | BLOCK | POLICIES_RESTRICT_NOT_GENERATE | Policy trace differs from evaluation order | `FIX_POLICY_EVALUATION_ORDER` |
| `META_SIMULATION_INCOMPLETE_stages_not_ready` | BLOCK | ALL_BEHAVIOR_DECLARED | Prior stages not all READY | `COMPLETE_PRIOR_STAGES` |

---

### I) FINALIZATION (Runtime Requirements 47–50)

| Code | Severity | Invariant | When it fires | Next Action |
|------|----------|-----------|---------------|-------------|
| `META_FINALIZATION_MISSING_acceptance_confirmation` | BLOCK | ALL_BEHAVIOR_DECLARED | User didn't confirm | `CONFIRM_FINAL_ACCEPTANCE` |
| `META_FINALIZATION_VIOLATION_contract_hash_missing` | REJECT | REPRODUCIBILITY_REQUIRED | Cannot compute hash | `FIX_CONTRACT_CANONICALIZATION` |
| `META_FINALIZATION_INVALID_contract_not_canonical` | BLOCK | REPRODUCIBILITY_REQUIRED | Canonical serialization fails | `RESOLVE_CANONICALIZATION_ERRORS` |
| `META_FINALIZATION_REJECTED_invariants_not_satisfied` | REJECT | NO_AMBIGUITY_PERSISTS | Final check fails with unresolved violations | `RETURN_TO_BLOCKED_STAGE` |
| `META_FINALIZATION_INCOMPLETE_simulation_not_passed` | BLOCK | REPRODUCIBILITY_REQUIRED | Simulation stage not READY | `RUN_SIMULATION` |

---

## 5. Next Action Enumeration

All `next_action` values must come from this controlled enum:

### Session Actions
- `CREATE_NEW_SESSION`
- `RESET_TO_LAST_VALID_STAGE`
- `FIX_REQUEST_PAYLOAD`
- `DISABLE_FEATURE`

### Framing Actions
- `SET_DECISION_ID`
- `FIX_DECISION_ID`
- `DEFINE_OPERATIONAL_PURPOSE`
- `MAKE_PURPOSE_OPERATIONAL`
- `DEFINE_EXECUTION_TRIGGER`
- `DECLARE_AUTHORITY`
- `DECLARE_NON_AUTHORITY`
- `DEFINE_REFUSAL_CONDITIONS`
- `RESOLVE_AUTHORITY_CONFLICT`
- `RESTATE_AUTHORITY_BOUNDARY`

### Versioning Actions
- `SET_CONTRACT_VERSION`
- `FIX_VERSION_FORMAT`
- `FIX_SUPERSEDES_REFERENCE`
- `CONFIRM_EFFECTIVE_DATE`

### Input Actions
- `ADD_INPUT`
- `NAME_INPUT`
- `FIX_INPUT_NAME`
- `SET_INPUT_TYPE`
- `SELECT_VALID_INPUT_TYPE`
- `SET_INPUT_SOURCE`
- `SET_TRUST_LEVEL`
- `SELECT_VALID_TRUST_LEVEL`
- `SET_REQUIRED_OPTIONAL`
- `SET_MISSING_INPUT_BEHAVIOR`
- `SELECT_VALID_MISSING_BEHAVIOR`
- `DECLARE_REFERENCED_INPUT`
- `RENAME_DUPLICATE_INPUT`

### Output Actions
- `DEFINE_OUTPUT_SCHEMA`
- `FIX_OUTPUT_SCHEMA`
- `DEFINE_ALLOWED_OUTPUTS`
- `ADD_ALLOWED_OUTPUT`
- `DEDUP_ALLOWED_OUTPUTS`
- `SET_REFUSAL_OUTPUT`
- `CHOOSE_ALLOWED_REFUSAL_OUTPUT`
- `SET_OUTPUT_AUTHORITY_LEVEL`
- `SELECT_VALID_AUTHORITY_LEVEL`

### Policy Actions
- `ADD_POLICY`
- `DEFINE_POLICY`
- `MAKE_POLICY_OPERATIONAL`
- `MOVE_LOGIC_TO_RULES`
- `RESOLVE_POLICY_CONFLICT`
- `SET_POLICY_PRECEDENCE`
- `FIX_PRECEDENCE_ORDER`
- `RESTATE_POLICY_WITHIN_AUTHORITY`

### Rule Actions
- `ADD_RULE`
- `FIX_RULE_EXPRESSION`
- `REMOVE_NONDETERMINISM`
- `DECLARE_STATE_AS_INPUT`
- `SELECT_ALLOWED_OUTPUT`
- `ADD_TERMINATION_RULE`
- `ADD_COVERAGE_RULES`
- `REMOVE_INPUT_MUTATION`

### Simulation Actions
- `RUN_SIMULATION`
- `ADD_VALID_CASE`
- `ADD_REFUSAL_CASE`
- `FIX_SIM_INPUT_VALUES`
- `FIX_RULES_OR_OUTPUTS`
- `FIX_POLICY_EVALUATION_ORDER`
- `COMPLETE_PRIOR_STAGES`

### Finalization Actions
- `CONFIRM_FINAL_ACCEPTANCE`
- `FIX_CONTRACT_CANONICALIZATION`
- `RESOLVE_CANONICALIZATION_ERRORS`
- `RETURN_TO_BLOCKED_STAGE`

---

## 6. Canonical Message Rules

To prevent drift:

- `message` should be short, imperative, and stable
- Do not embed variable data except identifiers (like `field_path`)
- Prefer "must" over "should"

**Good:** "Optional inputs must define missing_input_behavior."

**Avoid:** "You might want to consider adding a default…"

---

## 7. Code Count Summary

| Stage | Code Count |
|-------|------------|
| GLOBAL | 6 |
| FRAMING | 9 |
| VERSIONING | 4 |
| INPUTS | 13 |
| OUTPUTS | 9 |
| POLICIES | 8 |
| RULES | 9 |
| SIMULATION | 7 |
| FINALIZATION | 5 |
| **Total** | **70** |

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| v1.0 | 2026-01-18 | Initial frozen MVP specification |
