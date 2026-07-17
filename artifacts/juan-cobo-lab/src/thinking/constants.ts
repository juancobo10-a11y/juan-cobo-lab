/**
 * Thinking Router thresholds — single source of truth.
 *
 * Import from here in both ThinkingRouter and tests.
 * Never duplicate these values elsewhere.
 */
export const THINKING_THRESHOLDS = {
  /** Minimum score to appear as a candidate at all */
  ninguna: 0.05,
  /** Below this → baja confidence → caller must handle */
  baja: 0.20,
  /** At or above this → alta confidence → auto-select */
  alta: 0.40,
  /**
   * If top-1 and top-2 are within this delta, treat as a tie
   * rather than picking arbitrarily.
   */
  tieDelta: 0.08,
  /**
   * Guaranteed minimum score applied to universal patterns (esUniversal=true)
   * when no domain-specific pattern scored above the ninguna threshold.
   *
   * Set at baja+0.05 so universal patterns receive "media" confidence and
   * auto-select cleanly when they are the only available option, without
   * competing against specific patterns that matched on their own merit.
   *
   * The floor is applied when score < baja (0.20), not only when score < ninguna,
   * because enriching the input with pack context can produce scores in the
   * [ninguna, baja) range even for universal patterns — the floor preserves the
   * semantic contract of esUniversal: true.
   */
  universalFloor: 0.25,
} as const;

export type ThinkingThresholds = typeof THINKING_THRESHOLDS;

// ─── Contextual scoring weights (v0.3) ────────────────────────────────────────
//
// Three scoring surfaces are computed independently and combined with these
// weights. The user's problem text is always the primary signal. Pack context
// enriches the score without penalising patterns that already match the problem.
//
// Formula:
//   finalScore = min(
//     scoreProblema     * problemWeight     +   // ← primary signal
//     scoreNombrePack   * packNameWeight    +   // ← domain label enrichment
//     scoreContextoPack * packContextWeight,    // ← contextual vocabulary
//     1.0
//   )
//
// Each component score is normalised to [0, 1] against its own token count,
// so adding more context never dilutes the problem score.
export const SCORING_WEIGHTS = {
  /** Primary signal — the problem text written by the user */
  problemWeight: 1.0,
  /** Domain label enrichment — pack's human-readable name */
  packNameWeight: 0.35,
  /** Contextual vocabulary enrichment — summarised pack context */
  packContextWeight: 0.50,
} as const;

export type ScoringWeights = typeof SCORING_WEIGHTS;

// ─── Context summary ──────────────────────────────────────────────────────────
//
// Maximum characters extracted from a Knowledge Pack's contexto.texto when
// building packContextoResumido. extractContextSummary() in thinking/utils.ts
// uses this constant and cuts preferentially at a sentence boundary.
export const CONTEXT_SUMMARY_CHARS = 300 as const;
