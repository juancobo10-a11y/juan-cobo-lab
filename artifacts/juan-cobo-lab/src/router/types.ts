// ─── Domain types shared across router and UI ─────────────────────────────

export type NivelConfianza = "Alta" | "Media" | "Exploratoria";

export type Hipotesis = {
  numero: string;
  titulo: string;
  texto: string;
  confianza: NivelConfianza;
  nextStep: string;
};

export type PestelItem = {
  letra: string;
  dimension: string;
  explicacion: string;
  pregunta: string;
};

// ─── Knowledge Pack schema ─────────────────────────────────────────────────

/** Shape of each content/<pack>/metadata.json */
export type PackMetadata = {
  id: string;
  titulo: string;
  descripcion: string;
  tema: string;
  /** Domain-specific activation terms — owned by the pack, not the router */
  keywords: string[];
  herramienta: string;
  nivelComplejidad: string;
  version: string;
  estado: "activo" | "borrador" | "inactivo";
  // ── Provenance fields (added v0.5.1) ─────────────────────────────────────
  autor: string;
  institucion: string;
  ultimaActualizacion: string;
  fuentes: string[];
  licencia: string;
  estadoRevision: "experimental" | "revisado" | "validado";
};

/** Fully-loaded pack ready for HELIOS to consume */
export type KnowledgePack = {
  metadata: PackMetadata;
  contexto: { texto: string };
  hipotesis: Hipotesis[];
  pestel: PestelItem[];
  chips: { ejemplos: string[]; explorados: string[] };
};

// ─── Router I/O ────────────────────────────────────────────────────────────

export type RouterInput = {
  texto: string;
};

/** A single matched term with its provenance and weight */
export type MatchedTerm = {
  termino: string;
  campo: "keyword" | "tema" | "titulo" | "descripcion";
  peso: number;
  esFrase: boolean;
};

/** A scored candidate pack, ready for display or selection */
export type PackCandidate = {
  pack: KnowledgePack;
  score: number;
  confianza: "alta" | "media" | "baja";
  terminosCoincidentes: MatchedTerm[];
};

/**
 * Three distinct decisions the router can return:
 *
 * - "seleccionado": one clear winner (alta or media confidence, no tie)
 * - "candidatos":   tie or baja confidence — user must confirm
 * - "ninguno":      no pack scored above minimum threshold
 */
export type RouterResult =
  | {
      decision: "seleccionado";
      seleccionado: PackCandidate;
      /** All scored candidates for transparency */
      candidatos: PackCandidate[];
    }
  | {
      decision: "candidatos";
      candidatos: PackCandidate[];
      motivo: "empate" | "baja-confianza";
    }
  | {
      decision: "ninguno";
      /** Near-zero scored packs, for debug/future use */
      candidatos: PackCandidate[];
    };

// ─── Algorithm interface ───────────────────────────────────────────────────

/**
 * Stable extension point. Implement this to swap in embeddings, LLM
 * reranking, RAG, or any future scoring strategy — without touching
 * KnowledgeRouter or Helios.
 *
 * score() is async so implementations can call external APIs, run
 * local inference, or perform vector lookups without changing the
 * Router or any UI code.
 */
export interface RoutingAlgorithm {
  score(
    input: RouterInput,
    metadata: PackMetadata
  ): Promise<{ score: number; terminosCoincidentes: MatchedTerm[] }>;
}
