/**
 * ConceptualThinkingAlgorithm — S-011
 *
 * Implements ThinkingAlgorithm using a three-tier conceptual knowledge model:
 *
 *   expresiones  →  multi-word fixed phrases   (weight 0.55)
 *   terminos     →  primary terms/short phrases (weight 0.35)
 *   sinonimos    →  paraphrases / weak synonyms (weight 0.20)
 *
 * Scoring principles (per sprint spec):
 *   1. An expression match weighs more than a single-token match.
 *   2. Multiple matches within the same concept yield diminishing returns.
 *   3. Activating several distinct concepts yields a diversity bonus.
 *   4. The problem text always outweighs pack context.
 *   5. The universal-floor fallback is managed by ThinkingRouter, not here.
 *
 * Formula (per surface):
 *   conceptContribution(c) = firstMatchWeight + Σ(0.10 × wᵢ for i≥2)
 *                            capped at concept.peso ?? DEFAULT_PESO
 *   surfaceRaw(s)          = Σ(conceptContribution) × diversityBonus(n)
 *   diversityBonus(n)      = 1.0 + 0.20 × max(0, n−1)
 *   surfaceScore(s)        = min(surfaceRaw(s), 1.0)
 *   finalScore             = min(
 *                              surfaceScore(p) × 1.00 +  ← primary signal
 *                              surfaceScore(n) × 0.35 +  ← pack name
 *                              surfaceScore(c) × 0.50,   ← pack context
 *                              1.0
 *                            )
 *
 * Legacy fallback:
 *   Patterns that still carry `keywords[]` (and no `conceptos`) are scored
 *   using the keyword-based logic without token-count normalization.
 *   Each keyword phrase match: 0.55. Single keyword token: 0.35.
 *   Sum capped at 1.0. No diversity bonus (flat model).
 *
 * ADR-0002 compliance: zero domain knowledge in this file.
 * Adding a third Thinking Pattern requires ONLY a new metadata.json entry;
 * this algorithm is not touched.
 */

import type {
  ThinkingAlgorithm,
  ThinkingRouterInput,
  ThinkingPatternMetadata,
  ThinkingConcept,
  ThinkingConceptMatch,
} from "../types";
import { normalizeText } from "../../router/utils";

// ─── Constants ─────────────────────────────────────────────────────────────

const MATCH_WEIGHTS = {
  expresion: 0.55,
  termino: 0.35,
  sinonimo: 0.20,
} as const;

const SURFACE_WEIGHTS = {
  problema: 1.00,
  packNombre: 0.35,
  packContexto: 0.50,
} as const;

/** Default concept weight ceiling when ThinkingConcept.peso is absent */
const DEFAULT_CONCEPT_PESO = 0.40;

/** Fractional additional contribution of each extra match within a concept */
const DIM_RETURN_FACTOR = 0.10;

/** Bonus multiplier per additional concept activated beyond the first */
const DIVERSITY_BONUS_PER_CONCEPT = 0.20;

// ─── Spanish stop words (excluded from single-token matching) ─────────────

const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  "de", "del", "en", "a", "al", "por", "para", "con", "sin", "sobre",
  "ante", "bajo", "desde", "hasta", "hacia", "segun", "entre", "contra",
  "y", "e", "o", "u", "pero", "mas", "sino", "aunque", "porque", "que",
  "se", "me", "te", "le", "les", "nos", "lo", "su", "sus", "mi", "mis",
  "tu", "tus", "es", "son", "hay", "ser", "estar", "era", "eran",
  "que", "como", "donde", "cuando", "cual", "cuales", "quien", "quienes", "por",
]);

// ─── Text utilities ────────────────────────────────────────────────────────

function stem(token: string): string {
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

/** Returns normalized content tokens (no stopwords, no short tokens). */
function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function stemAll(tokens: string[]): string[] {
  return tokens.map(stem);
}

// ─── Concept matching ──────────────────────────────────────────────────────

type SurfaceKey = "problema" | "packNombre" | "packContexto";

/**
 * Finds all matches between a concept and a text surface.
 *
 * Phases run in priority order: expresiones first (highest weight),
 * then terminos, then sinonimos. A "claimed" set prevents the same
 * normalized text from producing multiple matches within one concept.
 */
function matchConceptOnSurface(
  concept: ThinkingConcept,
  normText: string,
  tokens: string[],
  stemmed: string[],
  surface: SurfaceKey
): ThinkingConceptMatch[] {
  const claimed = new Set<string>(); // prevents double-counting within concept
  const matches: ThinkingConceptMatch[] = [];

  // ── Phase 1: Expressions (multi-word, highest weight) ──────────────────
  for (const expr of concept.expresiones ?? []) {
    const normExpr = normalizeText(expr);
    if (claimed.has(normExpr)) continue;
    if (normText.includes(normExpr)) {
      claimed.add(normExpr);
      matches.push({
        conceptId: concept.id,
        conceptName: concept.nombre,
        matchedText: expr,
        matchType: "expresion",
        surface,
        weight: MATCH_WEIGHTS.expresion,
      });
    }
  }

  // ── Phase 2: Terminos ──────────────────────────────────────────────────
  for (const term of concept.terminos ?? []) {
    const normTerm = normalizeText(term);
    if (claimed.has(normTerm)) continue;
    const termParts = normTerm.split(/\s+/).filter(Boolean);
    const found =
      termParts.length > 1
        ? normText.includes(normTerm) // multi-word → substring search
        : tokens.includes(normTerm) || stemmed.includes(stem(normTerm)); // single → token/stem
    if (found) {
      claimed.add(normTerm);
      matches.push({
        conceptId: concept.id,
        conceptName: concept.nombre,
        matchedText: term,
        matchType: "termino",
        surface,
        weight: MATCH_WEIGHTS.termino,
      });
    }
  }

  // ── Phase 3: Sinonimos ─────────────────────────────────────────────────
  for (const syn of concept.sinonimos ?? []) {
    const normSyn = normalizeText(syn);
    if (claimed.has(normSyn)) continue;
    const synParts = normSyn.split(/\s+/).filter(Boolean);
    const found =
      synParts.length > 1
        ? normText.includes(normSyn)
        : tokens.includes(normSyn) || stemmed.includes(stem(normSyn));
    if (found) {
      claimed.add(normSyn);
      matches.push({
        conceptId: concept.id,
        conceptName: concept.nombre,
        matchedText: syn,
        matchType: "sinonimo",
        surface,
        weight: MATCH_WEIGHTS.sinonimo,
      });
    }
  }

  return matches;
}

/**
 * Scores all concepts from a pattern against a single text surface.
 *
 * Returns:
 *   score   — surface score in [0, 1] (already capped)
 *   matches — all ThinkingConceptMatch entries found, unsorted
 */
function scoreConceptsOnSurface(
  conceptos: ThinkingConcept[],
  text: string,
  surface: SurfaceKey
): { score: number; matches: ThinkingConceptMatch[] } {
  if (!text.trim()) return { score: 0, matches: [] };

  const normText = normalizeText(text);
  const tokens = tokenize(text);
  const stemmed = stemAll(tokens);

  const allMatches: ThinkingConceptMatch[] = [];
  let activeConcepts = 0;
  let rawSum = 0;

  for (const concept of conceptos) {
    const conceptMatches = matchConceptOnSurface(
      concept,
      normText,
      tokens,
      stemmed,
      surface
    );
    if (conceptMatches.length === 0) continue;

    // Apply diminishing returns within the concept
    const sorted = conceptMatches.slice().sort((a, b) => b.weight - a.weight);
    let contribution = 0;
    for (let i = 0; i < sorted.length; i++) {
      contribution +=
        i === 0 ? sorted[i].weight : DIM_RETURN_FACTOR * sorted[i].weight;
    }
    // Cap at concept weight ceiling
    contribution = Math.min(contribution, concept.peso ?? DEFAULT_CONCEPT_PESO);

    rawSum += contribution;
    activeConcepts++;
    allMatches.push(...conceptMatches);
  }

  if (activeConcepts === 0) return { score: 0, matches: [] };

  const diversityBonus =
    1.0 + DIVERSITY_BONUS_PER_CONCEPT * Math.max(0, activeConcepts - 1);
  const score = Math.min(rawSum * diversityBonus, 1.0);

  return { score, matches: allMatches };
}

// ─── Legacy keyword scoring ────────────────────────────────────────────────
//
// For patterns that still use the flat `keywords[]` model (e.g. test mocks).
// Computes a sum-of-weights score WITHOUT token-count normalization.
// Each phrase match: 0.55. Single-token match: 0.35. No diversity bonus.
// Wraps each match as a ThinkingConceptMatch with conceptId='legacy-keyword'.

function scoreLegacyKeywordsOnSurface(
  keywords: string[],
  text: string,
  surface: SurfaceKey
): { score: number; matches: ThinkingConceptMatch[] } {
  if (!text.trim() || keywords.length === 0) return { score: 0, matches: [] };

  const normText = normalizeText(text);
  const tokens = tokenize(text);
  const stemmed = stemAll(tokens);

  const matches: ThinkingConceptMatch[] = [];
  const claimed = new Set<string>();
  let raw = 0;

  // Phrase keywords first
  for (const kw of keywords) {
    const normKw = normalizeText(kw);
    const parts = normKw.split(/\s+/).filter(Boolean);
    if (parts.length < 2) continue;
    if (claimed.has(normKw)) continue;
    if (normText.includes(normKw)) {
      claimed.add(normKw);
      for (const p of parts) { claimed.add(p); claimed.add(stem(p)); }
      raw += MATCH_WEIGHTS.expresion;
      matches.push({
        conceptId: "legacy-keyword",
        conceptName: kw,
        matchedText: kw,
        matchType: "expresion",
        surface,
        weight: MATCH_WEIGHTS.expresion,
      });
    }
  }

  // Single-token keywords
  for (const kw of keywords) {
    const normKw = normalizeText(kw);
    const parts = normKw.split(/\s+/).filter(Boolean);
    if (parts.length !== 1) continue;
    const kwStem = stem(normKw);
    if (claimed.has(normKw) || claimed.has(kwStem)) continue;
    const found =
      tokens.includes(normKw) || stemmed.includes(kwStem) || normText.includes(normKw);
    if (found) {
      claimed.add(normKw);
      claimed.add(kwStem);
      raw += MATCH_WEIGHTS.termino;
      matches.push({
        conceptId: "legacy-keyword",
        conceptName: kw,
        matchedText: kw,
        matchType: "termino",
        surface,
        weight: MATCH_WEIGHTS.termino,
      });
    }
  }

  return { score: Math.min(raw, 1.0), matches };
}

// ─── ConceptualThinkingAlgorithm ───────────────────────────────────────────

/**
 * Primary Thinking Engine algorithm for S-011+.
 *
 * Routes to the conceptual path when `metadata.conceptos` is populated,
 * and falls back to the legacy keyword path otherwise. This ensures backward
 * compatibility with test mocks and unmigraded patterns without any
 * pattern-specific conditionals.
 *
 * Async to satisfy the ThinkingAlgorithm contract for future drop-in
 * replacement with embedding or LLM-based implementations.
 */
export class ConceptualThinkingAlgorithm implements ThinkingAlgorithm {
  async score(
    input: ThinkingRouterInput,
    metadata: ThinkingPatternMetadata
  ): Promise<{ score: number; scoreProblema: number; conceptMatches: ThinkingConceptMatch[] }> {
    const useConceptual = (metadata.conceptos?.length ?? 0) > 0;

    // ── Surface scorer dispatcher ──────────────────────────────────────────
    const scoreSurface = useConceptual
      ? (text: string, surface: SurfaceKey) =>
          scoreConceptsOnSurface(metadata.conceptos!, text, surface)
      : (text: string, surface: SurfaceKey) =>
          scoreLegacyKeywordsOnSurface(metadata.keywords ?? [], text, surface);

    // ── Surface 1: problem text (primary signal) ───────────────────────────
    const surfaceP = scoreSurface(input.texto, "problema");

    // ── Surface 2: pack domain name (enrichment) ──────────────────────────
    const surfaceN = input.packNombre
      ? scoreSurface(input.packNombre, "packNombre")
      : { score: 0, matches: [] as ThinkingConceptMatch[] };

    // ── Surface 3: pack contextual summary (enrichment) ───────────────────
    const surfaceC = input.packContextoResumido
      ? scoreSurface(input.packContextoResumido, "packContexto")
      : { score: 0, matches: [] as ThinkingConceptMatch[] };

    // ── Combine with surface weights ───────────────────────────────────────
    const score = Math.min(
      surfaceP.score * SURFACE_WEIGHTS.problema +
        surfaceN.score * SURFACE_WEIGHTS.packNombre +
        surfaceC.score * SURFACE_WEIGHTS.packContexto,
      1.0
    );

    // ── Merge conceptMatches (problema first for ExplanationService) ───────
    const conceptMatches: ThinkingConceptMatch[] = [
      ...surfaceP.matches,
      ...surfaceN.matches,
      ...surfaceC.matches,
    ];

    return { score, scoreProblema: surfaceP.score, conceptMatches };
  }
}
