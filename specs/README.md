# DDR Control Plane — Specifications

> **Status:** Frozen for MVP  
> **Version:** v0.1  
> **Date:** 2026-01-18

This directory contains the authoritative specifications for the DDR Control Plane.

---

## Frozen Artifacts

| Artifact | Path | Version | Status |
|----------|------|---------|--------|
| OpenAPI Specification | `openapi/meta-ddr.openapi.v0.1.1.yaml` | v0.1.1 | Frozen |
| Engine Interface | `engine/meta-ddr-engine-interface.v0.1.md` | v0.1 | Frozen |
| State Machine | `engine/meta-ddr-state-machine.v0.1.md` | v0.1 | Frozen |
| Reason Code Taxonomy | `reason-codes/taxonomy.v1.0.md` | v1.0 | Frozen |

---

## Change Policy

These specifications are **frozen for MVP**. Changes require:

1. Invariant review
2. Version bump
3. Migration documentation (if breaking)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DDR Control Plane                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │   Auth &    │───▶│  Meta DDR   │───▶│  Contract       │ │
│  │ Access Gate │    │   Engine    │    │  Generator      │ │
│  └─────────────┘    └─────────────┘    └─────────────────┘ │
│        │                  │                    │           │
│        │                  ▼                    │           │
│        │          ┌─────────────┐              │           │
│        │          │   Reason    │              │           │
│        │          │   Codes     │              │           │
│        │          └─────────────┘              │           │
│        │                                       │           │
│        ▼                                       ▼           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    OpenAPI Layer                    │   │
│  │              (meta-ddr.openapi.v0.1.1)              │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                               │
└────────────────────────────┼───────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Control Plane │
                    │       UI        │
                    └─────────────────┘
```

---

## Key Principles

1. **Progression is a decision** — Server-authoritative, not UI-driven
2. **Engine is pure** — No HTTP, no persistence, no side effects
3. **Reason codes are first-class** — Every BLOCK/REJECT includes structured findings
4. **Status is derived** — Computed from stage states, not stored independently
5. **Terminal states are immutable** — ACCEPTED/REJECTED cannot be modified

---

## Relationship to DDR Runtime

| Component | Responsibility |
|-----------|----------------|
| **DDR Control Plane** | Governs how decisions are allowed to exist |
| **DDR Runtime** | Executes decisions |

The Control Plane produces **immutable decision contracts** that the Runtime executes.

---

## Implementation Order

1. ✅ OpenAPI Specification (frozen)
2. ✅ Engine Interface (frozen)
3. ✅ State Machine (frozen)
4. ⏳ Reason Code Taxonomy (pending)
5. ⏳ Headless Engine Implementation
6. ⏳ API Layer
7. ⏳ UI Layer
