import type {
  ThinkingRouterInput,
  ThinkingResult,
  ThinkingCandidate,
  ThinkingAlgorithm,
  ThinkingPattern,
  ThinkingPatternMetadata,
} from "./types";
import { KeywordThinkingAlgorithm } from "./algorithms/KeywordThinkingAlgorithm";
import { THINKING_REGISTRY, type ThinkingRegistryEntry } from "./registry";
import { THINKING_THRESHOLDS } from "./constants";
import { normalizeText } from "../router/utils";

// ─── Score guard ──────────────────────────────────────────────────────────

/**
 * Clamp an algorithm's returned score to [0, 1] and warn in development
 * if the value was out of range. Prevents unbounded scorers (logits,
 * cosine distances) from silently breaking routing decisions.
 */
function guardScore(score: number, patternId: string): number {
  if (score >= 0 && score <= 1) return score;
  if (import.meta.env.DEV) {
    console.warn(
      `[HELIOS ThinkingRouter] Score out of range for pattern "${patternId}": ${score}. Clamping to [0, 1].`
    );
  }
  return Math.max(0, Math.min(1, score));
}

// ─── ThinkingRouter ───────────────────────────────────────────────────────

/**
 * Instanciable Thinking Router. Inject any ThinkingAlgorithm implementation
 * — keyword matching today, embeddings or LLM tomorrow.
 *
 * Accepts a custom registry (defaults to the production THINKING_REGISTRY),
 * making isolated unit tests possible without touching production patterns.
 *
 * @example
 * // Production singleton (default)
 * import { heliosThinkingEngine } from "@/thinking/ThinkingRouter";
 *
 * // Test with a mock registry
 * const router = new ThinkingRouter(new KeywordThinkingAlgorithm(), mockRegistry);
 */
export class ThinkingRouter {
  private readonly algorithm: ThinkingAlgorithm;
  private readonly registry: ThinkingRegistryEntry[];
  private readonly _cache = new Map<string, ThinkingResult>();

  constructor(
    algorithm: ThinkingAlgorithm,
    registry: ThinkingRegistryEntry[] = THINKING_REGISTRY
  ) {
    this.algorithm = algorithm;
    this.registry = registry;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async route(input: ThinkingRouterInput): Promise<ThinkingResult> {
    // Cache key includes packId so the same problem text routed through
    // different Knowledge Packs produces distinct, correctly-enriched results.
    const cacheKey = normalizeText(
      `${input.texto}::${input.packId ?? "ninguno"}`
    );
    const cached = this._cache.get(cacheKey);
    if (cached) return cached;

    const result = await this._route(input);
    this._cache.set(cacheKey, result);
    return result;
  }

  /** Returns the metadata of every active thinking pattern (no content loaded). */
  getActivePatterns(): ThinkingPatternMetadata[] {
    return this.registry
      .filter((e) => e.metadata.estado === "activo")
      .map((e) => e.metadata);
  }

  /** Clears the results cache. Useful in tests and after pattern updates. */
  clearCache(): void {
    this._cache.clear();
  }

  // ── Internal routing logic ────────────────────────────────────────────────

  private async _route(input: ThinkingRouterInput): Promise<ThinkingResult> {
    // 1. Only consider active patterns
    const activePatterns = this.registry.filter(
      (e) => e.metadata.estado === "activo"
    );

    if (activePatterns.length === 0) {
      return { decision: "ninguno", candidatos: [] };
    }

    // 2. Score every active pattern (metadata only — no content loaded yet).
    //    The algorithm now returns scoreProblema alongside the composite score
    //    so ThinkingRouter can assign motivoSeleccion without re-running scoring.
    const scored = (
      await Promise.all(
        activePatterns.map(async (entry) => {
          const { score: rawScore, scoreProblema, terminosCoincidentes } =
            await this.algorithm.score(input, entry.metadata);
          const score = guardScore(rawScore, entry.metadata.id);
          return { entry, score, scoreProblema, terminosCoincidentes };
        })
      )
    ).sort((a, b) => b.score - a.score);

    // 3. Universal-floor fallback
    //
    // Universal patterns (esUniversal=true) are general analytical methods
    // that apply to any meaningful policy problem. When no domain-specific
    // pattern scored above the minimum threshold, the router promotes any
    // universal pattern to `universalFloor` so the engine has a response
    // instead of returning "ninguno".
    //
    // The floor condition uses `< baja` (0.20) rather than `< ninguna` (0.05)
    // because enriching the input with pack context can produce scores in the
    // [ninguna, baja) range via description-token matches — the floor ensures
    // the semantic contract of esUniversal:true holds regardless.
    //
    // With the v0.3 separate-surface scoring, universal patterns now receive
    // their score only from the problem text, so the dilution-by-context issue
    // is also fixed at the algorithm level. The `< baja` condition is kept as
    // a belt-and-suspenders guarantee.
    //
    // A universal pattern that already scored ≥ baja (0.20) via its own
    // keywords competes on equal footing with specific patterns.
    // A specific pattern must reach at least "baja" confidence (≥ 0.20) to
    // suppress the universal floor. Weak description-token matches (score in
    // the [ninguna, baja) range) are not meaningful enough to displace a
    // universal pattern that was designed to handle any policy problem.
    const hasSpecificAboveThreshold = scored.some(
      (s) => !s.entry.metadata.esUniversal && s.score >= THINKING_THRESHOLDS.baja
    );

    // Track which pattern IDs received the floor boost — used later to set
    // esFallback:true on the resulting ThinkingCandidate.
    const flooredIds = new Set<string>();

    const withFloor = scored.map((s) => {
      if (
        s.entry.metadata.esUniversal &&
        s.score < THINKING_THRESHOLDS.baja &&
        !hasSpecificAboveThreshold
      ) {
        flooredIds.add(s.entry.metadata.id);
        return { ...s, score: THINKING_THRESHOLDS.universalFloor };
      }
      return s;
    });

    // Re-sort after potential floor adjustments
    const aboveThreshold = withFloor
      .filter((s) => s.score >= THINKING_THRESHOLDS.ninguna)
      .sort((a, b) => b.score - a.score);

    if (aboveThreshold.length === 0) {
      return { decision: "ninguno", candidatos: [] };
    }

    // 4. Load content for every candidate above threshold (lazy)
    const candidates: ThinkingCandidate[] = await Promise.all(
      aboveThreshold.map(async ({ entry, score, scoreProblema, terminosCoincidentes }) => {
        const content = await entry.load();
        const pattern: ThinkingPattern = {
          metadata: entry.metadata,
          ...content,
        };
        const confianza =
          score >= THINKING_THRESHOLDS.alta
            ? "alta"
            : score >= THINKING_THRESHOLDS.baja
            ? "media"
            : "baja";

        // esFallback: explicit typed field — do NOT infer by comparing
        // score === universalFloor numerically.
        const esFallback = flooredIds.has(entry.metadata.id);

        // motivoSeleccion: structured alternative to esFallback for future UI.
        //   "fallback-universal"   → floor was applied; esUniversal=true won by default.
        //   "coincidencia-directa" → scoreProblema alone was above ninguna threshold.
        //   "contexto-del-pack"    → problem text alone was weak; pack enrichment
        //                            pushed the composite score above threshold.
        const motivoSeleccion: ThinkingCandidate["motivoSeleccion"] = esFallback
          ? "fallback-universal"
          : scoreProblema >= THINKING_THRESHOLDS.ninguna
          ? "coincidencia-directa"
          : "contexto-del-pack";

        return { pattern, score, confianza, terminosCoincidentes, esFallback, motivoSeleccion };
      })
    );

    // 5. Detect tie between top candidates
    if (
      candidates.length >= 2 &&
      candidates[0].score - candidates[1].score <= THINKING_THRESHOLDS.tieDelta
    ) {
      return {
        decision: "candidatos",
        candidatos: candidates,
        motivo: "empate",
      };
    }

    const winner = candidates[0];

    // 6. Baja confidence → let the caller handle disambiguation
    if (winner.confianza === "baja") {
      return {
        decision: "candidatos",
        candidatos: candidates,
        motivo: "baja-confianza",
      };
    }

    // 7. Clear winner (alta or media)
    return {
      decision: "seleccionado",
      seleccionado: winner,
      candidatos: candidates,
    };
  }
}

// ─── Default singleton ─────────────────────────────────────────────────────

/** Pre-wired instance used by HELIOS. Import this to avoid re-instantiation. */
export const heliosThinkingEngine = new ThinkingRouter(
  new KeywordThinkingAlgorithm()
);
