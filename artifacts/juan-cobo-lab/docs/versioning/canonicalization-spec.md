# Canonicalization Specification — HELIOS Snapshot Hashing

## Purpose

Before computing a SHA-256 hash of a snapshot or package, HELIOS must produce a **canonical string representation** of the data — one that is identical regardless of:

- The order in which object keys were inserted
- Unicode composition form (NFD vs NFC for accented characters)
- Floating-point formatting (within JSON precision)
- Platform or runtime environment

This document specifies the canonicalization algorithm implemented in `src/project-versioning/crypto/canonicalize.ts`.

---

## Algorithm

### 1. Object Key Sorting

All object keys are sorted **alphabetically** at every level of nesting. This eliminates variance introduced by different insertion orders in `Map`, spread operators, or JSON parsers.

```
{ z: 1, a: 2 }  →  { a: 2, z: 1 }
```

Nested objects are recursively sorted:
```
{ outer: { z: 1, a: 2 } }  →  { outer: { a: 2, z: 1 } }
```

### 2. Unicode NFC Normalization

All string values (including object keys) are normalized to **NFC (Canonical Decomposition, followed by Canonical Composition)** before hashing.

This ensures that `é` (U+00E9, precomposed) and `e` + `◌́` (U+0065 + U+0301, decomposed) produce the same canonical representation and therefore the same hash.

NFC normalization is applied by `String.prototype.normalize("NFC")` before `TextEncoder` encodes the string for the `SubtleCrypto.digest()` call.

### 3. `undefined` Exclusion

`undefined` values are excluded from the canonical output, consistent with `JSON.stringify` behavior. An object `{ a: 1, b: undefined }` canonicalizes to `{"a":1}`.

### 4. `null` Preservation

`null` values are preserved in the canonical output. `{ a: null }` canonicalizes to `{"a":null}`. This is semantically significant — `null` means "explicitly absent" while `undefined` means "not provided".

### 5. Array Classification

Arrays are classified as either **semantic** or **non-semantic**:

**Semantic arrays** (order is meaningful): Elements are preserved in their original order.
- `hypotheses` — hypothesis order is methodologically significant
- `reflectionAnswers`, `variables`, `indicators` — order reflects user intent

**Non-semantic arrays** (order is incidental): Elements are sorted for determinism.
- `tags`, `thinkingPatternIds`, `sourceQuestionIds` — order is arbitrary

The sets `SEMANTIC_ARRAY_KEYS` and `NON_SEMANTIC_ARRAY_KEYS` in `canonicalize.ts` define the classification.

### 6. Circular Reference Detection

If a circular reference is detected during traversal, a `CanonicalizationError` is thrown immediately. The algorithm never silently produces incorrect output for circular structures.

---

## Output Format

The canonical representation is a **compact JSON string** (no whitespace, no pretty-printing). Object keys are double-quoted. String values are JSON-escaped.

Example:
```json
{"a":1,"b":{"x":"hello","z":null},"c":[1,2,3]}
```

---

## Included vs. Excluded Fields in `computeSnapshotHash`

The following metadata fields are **included** in `contentHash` (in addition to the full payload):

| Field | Included | Rationale |
|-------|---------|-----------|
| `schemaVersion` | ✅ | Version compatibility affects interpretation |
| `projectId` | ✅ | Identifies the project the snapshot belongs to |
| `projectName` | ✅ | Semantic identifier |
| `versionLabel` | ✅ | Label declared at creation time |
| `description` | ✅ | Descriptive metadata |
| `author` | ✅ | Attribution metadata |
| `tags` | ✅ | Classification metadata |
| `sourceSnapshotId` | ✅ | Lineage link |
| `changeSummary` | ✅ | Documented reason for the version |
| `createdAt` | ❌ | Excluded — timestamps vary across runs |

For `computePackageHash`, `exportedAt` is excluded to allow the same content exported on different dates to produce the same hash.

---

## Implementation Reference

```typescript
// src/project-versioning/crypto/canonicalize.ts

export function canonicalize(value: unknown, seen = new Set()): unknown;
export function canonicalStringify(value: unknown): string;
export function normalizeProjectPackage(pkg: ProjectPackage): object;
export function normalizeGeneratedReport(report: GeneratedReport): object;

export const SEMANTIC_ARRAY_KEYS: Set<string>;
export const NON_SEMANTIC_ARRAY_KEYS: Set<string>;
```

---

## Test Coverage

Canonicalization is tested in `src/project-versioning/__tests__/validacion_s024_1.ts`:
- Section §2: Canonización NFC (14 tests)
- Key properties verified: key ordering, NFC normalization, undefined exclusion, null preservation, circular reference detection, nested object ordering.
