/**
 * S-024.1 — Deterministic Canonicalization
 *
 * Produces a stable, reproducible string representation of any JSON-compatible
 * value so that the same logical content always hashes to the same SHA-256.
 *
 * Rules:
 *   - Object keys are sorted lexicographically (recursive).
 *   - String values are NFC-normalized.
 *   - `undefined` values are excluded (JSON.stringify behaviour).
 *   - `null` is preserved.
 *   - Circular references throw CanonicalizationError.
 *   - Dates are represented as ISO-8601 strings.
 *   - Numbers and booleans are preserved as JSON types.
 *   - Arrays have two modes:
 *       · Semantic (user-defined order) → preserved as-is.
 *       · Non-semantic (no user-defined order) → stable sort.
 *     See SEMANTIC_ARRAY_KEYS for the classification.
 *
 * Unicode:
 *   All strings are passed through String.prototype.normalize("NFC") before
 *   serialization. This ensures that composed and decomposed forms of the same
 *   character produce identical output (e.g., "é" composed vs decomposed).
 */

import { CanonicalizationError } from "../errors";

// ─── Semantic array classification ────────────────────────────────────────────

/**
 * Arrays whose order has methodological meaning (user decision).
 * These are preserved exactly as stored.
 *
 * Decision documented in docs/versioning/canonicalization-spec.md.
 */
export const SEMANTIC_ARRAY_KEYS = new Set([
  "variables",
  "indicators",
  "evidenceSources",
  "rows",
  "observations",
  "assessments",
  "sections",
  "reflectionAnswers",
  "hypotheses",
  "conceptualModels",
  "operationalizationMatrices",
  "contrastationMatrices",
  "evidenceEvaluationMatrices",
  "hypothesisEvidenceConclusions",
  "reportDefinitions",
  "blocks",         // ReportSection blocks
  "sectionOrder",   // explicit section ordering in ReportDefinition
]);

/**
 * Arrays that are NOT semantically ordered.
 * These are sorted stably before canonicalization.
 */
export const NON_SEMANTIC_ARRAY_KEYS = new Set([
  "tags",
  "errors",
  "warnings",
  "affectedEntityTypes",
  "changedFields",
]);

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Recursively canonicalize a value.
 *
 * @param value    Any JSON-compatible value.
 * @param key      The property key this value was accessed with (for semantic classification).
 * @param seen     WeakSet for circular reference detection.
 * @returns        A JSON-safe value ready for deterministic serialization.
 */
function canonicalizeValue(
  value: unknown,
  key: string,
  seen: WeakSet<object>
): unknown {
  // Primitives
  if (value === null) return null;
  if (value === undefined) return undefined; // will be dropped by JSON.stringify
  if (typeof value === "boolean" || typeof value === "number") return value;

  // Strings — normalize Unicode NFC
  if (typeof value === "string") return value.normalize("NFC");

  // Dates — represent as ISO-8601
  if (value instanceof Date) return value.toISOString();

  // Circular reference detection
  if (typeof value === "object") {
    if (seen.has(value as object)) {
      throw new CanonicalizationError(
        `Circular reference detected at key "${key}"`
      );
    }
    seen.add(value as object);
  }

  // Arrays
  if (Array.isArray(value)) {
    const mapped = value.map((item, i) =>
      canonicalizeValue(item, `${key}[${i}]`, seen)
    );

    let result: unknown[];
    if (SEMANTIC_ARRAY_KEYS.has(key)) {
      // Preserve user-defined order
      result = mapped;
    } else if (NON_SEMANTIC_ARRAY_KEYS.has(key)) {
      // Stable sort
      result = [...mapped].sort((a, b) =>
        JSON.stringify(a).localeCompare(JSON.stringify(b))
      );
    } else {
      // Default: preserve order (safer; explicit NON_SEMANTIC_ARRAY_KEYS for sort)
      result = mapped;
    }

    if (typeof value === "object") seen.delete(value as object);
    return result;
  }

  // Plain objects — sort keys
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};

  Object.keys(obj)
    .sort() // lexicographic key sort
    .forEach((k) => {
      const child = canonicalizeValue(obj[k], k, seen);
      if (child !== undefined) {
        sorted[k] = child;
      }
    });

  seen.delete(obj);
  return sorted;
}

/**
 * Produce a canonical JSON string from any JSON-compatible value.
 *
 * - Object keys sorted, strings NFC-normalized.
 * - Throws CanonicalizationError on circular references.
 */
export function canonicalStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const canonical = canonicalizeValue(value, "", seen);
  return JSON.stringify(canonical);
}

/**
 * Alias for canonicalStringify — use when the semantic intent is "normalize
 * before hashing" rather than "stringify".
 */
export function canonicalize(value: unknown): string {
  return canonicalStringify(value);
}

/**
 * Produce a canonical JSON string for a snapshot payload.
 * Identical to canonicalize() but documents intent at the call site.
 */
export function normalizeProjectPackage(value: unknown): string {
  return canonicalStringify(value);
}

/**
 * Produce a canonical JSON string for a GeneratedReport.
 * Timestamps should be stripped by the caller before passing.
 */
export function normalizeGeneratedReport(value: unknown): string {
  return canonicalStringify(value);
}
