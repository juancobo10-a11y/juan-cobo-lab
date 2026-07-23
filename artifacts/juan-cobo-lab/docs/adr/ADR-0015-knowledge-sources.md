# ADR-0015: Knowledge Sources as a Payload Array Field

**Status:** Accepted  
**Date:** 2026-07-23  
**Sprint:** S-026  
**Authors:** HELIOS Engineering

---

## Context

HELIOS analyses operate within an epistemic container (`UnderstandingCase`, S-025).
Within that container, analysts need to incorporate external information before
they can begin analytical work. Without a structured mechanism to register these
sources, the distinction between raw content and evaluated evidence collapses,
undermining the integrity of the analytical chain.

The Inteligencia Ecosistémica model defines four distinct cognitive roles that
must be preserved:

| Term | Role |
|------|------|
| **Fuente** (Source) | Origin of the content |
| **Información** (Information) | Content incorporated from the source |
| **Contribución** (Contribution) | Cognitive unit to be extracted (future: S-027) |
| **Evidencia** (Evidence) | Information evaluated against a hypothesis |

Conflating these roles — particularly treating a registered source as evidence —
would invalidate the methodological chain that HELIOS is designed to protect.

---

## Decision

Introduce `KnowledgeSource` as a new entity and add
`knowledgeSources: KnowledgeSource[]` to `ProjectSnapshotPayload`:

```typescript
knowledgeSources: KnowledgeSource[];
```

The array is always present (never `undefined` or `null`).
The default value for any new or migrated project is `[]`.

### Additive design

This is an additive change consistent with ADR-0014's precedent.
The existing methodological chain (`problema`, `hypotheses`, evidence matrices, etc.)
is not modified. `KnowledgeSource` entities live alongside `UnderstandingCase`
without structural reorganization.

### Association

Each `KnowledgeSource` references its case via `caseId: string`, which must
match an `UnderstandingCase.id`. Referential integrity is enforced at the
application layer; the schema does not impose a foreign-key constraint (there
is no relational database).

### Source types

`KnowledgeSourceType` defines seven origin modalities. In S-026, only
`"pasted-text"` has a functional UI; the remaining types (`"document"`,
`"web"`, `"dataset"`, `"interview"`, `"note"`, `"other"`) are defined
for type completeness and are shown as disabled in the UI with a
"próxima funcionalidad" label.

---

## Status lifecycle and the cognitive pipeline gateway

```
draft ──► registered ──► ready-for-analysis
                               │
                               │  [S-027: contribution extraction]
                               ▼
                            processed

Any non-processed state ──► rejected | archived
```

**`ready-for-analysis`** is the state immediately preceding contribution
extraction (S-027). When an analyst marks a source ready-for-analysis, they
signal that:
1. The source content has been reviewed and is deemed suitable.
2. The source is ready to be processed by the cognitive pipeline.
3. No automated action is triggered in S-026; the action is a forward intent signal.

This state is deliberately separated from `"processed"` to allow the pipeline
trigger (S-027) to be added without modifying the state model or requiring data
migration.

### Transitions permitted in S-026

| From | To | Meaning |
|------|----|---------|
| `draft` | `registered` | Content reviewed and saved |
| `registered` | `draft` | Returned for editing |
| `registered` | `ready-for-analysis` | Queued for S-027 processing |
| `ready-for-analysis` | `registered` | Pulled back from queue |
| `registered` | `rejected` | Deemed unsuitable |
| `ready-for-analysis` | `rejected` | Deemed unsuitable after review |
| any non-`processed` | `archived` | Soft-removed |
| `processed` | `archived` | Final retirement |

### Breaking changes

Removing a `KnowledgeSource` is **not** a breaking change in S-026, because
sources do not yet feed into hypotheses, evidence matrices, or conclusions.
This will be revisited in S-027 when contributions extracted from sources
enter the methodological chain.

---

## Schema version bump

`CURRENT_PROJECT_SCHEMA_VERSION`: `"1.1.0"` → `"1.2.0"`

---

## Migration strategy (1.1.0 → 1.2.0)

Unlike the S-025 `UnderstandingCase` migration, no synthesis is required.
All existing projects genuinely had zero knowledge sources.
The migration function appends `knowledgeSources: []` to every payload
that lacks the field:

```typescript
migrate: (payload) => ({
  ...all 1.1.0 fields verbatim,
  knowledgeSources: Array.isArray(payload.knowledgeSources)
    ? payload.knowledgeSources
    : [],
})
```

The three-hop path `0.9.0 → 1.0.0 → 1.1.0 → 1.2.0` is handled automatically
by `MigrationService`'s BFS engine.

---

## Alternatives considered

### A. Embed sources directly inside UnderstandingCase
Rejected. `UnderstandingCase` is intended as a container for epistemic framing,
not for content management. Embedding sources there would conflate two distinct
concerns and violate the Fuente / Información distinction.

### B. Use a separate top-level payload object for sources
Deferred. A fully normalized payload hierarchy (where sources, cases, and
analytical entities live as siblings at the top level) is consistent with the
long-term vision. However, it requires the full domain reorganization deferred
in ADR-0014. `knowledgeSources: KnowledgeSource[]` is the minimum additive step.

### C. Store sources outside the snapshot (e.g. localStorage, separate state)
Rejected. Sources are methodologically significant and must participate in
snapshot hashing, version comparison, export, and migration. Externalizing them
would break the integrity guarantee that HELIOS snapshots provide.

---

## Consequences

- `ProjectSnapshotPayload` gains one non-optional array field.
- All existing code that builds payloads without `knowledgeSources` must be
  updated to include `knowledgeSources: []`. TypeScript's strict mode enforces this.
- `ReconstructedSession` gains `knowledgeSources: KnowledgeSource[]`
  (defaults to `[]` when absent).
- `VersionComparisonService.compareSnapshots` now diffs knowledge sources.
- `generateMethodologicalChangelog` labels `knowledgeSource` changes as
  "Fuentes de conocimiento".
- Migration registry grows from 2 to 3 entries.
- A new initial sub-screen within HELIOS (`PantallaFuentes`) allows analysts
  to manage sources; accessible via the `CaseSummaryBand` from any screen.
- `CaseSummaryBand` displays a "Fuentes de conocimiento (N)" pill showing
  the live count of sources for the active case.
- 20/20 validation suites pass. TypeCheck: 0 errors.
