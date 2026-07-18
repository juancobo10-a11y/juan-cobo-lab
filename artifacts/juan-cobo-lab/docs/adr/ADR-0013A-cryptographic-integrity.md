# ADR-0013A — SHA-256 Cryptographic Integrity for Project Snapshots and Packages

**Status:** Accepted  
**Sprint:** S-024.1  
**Supersedes:** Partial replacement of ADR-0013 (MurmurHash3 removed)  
**Related:** ADR-0013 (Immutable Project Snapshots)

---

## Context

ADR-0013 introduced immutable project snapshots with content-addressed hashes to detect accidental corruption. The original implementation used **MurmurHash3-128**, a non-cryptographic hash, which is fast but offers no meaningful collision resistance or tamper-detection guarantees beyond accidental corruption.

S-024.1 upgrades the hashing algorithm to **SHA-256** (via the Web Crypto API / Node.js `crypto` module) and hardens the canonicalization layer to produce deterministic, Unicode-normalized input before hashing.

---

## Decision

**Replace MurmurHash3-128 with SHA-256 for all content hashes in HELIOS.**

Affected artifacts:
- `ProjectSnapshot.contentHash`
- `ProjectPackage.manifest.packageHash`
- `GeneratedReport.contentHash` (via `computeGeneratedReportHash`)

The implementation lives in `src/project-versioning/crypto/CryptoHashAdapter.ts`.

---

## What SHA-256 Provides (Integrity)

SHA-256 verifies **content integrity**:
- The snapshot's payload has not changed since it was created.
- The package has not been modified since it was exported.
- Two identically-structured snapshots will produce the same hash.

This is sufficient for the primary HELIOS use case: detecting accidental or deliberate file corruption, verifying round-trip reproducibility, and ensuring exported packages can be re-validated.

---

## ⚠️ What SHA-256 Does NOT Provide (Authenticity)

SHA-256 alone does **NOT** provide:
- **Authenticity** — cannot prove who created the snapshot
- **Authorship** — cannot verify the identity of the author
- **Origin verification** — cannot confirm where the file came from
- **Digital signature** — no private key is involved
- **Non-repudiation** — the hash can be recomputed by anyone with the content

These properties require asymmetric cryptography (e.g., Ed25519 signatures, X.509 certificates). HELIOS does not currently implement these, and the UI language explicitly distinguishes integrity from authenticity.

**UI language rule:** Use "SHA-256 verified — content intact" NOT "authentic", "certified", or "inviolable". The integrity badge must never imply authorship.

---

## Canonicalization

Before hashing, content is passed through `canonicalStringify()` in `crypto/canonicalize.ts`:

1. **Object keys are sorted** alphabetically at all nesting levels (eliminates key-order variance).
2. **Unicode NFC normalization** is applied to all strings (eliminates decomposed/precomposed character variance).
3. **`undefined` values are excluded** (JSON-compatible behavior).
4. **`null` values are preserved** (semantically meaningful absence).
5. **Arrays classified as semantic** (order preserved) or **non-semantic** (sorted for determinism).
6. **Circular references** throw `CanonicalizationError` (never silently produce wrong output).

---

## Implementation Strategy

```
DefaultCryptoHashAdapter (auto-selects based on runtime):
  ├── WebCryptoHashAdapter   (browser + Node 18+, uses globalThis.crypto.subtle)
  └── NodeCryptoHashAdapter  (older Node, uses node:crypto createHash)
```

The adapter interface (`CryptoHashAdapter`) allows future algorithm rotation without changing call sites.

---

## Consequences

### Positive
- SHA-256 is a well-established standard; collision resistance is cryptographically sound.
- The hash is deterministic across platforms and runtimes.
- `contentHash` length is now a stable 64 hex characters (was variable with MurmurHash3).
- Canonicalization prevents hash drift from insignificant formatting differences.
- NFC normalization eliminates a class of platform-specific encoding bugs.

### Negative / Trade-offs
- SHA-256 is ~2–3× slower than MurmurHash3 for large payloads. For HELIOS snapshot sizes (< 1 MB), this is imperceptible.
- The hash algorithm change is a **breaking change** for any externally stored hashes — all hashes from S-024 snapshots are invalid under S-024.1 and must be recomputed. A one-time migration is not needed since snapshot hashes are always recomputed on `verifySnapshotIntegrity()`.
- All snapshot and package creation functions are now **async**.

---

## Alternatives Considered

| Algorithm | Considered | Rejected Because |
|-----------|-----------|-----------------|
| MurmurHash3-128 | Yes (S-024) | Non-cryptographic; no collision resistance |
| SHA-1 | No | Deprecated; collision attacks known |
| SHA-256 | **Selected** | Standard; Web Crypto API native; adequate for integrity |
| SHA-512 | No | Unnecessary overhead; SHA-256 sufficient |
| BLAKE2/BLAKE3 | No | Not natively available in Web Crypto |

---

## References

- `src/project-versioning/crypto/CryptoHashAdapter.ts`
- `src/project-versioning/crypto/canonicalize.ts`
- `docs/versioning/canonicalization-spec.md`
- `docs/security/integrity-vs-authenticity.md`
- ADR-0013: Immutable Project Snapshots
