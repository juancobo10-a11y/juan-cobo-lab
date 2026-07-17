// ─── Domain types shared across the Thinking Engine ───────────────────────

// ─── Thinking Pattern schema ───────────────────────────────────────────────

/** Shape of each content/thinking/<pattern>/metadata.json */
export type ThinkingPatternMetadata = {
  id: string;
  titulo: string;
  descripcion: string;
  /** Method label — analogous to PackMetadata.tema */
  etiqueta: string;
  /** Activation terms — owned by the pattern, not the router */
  keywords: string[];
  /**
   * Short user-facing phrase describing what this pattern does.
   * Used by ExplanationService to build the "¿Por qué este patrón?"
   * sentence. Lives in JSON (ADR-0002); never constructed in code.
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
  /** Epistemic category: clarificacion | supuestos | evidencia | perspectivas | implicaciones | elementos | relaciones | retroalimentacion | efectos | dinamica */
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
  /**
   * Unique identifier of the Knowledge Pack that was selected — used as the
   * second component of the cache key so the same problem routed through
   * different packs produces distinct, correctly-enriched results.
   */
  packId?: string;
  /** Human-readable domain label (PackMetadata.tema) — added to scoring surface */
  packNombre?: string;
  /**
   * Summarised text from the pack's contexto — enriches keyword matching with
   * domain-specific vocabulary. Extracted via extractContextSummary() from
   * thinking/utils.ts, which cuts at sentence boundaries instead of mid-word.
   */
  packContextoResumido?: string;
};

/**
 * A single matched term with its provenance and weight.
 *
 * `superficie` records which component of the router input produced the
 * match — essential for ExplanationService to distinguish evidence from
 * the user's problem text vs. evidence from pack enrichment.
 */
export type ThinkingMatchedTerm = {
  termino: string;
  campo: "keyword" | "etiqueta" | "titulo" | "descripcion";
  peso: number;
  esFrase: boolean;
  /** Which router input surface this match was found in */
  superficie: "problema" | "packNombre" | "packContexto";
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
   * Subset of keyword terms identified as driving the selection.
   * Human-readable strings (e.g. "efectos indirectos", "supuestos").
   * Excludes generic policy terms (see NEUTRAL_TERMS in constants.ts).
   * Empty array when the pattern was selected by fallback.
   */
  dimensionesDetectadas: string[];
  /**
   * Primary evidence source for the selection:
   * - "problema"     → the user's problem text provided enough keyword signal.
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
  terminosCoincidentes: ThinkingMatchedTerm[];
  /**
   * True when the pattern was selected via the universalFloor boost, not by
   * its own keyword score. Use to surface "applied by default" vs "recommended
   * by direct match" in future transparency UI — do NOT infer by comparing
   * score === universalFloor numerically.
   */
  esFallback: boolean;
  /**
   * How the pattern was matched. Structured alternative to esFallback for
   * richer UI and future logging.
   *
   * - "coincidencia-directa": the problem text itself contained enough
   *   keyword signal (scoreProblema ≥ ninguna threshold).
   * - "contexto-del-pack": the problem text alone was weak, but pack
   *   enrichment (name or context) pushed the score above threshold.
   * - "fallback-universal": esUniversal=true and no specific pattern
   *   competed — universalFloor was applied.
   */
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
      /** All scored candidates for transparency */
      candidatos: ThinkingCandidate[];
      /**
       * Human-readable explanation of why this pattern was selected.
       * Built by ExplanationService — not constructed in UI code.
       */
      explicacionSeleccion: ExplicacionSeleccion;
    }
  | {
      decision: "candidatos";
      candidatos: ThinkingCandidate[];
      motivo: "empate" | "baja-confianza";
    }
  | {
      decision: "ninguno";
      /** Near-zero scored patterns, for debug/future use */
      candidatos: ThinkingCandidate[];
    };

// ─── Algorithm interface ───────────────────────────────────────────────────

/**
 * Stable extension point. Implement this to swap in embeddings, LLM
 * reranking, or any future scoring strategy — without touching
 * ThinkingRouter or any UI code.
 *
 * score() is async so implementations can call external APIs, run
 * local inference, or perform vector lookups without changing the
 * router.
 */
export interface ThinkingAlgorithm {
  score(
    input: ThinkingRouterInput,
    metadata: ThinkingPatternMetadata
  ): Promise<{
    /** Weighted composite score across all surfaces — the value used for routing */
    score: number;
    /**
     * Score computed from the problem text alone (before pack enrichment).
     * ThinkingRouter uses this to assign motivoSeleccion:
     *   ≥ ninguna → "coincidencia-directa"
     *   <  ninguna → "contexto-del-pack"  (pack pushed it above threshold)
     */
    scoreProblema: number;
    terminosCoincidentes: ThinkingMatchedTerm[];
  }>;
}
