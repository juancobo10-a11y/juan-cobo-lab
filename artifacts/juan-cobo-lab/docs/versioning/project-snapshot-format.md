# HELIOS Project Snapshot Format

**Version:** 1.0.0  
**Sprint:** S-024

## Overview

A `ProjectSnapshot` is an immutable JSON object representing the complete methodological state of a HELIOS project at a specific point in time.

## Structure

```json
{
  "id": "uuid-v4",
  "version": "1.0",
  "schemaVersion": "1.0.0",
  "metadata": {
    "projectId": "project-uuid",
    "projectName": "Mi proyecto HELIOS",
    "versionLabel": "v2 - revisión de evidencia",
    "description": "Descripción opcional",
    "author": "Juan Cobo",
    "tags": ["educación", "rural"],
    "sourceSnapshotId": "parent-snapshot-uuid",
    "changeSummary": "Agregadas 3 fuentes de evidencia"
  },
  "payload": {
    "problema": "¿Cómo aumentar la cobertura educativa en zonas rurales?",
    "packActivo": { ... },
    "thinkingUserSelection": { ... },
    "reflectionAnswers": [ ... ],
    "hypotheses": [ ... ],
    "primaryHypothesisId": "hyp-uuid",
    "conceptualModels": [ ... ],
    "operationalizationMatrices": [ ... ],
    "contrastationMatrices": [ ... ],
    "evidenceEvaluationMatrices": [ ... ],
    "hypothesisEvidenceConclusions": [ ... ],
    "reportDefinitions": [ ... ]
  },
  "contentHash": "64-char-hex-string",
  "createdAt": "2026-07-18T00:00:00.000Z"
}
```

## Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier |
| `version` | string | User-visible version string |
| `schemaVersion` | string | Technical schema version (≠ versionLabel) |
| `metadata.projectId` | UUID | Project identifier |
| `metadata.projectName` | string | Project name |
| `metadata.versionLabel` | string? | Methodological version label |
| `contentHash` | hex | MurmurHash3-128 of canonical content |
| `createdAt` | ISO-8601 | Capture timestamp (excluded from hash) |

## Payload lists with semantic order (preserved)

- `variables` — causal order within a model
- `indicators` — within each variable
- `evidenceSources` — within each indicator
- `reflectionAnswers` — chronological order
- `rows` — within operationalization matrices
- `assessments` — within evidence matrices
- `sections` — within report definitions

## Hash computation

The `contentHash` is computed over:
```
SHA3-128(
  schemaVersion +
  projectId +
  projectName +
  normalizeSnapshotPayload(payload)
)
```

`createdAt` and `contentHash` itself are excluded.

## Important

- **Hash ≠ encryption**: the hash guarantees integrity, not confidentiality
- **Snapshot ≠ backup**: snapshots live in session state; they should be exported and stored externally
- **versionLabel ≠ schemaVersion**: versionLabel is user-declared; schemaVersion is technical
