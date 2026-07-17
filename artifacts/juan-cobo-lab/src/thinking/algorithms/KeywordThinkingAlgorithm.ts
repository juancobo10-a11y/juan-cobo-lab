import type {
  ThinkingAlgorithm,
  ThinkingRouterInput,
  ThinkingPatternMetadata,
  ThinkingMatchedTerm,
} from "../types";
import { normalizeText } from "../../router/utils";

// ─── Stop words (Spanish) ─────────────────────────────────────────────────
const STOPWORDS = new Set([
  // articles
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  // prepositions
  "de", "del", "en", "a", "al", "por", "para", "con", "sin", "sobre",
  "ante", "bajo", "desde", "hasta", "hacia", "segun", "entre", "contra",
  // conjunctions
  "y", "e", "o", "u", "pero", "mas", "sino", "aunque", "porque", "que",
  // pronouns
  "se", "me", "te", "le", "les", "nos", "lo", "su", "sus", "mi", "mis",
  "tu", "tus",
  // common copulas / aux verbs
  "es", "son", "hay", "ser", "estar", "era", "eran",
  // question words
  "que", "como", "donde", "cuando", "cual", "cuales",
  "quien", "quienes", "por",
  // content-neutral action verbs
  "persiste", "aumenta", "aumentan", "reduce", "reducir", "mejorar",
  "aumentar", "disminuir", "disminuye", "afecta", "afectan",
  "genera", "generan", "quiero", "quiere", "quieren",
  "pasa", "ocurre", "existe", "existen", "puede", "pueden", "lograr",
  // determiners / adverbs
  "esto", "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas",
  "muy", "tan", "tanto", "tambien", "ya", "aun",
]);

// ─── Scoring weights ──────────────────────────────────────────────────────
const W = {
  keywordPhrase: 0.55, // multi-word phrase exact match in input
  keywordToken: 0.30,  // single keyword token match
  etiqueta: 0.20,      // matches the pattern's etiqueta label
  titulo: 0.15,
  descripcion: 0.10,
};

// ─── Text utilities ───────────────────────────────────────────────────────

function stem(token: string): string {
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function stemAll(tokens: string[]): string[] {
  return tokens.map(stem);
}

// ─── KeywordThinkingAlgorithm ─────────────────────────────────────────────

/**
 * Scores a thinking pattern against the router input using keyword matching.
 *
 * Mirrors KeywordAlgorithm from the Knowledge Router. Async to satisfy the
 * ThinkingAlgorithm contract — enables drop-in replacement with embeddings
 * or LLM-based implementations without touching ThinkingRouter or any UI code.
 */
export class KeywordThinkingAlgorithm implements ThinkingAlgorithm {
  async score(
    input: ThinkingRouterInput,
    metadata: ThinkingPatternMetadata
  ): Promise<{ score: number; terminosCoincidentes: ThinkingMatchedTerm[] }> {
    // Build the scoring surface from all available context signals.
    // packNombre + packContextoResumido enrich keyword matching with
    // domain-specific vocabulary without duplicating the full pack content.
    const contextParts = [input.packNombre, input.packContextoResumido]
      .filter(Boolean)
      .join(" ");
    const fullInput = contextParts
      ? `${input.texto} ${contextParts}`
      : input.texto;

    const normInput = normalizeText(fullInput);
    const inputTokens = tokenize(fullInput);
    const inputStemmed = stemAll(inputTokens);

    const matched: ThinkingMatchedTerm[] = [];
    let raw = 0;

    const claimed = new Set<string>();

    // ── Phase 1: multi-word keyword phrases ──────────────────────────────────
    for (const kw of metadata.keywords) {
      const normKw = normalizeText(kw);
      const kwParts = normKw.split(/\s+/).filter((t) => t.length > 0);

      if (kwParts.length < 2) continue;

      if (normInput.includes(normKw)) {
        raw += W.keywordPhrase;
        matched.push({
          termino: kw,
          campo: "keyword",
          peso: W.keywordPhrase,
          esFrase: true,
        });
        for (const part of kwParts) {
          claimed.add(part);
          claimed.add(stem(part));
        }
      }
    }

    // ── Phase 2: single keyword tokens (with stemming) ───────────────────────
    for (const kw of metadata.keywords) {
      const normKw = normalizeText(kw);
      const kwParts = normKw.split(/\s+/).filter((t) => t.length > 0);

      if (kwParts.length !== 1) continue;

      const kwStem = stem(normKw);

      if (claimed.has(normKw) || claimed.has(kwStem)) continue;

      const hits =
        inputTokens.includes(normKw) ||
        inputStemmed.includes(kwStem) ||
        normInput.includes(normKw);

      if (hits) {
        raw += W.keywordToken;
        matched.push({
          termino: kw,
          campo: "keyword",
          peso: W.keywordToken,
          esFrase: false,
        });
        claimed.add(normKw);
        claimed.add(kwStem);
      }
    }

    // ── Phase 3: etiqueta match ───────────────────────────────────────────────
    const normEtiqueta = normalizeText(metadata.etiqueta);
    if (
      normInput.includes(normEtiqueta) ||
      inputStemmed.includes(stem(normEtiqueta))
    ) {
      raw += W.etiqueta;
      matched.push({
        termino: metadata.etiqueta,
        campo: "etiqueta",
        peso: W.etiqueta,
        esFrase: false,
      });
    }

    // ── Phase 4: titulo tokens ────────────────────────────────────────────────
    const tituloTokens = tokenize(metadata.titulo);
    const tituloStemmed = stemAll(tituloTokens);
    const seenTitulo = new Set<string>();

    for (let i = 0; i < tituloTokens.length; i++) {
      const tt = tituloTokens[i];
      const ts = tituloStemmed[i];
      if (seenTitulo.has(ts)) continue;

      if (inputTokens.includes(tt) || inputStemmed.includes(ts)) {
        raw += W.titulo;
        seenTitulo.add(ts);
        matched.push({
          termino: tt,
          campo: "titulo",
          peso: W.titulo,
          esFrase: false,
        });
      }
    }

    // ── Phase 5: descripcion tokens ───────────────────────────────────────────
    const descTokens = tokenize(metadata.descripcion);
    const descStemmed = stemAll(descTokens);
    const seenDesc = new Set<string>();

    for (let i = 0; i < descTokens.length; i++) {
      const dt = descTokens[i];
      const ds = descStemmed[i];
      if (seenDesc.has(ds)) continue;

      if (inputTokens.includes(dt) || inputStemmed.includes(ds)) {
        raw += W.descripcion;
        seenDesc.add(ds);
        matched.push({
          termino: dt,
          campo: "descripcion",
          peso: W.descripcion,
          esFrase: false,
        });
      }
    }

    // ── Normalize to [0, 1] ───────────────────────────────────────────────────
    const meaningfulCount = Math.max(inputTokens.length, 1);
    const score = Math.min(raw / (meaningfulCount * W.keywordPhrase), 1);

    return { score, terminosCoincidentes: matched };
  }
}
