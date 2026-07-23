# ADR-0016: Contributions as Traceable Cognitive Units (S-027)

**Status:** Accepted  
**Date:** 2026-07-23  
**Sprint:** S-027  
**Author:** HELIOS Engineering

---

## Context

HELIOS's methodological chain begins with the analyst identifying a policy problem, selecting a knowledge pack, building hypotheses, and — since S-026 — registering knowledge sources. The gap this ADR addresses: sources exist as raw containers of content, but the chain lacks an explicit representation of *what the analyst extracts from a source* as a traceable cognitive unit.

Without contributions, the link between a knowledge source and subsequent methodological claims (hypotheses, conceptual models, evidence evaluations) is implicit. This prevents auditability and reproducibility.

## Decision

Introduce `Contribution` as a new first-class entity in HELIOS. A contribution:

1. **Is extracted from a `KnowledgeSource`** — it has a `sourceId` that must reference an existing source.
2. **Belongs to an `UnderstandingCase`** — `caseId` must match the source's `caseId`.
3. **Carries a typed statement** — the analyst's own formulation of what they extracted (not a verbatim copy).
4. **References a `sourceExcerpt`** — the exact text from the source that supports the statement.
5. **Has a typed `ContributionType`** — one of 11 types: `finding`, `definition`, `fact`, `claim`, `causal-mechanism`, `recommendation`, `limitation`, `assumption`, `contradiction`, `question`, `other`.
6. **Tracks status** — `draft → proposed → validated → rejected → archived` (with defined valid transitions).
7. **Records origin** — `"human" | "agent-assisted"`. All S-027 UI contributions record `"human"`.
8. **Has a `SourceLocation`** — typed struct (`{ description?, textRange?, page?, section? }`) for precise anchoring without requiring auto text-selection in S-027.

## Key Architectural Decisions

### Referential integrity at two layers
- **Structural validation** (`validateContribution`): checks types, lengths, required fields. Stateless — no context needed.
- **Referential validation** (`validateContributionReferences`): checks that `sourceId` exists, `caseId` matches the source's `caseId`, and the source belongs to the active case. Requires `KnowledgeSource[]`.

### Orphan protection (domain layer, not UI layer)
A `KnowledgeSource` with contributions cannot be hard-deleted. `canDeleteSource(sourceId, contributions)` returns `{ canDelete: false; contributionCount: number }` when contributions exist. The UI presents archive as an alternative.

Archiving a source does **not** delete its contributions. Contributions survive source archival by design.

### Source state enforcement (UI layer, not domain layer)
New contributions may only be created from sources in `registered` or `ready-for-analysis` state. This is enforced by the UI (reading `ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS`) — the domain `createContribution` does not check source status, since it doesn't need a reference to the source object.

### Navigation: PantallaContribuciones accessible only from PantallaFuentes
`PantallaContribuciones` is not accessible from the `CaseSummaryBand` or any header navigation. The entry point is always a source card in `PantallaFuentes`. This makes the source→contribution relationship explicit in the UX.

### Removing a contribution is NOT a breaking change in S-027
Contributions are not yet in the methodological chain (hypotheses, conceptual models, evidence evaluations do not reference them in S-027). This mirrors the S-026 principle for sources. Future sprints will strengthen this when contributions are linked to hypothesis formation.

### Schema 1.2.0 → 1.3.0
Migration is additive: `contributions: []` for all existing projects. The migration chain is:
```
0.9.0 → 1.0.0 → 1.1.0 → 1.2.0 → 1.3.0
```

## Consequences

### Positive
- Complete audit trail: source → excerpt → analyst statement → contribution type.
- Orphan protection prevents dangling references before contributions are in the methodological chain.
- Typed `SourceLocation` is extensible (page, section, textRange) without breaking changes.
- Two-layer validation separates structural checks (fast, no dependencies) from referential checks (requires context).

### Neutral / Future work
- Contributions are not yet linked to hypotheses or evidence evaluations. S-028+ will formalize this link.
- `agent-assisted` origin exists in the type system but is not exposed in S-027 UI.
- Text-range auto-selection is deferred to a future sprint.

## Rejected Alternatives

- **Embedding excerpts directly in sources**: would conflate the source (origin) with the analyst's interpretation (contribution). Rejected because it merges two distinct epistemological concepts.
- **Free-form notes per source**: too unstructured for downstream methodological use.
- **Blocking `createContribution` by source status in the domain layer**: rejected because `createContribution` does not receive the full `KnowledgeSource` object — passing only the `ContributionInput` keeps the domain layer lean and testable. The UI enforces enabled statuses.
