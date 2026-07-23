# ADR-0014: Understanding Case as Additive Payload Field

**Status:** Accepted  
**Date:** 2026-07-23  
**Sprint:** S-025  
**Authors:** HELIOS Engineering

---

## Context

HELIOS analyses have always had an implicit epistemic container — the question
or phenomenon being understood — but it was not reified as a first-class
entity in the data model. The `problema` field captured an analytical
formulation, but not the deeper comprehension question that motivates it.

Two conceptual distinctions prompted this ADR:

1. **Understanding question vs. analytical problem.** The *understanding
   question* is epistemic: what does the analyst seek to comprehend?  The
   *analytical problem* (`problema`) is methodological: what is the specific
   formulation of the phenomenon to be studied? These are distinct and both
   deserve to exist.

2. **Case as unit of work.** In practice, an analysis is always conducted
   *within a case* — a named, scoped, purposeful context. Encoding this
   explicitly allows future tooling (batch analysis, audit trails, case
   comparison) to operate on it.

---

## Decision

Introduce `UnderstandingCase` as an **additive optional field** in
`ProjectSnapshotPayload`:

```typescript
understandingCase?: UnderstandingCase | null;
```

**Key constraints accepted in S-025:**

- `UnderstandingCase` is a *context container*, not the structural root of
  the payload. The full domain reorganization is explicitly deferred.
- The `problema` field is preserved verbatim, independently. No renaming, no
  removal, no coercion.
- `understandingCase` is optional (`?`) so that snapshot integrity verification
  for pre-1.1.0 snapshots is not affected.

---

## Migration strategy (1.0.0 → 1.1.0)

Every project migrated from 1.0.0 carries an implicit Understanding Case.
Rather than assigning `null` (which would leave projects conceptually empty),
the migration synthesizes a case from the existing `problema` field:

- `name` — derived from the first sentence of `problema`, capped at 80 chars
- `understandingQuestion` — equals `problema` verbatim
- `purpose` — stamped as "Sintetizado automáticamente desde proyecto anterior"
- `domain` — set to "Sin especificar" (intended for user refinement)
- `status` — "active"
- `migrationOrigin` — carries `fromSchemaVersion`, `synthesizedAt`, and the
  original `problema` text for full traceability

This approach ensures no project is left without a case. The `migrationOrigin`
marker allows the UI to inform the user that the case was auto-generated.

---

## Schema version bump

`CURRENT_PROJECT_SCHEMA_VERSION`: `"1.0.0"` → `"1.1.0"`

---

## Alternatives considered

### A. Leave `understandingCase: null` in migrated projects
Rejected. A null case is semantically empty; every prior project had an
implicit case that deserves a concrete representation.

### B. Reorganize `ProjectSnapshotPayload` around `UnderstandingCase` now
Deferred. The full reorganization requires redesigning the payload hierarchy
and updating all consumers, snapshot verification, and test fixtures. This
scope belongs in a dedicated sprint.

### C. Separate `understandingCase` into its own standalone payload
Deferred. Keeping it as a field in `ProjectSnapshotPayload` is the simplest
additive change and preserves all existing integrity verification logic.

---

## Consequences

- `ProjectSnapshotPayload` gains one optional field. Existing code that builds
  payloads without `understandingCase` continues to work (field is optional).
- `ReconstructedSession` gains `understandingCase: UnderstandingCase | null`
  (defaults to null when absent in snapshot).
- `reconstructSessionFromSnapshot` updated to include `understandingCase`.
- Migration registry grows from 1 to 2 entries.
- `HELIOS.tsx` adds a `PantallaCaseSetup` screen as the new initial screen.
  `handleReiniciar` resets to `"case-setup"`.
- A thin `CaseSummaryBand` is displayed above all subsequent screens.
- 19/19 validation suites pass. TypeCheck: 0 errors.
