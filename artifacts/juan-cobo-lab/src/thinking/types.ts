// ─── Domain types shared across the Thinking Engine ───────────────────────

// ─── Conceptual knowledge model (S-011) ──────────────────────────────────
//
// Each Thinking Pattern's knowledge is expressed as an array of ThinkingConcept
// objects. A concept groups semantically related signals (terms, synonyms,
// fixed expressions) under a single human-readable name. The algorithm is
// generic: it iterates over any pattern's conceptos without knowing which
// pattern it is.
//
// Why three tiers (terminos / sinonimos / expresiones)?
//   expresiones  — full multi-word phrases; highest discrimination power (0.55)
//   terminos     — primary single-token or short-phrase terms;  medium power (0.35)
//   sinonimos    — paraphrases and weaker synonyms; lower power (0.20)
//
// ADR-0002: all entries in these lists live in metadata.json — never in TS.

/**
 * A single conceptual family within a Thinking Pattern.
 * Aggregates semantically related signals at three weight tiers.
 */
export type ThinkingConcept = {
  /** Machine-readable identifier — used as dedup key in ExplanationService */
  id: string;
  /** Human-readable name shown in the UI (e.g. "Retroalimentación") */
  nombre: string;
  /** One-sentence description of what this concept captures */
  descripcion: string;
  /**
   * Maximum score contribution of this concept — acts as a ceiling so a
   * concept with many matching terms cannot dominate the score alone.
   * Defaults to 0.40 in the algorithm if absent.
   */
  peso?: number;
  /** Primary terms — single tokens or short phrases (weight: 0.35) */
  terminos: string[];
  /** Paraphrases and weaker synonyms (weight: 0.20) */
  sinonimos: string[];
  /** Multi-word fixed expressions — highest discrimination (weight: 0.55) */
  expresiones: string[];
  /**
   * Reserved for future use: contextual signals that increase confidence
   * when present alongside other concept matches.
   */
  indicadores?: string[];
  /**
   * Reserved for future use: signals that lower confidence when present
   * (e.g. "evidencia anecdótica" would contra-indicate "Evidencia sólida").
   */
  contraIndicadores?: string[];
};

/**
 * A single concept match produced by ConceptualThinkingAlgorithm.
 * Replaces ThinkingMatchedTerm (which was tied to the flat-keyword model).
 *
 * All fields are suitable for logging and traceability but MUST NOT be
 * exposed directly in the UI — ExplanationService is the only consumer
 * that should translate these into user-facing language.
 */
export type ThinkingConceptMatch = {
  /** Concept id — used for deduplication in ExplanationService */
  conceptId: string;
  /** Human-readable concept name (from ThinkingConcept.nombre) */
  conceptName: string;
  /** The exact original text that matched (for debug / traceability) */
  matchedText: string;
  /** Which tier of the concept triggered the match */
  matchType: "termino" | "sinonimo" | "expresion";
  /** Which component of the router input contained the match */
  surface: "problema" | "packNombre" | "packContexto";
  /** Effective weight of this specific match (after diminishing returns) */
  weight: number;
};

/**
 * A single matched term with its provenance and weight.
 *
 * @deprecated since S-011 — use ThinkingConceptMatch instead.
 * Kept only to avoid breaking the legacy KeywordThinkingAlgorithm path
 * for patterns that have not yet been migrated to the conceptos model.
 * Will be removed once all patterns use conceptos.
 */
export type ThinkingMatchedTerm = {
  termino: string;
  campo: "keyword" | "etiqueta" | "titulo" | "descripcion";
  peso: number;
  esFrase: boolean;
  /** Which router input surface this match was found in */
  superficie: "problema" | "packNombre" | "packContexto";
};

// ─── Thinking Pattern schema ───────────────────────────────────────────────

/** Shape of each content/thinking/<pattern>/metadata.json */
export type ThinkingPatternMetadata = {
  id: string;
  titulo: string;
  descripcion: string;
  /** Method label — analogous to PackMetadata.tema */
  etiqueta: string;
  /**
   * Conceptual knowledge model (S-011) — primary knowledge representation.
   * When present, the ConceptualThinkingAlgorithm uses this for scoring.
   * Required for all new and migrated patterns; optional only during migration.
   */
  conceptos?: ThinkingConcept[];
  /**
   * @deprecated since S-011 — superseded by conceptos.
   * Retained for legacy patterns (e.g. test mocks) that have not been
   * migrated. Will be removed in a future sprint once all patterns use
   * conceptos. If conceptos is present, keywords is ignored by the algorithm.
   */
  keywords?: string[];
  /**
   * Short user-facing phrase describing what this pattern does.
   * Used by ExplanationService to build the "¿Por qué este patrón?"
   * sentence. Lives in JSON (ADR-0002).
   *
   * @example "examinar la solidez del diagnóstico y los supuestos"
   * @example "observar cómo funciona el sistema en su conjunto"
   */
  enfoqueBreve?: string;
  version: string;
  estado: "activo" | "borrador" | "inactivo";
  /**
   * When true, the pattern applies to any meaningful policy problem —
   * the ThinkingRouter uses it as a fallback when no domain-specific
   * pattern scores above the minimum threshold.
   */
  esUniversal?: boolean;
  // ── Provenance fields ──────────────────────────────────────────────────────
  autor: string;
  institucion: string;
  ultimaActualizacion: string;
  fuentes: string[];
  licencia: string;
  estadoRevision: "experimental" | "revisado" | "validado";
};

/** A single question within a thinking pattern */
export type ThinkingQuestion = {
  numero: number;
  /** Epistemic category */
  categoria: string;
  /** Question template — may include {{problema}} placeholder */
  pregunta: string;
  /** Why this question matters in the analytical process */
  proposito: string;
  /** How to approach answering it */
  orientacion: string;
};

/** Fully-loaded pattern ready for HELIOS to consume */
export type ThinkingPattern = {
  metadata: ThinkingPatternMetadata;
  preguntas: ThinkingQuestion[];
};

// ─── Router I/O ────────────────────────────────────────────────────────────

export type ThinkingRouterInput = {
  /** The policy problem text */
  texto: string;
  packId?: string;
  /** Human-readable domain label (PackMetadata.tema) */
  packNombre?: string;
  /** Summarised text from the pack's contexto */
  packContextoResumido?: string;
};

// ─── Explanation ───────────────────────────────────────────────────────────

/**
 * Human-readable explanation of why a pattern was selected.
 * Built by ExplanationService from ThinkingCandidate + input — never
 * constructed in Helios.tsx. Must not expose scores, weights, or
 * internal constant names.
 */
export type ExplicacionSeleccion = {
  /**
   * One or two complete sentences suitable for display to a non-technical
   * user. References only concepts the router actually detected.
   */
  resumen: string;
  /**
   * Human-readable concept names identified as driving the selection
   * (e.g. "Retroalimentación", "Supuestos", "Interdependencia").
   * Empty array when the pattern was selected by fallback.
   *
   * S-011: these are concept names (ThinkingConcept.nombre), not raw
   * keyword tokens. They are always legible to non-technical users.
   */
  dimensionesDetectadas: string[];
  /**
   * Primary evidence source for the selection:
   * - "problema"     → the user's problem text provided enough signal.
   * - "contexto-pack"→ the problem text alone was weak; pack context drove it.
   * - "mixta"        → both the problem text and pack context contributed.
   * - "fallback"     → no pattern scored high enough; universal floor applied.
   */
  fuentePrincipal: "problema" | "contexto-pack" | "mixta" | "fallback";
};

/** A scored candidate pattern, ready for display or selection */
export type ThinkingCandidate = {
  pattern: ThinkingPattern;
  score: number;
  confianza: "alta" | "media" | "baja";
  /**
   * All concept matches that contributed to this candidate's score.
   * Ordered: problema matches first, then packNombre, then packContexto.
   * Used by ExplanationService to build dimensionesDetectadas and determine
   * fuentePrincipal without re-running the algorithm.
   *
   * S-011: replaces terminosCoincidentes (flat-keyword model).
   */
  conceptMatches: ThinkingConceptMatch[];
  /**
   * True when the pattern was selected via the universalFloor boost, not
   * by its own concept score. Do NOT infer by comparing score numerically.
   */
  esFallback: boolean;
  motivoSeleccion: "coincidencia-directa" | "contexto-del-pack" | "fallback-universal";
};

/**
 * Three distinct decisions the Thinking Router can return:
 *
 * - "seleccionado": one clear winner (alta or media confidence, no tie)
 * - "candidatos":   tie or baja confidence — caller must handle disambiguation
 * - "ninguno":      no pattern scored above minimum threshold
 */
export type ThinkingResult =
  | {
      decision: "seleccionado";
      seleccionado: ThinkingCandidate;
      candidatos: ThinkingCandidate[];
      explicacionSeleccion: ExplicacionSeleccion;
    }
  | {
      decision: "candidatos";
      candidatos: ThinkingCandidate[];
      motivo: "empate" | "baja-confianza";
    }
  | {
      decision: "ninguno";
      candidatos: ThinkingCandidate[];
    };

// ─── Algorithm interface ───────────────────────────────────────────────────

/**
 * Stable extension point. Implement this to swap in embeddings, LLM
 * reranking, or any future scoring strategy — without touching
 * ThinkingRouter or any UI code.
 *
 * S-011: score() now returns conceptMatches (ThinkingConceptMatch[]) instead
 * of terminosCoincidentes (ThinkingMatchedTerm[]). Implementations that have
 * not migrated to the conceptual model must wrap their output accordingly.
 */
export interface ThinkingAlgorithm {
  score(
    input: ThinkingRouterInput,
    metadata: ThinkingPatternMetadata
  ): Promise<{
    /** Weighted composite score across all surfaces */
    score: number;
    /** Score from the problem text alone — used to assign motivoSeleccion */
    scoreProblema: number;
    /** All concept matches across all surfaces, problema surface first */
    conceptMatches: ThinkingConceptMatch[];
  }>;
}
