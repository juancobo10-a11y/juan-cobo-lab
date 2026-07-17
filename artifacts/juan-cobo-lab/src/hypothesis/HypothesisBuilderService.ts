/**
 * S-015 — HypothesisBuilderService
 *
 * Pure functions for managing PolicyHypothesis objects.
 * No domain knowledge, no sector-specific logic, no LLM, no external calls.
 * ADR-0002 compliant: all decisions are generic methodological rules.
 *
 * ADR-0005: a hypothesis must be explicit, testable, and revisable.
 * Minimum: Condition/Cause → Mechanism → Observable Result.
 */

import type {
  PolicyHypothesis,
  HypothesisVariable,
  HypothesisVariableRole,
  HypothesisValidation,
  HypothesisStatus,
  ReflectionAnswer,
} from "./types";

// ─── Infrastructure constants ─────────────────────────────────────────────────

/** Minimum word count for a hypothesis formulacion before a brevity warning */
export const MIN_WORDS_FORMULACION = 6;

/** Recommendation threshold — NOT a hard limit */
export const MAX_RECOMMENDED_HYPOTHESES = 5;

/**
 * Vague terms that reduce testability when the hypothesis lacks an observable result.
 * Only trigger a warning when resultadoEsperado is also absent (§11).
 * Never treated as hard errors.
 */
export const VAGUE_TERMS = [
  "mejorar",
  "fortalecer",
  "optimizar",
  "adecuado",
  "importante",
  "significativo",
];

/**
 * Causal/conditional connectors. At least one should appear in the formulacion
 * for the hypothesis to express a testable relationship.
 * Deterministic heuristic — not NLP (§11).
 */
export const CAUSAL_CONNECTORS = [
  "cuando ",
  " si ",
  "si ",
  "entonces ",
  "porque ",
  "mediante ",
  " produce ",
  " afecta ",
  " aumenta ",
  " reduce ",
  " depende ",
];

// ─── ID generation ────────────────────────────────────────────────────────────

/** Session-scoped ID — suitable for in-memory use only */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ─── Creation ─────────────────────────────────────────────────────────────────

/**
 * Creates a new empty hypothesis.
 * Always generates a unique id and both timestamps.
 *
 * @param thinkingPatternIds Pattern IDs active when the hypothesis is created.
 *   Captures the analytical lens in use (ADR-0005 traceability).
 */
export function createEmptyHypothesis(
  thinkingPatternIds: string[] = []
): PolicyHypothesis {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    titulo: "",
    formulacion: "",
    causa: "",
    mecanismo: "",
    resultadoEsperado: "",
    variables: [],
    confianza: "exploratoria",
    sourceQuestionIds: [],
    thinkingPatternIds,
    isPrimary: false,
    patternChangedWarning: false,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Returns a new hypothesis with updated fields and a refreshed updatedAt.
 * Pure — does not mutate the input.
 */
export function updateHypothesis(
  h: PolicyHypothesis,
  fields: Partial<Omit<PolicyHypothesis, "id" | "createdAt">>
): PolicyHypothesis {
  return { ...h, ...fields, updatedAt: new Date().toISOString() };
}

// ─── Formulacion builder ──────────────────────────────────────────────────────

/**
 * Builds a provisional "Cuando X, entonces Y, porque Z." formulation from
 * the three core fields.
 *
 * Returns "" if any field is missing — never writes to the hypothesis automatically.
 * The UI decides when to offer this to the user; the user must confirm (ADR-0005,
 * Case 3: manual text must not be overwritten without authorization).
 */
export function buildProvisionalFormulacion(
  causa: string,
  mecanismo: string,
  resultado: string
): string {
  const c = causa.trim();
  const m = mecanismo.trim();
  const r = resultado.trim();
  if (!c || !m || !r) return "";
  // Lowercase first character so the text flows naturally after "Cuando"
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  return `Cuando ${lower(c)}, entonces ${lower(r)}, porque ${lower(m)}.`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates a hypothesis against ADR-0005 rules and methodological heuristics (§11).
 *
 * errors   — block final confirmation; must be resolved before the analyst can
 *            mark the set as "revisado". Do NOT prevent saving a draft.
 * warnings — advisory; shown inline; do not block any action.
 * strengths — positive indicators to encourage completeness.
 */
export function validateHypothesis(h: PolicyHypothesis): HypothesisValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const strengths: string[] = [];

  // ── Errors (§10 — block final confirmation only) ──────────────────────
  if (!h.formulacion.trim()) {
    errors.push("La hipótesis no tiene formulación.");
  }
  if (!h.causa.trim()) {
    errors.push("Falta la causa o condición.");
  }
  if (!h.mecanismo.trim()) {
    errors.push("Falta el mecanismo explicativo.");
  }
  if (!h.resultadoEsperado.trim()) {
    errors.push("Falta el resultado esperado.");
  }

  // ── Variable warnings (§8) ─────────────────────────────────────────────
  const hasCausaVar = h.variables.some((v) => v.rol === "causa");
  const hasResultVar = h.variables.some((v) => v.rol === "resultado");
  if (!hasCausaVar) {
    warnings.push("No se identificó una variable causa.");
  }
  if (!hasResultVar) {
    warnings.push("No se identificó una variable resultado.");
  }

  // ── Scope warnings (§10) ──────────────────────────────────────────────
  if (!h.condiciones?.trim()) {
    warnings.push("No se registraron condiciones de aplicabilidad.");
  }
  if (!h.evidenciaNecesaria?.trim()) {
    warnings.push("No se registró evidencia necesaria para contrastar.");
  }
  if (h.sourceQuestionIds.length === 0) {
    warnings.push("No se vinculó ninguna pregunta de la reflexión previa.");
  }

  // ── Heuristic quality checks (§11) ────────────────────────────────────
  const ftext = h.formulacion.trim();
  if (ftext) {
    const wordCount = ftext.split(/\s+/).filter(Boolean).length;
    if (wordCount < MIN_WORDS_FORMULACION) {
      warnings.push(
        `La formulación es muy breve (${wordCount} palabra${wordCount === 1 ? "" : "s"}). ` +
          `Se recomienda al menos ${MIN_WORDS_FORMULACION}.`
      );
    }

    const ftextLC = ftext.toLowerCase();
    const hasConnector = CAUSAL_CONNECTORS.some((c) => ftextLC.includes(c));
    if (!hasConnector) {
      warnings.push(
        "La formulación no expresa explícitamente una relación causal o condicional. " +
          "Considera añadir conectores como cuando, si, entonces, porque, produce."
      );
    }

    const hasVague = VAGUE_TERMS.some((t) => ftextLC.includes(t));
    if (hasVague && !h.resultadoEsperado.trim()) {
      const found = VAGUE_TERMS.filter((t) => ftextLC.includes(t)).slice(0, 2);
      warnings.push(
        `La formulación contiene términos poco contrastables (${found.join(", ")}) ` +
          "sin un resultado observable claro."
      );
    }
  }

  // ── Strengths ─────────────────────────────────────────────────────────
  const coreComplete =
    ftext && h.causa.trim() && h.mecanismo.trim() && h.resultadoEsperado.trim();
  if (coreComplete) {
    strengths.push("Tiene formulación, causa, mecanismo y resultado.");
  }
  if (hasCausaVar && hasResultVar) {
    strengths.push("Identifica variables causa y resultado.");
  }
  if (h.evidenciaNecesaria?.trim()) {
    strengths.push("Especifica la evidencia necesaria para contrastar.");
  }
  if (h.condiciones?.trim()) {
    strengths.push("Define condiciones de aplicabilidad.");
  }
  if (h.sourceQuestionIds.length > 0) {
    strengths.push(
      `Vinculada a ${h.sourceQuestionIds.length} pregunta${h.sourceQuestionIds.length === 1 ? "" : "s"} de reflexión.`
    );
  }
  if (h.limites?.trim()) {
    strengths.push("Registra límites de aplicación.");
  }

  return {
    isComplete: errors.length === 0,
    errors,
    warnings,
    strengths,
  };
}

// ─── Status computation ───────────────────────────────────────────────────────

/**
 * Computes the deterministic status of a hypothesis (§15).
 * Does NOT use confidence level — an exploratoria hypothesis can be lista-para-contrastar.
 */
export function computeHypothesisStatus(h: PolicyHypothesis): HypothesisStatus {
  const coreComplete =
    h.causa.trim() && h.mecanismo.trim() && h.resultadoEsperado.trim();
  if (!coreComplete) return "borrador";

  const hasCausaVar = h.variables.some((v) => v.rol === "causa");
  const hasResultVar = h.variables.some((v) => v.rol === "resultado");
  const hasFormulacion = !!h.formulacion.trim();
  const hasEvidencia = !!h.evidenciaNecesaria?.trim();

  if (hasFormulacion && hasCausaVar && hasResultVar && hasEvidencia) {
    return "lista-para-contrastar";
  }
  return "incompleta";
}

// ─── Duplication ──────────────────────────────────────────────────────────────

/**
 * Duplicates a hypothesis, assigning a new id and timestamps.
 * Title gets a " (copia)" suffix if present.
 * isPrimary is always false on duplicates (§12).
 */
export function duplicateHypothesis(h: PolicyHypothesis): PolicyHypothesis {
  const now = new Date().toISOString();
  return {
    ...h,
    id: generateId(),
    titulo: h.titulo ? `${h.titulo} (copia)` : "",
    isPrimary: false,
    patternChangedWarning: false,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Ordering ─────────────────────────────────────────────────────────────────

/**
 * Moves a hypothesis one position up or down in the list.
 * Returns the original array unchanged if movement is out of bounds.
 */
export function moveHypothesis(
  hypotheses: PolicyHypothesis[],
  id: string,
  direction: "up" | "down"
): PolicyHypothesis[] {
  const idx = hypotheses.findIndex((h) => h.id === id);
  if (idx === -1) return hypotheses;
  const newIdx = direction === "up" ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= hypotheses.length) return hypotheses;
  const result = [...hypotheses];
  [result[idx], result[newIdx]] = [result[newIdx], result[idx]];
  return result;
}

// ─── Primary hypothesis ───────────────────────────────────────────────────────

/**
 * Sets exactly one hypothesis as primary.
 * Unsets isPrimary on all others (§12 — at most one primary).
 */
export function setPrimaryHypothesis(
  hypotheses: PolicyHypothesis[],
  id: string
): PolicyHypothesis[] {
  return hypotheses.map((h) => ({ ...h, isPrimary: h.id === id }));
}

// ─── Removal ──────────────────────────────────────────────────────────────────

/**
 * Removes a hypothesis by id.
 * Returns an array without the target; does not affect others.
 */
export function removeHypothesis(
  hypotheses: PolicyHypothesis[],
  id: string
): PolicyHypothesis[] {
  return hypotheses.filter((h) => h.id !== id);
}

// ─── Pattern change ───────────────────────────────────────────────────────────

/**
 * Marks all existing hypotheses with patternChangedWarning = true.
 * Called when the analyst changes the ThinkingPattern after hypotheses were created (§18).
 * Does NOT delete any hypothesis.
 */
export function markPatternChanged(
  hypotheses: PolicyHypothesis[]
): PolicyHypothesis[] {
  return hypotheses.map((h) => ({ ...h, patternChangedWarning: true }));
}

// ─── Linked answer helpers ────────────────────────────────────────────────────

/** How many reflection answers are linked to this hypothesis */
export function countLinkedAnswers(h: PolicyHypothesis): number {
  return h.sourceQuestionIds.length;
}

/**
 * Links a reflection answer to a hypothesis by adding its questionKey to
 * sourceQuestionIds (if not already present). Pure — returns new hypothesis.
 */
export function linkReflectionAnswer(
  h: PolicyHypothesis,
  questionKey: string
): PolicyHypothesis {
  if (h.sourceQuestionIds.includes(questionKey)) return h;
  return updateHypothesis(h, {
    sourceQuestionIds: [...h.sourceQuestionIds, questionKey],
  });
}

/**
 * Unlinks a reflection answer from a hypothesis.
 */
export function unlinkReflectionAnswer(
  h: PolicyHypothesis,
  questionKey: string
): PolicyHypothesis {
  return updateHypothesis(h, {
    sourceQuestionIds: h.sourceQuestionIds.filter((k) => k !== questionKey),
  });
}

// ─── Variable helpers ─────────────────────────────────────────────────────────

/** Creates a new variable with a unique id */
export function createVariable(
  nombre: string,
  rol: HypothesisVariableRole,
  descripcion?: string
): HypothesisVariable {
  return { id: generateId(), nombre, rol, descripcion };
}

/** Removes a variable by id from a hypothesis */
export function removeVariable(
  h: PolicyHypothesis,
  variableId: string
): PolicyHypothesis {
  return updateHypothesis(h, {
    variables: h.variables.filter((v) => v.id !== variableId),
  });
}

/** Updates a variable field within a hypothesis */
export function updateVariable(
  h: PolicyHypothesis,
  variableId: string,
  fields: Partial<Omit<HypothesisVariable, "id">>
): PolicyHypothesis {
  return updateHypothesis(h, {
    variables: h.variables.map((v) =>
      v.id === variableId ? { ...v, ...fields } : v
    ),
  });
}

// ─── Readiness heuristics ─────────────────────────────────────────────────────

/**
 * Returns true if the set of hypotheses is too large to manage comfortably.
 * Triggers a non-blocking recommendation (§12).
 */
export function exceedsRecommendedCount(hypotheses: PolicyHypothesis[]): boolean {
  return hypotheses.length > MAX_RECOMMENDED_HYPOTHESES;
}

/**
 * Returns a filtered view of reflection answers that have non-empty text.
 * Used in the Builder to show only meaningful answers as inputs.
 */
export function getAnsweredReflections(
  reflectionAnswers: ReflectionAnswer[]
): ReflectionAnswer[] {
  return reflectionAnswers.filter((r) => r.answerText.trim().length > 0);
}

/**
 * Returns the primary hypothesis, or the first one if none is marked primary.
 * Returns null for empty arrays.
 */
export function getPrimaryHypothesis(
  hypotheses: PolicyHypothesis[]
): PolicyHypothesis | null {
  if (hypotheses.length === 0) return null;
  return hypotheses.find((h) => h.isPrimary) ?? hypotheses[0];
}
