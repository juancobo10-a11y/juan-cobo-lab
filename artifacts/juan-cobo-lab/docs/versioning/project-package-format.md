# HELIOS Project Package Format (.helios.json)

**Version:** 1.0.0  
**Sprint:** S-024

## Overview

A `.helios.json` file is a portable, self-contained bundle of one or more project snapshots and their associated version metadata. It is the primary mechanism for exporting and importing HELIOS projects.

## Structure

```json
{
  "manifest": {
    "format": "HELIOS_PROJECT_PACKAGE",
    "packageVersion": "1.0.0",
    "schemaVersion": "1.0.0",
    "projectId": "project-uuid",
    "projectName": "Mi proyecto HELIOS",
    "exportedAt": "2026-07-18T00:00:00.000Z",
    "snapshotCount": 3,
    "versionCount": 3,
    "packageHash": "64-char-hex"
  },
  "snapshots": [ ... ],
  "versions": [ ... ]
}
```

## packageHash

The `packageHash` is computed over:
```
format + packageVersion + schemaVersion + projectId + projectName +
sorted(snapshot.contentHash for each snapshot)
```

`exportedAt` is **excluded** from the packageHash to allow date-stripped reproducibility: the same content exported twice (at different times) produces the same hash.

## Security

- **No encryption**: the file contains the complete methodological state in plaintext
- **Integrity**: the `packageHash` detects tampering
- **Confidentiality**: the user is responsible for protecting the file
- **No tokens or credentials**: HELIOS never includes secrets in exported packages

## Import behavior

| Condition | Action |
|-----------|--------|
| Same schemaVersion | Import directly |
| Older schemaVersion + migration exists | Migrate then import |
| Older schemaVersion + no migration | Block import |
| Future schemaVersion | Block import |
| Invalid hash | Block import |
| Valid, confirmed | Apply chosen strategy |

## Import strategies

| Strategy | Description |
|----------|-------------|
| `create-copy` | New IDs for all entities; default; no conflict with active project |
| `replace-current` | Uses original IDs; requires explicit confirmation |
| `cancel` | No changes made |

## Filename convention

```
<project-name>-<version-label>.helios.json
```

Example: `gasto-educativo-v2-revision.helios.json`
