/**
 * ExplanationService — builds human-readable explanations from ThinkingRouter
 * output without exposing internal scores, weights, or constant names.
 *
 * S-010 requirement: the logic that turns routing signals into user-facing
 * text must live here, not dispersed in Helios.tsx.
 *
 * Contract:
 *   - Pure function: same inputs → same output, no side effects.
 *   - No LLM calls (S-010 explicitly prohibits them in this version).
 *   - No direct metadata imports from React code.
 *   - Output must be intelligible to non-technical users.
 */

import type {
  ThinkingCandidate,
  ExplicacionSeleccion,
  ThinkingRouterInput,
} from "./types";
import { NEUTRAL_TERMS } from "./constants";
import { normalizeText } from "../router/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true when every meaningful token of a term is in NEUTRAL_TERMS.
 * This prevents ultra-generic policy tokens ("política pública", "problema")
 * from appearing in dimensionesDetectadas even when they matched as keywords.
 */
function isNeutralTerm(termino: string): boolean {
  const tokens = normalizeText(termino)
    .split(/\s+/)
    .filter((t) => t.length > 0);
  return tokens.length > 0 && tokens.every((t) => NEUTRAL_TERMS.has(t));
}

/**
 * Joins a list of terms as a natural Spanish enumeration.
 *   []          → ""
 *   ["A"]       → "A"
 *   ["A","B"]   → "A y B"
 *   ["A","B","C"] → "A, B y C"
 */
function joinDimensions(dims: string[]): string {
  if (dims.length === 0) return "";
  if (dims.length === 1) return dims[0];
  return dims.slice(0, -1).join(", ") + " y " + dims[dims.length - 1];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Builds an ExplicacionSeleccion from a winning ThinkingCandidate and the
 * original router input.
 *
 * Called by ThinkingRouter immediately before it returns a "seleccionado"
 * result — the explanation travels with the result and is never reconstructed
 * in the UI layer.
 *
 * @param candidate - the winning ThinkingCandidate (with terminosCoincidentes
 *                    already tagged with `superficie` by KeywordThinkingAlgorithm)
 * @param input     - original ThinkingRouterInput, used for pack name references
 */
export function buildExplicacionSeleccion(
  candidate: ThinkingCandidate,
  input: ThinkingRouterInput
): ExplicacionSeleccion {
  const { esFallback, motivoSeleccion, terminosCoincidentes, pattern } =
    candidate;

  // enfoqueBreve lives in metadata.json (ADR-0002). Use a generic fallback if
  // a future pattern omits it — avoids hard crash and signals the gap.
  const enfoqueBreve =
    (pattern.metadata as { enfoqueBreve?: string }).enfoqueBreve ??
    `aplicar el ${pattern.metadata.titulo}`;

  // ── 1. fuentePrincipal ────────────────────────────────────────────────────
  //
  // Derived from motivoSeleccion (set by ThinkingRouter from scoreProblema)
  // and from whether any KEYWORD match came from a pack surface.
  // Keyword matches from titulo/descripcion are not counted — they are weak
  // signals and mixing them with pack surfaces would mislead the explanation.
  let fuentePrincipal: ExplicacionSeleccion["fuentePrincipal"];

  if (esFallback) {
    fuentePrincipal = "fallback";
  } else if (motivoSeleccion === "contexto-del-pack") {
    fuentePrincipal = "contexto-pack";
  } else {
    // coincidencia-directa: check if any KEYWORD match came from a pack surface
    const hasPackKeyword = terminosCoincidentes.some(
      (t) =>
        t.campo === "keyword" &&
        (t.superficie === "packNombre" || t.superficie === "packContexto")
    );
    fuentePrincipal = hasPackKeyword ? "mixta" : "problema";
  }

  // ── 2. dimensionesDetectadas ──────────────────────────────────────────────
  //
  // Keyword matches only (campo === "keyword") — description/titulo matches
  // are too weak and too generic to cite as detected dimensions.
  // Filter neutral terms. Prefer problema-surface matches so the most
  // user-anchored evidence appears first.
  // Cap at 5 to keep the pill list scannable.
  const seen = new Set<string>();
  const dims: string[] = [];

  // Pass 1: problema surface first
  for (const t of terminosCoincidentes) {
    if (t.campo !== "keyword") continue;
    if (t.superficie !== "problema") continue;
    if (isNeutralTerm(t.termino)) continue;
    const key = normalizeText(t.termino);
    if (seen.has(key)) continue;
    seen.add(key);
    dims.push(t.termino);
    if (dims.length >= 5) break;
  }

  // Pass 2: pack surfaces (fills contexto-pack and mixta cases)
  if (dims.length < 5) {
    for (const t of terminosCoincidentes) {
      if (t.campo !== "keyword") continue;
      if (t.superficie === "problema") continue; // already handled
      if (isNeutralTerm(t.termino)) continue;
      const key = normalizeText(t.termino);
      if (seen.has(key)) continue;
      seen.add(key);
      dims.push(t.termino);
      if (dims.length >= 5) break;
    }
  }

  // ── 3. resumen ────────────────────────────────────────────────────────────
  //
  // Template-based. Never exposes scores, weights, or constant names.
  // Uses enfoqueBreve from metadata so the text stays knowledge-driven.
  const dimsText = dims.length > 0 ? joinDimensions(dims) : null;
  const packRef = input.packNombre
    ? `el área de ${input.packNombre}`
    : "el sector analizado";

  let resumen: string;

  if (fuentePrincipal === "fallback") {
    resumen =
      "El problema aún no contiene señales suficientes para recomendar un patrón " +
      "especializado. HELIOS propone comenzar con preguntas fundamentales para precisar " +
      "el diagnóstico, los supuestos y la evidencia disponible.";
  } else if (fuentePrincipal === "contexto-pack") {
    const signales = dimsText ? `señales de ${dimsText}` : "elementos relevantes";
    resumen =
      `Además de la formulación del problema, el contexto de ${packRef} muestra ` +
      `${signales} que orientan hacia ${enfoqueBreve}.`;
  } else if (fuentePrincipal === "mixta") {
    const signales = dimsText ? `señales de ${dimsText}` : "elementos relevantes";
    resumen =
      `La formulación del problema y el contexto de ${packRef} contienen ${signales}. ` +
      `Por eso HELIOS recomienda ${enfoqueBreve}.`;
  } else {
    // 'problema'
    if (dimsText) {
      resumen =
        `La formulación del problema contiene señales de ${dimsText}. ` +
        `Por eso HELIOS recomienda ${enfoqueBreve}.`;
    } else {
      resumen = `La naturaleza del problema orienta hacia ${enfoqueBreve}.`;
    }
  }

  return { resumen, dimensionesDetectadas: dims, fuentePrincipal };
}
