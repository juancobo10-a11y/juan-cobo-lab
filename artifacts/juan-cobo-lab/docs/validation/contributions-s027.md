# S-027 Validation Report: Contributions (Contribuciones)

**Sprint:** S-027  
**Date:** 2026-07-23  
**Schema version:** 1.3.0 (bumped from 1.2.0)  
**Total suites after S-027:** 21

---

## Summary

| Check | Result |
|-------|--------|
| TypeCheck | ✅ 0 errors |
| S-027 test suite | ✅ PASS |
| All 21 suites | ✅ 21/21 PASS |
| Build | ✅ OK |

---

## Approval Conditions (from S-027 diagnostic)

| # | Condition | Implementation | Test |
|---|-----------|---------------|------|
| 1 | Orphan protection: source with contributions cannot be hard-deleted | `canDeleteSource` in `ContributionService.ts`; `handleDeleteRequest` in `PantallaFuentes.tsx` shows orphan-block dialog | §18a, §15 |
| 2 | Referential validation: sourceId must exist; caseId must match source.caseId | `validateContributionReferences` in `ContributionService.ts` | §12, §13, §14 |
| 3 | Enabled source states: new contributions only on `registered` or `ready-for-analysis` | `ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS` in `types.ts`; UI checks in `PantallaContribuciones` | §18b |
| 4 | `sourceLocation` typed struct | `SourceLocation { description?, textRange?, page?, section? }` in `types.ts` | §3 |
| 5 | `origin` field: all S-027 UI contributions record `"human"` | `ContributionForm` hardcodes `origin: "human"` | §4 |
| 6 | Extra tests | orphan deletion, sourceId nonexistent, caseId mismatch, disabled source, archive preservation | §12, §13, §15, §18 |

---

## Entities Created

### `src/contributions/types.ts`
- `Contribution` interface
- `ContributionType` (11 values): `finding`, `definition`, `fact`, `claim`, `causal-mechanism`, `recommendation`, `limitation`, `assumption`, `contradiction`, `question`, `other`
- `ContributionStatus` (5 values): `draft`, `proposed`, `validated`, `rejected`, `archived`
- `ContributionOrigin`: `"human" | "agent-assisted"`
- `SourceLocation { description?, textRange?, page?, section? }`
- `ContributionInput`, `ContributionUpdate`, `ContributionValidationResult`, `ContributionReferentialValidationResult`
- Labels: `CONTRIBUTION_TYPE_LABELS`, `CONTRIBUTION_STATUS_LABELS`, `CONTRIBUTION_ORIGIN_LABELS`
- `VALID_CONTRIBUTION_STATUS_TRANSITIONS`
- `ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS = ["registered", "ready-for-analysis"]`

### `src/contributions/ContributionService.ts`
- `validateContribution(input)` — structural validation
- `validateContributionReferences(input, sources)` — referential validation
- `canDeleteSource(sourceId, contributions)` — orphan protection guard
- `createContribution(input)` — creates with `status: "draft"`, `origin: "human"`
- `updateContribution(contribution, update)` — updates mutable fields
- `changeContributionStatus(contribution, newStatus)` — validates transition
- `deleteContribution(list, id)` — removes by id
- `replaceContribution(list, updated)` — upserts by id
- `getContributionsBySource(list, sourceId)` — filter by sourceId
- `getContributionsByCase(list, caseId)` — filter by caseId
- `getContributionById(list, id)` — find by id

---

## Schema Changes

- `ProjectSnapshotPayload.contributions: Contribution[]` added
- `ReconstructedSession.contributions: Contribution[]` added
- `CURRENT_PROJECT_SCHEMA_VERSION`: `"1.2.0"` → `"1.3.0"`
- Migration `1.2.0 → 1.3.0`: additive, sets `contributions: []` for all existing payloads
- `VersionComparisonService`: contributions entity list diffed with entity type `"contribution"`; label `"Contribuciones"` in changelog

---

## UI Components

### `src/components/PantallaContribuciones.tsx` (new)
- List view: active + archived contributions, empty state
- Create form: `ContributionForm` with type selector, statement, sourceExcerpt, optional location/interpretation/relevance
- Edit form: pre-filled `ContributionForm`
- Status transitions: visible buttons per `VALID_CONTRIBUTION_STATUS_TRANSITIONS`
- Source excerpt toggle with blockquote
- View-only mode when source is in disabled state (warning shown)
- Entry point: exclusively from `PantallaFuentes` (ADR-0016 §Navigation)

### `src/components/PantallaFuentes.tsx` (modified)
- Contribution count pill on each source card (opens PantallaContribuciones on click)
- "Contribuciones" button (replaces disabled S-027 stub)
- `handleDeleteRequest`: orphan-aware — calls `canDeleteSource`, shows orphan-block dialog if contributions exist
- Orphan-block dialog: offers Archive or Manage Contributions as alternatives
- Props added: `contributions: Contribution[]`, `onNavigateToContribuciones: (sourceId: string) => void`

### `src/pages/Helios.tsx` (modified)
- `Pantalla` union: `"contribuciones"` added
- `contributions` state: `useState<Contribution[]>([])`
- `selectedSourceForContribuciones` state: `useState<string | null>(null)`
- `handleNavigateToContribuciones(sourceId)` handler
- `handleReiniciar`: resets `contributions` and `selectedSourceForContribuciones`
- `currentPayload`: includes `contributions`
- PantallaFuentes receives `contributions` and `onNavigateToContribuciones` props
- PantallaContribuciones render block (conditioned on `pantalla === "contribuciones"`)

---

## Test Suite: `src/contributions/__tests__/validacion_s027.ts`

18 sections, covering:

1. Type system & constants (8 tests)
2. ContributionInput structural validation (11 tests)
3. SourceLocation typed struct (3 tests)
4. createContribution (4 tests)
5. updateContribution (2 tests)
6. changeContributionStatus — valid transitions (4 tests)
7. changeContributionStatus — invalid transitions (2 tests)
8. deleteContribution (2 tests)
9. replaceContribution (1 test)
10. Query functions (4 tests)
11. validateContributionReferences — valid (1 test)
12. validateContributionReferences — sourceId nonexistent (**approval condition**) (1 test)
13. validateContributionReferences — caseId mismatch (**approval condition**) (1 test)
14. validateContributionReferences — source not in active case (1 test)
15. canDeleteSource — orphan protection (**approval condition**) (3 tests)
16. Snapshot integration (3 tests)
17. Migration 1.2.0 → 1.3.0 (3 tests)
18. Extra approval conditions: 18a orphan deletion, 18b disabled source, 18c archive preservation (4 tests)

---

## Existing Suites — Fixture Updates

| File | Change |
|------|--------|
| `validacion_s024.ts` | `basePayload` gets `contributions: []` |
| `validacion_s024_1.ts` | `basePayload` gets `contributions: []`; schema version assertion `1.2.0 → 1.3.0` |
| `validacion_s025.ts` | `makePayload` gets `contributions: []`; 2 schema version assertions `1.2.0 → 1.3.0` |
| `validacion_s026.ts` | `makePayload` gets `contributions: []`; `CURRENT_PROJECT_SCHEMA_VERSION` assertion `1.2.0 → 1.3.0` |
