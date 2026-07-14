import type {
  RouterInput,
  RouterResult,
  PackCandidate,
  RoutingAlgorithm,
  KnowledgePack,
} from "./types";
import { KeywordAlgorithm } from "./algorithms/KeywordAlgorithm";
import { REGISTRY } from "./registry";

// ─── Thresholds ────────────────────────────────────────────────────────────

const THRESHOLD = {
  /** Minimum score to be considered a real candidate */
  ninguna: 0.05,
  /** Below this → baja confidence → ask user to confirm */
  baja: 0.20,
  /** At or above this → alta confidence → auto-select */
  alta: 0.42,
  /**
   * If the top two candidates are within this delta of each other,
   * treat it as a tie and ask the user to confirm rather than
   * picking arbitrarily.
   */
  tieDelta: 0.09,
} as const;

// ─── KnowledgeRouter ───────────────────────────────────────────────────────

/**
 * Instanciable router. Inject any RoutingAlgorithm implementation —
 * keyword matching today, embeddings or LLM tomorrow.
 *
 * @example
 * const router = new KnowledgeRouter(new KeywordAlgorithm());
 * const result = await router.route({ texto: "¿Por qué persiste la brecha digital?" });
 */
export class KnowledgeRouter {
  private readonly algorithm: RoutingAlgorithm;

  constructor(algorithm: RoutingAlgorithm) {
    this.algorithm = algorithm;
  }

  async route(input: RouterInput): Promise<RouterResult> {
    // 1. Only consider active packs
    const activePacks = REGISTRY.filter(
      (e) => e.metadata.estado === "activo"
    );

    if (activePacks.length === 0) {
      return { decision: "ninguno", candidatos: [] };
    }

    // 2. Score every active pack (metadata only — no content loaded yet)
    const scored = activePacks
      .map((entry) => {
        const { score, terminosCoincidentes } = this.algorithm.score(
          input,
          entry.metadata
        );
        return { entry, score, terminosCoincidentes };
      })
      .sort((a, b) => b.score - a.score);

    // 3. Filter out sub-threshold scores
    const aboveThreshold = scored.filter(
      (s) => s.score >= THRESHOLD.ninguna
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
          score >= THRESHOLD.alta
            ? "alta"
            : score >= THRESHOLD.baja
            ? "media"
            : "baja";
        return { pack, score, confianza, terminosCoincidentes };
      })
    );

    // 5. Detect tie between top candidates
    if (
      candidates.length >= 2 &&
      candidates[0].score - candidates[1].score <= THRESHOLD.tieDelta
    ) {
      return {
        decision: "candidatos",
        candidatos: candidates,
        motivo: "empate",
      };
    }

    const winner = candidates[0];

    // 6. Baja confidence → ask user to confirm before loading
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
