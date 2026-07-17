/**
 * ExplanationService — builds human-readable explanations from ThinkingRouter
 * output without exposing internal scores, weights, or constant names.
 *
 * S-010 requirement: the logic that turns routing signals into user-facing
 * text must live here, not dispersed in Helios.tsx.
 *
 * S-011 update: now reads from ThinkingCandidate.conceptMatches
 * (ThinkingConceptMatch[]) instead of the deprecated terminosCoincidentes.
 * dimensionesDetectadas now contains human-readable concept names
 * (ThinkingConcept.nombre, e.g. "Retroalimentación") — never raw keyword
 * tokens or internal identifiers.
 *
 * Contract:
 *   - Pure function: same inputs → same output, no side effects.
 *   - No LLM calls.
 *   - No direct metadata imports from React code.
 *   - Output must be intelligible to non-technical users.
 */

import type {
  ThinkingCandidate,
  ExplicacionSeleccion,
  ThinkingRouterInput,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Joins a list of names as a natural Spanish enumeration.
 *   []            → ""
 *   ["A"]         → "A"
 *   ["A","B"]     → "A y B"
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
 * @param candidate - the winning ThinkingCandidate (with conceptMatches
 *                    tagged with surface by ConceptualThinkingAlgorithm)
 * @param input     - original ThinkingRouterInput, used for pack name references
 */
export function buildExplicacionSeleccion(
  candidate: ThinkingCandidate,
  input: ThinkingRouterInput
): ExplicacionSeleccion {
  const { esFallback, motivoSeleccion, conceptMatches, pattern } = candidate;

  const enfoqueBreve =
    (pattern.metadata as { enfoqueBreve?: string }).enfoqueBreve ??
    `aplicar el ${pattern.metadata.titulo}`;

  // ── 1. fuentePrincipal ────────────────────────────────────────────────────
  //
  // Derived from motivoSeleccion (set by ThinkingRouter from scoreProblema)
  // and from whether any match came from a pack surface.
  //
  // Only expresion/termino matches count for the pack-surface check — a weak
  // sinonimo match in the pack is not prominent enough to change the narrative
  // from "problema" to "mixta".
  let fuentePrincipal: ExplicacionSeleccion["fuentePrincipal"];

  if (esFallback) {
    fuentePrincipal = "fallback";
  } else if (motivoSeleccion === "contexto-del-pack") {
    fuentePrincipal = "contexto-pack";
  } else {
    // coincidencia-directa: check if any significant match came from a pack surface
    const hasSignificantPackMatch = conceptMatches.some(
      (m) =>
        (m.surface === "packNombre" || m.surface === "packContexto") &&
        m.matchType !== "sinonimo"
    );
    fuentePrincipal = hasSignificantPackMatch ? "mixta" : "problema";
  }

  // ── 2. dimensionesDetectadas ──────────────────────────────────────────────
  //
  // S-011: unique concept NAMES (ThinkingConcept.nombre), not raw keyword tokens.
  // conceptMatches are ordered: problema first, then pack surfaces.
  // First occurrence of each conceptId wins → problema-surface concepts appear first.
  // Cap at 5 to keep the pill list scannable.
  //
  // Legacy-keyword matches (conceptId='legacy-keyword') use matchedText as the
  // display name for backward compatibility with unmigrated patterns in tests.
  const seenConceptIds = new Set<string>();
  const dims: string[] = [];

  for (const m of conceptMatches) {
    if (dims.length >= 5) break;

    // Dedup key: per concept (or per matched text for legacy)
    const key =
      m.conceptId === "legacy-keyword"
        ? `lk:${m.matchedText.toLowerCase()}`
        : m.conceptId;

    if (seenConceptIds.has(key)) continue;
    seenConceptIds.add(key);
    dims.push(m.conceptName); // always the human-readable name
  }

  // ── 3. resumen ────────────────────────────────────────────────────────────
  //
  // Template-based. Never exposes scores, weights, or constant names.
  // Uses concept names and enfoqueBreve from metadata so the text is
  // knowledge-driven and consistent with what the router detected.
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
    // "problema"
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
