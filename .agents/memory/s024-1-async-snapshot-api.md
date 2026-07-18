---
name: S-024.1 async snapshot API
description: All SnapshotService/ProjectPackageService functions that compute hashes are now async (SHA-256). Test harnesses and UI components must account for this.
---

## Rule
`createProjectSnapshot`, `cloneSnapshot`, `computeSnapshotHash`, `verifySnapshotIntegrity`, `verifyReportReproducibility`, `createProjectPackage`, `validateProjectPackage`, `verifyProjectPackageIntegrity`, `importProjectPackage` are all **async** as of S-024.1.

**Why:** SHA-256 via SubtleCrypto is inherently async. Synchronous wrappers were rejected to avoid requiring Node.js crypto everywhere.

## How to apply
- Any component that calls these must be async: use `useCallback(async () => { ... await ... })` in React.
- Render-time calls (inside JSX) cannot be awaited — move to `useEffect` + state (see `PantallaProjectVersions.tsx` `integrityMap` pattern).
- Test files must use a queue-based async harness: collect tests with `it()`, run via `for...of` with `await Promise.resolve(test.fn())`.
- Clone hashes DIFFER from originals because `sourceSnapshotId` is included in `computeSnapshotHash` metadata inputs.

## ImportTransaction API (S-024.1)
- `createImportTransaction(pkg)` — 1 arg only (returns status="parsed")
- `prepareImportTransaction(tx, currentSnapshots, currentVersions, strategy)` — 4 args
- `commitImportTransaction(tx, currentSnapshots, currentVersions)` — 3 args

## SchemaMigration properties
- `fromVersion`, `toVersion`, `description`, `migrate` (NOT `from`, `to`)

## BreakingChangeRule properties
- `id`, `entityType`, `applicableChangeTypes`, `ruleLabel`, `explanation`, `isBreaking` (NOT `condition`, `message`)
- `evaluateBreakingChange()` returns `BreakingChangeRule | null` (not `{ isBreaking }`)
- `findAllBreakingChanges()` returns `Array<{ change, rule }>` — access `.rule.id` not `.breakingRuleId`
