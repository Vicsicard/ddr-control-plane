# Meta DDR Engine

> **Frozen for MVP - v0.1**

Pure, deterministic, headless decision engine for DDR Control Plane.

## Overview

This engine is the authoritative semantic core that validates, simulates, and generates decision contracts. It has no HTTP, persistence, or UI concerns.

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## Architecture

```
src/
├── types/          # Frozen type definitions
├── invariants/     # Global invariants (11 total)
├── reason-codes/   # Frozen reason code taxonomy (70 codes)
├── validators/     # Stage validators (FRAMING → RULES)
├── state/          # Status derivation and transitions
├── simulation/     # Simulation runner
├── finalization/   # Contract generation and canonicalization
└── engine.ts       # Main engine class
```

## Key Principles

1. **Engine is authoritative** — All progression decisions come from here
2. **Stateless evaluation** — Engine receives state, returns decision + new state
3. **No side effects** — Engine doesn't persist; caller handles storage
4. **Deterministic** — Same inputs → same outputs, always
5. **Reason codes are first-class** — Every BLOCK/REJECT includes structured findings

## Usage

```typescript
import { MetaDDREngine, createInitialSession } from '@ddr/meta-engine';

const engine = new MetaDDREngine();
const session = createInitialSession('session-001', 'meta.ddr.intake.v0_1', new Date().toISOString());

// Evaluate stage artifacts
const result = engine.evaluateStage(session, 'FRAMING', framingArtifacts, new Date().toISOString());

if (result.decision === 'ALLOW') {
  // Proceed to next stage
  const transitionResult = engine.requestTransition(
    result.updated_session,
    'FRAMING',
    'INPUTS',
    new Date().toISOString()
  );
}
```

## Implementation Status

| Component | Status |
|-----------|--------|
| Types | ✅ Complete |
| Invariants | ✅ Complete |
| Reason Codes | ✅ Complete |
| Engine Orchestration | ✅ Complete |
| State Logic | ✅ Complete |
| FRAMING Validator | 🔲 Phase 2a |
| INPUTS Validator | 🔲 Phase 2b |
| OUTPUTS Validator | 🔲 Phase 2c |
| POLICIES Validator | 🔲 Phase 2d |
| RULES Validator | 🔲 Phase 2e |
| Simulation Runner | 🔲 Phase 4 |
| Canonicalization | 🔲 Phase 5 |

## Specs

See `/specs` directory for frozen specifications:

- `openapi/meta-ddr.openapi.v0.1.1.yaml` — API contract
- `engine/meta-ddr-engine-interface.v0.1.md` — Engine interface
- `engine/meta-ddr-state-machine.v0.1.md` — State machine
- `reason-codes/taxonomy.v1.0.md` — Reason code taxonomy

## License

UNLICENSED - Proprietary
