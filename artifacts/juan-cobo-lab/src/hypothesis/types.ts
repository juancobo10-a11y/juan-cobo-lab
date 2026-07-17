/**
 * S-015 — Hypothesis Builder types
 *
 * ADR-0005: Una hipótesis debe ser explícita, contrastable y revisable.
 * Debe contener como mínimo: Condición/causa → Mecanismo → Resultado observable.
 *
 * Persistence: session-only (in-memory). Not persisted to any external store.
 * Risk: all hypotheses are lost on page reload.
 */

// ─── Core vocabulary ─────────────────────────────────────────────────────────

/**
 * Epistemic confidence level assigned by the analyst (not auto-generated).
 * ADR-0005: confidence is the analyst's judgment, not a system score.
 */
export type HypothesisConfidence =
  | "exploratoria"       // Plausible relation but little evidence yet
  | "plausible"          // Has partial arguments or evidence
  | "bien-sustentada";   // Sufficient empirical or theoretical grounding

export type HypothesisVariableRole =
  | "causa"
  | "resultado"
  | "mediadora"
  | "moderadora"
  | "control";

/**
 * Analytical variable attached to a hypothesis.
 * At minimum a hypothesis should have one "causa" and one "resultado".
 * Others are optional — their absence generates a warning, not an error.
 */
export interface HypothesisVariable {
  id: string;
  nombre: string;
  rol: HypothesisVariableRole;
  descripcion?: string;
}

/**
 * Deterministic status computed by HypothesisBuilderService.computeHypothesisStatus().
 * NOT driven by confidence level — an exploratory hypothesis can be "lista-para-contrastar".
 *
 * borrador               → has some fields but missing causa/mecanismo/resultado
 * incompleta             → has all three core fields but fails readiness check
 * lista-para-contrastar  → formulacion + core fields + variable causa + variable resultado + evidencia
 */
export type HypothesisStatus =
  | "borrador"
  | "incompleta"
  | "lista-para-contrastar";

/** A user-authored analytical hypothesis (ADR-0005 compliant) */
export interface PolicyHypothesis {
  id: string;
  titulo: string;

  /**
   * Full hypothesis statement. May be generated provisionally from
   * causa+mecanismo+resultado ("Cuando X, entonces Y, porque Z.") or
   * written manually. Never auto-overwritten without explicit user action.
   */
  formulacion: string;

  // ── Core causal structure ──────────────────────────────────────────────
  causa: string;
  mecanismo: string;
  resultadoEsperado: string;

  // ── Scope and evidence (optional but encouraged) ───────────────────────
  condiciones?: string;
  limites?: string;
  evidenciaNecesaria?: string;

  // ── Analytical inventory ───────────────────────────────────────────────
  variables: HypothesisVariable[];

  // ── Analyst judgment ──────────────────────────────────────────────────
  confianza: HypothesisConfidence;

  // ── Traceability ──────────────────────────────────────────────────────
  /**
   * Keys of reflection answers linked to this hypothesis.
   * Format matches PantallaPereque accordion keys: "single:N", "primary:N", "secondary:N".
   */
  sourceQuestionIds: string[];
  /**
   * IDs of the ThinkingPattern(s) this hypothesis was formulated under.
   * Preserves which lens(es) were used at creation time.
   */
  thinkingPatternIds: string[];

  /**
   * When true, this is the session's primary hypothesis.
   * At most one hypothesis in the session can have isPrimary = true.
   */
  isPrimary?: boolean;

  /**
   * Set by markPatternChanged() when the analyst returns to the selection
   * screen and picks a different pattern after this hypothesis was created.
   * Does NOT delete the hypothesis; prompts the analyst to review it.
   */
  patternChangedWarning?: boolean;

  // ── Timestamps ────────────────────────────────────────────────────────
  createdAt: string;  // ISO-8601
  updatedAt: string;  // ISO-8601
}

// ─── Validation ────────────────────────────────────────────────────────────────

/**
 * Result of validateHypothesis().
 *
 * errors   — block final confirmation (missing causa / mecanismo / resultado / formulacion)
 * warnings — non-blocking; shown inline; do not prevent saving
 * strengths — positive feedback shown to encourage completeness
 */
export interface HypothesisValidation {
  isComplete: boolean;
  errors: string[];
  warnings: string[];
  strengths: string[];
}

// ─── Reflection answers ───────────────────────────────────────────────────────

/**
 * A user's typed answer to a pereque question, captured in PantallaPereque.
 * answerText may be empty string (user skipped).
 *
 * questionKey matches the PantallaPereque accordion composite key so the Builder
 * can look up which question each answer corresponds to.
 */
export interface ReflectionAnswer {
  /** Composite key: "single:N" | "primary:N" | "secondary:N" */
  questionKey: string;
  /** The question text with {{problema}} interpolated */
  questionText: string;
  /** User's typed answer. Empty string = skipped. */
  answerText: string;
  /** ID of the ThinkingPattern this question belongs to */
  patternId: string;
  /** Human-readable title of the ThinkingPattern */
  patternTitulo: string;
  /** Epistemic category of the question (e.g. "supuestos", "incentivos") */
  categoria: string;
}

// ─── Full analysis session ────────────────────────────────────────────────────

/**
 * Complete in-memory representation of one HELIOS analysis session.
 * Preserves every layer from problem to hypotheses without overwriting.
 *
 * Traceability chain:
 *   problem → Router recommendation → user selection → reflection answers → hypotheses
 */
export interface HeliosAnalysisSession {
  problem: string;
  knowledgePackId?: string;

  thinkingResult: import("../thinking/types").ThinkingResult;
  thinkingUserSelection?: import("../thinking/types").ThinkingUserSelection;

  reflectionAnswers: ReflectionAnswer[];

  hypotheses: PolicyHypothesis[];
  primaryHypothesisId?: string;

  /** True once the analyst explicitly confirms the hypothesis set in PantallaRevisionHipotesis */
  hypothesesReviewed: boolean;
}

// ─── Hypothesis template (methodological scaffold — no domain knowledge) ───────

/**
 * A generic methodological template. Three are provided:
 *   causal, condicional, mecanismo-institucional.
 * None contain sector-specific knowledge (ADR-0002).
 */
export interface HypothesisTemplate {
  id: string;
  nombre: string;
  estructura: string;
  ejemplo: string;
}

export const HYPOTHESIS_TEMPLATES: HypothesisTemplate[] = [
  {
    id: "causal",
    nombre: "Plantilla causal",
    estructura: "Cuando X ocurre, Y cambia porque Z.",
    ejemplo: "Cuando los costos operativos superan la capacidad institucional, la provisión del servicio se deteriora porque los operadores no pueden cubrir los gastos corrientes.",
  },
  {
    id: "condicional",
    nombre: "Plantilla condicional",
    estructura: "El efecto de X sobre Y será mayor o menor cuando Z esté presente.",
    ejemplo: "El efecto de los subsidios sobre la cobertura será mayor cuando existan mecanismos de rendición de cuentas locales.",
  },
  {
    id: "mecanismo-institucional",
    nombre: "Plantilla de mecanismo institucional",
    estructura: "La política produce Y cuando los actores responden a X mediante Z.",
    ejemplo: "La política de acceso produce mayor adopción cuando los usuarios responden a los incentivos económicos mediante cambios en sus patrones de uso.",
  },
];
