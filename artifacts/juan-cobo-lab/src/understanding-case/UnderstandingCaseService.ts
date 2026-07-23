/**
 * S-025 — UnderstandingCaseService
 *
 * Pure functions for creating, validating, and updating Understanding Cases.
 * No side effects. No storage access. All functions return new values.
 *
 * Synthesis: synthesizeCaseFromPayload() is used exclusively by the
 * 1.0.0 → 1.1.0 migration to build a compatible case from legacy payload data.
 */

import type {
  UnderstandingCase,
  UnderstandingCaseInput,
  UnderstandingCaseMigrationOrigin,
  UnderstandingCaseValidationResult,
} from "./types";

// ─── Validation ───────────────────────────────────────────────────────────────

const REQUIRED_FIELDS: Array<keyof UnderstandingCaseInput> = [
  "name",
  "understandingQuestion",
  "purpose",
  "domain",
];

/**
 * Validate the required fields of an UnderstandingCaseInput.
 * Returns { valid: true, errors: [] } on success.
 */
export function validateCase(
  input: Partial<UnderstandingCaseInput>
): UnderstandingCaseValidationResult {
  const errors: string[] = [];

  if (!input.name?.trim()) {
    errors.push("El nombre del caso es obligatorio.");
  }
  if (!input.understandingQuestion?.trim()) {
    errors.push("La pregunta de comprensión es obligatoria.");
  }
  if (!input.purpose?.trim()) {
    errors.push("El propósito es obligatorio.");
  }
  if (!input.domain?.trim()) {
    errors.push("El dominio es obligatorio.");
  }

  return { valid: errors.length === 0, errors };
}

// ─── Creation ─────────────────────────────────────────────────────────────────

/**
 * Create a new UnderstandingCase from user-supplied input.
 * Throws if required fields are missing or blank.
 */
export function createCase(input: UnderstandingCaseInput): UnderstandingCase {
  const validation = validateCase(input);
  if (!validation.valid) {
    throw new Error(
      `UnderstandingCase inválido: ${validation.errors.join(" ")}`
    );
  }

  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    understandingQuestion: input.understandingQuestion.trim(),
    purpose: input.purpose.trim(),
    domain: input.domain.trim(),
    scope: input.scope?.trim() || undefined,
    description: input.description?.trim() || undefined,
    status: input.status ?? "active",
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Return an updated copy of an existing case.
 * Only the provided fields are changed; id and createdAt are always preserved.
 * updatedAt is set to now.
 */
export function updateCase(
  existing: UnderstandingCase,
  updates: Partial<UnderstandingCaseInput>
): UnderstandingCase {
  const now = new Date().toISOString();
  return {
    ...existing,
    ...(updates.name !== undefined
      ? { name: updates.name.trim() }
      : {}),
    ...(updates.understandingQuestion !== undefined
      ? { understandingQuestion: updates.understandingQuestion.trim() }
      : {}),
    ...(updates.purpose !== undefined
      ? { purpose: updates.purpose.trim() }
      : {}),
    ...(updates.domain !== undefined
      ? { domain: updates.domain.trim() }
      : {}),
    ...(updates.scope !== undefined
      ? { scope: updates.scope.trim() || undefined }
      : {}),
    ...(updates.description !== undefined
      ? { description: updates.description.trim() || undefined }
      : {}),
    ...(updates.status !== undefined
      ? { status: updates.status }
      : {}),
    updatedAt: now,
  };
}

// ─── Synthesis (migration only) ───────────────────────────────────────────────

/**
 * Synthesize a minimal UnderstandingCase from a legacy payload's problema field.
 *
 * Used exclusively by the 1.0.0 → 1.1.0 schema migration. The returned case
 * carries a `migrationOrigin` marker so that:
 *   1. The UI can inform the user that the case was auto-generated.
 *   2. The case can be distinguished from user-created cases.
 *   3. No project is left without a case after migration.
 *
 * Name derivation:
 *   - Uses the first sentence (split on ., !, ?) up to 80 chars.
 *   - Falls back to first 60 chars of problema with ellipsis.
 *   - Falls back to "Caso importado" if problema is blank.
 */
export function synthesizeCaseFromPayload(
  problema: string,
  fromSchemaVersion: string
): UnderstandingCase {
  const now = new Date().toISOString();
  const trimmed = problema.trim();

  // Derive a short, readable name from the problema text
  const firstSentence = trimmed.split(/[.!?]/)[0]?.trim() ?? "";
  let caseName: string;
  if (firstSentence.length >= 4 && firstSentence.length <= 80) {
    caseName = firstSentence;
  } else if (trimmed.length >= 4) {
    caseName =
      trimmed.length <= 60
        ? trimmed
        : trimmed.slice(0, 60).trimEnd() + "…";
  } else {
    caseName = "Caso importado";
  }

  const migrationOrigin: UnderstandingCaseMigrationOrigin = {
    fromSchemaVersion,
    synthesizedAt: now,
    synthesizedFromProblema: trimmed,
  };

  return {
    id: crypto.randomUUID(),
    name: caseName,
    understandingQuestion:
      trimmed.length > 0 ? trimmed : "Sin especificar",
    purpose:
      "Caso sintetizado automáticamente desde un proyecto con esquema " +
      fromSchemaVersion +
      ". Edita este caso para registrar el propósito original del análisis.",
    domain: "Sin especificar",
    status: "active",
    createdAt: now,
    updatedAt: now,
    migrationOrigin,
  };
}

// ─── Predicates ───────────────────────────────────────────────────────────────

/**
 * Returns true if the case was synthesized by a schema migration
 * (i.e. it was not created directly by the user).
 */
export function isSynthesizedCase(c: UnderstandingCase): boolean {
  return c.migrationOrigin !== undefined;
}

/**
 * Returns a human-readable label for the case status.
 */
export const STATUS_LABELS: Record<UnderstandingCase["status"], string> = {
  draft: "Borrador",
  active: "Activo",
  "in-review": "En revisión",
  archived: "Archivado",
};
