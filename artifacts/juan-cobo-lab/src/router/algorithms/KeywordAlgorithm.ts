import type {
  RoutingAlgorithm,
  RouterInput,
  PackMetadata,
  MatchedTerm,
} from "../types";

// ─── Stop words (Spanish) ──────────────────────────────────────────────────
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
  "que", "que", "como", "donde", "cuando", "cual", "cuales",
  "quien", "quienes",
  // content-neutral action verbs
  "persiste", "aumenta", "aumentan", "reduce", "reducir", "mejorar",
  "aumentar", "disminuir", "disminuye", "afecta", "afectan",
  "genera", "generan", "quiero", "quiere", "quieren",
  "pasa", "ocurre", "existe", "existen", "puede", "pueden", "lograr",
  // determiners / adverbs
  "esto", "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas",
  "muy", "tan", "tanto", "tambien", "ya", "aun",
]);

// ─── Scoring weights ───────────────────────────────────────────────────────
const W = {
  keywordPhrase: 0.55, // multi-word phrase exact match
  keywordToken: 0.30,  // single keyword token match
  tema: 0.20,
  titulo: 0.15,
  descripcion: 0.10,
};

// ─── Text utilities ────────────────────────────────────────────────────────

/** Lowercase + remove diacritics + normalize punctuation */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿¡.,;:()?!"'«»\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Basic singular/plural stemmer for Spanish.
 * Handles common endings: -es, -s
 * Not perfect — intentionally minimal to avoid false collapses.
 */
function stem(token: string): string {
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

/** Meaningful tokens: normalized, non-stopword, length > 2 */
function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function stemAll(tokens: string[]): string[] {
  return tokens.map(stem);
}

// ─── KeywordAlgorithm ──────────────────────────────────────────────────────

export class KeywordAlgorithm implements RoutingAlgorithm {
  score(
    input: RouterInput,
    metadata: PackMetadata
  ): { score: number; terminosCoincidentes: MatchedTerm[] } {
    const normInput = normalize(input.texto);
    const inputTokens = tokenize(input.texto);
    const inputStemmed = stemAll(inputTokens);

    const matched: MatchedTerm[] = [];
    let raw = 0;

    /**
     * Tracks (normalized-token, stem) pairs already claimed by a phrase match
     * so single-token keyword passes don't double-count.
     */
    const claimed = new Set<string>();

    // ── Phase 1: multi-word keyword phrases (highest priority) ──────────────
    for (const kw of metadata.keywords) {
      const normKw = normalize(kw);
      const kwParts = normKw.split(/\s+/).filter((t) => t.length > 0);

      if (kwParts.length < 2) continue; // single-token keywords handled in phase 2

      if (normInput.includes(normKw)) {
        raw += W.keywordPhrase;
        matched.push({
          termino: kw,
          campo: "keyword",
          peso: W.keywordPhrase,
          esFrase: true,
        });
        // Claim constituent tokens to prevent double-counting
        for (const part of kwParts) {
          claimed.add(part);
          claimed.add(stem(part));
        }
      }
    }

    // ── Phase 2: single keyword tokens (with stemming, respecting claims) ───
    for (const kw of metadata.keywords) {
      const normKw = normalize(kw);
      const kwParts = normKw.split(/\s+/).filter((t) => t.length > 0);

      if (kwParts.length !== 1) continue; // phrases handled above

      const kwStem = stem(normKw);

      // Skip if this token was already covered by a phrase match
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

    // ── Phase 3: tema match ──────────────────────────────────────────────────
    const normTema = normalize(metadata.tema);
    if (
      normInput.includes(normTema) ||
      inputStemmed.includes(stem(normTema))
    ) {
      raw += W.tema;
      matched.push({
        termino: metadata.tema,
        campo: "tema",
        peso: W.tema,
        esFrase: false,
      });
    }

    // ── Phase 4: titulo tokens ───────────────────────────────────────────────
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

    // ── Phase 5: descripcion tokens ──────────────────────────────────────────
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

    // ── Normalize to [0, 1] ──────────────────────────────────────────────────
    // Divide by (inputTokenCount × maxWeightPerUnit) so a query that perfectly
    // matches a single phrase still gets a high score regardless of extra tokens.
    const meaningfulCount = Math.max(inputTokens.length, 1);
    const score = Math.min(raw / (meaningfulCount * W.keywordPhrase), 1);

    return { score, terminosCoincidentes: matched };
  }
}
