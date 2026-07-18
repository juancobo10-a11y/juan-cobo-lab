# S-024.1 — Cryptographic Integrity & Versioning Hardening: Architecture Review

**Sprint:** S-024.1  
**Date:** 2026-07-18  
**Status:** Complete

---

## 1. What changed and why?

S-024 introduced immutable snapshots with MurmurHash3-128 hashing. While adequate for accidental corruption detection, MurmurHash3 is a non-cryptographic hash with known collision construction. S-024.1 upgrades to SHA-256 and adds four hardening areas:

1. **SHA-256 hashing** via the Web Crypto API (browser/Node 18+) with Node.js `crypto` fallback
2. **NFC canonicalization** eliminating Unicode composition-form variance in hashes
3. **Transactional import** ensuring no partial state during `importProjectPackage`
4. **Declarative migration registry** removing module-level side effects

---

## 2. Architecture decisions

### 2.1 Async everywhere

SHA-256 via `SubtleCrypto.digest()` is inherently async. Rather than hide this with synchronous wrappers (which would require synchronous Node.js `crypto` everywhere), all hash-dependent functions are now explicitly async. This is a breaking API change from S-024 but produces more honest code.

### 2.2 Adapter pattern for hash implementations

`CryptoHashAdapter` is an interface, not a concrete class. `DefaultCryptoHashAdapter` selects the implementation at runtime:
- `WebCryptoHashAdapter` for browser + Node 18+ (uses `globalThis.crypto.subtle`)
- `NodeCryptoHashAdapter` for older Node (uses dynamic `import("node:crypto")`)

This allows future algorithm rotation (e.g., SHA-3, BLAKE3) without changing call sites.

### 2.3 Canonicalization as a separate concern

`canonicalize.ts` is isolated from `CryptoHashAdapter.ts`. This separation allows:
- Testing canonicalization independently of hashing
- Using canonical forms for purposes other than hashing (e.g., deduplication, deep equality)
- Clear documentation of what the canonical form looks like

### 2.4 Declarative migration registry

Moving from `registerMigration(...)` at module load time to `REGISTERED_MIGRATIONS` in `registry.ts` eliminates implicit global state and makes the migration set inspectable without running any code. Tests use `resetMigrationsToRegistry()` to isolate state.

### 2.5 Transactional import

The `prepare → commit` separation ensures that UI components can show validation results (conflicts, migration warnings) before any state changes. The UI holds the transaction object and only commits when the user explicitly confirms.

---

## 3. What was NOT changed

- **`ProjectEntityChange` shape** — `reordered`, `beforeIndex`, `afterIndex` are additive fields; no breaking changes to the diff type.
- **`importProjectPackage()` signature** — kept for backward compatibility; delegates to the transactional pipeline internally.
- **UI screens** — `PantallaProjectVersions`, `PantallaVersionComparison`, `PantallaProjectImport` received minimal async updates; no visual redesign.
- **`SchemaMigration` interface** — `fromVersion`/`toVersion`/`description`/`migrate` fields unchanged.

---

## 4. Open risks

| Risk | Severity | Mitigation |
|------|---------|------------|
| Old S-024 hashes stored in user localStorage are now invalid | Low | `verifySnapshotIntegrity()` recomputes hash; mismatch shown in UI as "SHA-256 ✗" |
| SubtleCrypto not available in very old browsers | Low | `NodeCryptoHashAdapter` fallback; both paths tested |
| Large snapshots (>10MB) may cause perceptible delay in hash computation | Low | SHA-256 performance is adequate for expected payload sizes (<1MB) |
| `resetMigrationsToRegistry()` in tests could interfere with parallel test runs | Low | Tests run sequentially; always call reset at end of test |

---

## 5. Test coverage summary

| Suite | Tests | Assertions | Focus |
|-------|-------|------------|-------|
| S-024 | 106 | 106 | Core snapshot/version/diff/import/migration functionality |
| S-024.1 | 117 | 117 | SHA-256, canonicalization, deep immutability, transactional import, migration registry, error types |
| **Total** | **223** | **223** | |

---

## 6. Files changed

**New:** `CryptoHashAdapter.ts`, `canonicalize.ts`, `errors.ts`, `breaking-change-rules.ts`, `migrations/registry.ts`, `validacion_s024_1.ts`, ADR-0013A, security doc, canonicalization spec, import transaction model

**Refactored:** `SnapshotService.ts`, `VersionComparisonService.ts`, `ProjectPackageService.ts`, `MigrationService.ts`, `index.ts`, `validacion_s024.ts` (async harness), `PantallaProjectVersions.tsx`, `PantallaProjectImport.tsx`, `Helios.tsx`, `validate-all.ts`, `package.json`
