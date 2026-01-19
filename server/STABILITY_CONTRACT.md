# DCG Engine Stability Contract

**Version:** 1.0.0  
**Status:** FROZEN  
**Effective Date:** 2026-01-19

---

## Purpose

This document defines the stability guarantees for the DCG Engine API. Any breaking change to these guarantees requires a **major version bump** (e.g., v1 → v2).

---

## Frozen Specifications

### 1. API Version

| Property | Value |
|----------|-------|
| API Version | `v1` |
| Base Path | `/api/v1` |

### 2. Hash Algorithm

| Property | Value |
|----------|-------|
| Algorithm | SHA-256 |
| Output Format | `sha256:<64-char-hex>` |
| Input | Canonical JSON (see below) |

### 3. Canonical JSON Format

| Property | Value |
|----------|-------|
| Key Ordering | Alphabetical (recursive) |
| Whitespace | None (compact) |
| Encoding | UTF-8 |
| Library | `json-stable-stringify` |

### 4. Artifact Schema Version

| Property | Value |
|----------|-------|
| Schema Version | `1.0.0` |
| Contract Fields | `framing`, `inputs`, `outputs`, `policies`, `rules` |

---

## API Endpoints (v1)

### Health Check
```
GET /api/v1/health
```

Response includes:
- `engine_version`
- `artifact_schema_version`
- `api_version`
- `hash_algorithm`

### Stage Validation
```
POST /api/v1/validate/stage
```

Request:
```json
{
  "stage": "FRAMING",
  "artifacts": { ... },
  "session": { ... }
}
```

Response includes:
- `findings[]`
- `is_valid`
- `engine_version`
- `artifact_schema_version`

### Simulation
```
POST /api/v1/simulate
```

Request:
```json
{
  "session": { ... },
  "cases": [ ... ]
}
```

Response includes:
- `caseResults[]`
- `findings[]`
- `engine_version`
- `artifact_schema_version`

### Finalization
```
POST /api/v1/finalize
```

Request:
```json
{
  "session": { ... },
  "acceptance_confirmed": true,
  "requested_version": "1.0.0"
}
```

Response includes:
- `contract`
- `canonical_json`
- `hash`
- `hash_algorithm`
- `engine_version`
- `artifact_schema_version`

---

## Guarantees

### What Will NOT Change (Without Major Version Bump)

1. **Hash determinism** — Same input always produces same hash
2. **Canonical JSON ordering** — Alphabetical key sort, no whitespace
3. **Hash algorithm** — SHA-256
4. **Response structure** — Field names and types
5. **Finding codes** — Existing codes will not be removed or renamed

### What MAY Change (Minor/Patch Versions)

1. **New finding codes** — Additional validation rules
2. **New response fields** — Additive only
3. **Performance improvements** — Same output, faster
4. **Bug fixes** — Correcting incorrect behavior

---

## Versioning Policy

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Breaking API change | Major (v1 → v2) | Remove endpoint |
| New feature | Minor (1.0 → 1.1) | Add new finding code |
| Bug fix | Patch (1.0.0 → 1.0.1) | Fix validation logic |

---

## Deprecation Policy

1. Legacy endpoints (`/api/...` without version) are deprecated
2. Deprecated endpoints will be removed in v2
3. Clients should migrate to `/api/v1/...` immediately

---

## Contact

For questions about this stability contract, open an issue in the repository.
