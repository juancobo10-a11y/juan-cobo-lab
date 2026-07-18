# HELIOS Schema Migrations

**Sprint:** S-024

## Overview

Schema migrations allow HELIOS to import project snapshots created with older versions of the payload schema.

## Architecture

Migrations are pure functions registered in `MigrationService`:

```typescript
registerMigration({
  fromVersion: "0.9.0",
  toVersion: "1.0.0",
  description: "...",
  migrate: (payload: unknown): unknown => { ... }
});
```

Path finding uses BFS (breadth-first search) to find the shortest migration path between any two versions.

## Available migrations

| From | To | Description |
|------|----|-------------|
| 0.9.0 | 1.0.0 | Adds reportDefinitions, primaryHypothesisId; normalizes evidenceEvaluationMatrices |

## Compatibility rules

| Condition | Result |
|-----------|--------|
| `pkgSchema == currentSchema` | Import directly |
| `pkgSchema < currentSchema` + path exists | Migrate automatically |
| `pkgSchema < currentSchema` + no path | Block with error |
| `pkgSchema > currentSchema` | Block with error (never guess future structures) |

## Adding a new migration

1. Create `src/project-versioning/migrations/migration-X.Y.Z-to-A.B.C.ts`
2. Export a `SchemaMigration` object
3. Register it in the app startup (or import it in `MigrationService.ts`)
4. Add a test case in `validacion_s024.ts`
5. Update this document

## Safety rules

- Migrations never mutate their input
- A failed migration returns an error; it does not produce a partial result
- The migrated payload is validated before use
- Migrations are idempotent when possible
