/**
 * S-026 — KnowledgeSourceService
 *
 * Pure functions for creating, validating, updating, and managing
 * KnowledgeSource entities. No side effects. No storage access.
 * All functions are synchronous.
 *
 * Conceptual note: these functions manage Fuentes de Conocimiento as
 * defined in the Inteligencia Ecosistémica model. A source provides raw
 * content; it does not constitute evidence until evaluated (future sprints).
 */

import type {
  KnowledgeSource,
  KnowledgeSourceInput,
  KnowledgeSourceStatus,
  KnowledgeSourceUpdate,
  KnowledgeSourceValidationResult,
} from "./types";
import { VALID_STATUS_TRANSITIONS } from "./types";

// ─── ID generation ────────────────────────────────────────────────────────────

function generateSourceId(): string {
  return `ks_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a KnowledgeSourceInput before creation.
 * Returns a result object; never throws.
 */
export function validateSource(
  input: KnowledgeSourceInput
): KnowledgeSourceValidationResult {
  const errors: string[] = [];

  if (!input.caseId || input.caseId.trim().length === 0) {
    errors.push("El identificador del caso (caseId) es obligatorio.");
  }

  if (!input.title || input.title.trim().length === 0) {
    errors.push("El título de la fuente de conocimiento es obligatorio.");
  } else if (input.title.trim().length > 200) {
    errors.push("El título no puede superar los 200 caracteres.");
  }

  if (!input.content || input.content.trim().length === 0) {
    errors.push("El contenido de la fuente es obligatorio.");
  } else if (input.content.trim().length < 10) {
    errors.push("El contenido debe tener al menos 10 caracteres.");
  }

  if (!input.sourceType) {
    errors.push("El tipo de fuente de conocimiento es obligatorio.");
  }

  return { valid: errors.length === 0, errors };
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new KnowledgeSource from validated input.
 * Throws if the input fails validation.
 *
 * incorporatedAt and updatedAt are stamped at creation time.
 * The caller is responsible for providing a NOW timestamp via `_now` (for
 * deterministic testing). If omitted, uses the current system time.
 */
export function createSource(
  input: KnowledgeSourceInput,
  _now?: string
): KnowledgeSource {
  const validation = validateSource(input);
  if (!validation.valid) {
    throw new Error(
      `KnowledgeSource inválido: ${validation.errors.join("; ")}`
    );
  }
  const now = _now ?? new Date().toISOString();
  return {
    id: generateSourceId(),
    caseId: input.caseId.trim(),
    title: input.title.trim(),
    sourceType: input.sourceType,
    content: input.content.trim(),
    status: input.status ?? "draft",
    author: input.author?.trim() || undefined,
    institution: input.institution?.trim() || undefined,
    publicationDate: input.publicationDate?.trim() || undefined,
    language: input.language?.trim() || undefined,
    referenceUrl: input.referenceUrl?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    incorporatedAt: now,
    updatedAt: now,
  };
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Return a new KnowledgeSource with the supplied fields merged in.
 *
 * Immutable fields (id, caseId, incorporatedAt) are never changed by this
 * function even if passed in `updates`.
 *
 * updatedAt is always stamped to the current time.
 */
export function updateSource(
  source: KnowledgeSource,
  updates: KnowledgeSourceUpdate,
  _now?: string
): KnowledgeSource {
  const now = _now ?? new Date().toISOString();
  return {
    ...source,
    ...updates,
    // Immutable fields
    id: source.id,
    caseId: source.caseId,
    incorporatedAt: source.incorporatedAt,
    // Always refreshed
    updatedAt: now,
  };
}

// ─── Status change ────────────────────────────────────────────────────────────

/**
 * Attempt a status transition on a source.
 *
 * Returns { success: true, source } on a valid transition.
 * Returns { success: false, error } when the transition is not permitted.
 *
 * Permitted transitions are defined in VALID_STATUS_TRANSITIONS.
 * ready-for-analysis is the gateway state preceding S-027 contribution extraction.
 */
export function changeStatus(
  source: KnowledgeSource,
  newStatus: KnowledgeSourceStatus,
  _now?: string
): { success: true; source: KnowledgeSource } | { success: false; error: string } {
  const allowed = VALID_STATUS_TRANSITIONS[source.status];
  if (!allowed.includes(newStatus)) {
    const allowedStr = allowed.length > 0 ? allowed.join(", ") : "ninguna";
    return {
      success: false,
      error: `Transición de estado no permitida: "${source.status}" → "${newStatus}". Transiciones válidas desde "${source.status}": ${allowedStr}.`,
    };
  }
  return {
    success: true,
    source: updateSource(source, { status: newStatus }, _now),
  };
}

// ─── Query ────────────────────────────────────────────────────────────────────

/** Return all sources that belong to a given case. Preserves order. */
export function getSourcesByCase(
  sources: KnowledgeSource[],
  caseId: string
): KnowledgeSource[] {
  return sources.filter((s) => s.caseId === caseId);
}

/** Find a source by ID. Returns undefined when not found. */
export function getSourceById(
  sources: KnowledgeSource[],
  id: string
): KnowledgeSource | undefined {
  return sources.find((s) => s.id === id);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Return a new array with the source removed.
 * Physical deletion. Caller is responsible for showing a confirmation dialog.
 */
export function deleteSource(
  sources: KnowledgeSource[],
  id: string
): KnowledgeSource[] {
  return sources.filter((s) => s.id !== id);
}

// ─── Bulk helpers ─────────────────────────────────────────────────────────────

/**
 * Replace a source in-place by ID, returning the updated array.
 * If the ID is not found the original array is returned unchanged.
 */
export function replaceSource(
  sources: KnowledgeSource[],
  updated: KnowledgeSource
): KnowledgeSource[] {
  const idx = sources.findIndex((s) => s.id === updated.id);
  if (idx === -1) return sources;
  const next = [...sources];
  next[idx] = updated;
  return next;
}
