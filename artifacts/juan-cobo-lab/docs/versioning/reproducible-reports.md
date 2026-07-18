# Reproducible Reports in HELIOS

**Sprint:** S-024

## Overview

The same snapshot + the same ReportDefinition always produces the same structural content.

## Flow

```
Snapshot
  ↓ reconstructSessionFromSnapshot()
Session reconstruida
  ↓ buildReportDocument(reportDef, buildInput)
GeneratedReport
  ↓ MarkdownExporter.export()
Report content (Markdown)
```

## Key properties

1. **Deterministic**: no randomness, no LLM, no external API calls
2. **Timestamp-excluded**: ISO timestamps in report content are excluded from the reproducibility hash
3. **Snapshot-isolated**: the reconstructed session is a deep copy; modifying active state does not affect previously created snapshots
4. **ReportDefinition-driven**: only the section configuration (order, visibility) is stored in the snapshot, not the rendered content

## Verification

`verifyReportReproducibility(snapshot, reportDefinitionId)` generates the report twice and compares:

```typescript
const result: ReproducibilityResult = {
  reproducible: boolean;
  firstHash: string;
  secondHash: string;
  differences: string[];  // up to 10 differing lines
}
```

## Limitations

- Reports are reconstructed, not stored: if the report definition is deleted from the snapshot, reconstruction fails
- packActivo must be included in the snapshot for full reproducibility of pattern-dependent content
- Timestamps in entity fields (createdAt, updatedAt) are included in the report content but excluded from the reproducibility hash comparison
