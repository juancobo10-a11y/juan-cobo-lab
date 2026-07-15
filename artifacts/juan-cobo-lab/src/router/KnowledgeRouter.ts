import type {
  RouterInput,
  RouterResult,
  PackCandidate,
  RoutingAlgorithm,
  KnowledgePack,
  PackMetadata,
} from "./types";
import { KeywordAlgorithm } from "./algorithms/KeywordAlgorithm";
import { REGISTRY, type RegistryEntry } from "./registry";
import { ROUTER_THRESHOLDS } from "./constants";
import { normalizeText } from "./utils";

// ─── Score guard ────────────────────────────────────────────────────────────

/**
 * Clamp an algorithm's returned score to [0, 1] and warn in development
 * if the value was out of range. Prevents algorithms that return raw
 * logits or cosine distances (unbounded) from silently breaking routing.
 */
function guardScore(score: number, packId: string): number {
  if (score >= 0 && score <= 1) return score;
  if (import.meta.env.DEV) {
    console.warn(
      `[HELIOS Router] Score out of range for pack "${packId}": ${score}. Clamping to [0, 1].`
    );
  }
  return Math.max(0, Math.min(1, score));
}

// ─── KnowledgeRouter ───────────────────────────────────────────────────────

/**
 * Instanciable router. Inject any RoutingAlgorithm implementation —
 * keyword matching today, embeddings or LLM tomorrow.
 *
 * Also accepts a custom registry (defaults to the production REGISTRY),
 * making isolated unit tests possible without touching the real packs.
 *
 * @example
 * // Production singleton (default)
 * import { heliosRouter } from "@/router/KnowledgeRouter";
 *
 * // Test with a mock registry
 * const router = new KnowledgeRouter(new KeywordAlgorithm(), mockRegistry);
 */
export class KnowledgeRouter {
  private readonly algorithm: RoutingAlgorithm;
  private readonly registry: RegistryEntry[];
  private readonly _cache = new Map<string, RouterResult>();

  constructor(
    algorithm: RoutingAlgorithm,
    registry: RegistryEntry[] = REGISTRY
  ) {
    this.algorithm = algorithm;
    this.registry = registry;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async route(input: RouterInput): Promise<RouterResult> {
    const cacheKey = normalizeText(input.texto);
    const cached = this._cache.get(cacheKey);
    if (cached) return cached;

    const result = await this._route(input);
    this._cache.set(cacheKey, result);
    return result;
  }

  /** Returns the metadata of every active pack (no content loaded). */
  getActivePacks(): PackMetadata[] {
    return this.registry
      .filter((e) => e.metadata.estado === "activo")
      .map((e) => e.metadata);
  }

  /** Clears the results cache. Useful in tests and after pack updates. */
  clearCache(): void {
    this._cache.clear();
  }

  // ── Internal routing logic ────────────────────────────────────────────────

  private async _route(input: RouterInput): Promise<RouterResult> {
    // 1. Only consider active packs
    const activePacks = this.registry.filter(
      (e) => e.metadata.estado === "activo"
    );

    if (activePacks.length === 0) {
      return { decision: "ninguno", candidatos: [] };
    }

    // 2. Score every active pack (metadata only — no content loaded yet)
    const scored = (
      await Promise.all(
        activePacks.map(async (entry) => {
          const { score: rawScore, terminosCoincidentes } =
            await this.algorithm.score(input, entry.metadata);
          const score = guardScore(rawScore, entry.metadata.id);
          return { entry, score, terminosCoincidentes };
        })
      )
    ).sort((a, b) => b.score - a.score);

    // 3. Filter out sub-threshold scores
    const aboveThreshold = scored.filter(
      (s) => s.score >= ROUTER_THRESHOLDS.ninguna
    );

    if (aboveThreshold.length === 0) {
      return { decision: "ninguno", candidatos: [] };
    }

    // 4. Load content for every candidate above threshold (lazy)
    const candidates: PackCandidate[] = await Promise.all(
      aboveThreshold.map(async ({ entry, score, terminosCoincidentes }) => {
        const content = await entry.load();
        const pack: KnowledgePack = { metadata: entry.metadata, ...content };
        const confianza =
          score >= ROUTER_THRESHOLDS.alta
            ? "alta"
            : score >= ROUTER_THRESHOLDS.baja
            ? "media"
            : "baja";
        return { pack, score, confianza, terminosCoincidentes };
      })
    );

    // 5. Detect tie between top candidates
    if (
      candidates.length >= 2 &&
      candidates[0].score - candidates[1].score <= ROUTER_THRESHOLDS.tieDelta
    ) {
      return {
        decision: "candidatos",
        candidatos: candidates,
        motivo: "empate",
      };
    }

    const winner = candidates[0];

    // 6. Baja confidence → ask user to confirm before proceeding
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

/** Pre-wired instance used by Helios. Import this to avoid re-instantiation. */
export const heliosRouter = new KnowledgeRouter(new KeywordAlgorithm());
