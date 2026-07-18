# Integrity vs. Authenticity in HELIOS

## Overview

HELIOS uses SHA-256 to verify the **integrity** of project snapshots and packages. This document explains precisely what "integrity" means in this context, and what it does **not** mean.

---

## Integrity (What HELIOS Verifies)

**Content integrity** means that the data has not changed since it was hashed.

When HELIOS computes `contentHash = SHA-256(canonicalize(snapshot))`, it records a fingerprint of the snapshot's content at the moment of creation. Later, `verifySnapshotIntegrity(snap)` recomputes the hash and compares it to the stored value:

- ✅ **Same hash** → the content has not been modified since the snapshot was created.
- ❌ **Different hash** → the content has been altered (corruption, truncation, manual edit, or transmission error).

This protects against:
- Accidental file corruption during storage or transfer
- Incomplete writes (partially saved files)
- Silent bit rot in storage media
- Naive tampering (editing the JSON manually without updating the hash)

---

## Authenticity (What HELIOS Does NOT Verify)

**Authenticity** means knowing *who* created the content and *where* it came from.

SHA-256 does **not** provide authenticity because:

1. **Anyone with the content can recompute the hash.** If an attacker replaces a snapshot's payload and recomputes `contentHash = SHA-256(newPayload)`, the integrity check will pass — it verifies consistency, not origin.
2. **There is no secret key involved.** Authentication requires a private key (e.g., digital signatures) that only the legitimate author possesses. SHA-256 is a public algorithm applied to public data.
3. **There is no certificate chain.** HELIOS does not participate in PKI (Public Key Infrastructure) or any trust anchor system.

Authenticity would require **digital signatures** (e.g., Ed25519, RSA-PSS), which HELIOS does not currently implement.

---

## UI Language Rules

When displaying hash-related UI in HELIOS, use language that reflects integrity without implying authenticity:

| ✅ Correct | ❌ Incorrect |
|-----------|------------|
| "SHA-256 verified — content intact" | "Authentic" |
| "Content integrity confirmed" | "Certified" |
| "Hash matches — no changes detected" | "Inviolable" |
| "SHA-256 ✓" | "Digitally signed" |
| "SHA-256 ✗ — content may have changed" | "Forged" |

The integrity badge must always carry a tooltip or accessible label that explains its scope:
> "SHA-256 verifies that the content has not changed since this snapshot was created. It does not verify who created it or where it came from."

---

## Future: Moving Toward Authenticity

If HELIOS ever needs to provide authenticity guarantees (e.g., for audit trails, regulatory compliance, or multi-author workflows), the recommended path is:

1. **Asymmetric signatures** — sign the canonical JSON with Ed25519; embed the public key and signature in the snapshot metadata.
2. **Timestamping** — use a trusted timestamping service (RFC 3161) to prove when the snapshot was created.
3. **Chain-of-custody** — use `parentVersionId` references to build a verifiable lineage graph.

These are not current requirements. The current SHA-256 implementation is designed to be extended: `CryptoHashAdapter` is an interface, and `SnapshotService` passes metadata fields through `computeSnapshotHash` in a way that could accommodate a signature field.

---

## References

- `docs/adr/ADR-0013A-cryptographic-integrity.md`
- `src/project-versioning/crypto/CryptoHashAdapter.ts`
- `src/project-versioning/SnapshotService.ts` → `verifySnapshotIntegrity()`
