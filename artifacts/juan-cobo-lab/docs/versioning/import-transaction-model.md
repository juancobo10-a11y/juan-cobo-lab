# Import Transaction Model

## Overview

HELIOS S-024.1 introduces a **transactional import model** that ensures no partial state is applied to the active project during a package import. The import pipeline runs entirely on copies of the current state, and only `commitImportTransaction()` modifies the project.

---

## Transaction Lifecycle

```
createImportTransaction(pkg)
        │
        ▼
  status: "parsed"
        │
        ▼
prepareImportTransaction(tx, currentSnapshots, currentVersions, strategy)
        │
        ├─── validation fails ──────► status: "failed"  (no state changes)
        │
        ├─── migration succeeds ────►
        │
        ├─── conflict detection ────►
        │
        └─── all checks pass ───────► status: "ready"
                                              │
                                              ▼
                                 commitImportTransaction(tx, currentSnapshots, currentVersions)
                                              │
                                              ▼
                                    { success, resultingSnapshots, resultingVersions }
```

---

## Phases

### 1. Parse — `createImportTransaction(pkg)`

**No validation, no mutations.** Creates a transaction envelope from the raw deserialized package. The transaction starts in `"parsed"` status.

```typescript
const tx = createImportTransaction(pkg);
// tx.status === "parsed"
// tx.originalPackage === pkg
```

### 2. Prepare — `prepareImportTransaction(tx, currentSnapshots, currentVersions, strategy)`

**Runs entirely on copies. No active project state is modified.**

Steps executed in order:
1. **Schema version check** — package must not be from a future version
2. **Structural validation** — `validateProjectPackage(pkg)`
3. **Migration** — if `pkg.schemaVersion !== CURRENT_VERSION`, migrate each snapshot
4. **Conflict detection** — identify ID collisions with `currentSnapshots`
5. **Prepared package assembly** — build the final `ImportPackage` ready for commit

Returns a transaction in either `"ready"` or `"failed"` status. On failure, `tx.errors` contains human-readable messages.

### 3. Commit — `commitImportTransaction(tx, currentSnapshots, currentVersions)`

**Only this step modifies state.** If `tx.status !== "ready"`, returns `{ success: false }` immediately without any mutations.

Applies the prepared package to `currentSnapshots` and `currentVersions` according to `tx.strategy`:

- `"create-copy"` — new IDs for all imported snapshots; appends to existing state
- `"replace-current"` — uses original IDs from the package; replaces/merges existing state
- `"cancel"` — no-op; returns the original state unchanged

---

## Import Strategies

| Strategy | Effect | Use Case |
|----------|--------|----------|
| `create-copy` | Generates new IDs for imported items | Adding a collaborator's package without conflicts |
| `replace-current` | Uses original IDs from the package | Restoring a backup or merging canonical versions |
| `cancel` | Returns current state unchanged | User changes their mind |

---

## Atomicity Guarantee

`commitImportTransaction` is **atomic**: either all imports succeed or none are applied. The function never leaves the project in a partially-imported state.

This is achieved by building the `resultingSnapshots` and `resultingVersions` arrays on copies, returning them only on full success.

---

## Backward Compatibility

`importProjectPackage(pkg, currentSnapshots, currentVersions, strategy)` is kept for backward compatibility. It internally calls `createImportTransaction → prepareImportTransaction → commitImportTransaction` and returns the same `ProjectImportResult` shape as before. All calls to the old API are still valid.

---

## Error Handling

All errors are surfaced through:
- `tx.errors` — string array on the transaction object
- `result.errors` — string array in the commit result
- `result.success === false` — boolean sentinel

Errors are never thrown as exceptions from the public API (with the exception of `CanonicalizationError` from the canonicalize layer, which indicates a bug in the calling code).

---

## References

- `src/project-versioning/ProjectPackageService.ts` — `createImportTransaction`, `prepareImportTransaction`, `commitImportTransaction`
- `src/project-versioning/types.ts` — `ImportTransaction`, `ImportConflict`
- `src/project-versioning/__tests__/validacion_s024_1.ts` — Section §5: Importación transaccional
