# Meta DDR Engine v0.1.0

**Release Date:** 2026-01-18

## Summary

First production-grade deterministic governance engine.

- Enforces decision contracts through immutable validation
- Proven positive and negative determinism
- Headless, side-effect-free, test-hardened

This release establishes the minimum credible surface for decision governance.

## Verification

| Metric | Value |
|--------|-------|
| Unit Tests | 145 passed |
| Harness Scenarios | 4 passed |
| Contract Hash | `sha256:df0a99f22f85ef8c2011956970b2a964129daf7507ebcb8926cdf30ae88112fd` |

## Harness Scenarios

| Scenario | Purpose | Result |
|----------|---------|--------|
| `happy-path` | End-to-end contract generation | ✅ ACCEPTED |
| `refusal-path` | Governance enforcement | ✅ Blocked → Corrected |
| `blocked-path` | Stage gating | ✅ Blocked → Corrected |
| `refusal-only` | Negative determinism | ✅ Correctly rejected |

## Guarantees

- **Positive determinism** — Valid contracts are reproducible
- **Negative determinism** — Refusal-only systems are correctly rejected
- **Authority gating** — Governance enforced at every stage
- **No silent success** — Contracts require explicit validation
- **No silent failure** — All rejections are traceable

## Components

- `engine/` — Core validation engine
- `harness/` — Reference harness with golden outputs
- `specs/` — Frozen OpenAPI, reason codes, and state machine

## Tag

```
meta-ddr-engine-v0.1.0
```
