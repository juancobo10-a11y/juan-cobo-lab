/**
 * KeywordThinkingAlgorithm — LEGACY (deprecated since S-011)
 *
 * @deprecated Use ConceptualThinkingAlgorithm instead.
 *
 * This implementation is retained for reference and for any external code
 * that explicitly constructs it. It has been updated to implement the S-011
 * ThinkingAlgorithm interface (returning conceptMatches instead of
 * terminosCoincidentes) but is no longer used by the default singleton or
 * the production registry.
 *
 * Migration path:
 *   - All production patterns now use conceptos[] (not keywords[]).
 *   - ConceptualThinkingAlgorithm handles both the conceptual path (new)
 *     and the legacy keyword path (for unmigrated patterns in tests).
 *   - This class will be removed in a future sprint once all test mocks
 *     have been updated to use conceptos.
 *
 * Original scoring issues addressed in S-011:
 *   - Token-count normalization penalized longer problem statements.
 *   - Flat keyword list had no synonym / expression coverage.
 *   - No diversity bonus for multi-concept matches.
 */

import type {
  ThinkingAlgorithm,
  ThinkingRouterInput,
  ThinkingPatternMetadata,
  ThinkingConceptMatch,
} from "../types";
import { SCORING_WEIGHTS, NEUTRAL_TERMS } from "../constants";
import { normalizeText } from "../../router/utils";

// ─── Stop words ───────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  "de", "del", "en", "a", "al", "por", "para", "con", "sin", "sobre",
  "ante", "bajo", "desde", "hasta", "hacia", "segun", "entre", "contra",
  "y", "e", "o", "u", "pero", "mas", "sino", "aunque", "porque", "que",
  "se", "me", "te", "le", "les", "nos", "lo", "su", "sus", "mi", "mis",
  "tu", "tus", "es", "son", "hay", "ser", "estar", "era", "eran",
  "que", "como", "donde", "cuando", "cual", "cuales", "quien", "quienes", "por",
  "persiste", "aumenta", "aumentan", "reduce", "reducir", "mejorar",
  "aumentar", "disminuir", "disminuye", "afecta", "afectan",
  "genera", "generan", "quiero", "quiere", "quieren",
  "pasa", "ocurre", "existe", "existen", "puede", "pueden", "lograr",
  "esto", "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas",
  "muy", "tan", "tanto", "tambien", "ya", "aun",
]);

const W = {
  keywordPhrase: 0.55,
  keywordToken: 0.30,
  etiqueta: 0.20,
  titulo: 0.15,
  descripcion: 0.10,
};

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

type SurfaceKey = "problema" | "packNombre" | "packContexto";

function scoreSurface(
  surface: string,
  metadata: ThinkingPatternMetadata,
  superficieInput: SurfaceKey
): { raw: number; tokenCount: number; matches: ThinkingConceptMatch[] } {
  if (!surface.trim()) return { raw: 0, tokenCount: 1, matches: [] };

  const normSurface = normalizeText(surface);
  const surfaceTokens = tokenize(surface);
  const surfaceStemmed = stemAll(surfaceTokens);

  const matches: ThinkingConceptMatch[] = [];
  let raw = 0;
  const claimed = new Set<string>();
  const keywords = metadata.keywords ?? [];

  // Phase 1: multi-word keyword phrases
  for (const kw of keywords) {
    const normKw = normalizeText(kw);
    const kwParts = normKw.split(/\s+/).filter((t) => t.length > 0);
    if (kwParts.length < 2) continue;
    if (normSurface.includes(normKw)) {
      raw += W.keywordPhrase;
      matches.push({
        conceptId: "legacy-keyword",
        conceptName: kw,
        matchedText: kw,
        matchType: "expresion",
        surface: superficieInput,
        weight: W.keywordPhrase,
      });
      for (const part of kwParts) { claimed.add(part); claimed.add(stem(part)); }
    }
  }

  // Phase 2: single keyword tokens (with stemming)
  for (const kw of keywords) {
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
      matches.push({
        conceptId: "legacy-keyword",
        conceptName: kw,
        matchedText: kw,
        matchType: "termino",
        surface: superficieInput,
        weight: W.keywordToken,
      });
      claimed.add(normKw);
      claimed.add(kwStem);
    }
  }

  // Phase 3: etiqueta
  const normEtiqueta = normalizeText(metadata.etiqueta);
  if (
    normSurface.includes(normEtiqueta) ||
    surfaceStemmed.includes(stem(normEtiqueta))
  ) {
    raw += W.etiqueta;
    matches.push({
      conceptId: "legacy-etiqueta",
      conceptName: metadata.etiqueta,
      matchedText: metadata.etiqueta,
      matchType: "termino",
      surface: superficieInput,
      weight: W.etiqueta,
    });
  }

  // Phase 4: titulo tokens (NEUTRAL_TERMS filtered)
  const tituloTokens = tokenize(metadata.titulo);
  const tituloStemmed = stemAll(tituloTokens);
  const seenTitulo = new Set<string>();
  for (let i = 0; i < tituloTokens.length; i++) {
    const tt = tituloTokens[i]; const ts = tituloStemmed[i];
    if (seenTitulo.has(ts)) continue;
    if (NEUTRAL_TERMS.has(tt) || NEUTRAL_TERMS.has(ts)) continue;
    if (surfaceTokens.includes(tt) || surfaceStemmed.includes(ts)) {
      raw += W.titulo; seenTitulo.add(ts);
      matches.push({ conceptId: "legacy-titulo", conceptName: tt, matchedText: tt, matchType: "termino", surface: superficieInput, weight: W.titulo });
    }
  }

  // Phase 5: descripcion tokens (NEUTRAL_TERMS filtered)
  const descTokens = tokenize(metadata.descripcion);
  const descStemmed = stemAll(descTokens);
  const seenDesc = new Set<string>();
  for (let i = 0; i < descTokens.length; i++) {
    const dt = descTokens[i]; const ds = descStemmed[i];
    if (seenDesc.has(ds)) continue;
    if (NEUTRAL_TERMS.has(dt) || NEUTRAL_TERMS.has(ds)) continue;
    if (surfaceTokens.includes(dt) || surfaceStemmed.includes(ds)) {
      raw += W.descripcion; seenDesc.add(ds);
      matches.push({ conceptId: "legacy-desc", conceptName: dt, matchedText: dt, matchType: "sinonimo", surface: superficieInput, weight: W.descripcion });
    }
  }

  return { raw, tokenCount: Math.max(surfaceTokens.length, 1), matches };
}

/** @deprecated since S-011 — use ConceptualThinkingAlgorithm */
export class KeywordThinkingAlgorithm implements ThinkingAlgorithm {
  async score(
    input: ThinkingRouterInput,
    metadata: ThinkingPatternMetadata
  ): Promise<{ score: number; scoreProblema: number; conceptMatches: ThinkingConceptMatch[] }> {

    const { raw: rawP, tokenCount: tcP, matches: matchedP } = scoreSurface(input.texto, metadata, "problema");
    const scoreProblema = Math.min(rawP / (tcP * W.keywordPhrase), 1);

    let scoreNombrePack = 0;
    let matchedNombre: ThinkingConceptMatch[] = [];
    if (input.packNombre) {
      const { raw: rawN, tokenCount: tcN, matches: mN } = scoreSurface(input.packNombre, metadata, "packNombre");
      scoreNombrePack = Math.min(rawN / (tcN * W.keywordPhrase), 1);
      matchedNombre = mN;
    }

    let scoreContextoPack = 0;
    let matchedContexto: ThinkingConceptMatch[] = [];
    if (input.packContextoResumido) {
      const { raw: rawC, tokenCount: tcC, matches: mC } = scoreSurface(input.packContextoResumido, metadata, "packContexto");
      scoreContextoPack = Math.min(rawC / (tcC * W.keywordPhrase), 1);
      matchedContexto = mC;
    }

    const score = Math.min(
      scoreProblema     * SCORING_WEIGHTS.problemWeight     +
      scoreNombrePack   * SCORING_WEIGHTS.packNameWeight    +
      scoreContextoPack * SCORING_WEIGHTS.packContextWeight,
      1.0
    );

    // Merge (dedup by conceptId+matchedText+surface)
    const seenKey = new Set<string>();
    const conceptMatches: ThinkingConceptMatch[] = [];
    for (const m of [...matchedP, ...matchedNombre, ...matchedContexto]) {
      const key = `${m.conceptId}::${m.matchedText}::${m.surface}`;
      if (!seenKey.has(key)) { seenKey.add(key); conceptMatches.push(m); }
    }

    return { score, scoreProblema, conceptMatches };
  }
}
