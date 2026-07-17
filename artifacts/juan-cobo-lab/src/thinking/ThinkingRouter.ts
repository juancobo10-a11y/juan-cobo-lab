import type {
  ThinkingRouterInput,
  ThinkingResult,
  ThinkingCandidate,
  ThinkingAlgorithm,
  ThinkingPattern,
  ThinkingPatternMetadata,
} from "./types";
import { ConceptualThinkingAlgorithm } from "./algorithms/ConceptualThinkingAlgorithm";
import { THINKING_REGISTRY, type ThinkingRegistryEntry } from "./registry";
import { THINKING_THRESHOLDS } from "./constants";
import { normalizeText } from "../router/utils";
import { buildExplicacionSeleccion } from "./ExplanationService";

// ─── Score guard ──────────────────────────────────────────────────────────

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
 * — conceptual keyword matching today, embeddings or LLM tomorrow.
 *
 * Accepts a custom registry (defaults to the production THINKING_REGISTRY),
 * making isolated unit tests possible without touching production patterns.
 *
 * @example
 * // Production singleton (default)
 * import { heliosThinkingEngine } from "@/thinking/ThinkingRouter";
 *
 * // Test with a mock registry
 * const router = new ThinkingRouter(new ConceptualThinkingAlgorithm(), mockRegistry);
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
      `${input.texto}::${input.packId ?? "ninguno"}`
    );
    const cached = this._cache.get(cacheKey);
    if (cached) return cached;

    const result = await this._route(input);
    this._cache.set(cacheKey, result);
    return result;
  }

  getActivePatterns(): ThinkingPatternMetadata[] {
    return this.registry
      .filter((e) => e.metadata.estado === "activo")
      .map((e) => e.metadata);
  }

  clearCache(): void {
    this._cache.clear();
  }

  // ── Internal routing logic ────────────────────────────────────────────────

  private async _route(input: ThinkingRouterInput): Promise<ThinkingResult> {
    const activePatterns = this.registry.filter(
      (e) => e.metadata.estado === "activo"
    );

    if (activePatterns.length === 0) {
      return { decision: "ninguno", candidatos: [] };
    }

    // Score every active pattern
    const scored = (
      await Promise.all(
        activePatterns.map(async (entry) => {
          const { score: rawScore, scoreProblema, conceptMatches } =
            await this.algorithm.score(input, entry.metadata);
          const score = guardScore(rawScore, entry.metadata.id);
          return { entry, score, scoreProblema, conceptMatches };
        })
      )
    ).sort((a, b) => b.score - a.score);

    // Universal-floor fallback
    const hasSpecificAboveThreshold = scored.some(
      (s) => !s.entry.metadata.esUniversal && s.score >= THINKING_THRESHOLDS.baja
    );

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

    // ── Signal protection (S-013) ────────────────────────────────────────────
    //
    // Rule: when any pattern's problem-text score alone (scoreProblema) reaches
    // the "baja" threshold, the pack context must NOT displace that pattern as
    // the winner. The pack may reinforce, increase confidence, or break a tie
    // among patterns that all have a strong problem signal — but it cannot
    // override a pattern whose problem signal is already sufficient on its own.
    //
    // Implementation: patterns with scoreProblema >= baja are ordered first
    // (by problem score), then the rest follow by combined score. This leaves
    // the combined score intact for confidence and explanation calculations.
    //
    // Why "baja" (0.20) as the protection threshold?
    //   It matches the threshold used to qualify a specialized pattern candidate.
    //   If a problem signal is strong enough to activate a specialized pattern
    //   on its own, it is strong enough to be protected from pack displacement.
    const problemDominant = withFloor
      .filter((s) => (s.scoreProblema ?? 0) >= THINKING_THRESHOLDS.baja)
      .sort((a, b) => (b.scoreProblema ?? 0) - (a.scoreProblema ?? 0));

    const orderedScored =
      problemDominant.length > 0
        ? [
            ...problemDominant,
            ...withFloor
              .filter(
                (s) =>
                  !problemDominant.some(
                    (p) => p.entry.metadata.id === s.entry.metadata.id
                  )
              )
              .sort((a, b) => b.score - a.score),
          ]
        : withFloor;

    const aboveThreshold = orderedScored
      .filter((s) => s.score >= THINKING_THRESHOLDS.ninguna);

    if (aboveThreshold.length === 0) {
      return { decision: "ninguno", candidatos: [] };
    }

    // Load content for every candidate above threshold (lazy)
    const candidates: ThinkingCandidate[] = await Promise.all(
      aboveThreshold.map(async ({ entry, score, scoreProblema, conceptMatches }) => {
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

        const esFallback = flooredIds.has(entry.metadata.id);

        const motivoSeleccion: ThinkingCandidate["motivoSeleccion"] = esFallback
          ? "fallback-universal"
          : scoreProblema >= THINKING_THRESHOLDS.ninguna
          ? "coincidencia-directa"
          : "contexto-del-pack";

        return { pattern, score, confianza, conceptMatches, esFallback, motivoSeleccion };
      })
    );

    // Tie detection
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

    // Baja confidence → caller handles disambiguation
    if (winner.confianza === "baja") {
      return {
        decision: "candidatos",
        candidatos: candidates,
        motivo: "baja-confianza",
      };
    }

    // Clear winner → build explanation and return
    const explicacionSeleccion = buildExplicacionSeleccion(winner, input);

    return {
      decision: "seleccionado",
      seleccionado: winner,
      candidatos: candidates,
      explicacionSeleccion,
    };
  }
}

// ─── Default singleton ─────────────────────────────────────────────────────

export const heliosThinkingEngine = new ThinkingRouter(
  new ConceptualThinkingAlgorithm()
);
