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
    const cacheKey = normalizeText(
      input.contexto
        ? `${input.texto}::${input.contexto}`
        : input.texto
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

    // 2. Score every active pattern (metadata only — no content loaded yet)
    const scored = (
      await Promise.all(
        activePatterns.map(async (entry) => {
          const { score: rawScore, terminosCoincidentes } =
            await this.algorithm.score(input, entry.metadata);
          const score = guardScore(rawScore, entry.metadata.id);
          return { entry, score, terminosCoincidentes };
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
    // Universal patterns that already scored above `ninguna` on their own
    // keywords compete normally — no artificial boost applied.
    //
    // If at least one non-universal pattern is above threshold, universal
    // patterns get no floor boost: the specific pattern is more relevant.
    const hasSpecificAboveThreshold = scored.some(
      (s) => !s.entry.metadata.esUniversal && s.score >= THINKING_THRESHOLDS.ninguna
    );

    const withFloor = scored.map((s) => {
      if (
        s.entry.metadata.esUniversal &&
        s.score < THINKING_THRESHOLDS.ninguna &&
        !hasSpecificAboveThreshold
      ) {
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
      aboveThreshold.map(async ({ entry, score, terminosCoincidentes }) => {
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
        return { pattern, score, confianza, terminosCoincidentes };
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
