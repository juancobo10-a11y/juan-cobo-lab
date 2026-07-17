import type {
  ThinkingAlgorithm,
  ThinkingRouterInput,
  ThinkingPatternMetadata,
  ThinkingMatchedTerm,
} from "../types";
import { SCORING_WEIGHTS } from "../constants";
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

// ─── Per-surface scoring weights ──────────────────────────────────────────
const W = {
  keywordPhrase: 0.55, // multi-word phrase exact match in surface
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

// ─── Surface scorer ───────────────────────────────────────────────────────

/**
 * Scores a single text surface (problema, packNombre, or packContextoResumido)
 * against a pattern's metadata using five matching phases.
 *
 * Returns the raw accumulated score, the meaningful token count (used to
 * normalise the score against surface length), and the list of matched terms.
 *
 * Keeping each surface independent is the key v0.3 improvement: combining
 * all surfaces into one string inflated the token count (denominator) and
 * penalised patterns with strong problem-text matches when context was added.
 */
function scoreSurface(
  surface: string,
  metadata: ThinkingPatternMetadata
): { raw: number; tokenCount: number; matched: ThinkingMatchedTerm[] } {
  if (!surface.trim()) return { raw: 0, tokenCount: 1, matched: [] };

  const normSurface = normalizeText(surface);
  const surfaceTokens = tokenize(surface);
  const surfaceStemmed = stemAll(surfaceTokens);

  const matched: ThinkingMatchedTerm[] = [];
  let raw = 0;

  const claimed = new Set<string>();

  // ── Phase 1: multi-word keyword phrases ─────────────────────────────────
  for (const kw of metadata.keywords) {
    const normKw = normalizeText(kw);
    const kwParts = normKw.split(/\s+/).filter((t) => t.length > 0);

    if (kwParts.length < 2) continue;

    if (normSurface.includes(normKw)) {
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
      surfaceTokens.includes(normKw) ||
      surfaceStemmed.includes(kwStem) ||
      normSurface.includes(normKw);

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

  // ── Phase 3: etiqueta match ──────────────────────────────────────────────
  const normEtiqueta = normalizeText(metadata.etiqueta);
  if (
    normSurface.includes(normEtiqueta) ||
    surfaceStemmed.includes(stem(normEtiqueta))
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

    if (surfaceTokens.includes(tt) || surfaceStemmed.includes(ts)) {
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

    if (surfaceTokens.includes(dt) || surfaceStemmed.includes(ds)) {
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

  return { raw, tokenCount: Math.max(surfaceTokens.length, 1), matched };
}

// ─── KeywordThinkingAlgorithm ─────────────────────────────────────────────

/**
 * Scores a thinking pattern against the router input using keyword matching.
 *
 * v0.3 CHANGE: Three scoring surfaces (problema, packNombre, packContexto) are
 * computed independently and combined with configurable weights from constants.ts.
 * This eliminates the "dilution by context" bug where enriching the input with
 * pack vocabulary increased the token count (denominator) and reduced the score
 * of patterns that already matched the problem text directly.
 *
 * Formula:
 *   finalScore = min(
 *     scoreProblema     * SCORING_WEIGHTS.problemWeight     +
 *     scoreNombrePack   * SCORING_WEIGHTS.packNameWeight    +
 *     scoreContextoPack * SCORING_WEIGHTS.packContextWeight,
 *     1.0
 *   )
 *
 * Async to satisfy the ThinkingAlgorithm contract — enables drop-in
 * replacement with embeddings or LLM-based implementations without
 * touching ThinkingRouter or any UI code.
 */
export class KeywordThinkingAlgorithm implements ThinkingAlgorithm {
  async score(
    input: ThinkingRouterInput,
    metadata: ThinkingPatternMetadata
  ): Promise<{ score: number; scoreProblema: number; terminosCoincidentes: ThinkingMatchedTerm[] }> {

    // ── Surface 1: problem text (primary signal) ──────────────────────────
    const { raw: rawP, tokenCount: tcP, matched: matchedP } = scoreSurface(
      input.texto,
      metadata
    );
    const scoreProblema = Math.min(rawP / (tcP * W.keywordPhrase), 1);

    // ── Surface 2: pack domain name (enrichment) ──────────────────────────
    let scoreNombrePack = 0;
    let matchedNombre: ThinkingMatchedTerm[] = [];
    if (input.packNombre) {
      const { raw: rawN, tokenCount: tcN, matched: mN } = scoreSurface(
        input.packNombre,
        metadata
      );
      scoreNombrePack = Math.min(rawN / (tcN * W.keywordPhrase), 1);
      matchedNombre = mN;
    }

    // ── Surface 3: pack contextual summary (enrichment) ───────────────────
    let scoreContextoPack = 0;
    let matchedContexto: ThinkingMatchedTerm[] = [];
    if (input.packContextoResumido) {
      const { raw: rawC, tokenCount: tcC, matched: mC } = scoreSurface(
        input.packContextoResumido,
        metadata
      );
      scoreContextoPack = Math.min(rawC / (tcC * W.keywordPhrase), 1);
      matchedContexto = mC;
    }

    // ── Combine with weights ──────────────────────────────────────────────
    const score = Math.min(
      scoreProblema     * SCORING_WEIGHTS.problemWeight     +
      scoreNombrePack   * SCORING_WEIGHTS.packNameWeight    +
      scoreContextoPack * SCORING_WEIGHTS.packContextWeight,
      1.0
    );

    // ── Merge terminosCoincidentes (deduplicated by termino+campo) ─────────
    const seenKey = new Set<string>();
    const terminosCoincidentes: ThinkingMatchedTerm[] = [];
    for (const m of [...matchedP, ...matchedNombre, ...matchedContexto]) {
      const key = `${m.termino}::${m.campo}`;
      if (!seenKey.has(key)) {
        seenKey.add(key);
        terminosCoincidentes.push(m);
      }
    }

    return { score, scoreProblema, terminosCoincidentes };
  }
}
