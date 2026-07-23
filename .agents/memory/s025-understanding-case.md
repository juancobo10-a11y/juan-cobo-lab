---
name: S-025 Understanding Case
description: API quirks and decisions from the Understanding Case sprint — critical for future sprints that touch UnderstandingCase or the versioning layer.
---

## Key API signatures (critical — different from what tests might assume)

- `migrateSnapshot(snapshot: ProjectSnapshot, toVersion: string)` — takes a **full ProjectSnapshot** (not a plain payload). Reads `snapshot.schemaVersion` internally. To test migration of legacy data, wrap the payload: `{ id, version, schemaVersion, metadata, payload, contentHash, createdAt }`.
- `verifySnapshotIntegrity(snap)` → `Promise<boolean>` — returns a **boolean**, not `{ valid: boolean }`. Do NOT call `.valid` on the result.
- `validateProjectPackage(pkg)` → `Promise<ProjectIntegrityResult>` — returns an object with `.valid` property (correct to access `.valid`).
- `importProjectPackage(pkg, snapshots, versions, strategy)` → result has `resultingSnapshots` and `resultingVersions`, NOT `snapshots`/`versions`.
- `createProjectSnapshot(payload, metadata, versionLabel?)` — 3rd arg is optional versionLabel string (not a hash adapter).

## Schema version
`CURRENT_PROJECT_SCHEMA_VERSION = "1.1.0"` (bumped from 1.0.0 in S-025).

## Migration approach (ADR-0014, Adjustment 2)
Migration 1.0.0→1.1.0 synthesizes a real `UnderstandingCase` from `problema` (never null). The synthesized case has `migrationOrigin: { fromSchemaVersion, synthesizedAt, synthesizedFromProblema }`. `isSynthesizedCase(c)` checks for presence of `migrationOrigin`.

**Why:** Every prior project had an implicit case. Null would leave projects semantically empty.

## UnderstandingCase vs problema
- `understandingCase.understandingQuestion` = epistemic question (what analyst seeks to comprehend)
- `problema` = analytical formulation of the phenomenon
- Both coexist independently in `ProjectSnapshotPayload`. Neither replaces the other.

## Helios.tsx integration
- New initial `Pantalla`: `"case-setup"` (before `"entrada"`)
- `handleReiniciar` → resets to `"case-setup"` (not `"entrada"`)
- `CaseSummaryBand` shows above all screens except `"case-setup"` itself
- `understandingCase` is included in `currentPayload` passed to `PantallaProjectVersions`
