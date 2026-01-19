# Engine Adapter Layer

> **⚠️ TRANSITIONAL LAYER — SCHEDULED FOR DELETION**

This adapter exists to bridge the current Studio UI schema to the DCG Engine schema.

## Current Status

**Engine integration: BLOCKED**

The engine uses Node.js `crypto.createHash()` in `canonicalizer.ts`, which fails in browser context.

### Resolution Options

1. **Replace crypto with browser-compatible library** (Recommended)
   - Use `js-sha256` or Web Crypto API in engine
   - Allows direct browser integration
   - Minimal code change

2. **Run engine server-side**
   - Create API endpoint that calls engine
   - Studio calls API instead of importing engine directly
   - More infrastructure, but cleaner separation

3. **Lazy-load crypto-dependent code**
   - Only import finalization module when needed
   - Validation can run in browser
   - Partial solution

### Current Workaround

`isEngineAvailable()` returns `false`, so Studio uses fallback validators.
Adapter translation still runs (for testing), but engine validation is skipped.

## Purpose

- Translate Studio form state → Engine artifact shapes
- Call engine APIs with properly typed data
- Return engine findings to Studio for display

## Rules

1. **No validation logic here** — Engine owns all validation
2. **No decisions** — Engine decides, Studio displays
3. **No defaults** — If a field is missing, fail loudly
4. **Explicit mapping only** — Every field must be mapped explicitly

## Long-Term Goal

**Delete this directory entirely.**

When Studio state matches engine schema directly:
- All adapter files should shrink to zero
- Studio imports engine types directly
- No translation layer remains

## Success Metric

Adapter files shrink over time, never grow.

## Structure

```
engine-adapter/
  index.ts              # Public API (engine-shaped only)
  engine-bridge.ts      # Unified interface for engine calls
  session.adapter.ts    # Full session translation
  framing.adapter.ts    # FramingData → FramingArtifacts
  inputs.adapter.ts     # InputsData → InputsArtifacts
  outputs.adapter.ts    # OutputsData → OutputsArtifacts
  policies.adapter.ts   # PoliciesData → PoliciesArtifacts
  rules.adapter.ts      # RulesData → RulesArtifacts
  simulation.adapter.ts # SimulationData → SimulationCase[]
  findings.adapter.ts   # Finding[] → ValidationError[] (display only)
```

## Schema Gaps (Studio → Engine)

| Stage | Missing Fields |
|-------|----------------|
| Framing | `execution_trigger`, `refusal_conditions` |
| Inputs | `input_source`, `trust_level` |
| Outputs | `output_schema`, `output_authority_level` |
| Policies | `timing`, `precedence` |

These gaps apply **Option E pressure** — Studio must be updated to collect these fields.

## Migration Path (Option E)

1. ~~Adapter stabilizes~~ ✅ Done
2. **Fix crypto blocker** ← Current step
3. Enable engine validation
4. One screen at a time: update Studio state to match engine types
5. Adapter logic shrinks
6. When empty: delete adapter, import engine directly
