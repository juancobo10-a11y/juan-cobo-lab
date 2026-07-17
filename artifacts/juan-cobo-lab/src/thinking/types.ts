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

/** A single matched term with its provenance and weight */
export type ThinkingMatchedTerm = {
  termino: string;
  campo: "keyword" | "etiqueta" | "titulo" | "descripcion";
  peso: number;
  esFrase: boolean;
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
