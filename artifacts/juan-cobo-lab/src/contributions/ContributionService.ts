/**
 * S-027 — ContributionService
 *
 * Pure functions for managing Contribution entities.
 * No mutations. No storage access. No side effects.
 *
 * Two distinct validation layers (ADR-0016):
 *
 *   Structural validation (validateContribution):
 *     Checks field types, lengths, required fields, and enum membership.
 *     Does NOT require external context. Used before createContribution.
 *
 *   Referential validation (validateContributionReferences):
 *     Checks that sourceId refers to an existing KnowledgeSource,
 *     that caseId matches KnowledgeSource.caseId, and that the source
 *     is in a state that permits new contributions.
 *     Requires the KnowledgeSource[] array as context.
 *
 * Orphan protection (canDeleteSource):
 *     A KnowledgeSource with ≥1 contribution cannot be hard-deleted.
 *     Returns { canDelete: false, contributionCount: N } when blocked.
 *     The UI must surface the count and offer archiving or managing
 *     contributions first.
 */

import type { KnowledgeSource } from "@/knowledge-sources/types";
import type {
  Contribution,
  ContributionInput,
  ContributionStatus,
  ContributionUpdate,
  ContributionValidationResult,
  ContributionReferentialValidationResult,
} from "./types";
import {
  VALID_CONTRIBUTION_STATUS_TRANSITIONS,
  ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS,
} from "./types";

// ─── ID generation ────────────────────────────────────────────────────────────

/**
 * Generate a unique contribution ID.
 * Format: cn_<timestamp>_<random6hex>
 */
function generateContributionId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `cn_${ts}_${rand}`;
}

// ─── Structural validation ────────────────────────────────────────────────────

/**
 * Validate a ContributionInput structurally.
 * Does NOT require external context (no sources array needed).
 * Call this before createContribution.
 */
export function validateContribution(
  input: ContributionInput
): ContributionValidationResult {
  const errors: string[] = [];

  // Required: caseId
  if (!input.caseId || !input.caseId.trim()) {
    errors.push("caseId es obligatorio");
  }

  // Required: sourceId
  if (!input.sourceId || !input.sourceId.trim()) {
    errors.push("sourceId es obligatorio");
  }

  // Required: type
  const validTypes = [
    "finding", "definition", "fact", "claim", "causal-mechanism",
    "recommendation", "limitation", "assumption", "contradiction",
    "question", "other",
  ];
  if (!input.type || !validTypes.includes(input.type)) {
    errors.push(`tipo de contribución inválido: "${input.type}"`);
  }

  // Required: statement (10–2000 chars after trim)
  const statement = (input.statement ?? "").trim();
  if (!statement) {
    errors.push("El enunciado (statement) es obligatorio");
  } else if (statement.length < 10) {
    errors.push("El enunciado debe tener al menos 10 caracteres");
  } else if (statement.length > 2000) {
    errors.push("El enunciado no puede superar los 2 000 caracteres");
  }

  // Required: sourceExcerpt (10–5000 chars after trim)
  const excerpt = (input.sourceExcerpt ?? "").trim();
  if (!excerpt) {
    errors.push("El fragmento original (sourceExcerpt) es obligatorio");
  } else if (excerpt.length < 10) {
    errors.push("El fragmento original debe tener al menos 10 caracteres");
  } else if (excerpt.length > 5000) {
    errors.push("El fragmento original no puede superar los 5 000 caracteres");
  }

  // Optional: interpretation (max 1000)
  if (input.interpretation && input.interpretation.trim().length > 1000) {
    errors.push("La interpretación no puede superar los 1 000 caracteres");
  }

  // Optional: relevance (max 500)
  if (input.relevance && input.relevance.trim().length > 500) {
    errors.push("La relevancia no puede superar los 500 caracteres");
  }

  // Optional: confidence (0–1)
  if (input.confidence !== undefined) {
    if (typeof input.confidence !== "number" || input.confidence < 0 || input.confidence > 1) {
      errors.push("La confianza debe ser un número entre 0 y 1");
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Referential validation ───────────────────────────────────────────────────

/**
 * Validate that a contribution's sourceId and caseId are referentially consistent.
 *
 * Checks:
 *   1. sourceId refers to an existing KnowledgeSource in the provided array.
 *   2. caseId equals KnowledgeSource.caseId (referential integrity).
 *   3. The source is in a state that permits new contributions
 *      (registered | ready-for-analysis).
 *
 * Separate from structural validation so callers can run them independently
 * (e.g. tests of structural validation do not need a sources array).
 */
export function validateContributionReferences(
  input: { sourceId: string; caseId: string },
  sources: KnowledgeSource[]
): ContributionReferentialValidationResult {
  const errors: string[] = [];

  const source = sources.find((s) => s.id === input.sourceId);

  // 1. sourceId must exist
  if (!source) {
    errors.push(
      `sourceId "${input.sourceId}" no corresponde a ninguna fuente de conocimiento existente`
    );
    return { valid: false, errors };
  }

  // 2. caseId must match source.caseId
  if (source.caseId !== input.caseId) {
    errors.push(
      `caseId "${input.caseId}" no coincide con el caso de la fuente "${input.sourceId}" (esperado: "${source.caseId}")`
    );
  }

  // 3. Source must be in an enabled state for new contributions
  const enabledStatuses: string[] = [...ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS];
  if (!enabledStatuses.includes(source.status)) {
    errors.push(
      `La fuente "${source.title}" está en estado "${source.status}" y no admite nuevas contribuciones. ` +
      `Solo se permiten contribuciones en fuentes con estado: ${enabledStatuses.join(", ")}.`
    );
  }

  return { valid: errors.length === 0, errors };
}

// ─── Orphan protection ────────────────────────────────────────────────────────

/**
 * Check whether a KnowledgeSource can be hard-deleted.
 *
 * A source with ≥1 contribution CANNOT be deleted. The caller must:
 *   a) Offer to archive the source instead, OR
 *   b) Prompt the analyst to manage (archive/delete) contributions first.
 *
 * Returns { canDelete: true } when no contributions reference the source.
 * Returns { canDelete: false, contributionCount: N } when blocked.
 */
export function canDeleteSource(
  sourceId: string,
  contributions: Contribution[]
): { canDelete: true } | { canDelete: false; contributionCount: number } {
  const count = contributions.filter((c) => c.sourceId === sourceId).length;
  if (count === 0) return { canDelete: true };
  return { canDelete: false, contributionCount: count };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Create a new Contribution.
 *
 * Performs structural validation first. If validation fails, throws an Error
 * listing all structural errors. Referential validation must be performed
 * separately by the caller before invoking this function.
 *
 * @param input     Fields supplied by the analyst.
 * @param now       ISO-8601 timestamp (injected for deterministic tests).
 */
export function createContribution(
  input: ContributionInput,
  now: string = new Date().toISOString()
): Contribution {
  const { valid, errors } = validateContribution(input);
  if (!valid) {
    throw new Error(`Contribution inválida: ${errors.join("; ")}`);
  }

  return {
    id: generateContributionId(),
    caseId: input.caseId.trim(),
    sourceId: input.sourceId.trim(),
    type: input.type,
    statement: input.statement.trim(),
    sourceExcerpt: input.sourceExcerpt.trim(),
    sourceLocation: input.sourceLocation,
    interpretation: input.interpretation?.trim() || undefined,
    relevance: input.relevance?.trim() || undefined,
    status: input.status ?? "draft",
    origin: input.origin ?? "human",
    confidence: input.confidence,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update mutable fields of a Contribution.
 * id, caseId, sourceId, and createdAt are immutable.
 *
 * @param contribution  Existing contribution (not mutated).
 * @param update        Partial fields to update.
 * @param now           ISO-8601 timestamp for updatedAt.
 */
export function updateContribution(
  contribution: Contribution,
  update: ContributionUpdate,
  now: string = new Date().toISOString()
): Contribution {
  const merged = {
    ...contribution,
    ...update,
    // Normalize string fields
    statement: ((update.statement ?? contribution.statement) || "").trim(),
    sourceExcerpt: ((update.sourceExcerpt ?? contribution.sourceExcerpt) || "").trim(),
    interpretation:
      update.interpretation !== undefined
        ? (update.interpretation?.trim() || undefined)
        : contribution.interpretation,
    relevance:
      update.relevance !== undefined
        ? (update.relevance?.trim() || undefined)
        : contribution.relevance,
    // Immutable fields
    id: contribution.id,
    caseId: contribution.caseId,
    sourceId: contribution.sourceId,
    createdAt: contribution.createdAt,
    updatedAt: now,
  };
  return merged;
}

/**
 * Attempt a status transition.
 *
 * Returns { success: true, contribution } on valid transition.
 * Returns { success: false, error } on invalid transition.
 */
export function changeContributionStatus(
  contribution: Contribution,
  newStatus: ContributionStatus,
  now: string = new Date().toISOString()
):
  | { success: true; contribution: Contribution }
  | { success: false; error: string } {
  const allowed = VALID_CONTRIBUTION_STATUS_TRANSITIONS[contribution.status];
  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error:
        `Transición no permitida: "${contribution.status}" → "${newStatus}". ` +
        `Permitidas desde "${contribution.status}": ${allowed.length ? allowed.join(", ") : "ninguna"}.`,
    };
  }
  return {
    success: true,
    contribution: { ...contribution, status: newStatus, updatedAt: now },
  };
}

/**
 * Remove a contribution by ID.
 * Returns the original array unchanged if the ID is not found.
 */
export function deleteContribution(
  contributions: Contribution[],
  id: string
): Contribution[] {
  const idx = contributions.findIndex((c) => c.id === id);
  if (idx === -1) return contributions;
  return [...contributions.slice(0, idx), ...contributions.slice(idx + 1)];
}

/**
 * Replace a contribution in the array by ID.
 * Returns the same reference if the ID is not found (no mutation).
 */
export function replaceContribution(
  contributions: Contribution[],
  updated: Contribution
): Contribution[] {
  const idx = contributions.findIndex((c) => c.id === updated.id);
  if (idx === -1) return contributions;
  const result = [...contributions];
  result[idx] = updated;
  return result;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Return all contributions associated with a specific source. */
export function getContributionsBySource(
  contributions: Contribution[],
  sourceId: string
): Contribution[] {
  return contributions.filter((c) => c.sourceId === sourceId);
}

/** Return all contributions associated with a specific case. */
export function getContributionsByCase(
  contributions: Contribution[],
  caseId: string
): Contribution[] {
  return contributions.filter((c) => c.caseId === caseId);
}

/** Return a contribution by ID, or undefined if not found. */
export function getContributionById(
  contributions: Contribution[],
  id: string
): Contribution | undefined {
  return contributions.find((c) => c.id === id);
}
