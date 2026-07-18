/**
 * S-024.1 — CryptoHashAdapter
 *
 * ADR-0013A: HELIOS uses SHA-256 for snapshot, package, and report hashes.
 *
 * What this provides:
 *   Cryptographic integrity — detects accidental or deliberate content changes.
 *
 * What this does NOT provide:
 *   Authenticity, authorship, digital signature, or identity verification.
 *   The hash confirms the content matches its stored representation.
 *   It does not certify who created the content or where it came from.
 *
 * Implementation strategy:
 *   1. Try globalThis.crypto.subtle (browser + Node 18+).
 *   2. Fall back to node:crypto createHash (older Node, test environments).
 *   Unicode normalization (NFC) is applied consistently before hashing.
 */

// ─── Interface ────────────────────────────────────────────────────────────────

export interface CryptoHashAdapter {
  /** Compute SHA-256 and return 64-character lowercase hex string. */
  sha256(input: string | Uint8Array): Promise<string>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function encodeString(input: string): Uint8Array {
  // NFC normalization ensures identical canonical form across decomposed/composed chars
  const normalized = input.normalize("NFC");
  return new TextEncoder().encode(normalized);
}

// ─── WebCryptoHashAdapter ─────────────────────────────────────────────────────

/**
 * Uses the Web Crypto API (available in browsers and Node 18+).
 * Preferred implementation.
 */
export class WebCryptoHashAdapter implements CryptoHashAdapter {
  async sha256(input: string | Uint8Array): Promise<string> {
    const data = typeof input === "string" ? encodeString(input) : input;
    const buffer = await globalThis.crypto.subtle.digest("SHA-256", data as unknown as ArrayBuffer);
    return bufferToHex(buffer);
  }
}

// ─── NodeCryptoHashAdapter ────────────────────────────────────────────────────

/**
 * Uses Node.js built-in crypto module.
 * Fallback for environments without Web Crypto.
 */
export class NodeCryptoHashAdapter implements CryptoHashAdapter {
  async sha256(input: string | Uint8Array): Promise<string> {
    // Dynamic import avoids bundler issues in browser environments
    const { createHash } = await import("node:crypto");
    if (typeof input === "string") {
      const normalized = input.normalize("NFC");
      return createHash("sha256").update(normalized, "utf8").digest("hex");
    }
    return createHash("sha256").update(Buffer.from(input)).digest("hex");
  }
}

// ─── DefaultCryptoHashAdapter ─────────────────────────────────────────────────

/**
 * Auto-selects the appropriate implementation based on the runtime environment.
 * Use this in production code.
 */
export class DefaultCryptoHashAdapter implements CryptoHashAdapter {
  async sha256(input: string | Uint8Array): Promise<string> {
    if (
      typeof globalThis !== "undefined" &&
      typeof globalThis.crypto?.subtle?.digest === "function"
    ) {
      return new WebCryptoHashAdapter().sha256(input);
    }
    return new NodeCryptoHashAdapter().sha256(input);
  }
}

// ─── Singleton default instance ───────────────────────────────────────────────

/** Ready-to-use default adapter. Import this in all services. */
export const defaultHashAdapter: CryptoHashAdapter = new DefaultCryptoHashAdapter();

// ─── Convenience function ─────────────────────────────────────────────────────

/**
 * Compute SHA-256 of a string and return 64-char hex.
 * Applies NFC normalization automatically.
 */
export async function sha256Hex(input: string): Promise<string> {
  return defaultHashAdapter.sha256(input);
}
