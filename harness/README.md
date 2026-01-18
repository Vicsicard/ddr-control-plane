# Meta DDR Reference Harness

**This harness exists to prove Meta DDR determinism.**

## Purpose

The reference harness validates:

1. **End-to-end determinism** - Same inputs always produce identical outputs
2. **Governance enforcement** - All reason codes fire correctly
3. **Canonical contract generation** - Hashes are reproducible

## Critical Invariants

- **If this harness breaks, the engine is broken.**
- **Do not modify golden outputs without invariant review.**
- **This is governance, not documentation.**

## Usage

```bash
# From repo root
npx ts-node harness/run.ts happy-path
npx ts-node harness/run.ts refusal-path
npx ts-node harness/run.ts blocked-path
```

## Directory Structure

```
harness/
├── run.ts              # Single entry point
├── scenarios/          # Canonical flows
├── fixtures/           # Frozen inputs (no functions, no randomness)
├── golden/             # Determinism oracle (source of truth)
└── utils/              # Guardrails
```

## Golden Outputs

The `golden/` directory contains committed outputs that serve as the determinism oracle.

- Re-running the harness must reproduce these exactly
- Hash mismatch = regression
- Any change requires governance review

## Verification

After any engine change:

1. Run all scenarios
2. Compare outputs to golden files
3. If mismatch: investigate before committing
4. If intentional change: update golden files with review

## No Hidden State

- No CLI framework
- No config files
- No environment variables
- No clocks (frozen `NOW` timestamp)
- No randomness

This ensures reproducibility across all environments.
