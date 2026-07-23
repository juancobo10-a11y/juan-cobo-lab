# S-025 — Validation Report: Understanding Case Foundation

**Date:** 2026-07-23  
**Sprint:** S-025  
**Suite:** `src/understanding-case/__tests__/validacion_s025.ts`

---

## Coverage summary

| Section | Description | Tests |
|---------|-------------|-------|
| §1 | Creación de UnderstandingCase | 10 |
| §2 | Validación de campos obligatorios | 9 |
| §3 | Actualización de metadatos | 7 |
| §4 | Asociación caso-problema | 5 |
| §5 | Inclusión en snapshot | 5 |
| §6 | Estabilidad del hash | 5 |
| §7 | Exportación e importación | 4 |
| §8 | Migración 1.0.0 → 1.1.0 | 10 |
| §9 | Diff semántico y rutas de migración | 4 |
| §10 | Regresión — suites anteriores | 5 |
| **Total** | | **~64** |

---

## Key properties verified

### Additive field
- `understandingCase` is optional (`?`) in `ProjectSnapshotPayload`.
- Existing code that omits it continues to work (`createProjectSnapshot`
  without the field does not throw).

### Canonical separation
- `understandingCase` and `problema` coexist independently.
- Changing `problema` does not affect `understandingCase.understandingQuestion`.
- The two fields have distinct conceptual roles.

### Hash integrity
- `understandingCase: null` and a defined case produce different hashes.
- Changing `understandingCase.name` changes the hash.
- Changing `understandingCase.understandingQuestion` changes the hash.
- Integrity verification passes after JSON serialization/deserialization.

### Migration (1.0.0 → 1.1.0)
- `canMigrate("1.0.0", "1.1.0")` → true.
- Migration produces a non-null `understandingCase` (never null, never undefined).
- Synthesized case carries `migrationOrigin.fromSchemaVersion === "1.0.0"`.
- `isSynthesizedCase(migratedCase)` → true.
- `understandingQuestion` of synthesized case equals the original `problema`.
- Name is derived from the first sentence of `problema` (max 80 chars).
- Empty `problema` → fallback name "Caso importado".
- All 1.0.0 payload fields preserved verbatim after migration.

### Two-hop migration (0.9.0 → 1.1.0)
- `canMigrate("0.9.0", "1.1.0")` → true.
- BFS finds the 2-hop path: 0.9.0 → 1.0.0 → 1.1.0.
- `isSynthesizedCase` holds for the final case.

### Regression
- `CURRENT_PROJECT_SCHEMA_VERSION === "1.1.0"`.
- `REGISTERED_MIGRATIONS.length >= 2`.
- `canMigrate("0.9.0", "1.0.0")` still true.
- `canMigrate("1.0.0", "1.1.0")` available.

---

## Files created (S-025)

| File | Role |
|------|------|
| `src/understanding-case/types.ts` | Domain types: `UnderstandingCase`, `UnderstandingCaseMigrationOrigin`, `UnderstandingCaseInput`, `UnderstandingCaseValidationResult` |
| `src/understanding-case/UnderstandingCaseService.ts` | Pure functions: `createCase`, `validateCase`, `updateCase`, `synthesizeCaseFromPayload`, `isSynthesizedCase` |
| `src/understanding-case/__tests__/validacion_s025.ts` | This test suite |
| `src/components/PantallaCaseSetup.tsx` | UI: `PantallaCaseSetup`, `CaseSummaryBand` |
| `src/project-versioning/migrations/migration-1.0.0-to-1.1.0.ts` | Schema migration |
| `docs/adr/ADR-0014-understanding-case.md` | Architecture Decision Record |
| `docs/validation/understanding-case-s025.md` | This report |

## Files modified (S-025)

| File | Change |
|------|--------|
| `src/project-versioning/types.ts` | `CURRENT_PROJECT_SCHEMA_VERSION` 1.0.0 → 1.1.0; added `understandingCase?` to `ProjectSnapshotPayload` and `ReconstructedSession` |
| `src/project-versioning/SnapshotService.ts` | `reconstructSessionFromSnapshot` includes `understandingCase` |
| `src/project-versioning/migrations/registry.ts` | Registered `migration_1_0_0_to_1_1_0` |
| `src/project-versioning/index.ts` | Re-exports `UnderstandingCase` types and service |
| `src/project-versioning/__tests__/validacion_s024_1.ts` | Updated schema version assertion to `"1.1.0"` |
| `src/pages/Helios.tsx` | `Pantalla` gains `"case-setup"`; `understandingCase` state; `handleCaseCreated`; `handleReiniciar` resets to `"case-setup"`; `CaseSummaryBand` rendered; `PantallaCaseSetup` rendered; `currentPayload` includes `understandingCase` |
| `scripts/validate-all.ts` | Added S-025 suite; updated header to S-025 |
| `package.json` | Added `validate:s025` script |
