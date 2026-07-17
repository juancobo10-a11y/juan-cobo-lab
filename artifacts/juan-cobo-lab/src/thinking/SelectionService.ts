/**
 * SelectionService — centralizes candidate filtering, explanation building,
 * comparison, deduplication, and question limiting for the multi-candidate
 * ThinkingPattern selection flow (S-014).
 *
 * All functions are pure: same inputs → same output, no side effects.
 * No UI logic. No LLM calls. All knowledge comes from metadata (ADR-0002).
 *
 * Used by:
 *   - Helios.tsx: to compute perequeMode and pass data to PantallaSeleccionThinkingPattern
 *   - PantallaSeleccionThinkingPattern: receives pre-computed data from Helios
 */

import { buildExplicacionSeleccion } from "./ExplanationService";
import type {
  ThinkingCandidate,
  ThinkingPattern,
  ThinkingQuestion,
  ExplicacionSeleccion,
  ThinkingRouterInput,
} from "./types";

// ─── Infrastructure constants (not domain knowledge) ─────────────────────────
//
// These control how questions are presented in combined mode.
// Defined here so they are easy to change without touching UI or metadata.

/** Maximum questions shown for the primary pattern in combined mode. */
export const MAX_PREGUNTAS_PRINCIPAL = 5;

/** Maximum questions shown for the secondary pattern in combined mode. */
export const MAX_PREGUNTAS_COMPLEMENTARIO = 3;

/**
 * Maximum number of candidates shown in the selection UI.
 * When the Router returns more, only the first MAX_CANDIDATOS_UI are displayed
 * (Router ordering is preserved — not reordered here).
 * Documented per spec §5.
 */
export const MAX_CANDIDATOS_UI = 3;

// ─── Candidate filtering ──────────────────────────────────────────────────────

/**
 * Returns the real (non-fallback) candidates from Router output, limited to
 * MAX_CANDIDATOS_UI and preserving the Router's ordering.
 *
 * Fallback candidates are excluded: they represent the universal floor, not
 * a specialized recommendation. The UI must never label a fallback as a
 * "second-best option" (spec §14).
 *
 * Edge case: if all candidates are fallback, returns an empty array — the
 * caller should route directly to hipótesis without showing the selection screen.
 */
export function getRealCandidates(candidates: ThinkingCandidate[]): ThinkingCandidate[] {
  return candidates.filter((c) => !c.esFallback).slice(0, MAX_CANDIDATOS_UI);
}

/**
 * Returns true when there are at least two real (non-fallback) candidates.
 * Used to decide whether to offer the "Combinar dos enfoques" option.
 */
export function hasCombinableOptions(candidates: ThinkingCandidate[]): boolean {
  return candidates.filter((c) => !c.esFallback).length >= 2;
}

// ─── Explanation building ─────────────────────────────────────────────────────

/**
 * Builds an ExplicacionSeleccion for each candidate, keyed by patternId.
 *
 * Reuses ExplanationService so candidate explanations are consistent with the
 * explanation a user would see if that pattern had been the sole winner.
 * Called once when the Router runs; result is stored in Helios state.
 */
export function buildCandidateExplanations(
  candidates: ThinkingCandidate[],
  input: ThinkingRouterInput
): Map<string, ExplicacionSeleccion> {
  const map = new Map<string, ExplicacionSeleccion>();
  for (const c of candidates) {
    const id = c.pattern.metadata.id;
    if (!map.has(id)) {
      map.set(id, buildExplicacionSeleccion(c, input));
    }
  }
  return map;
}

// ─── Comparison ("¿En qué se diferencian?") ──────────────────────────────────

/**
 * Builds a generic, metadata-driven comparison between two candidates.
 *
 * Uses enfoqueBreve (one-sentence description from metadata) and the
 * human-readable names of the top detected concepts. Never hardcodes
 * pattern-pair-specific text — reads only from metadata (ADR-0002).
 *
 * Shown only when there are exactly two candidates (spec §6).
 */
export function buildComparacion(
  a: ThinkingCandidate,
  b: ThinkingCandidate
): {
  a: { titulo: string; foco: string; topConceptos: string[] };
  b: { titulo: string; foco: string; topConceptos: string[] };
} {
  const getTopConceptos = (c: ThinkingCandidate): string[] => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const m of c.conceptMatches) {
      if (names.length >= 3) break;
      if (m.surface === "problema" && !seen.has(m.conceptId)) {
        seen.add(m.conceptId);
        names.push(m.conceptName);
      }
    }
    // Fall back to all surfaces if problema surface had no matches
    if (names.length === 0) {
      for (const m of c.conceptMatches) {
        if (names.length >= 3) break;
        if (!seen.has(m.conceptId)) {
          seen.add(m.conceptId);
          names.push(m.conceptName);
        }
      }
    }
    return names;
  };

  return {
    a: {
      titulo: a.pattern.metadata.titulo,
      foco: a.pattern.metadata.enfoqueBreve ?? a.pattern.metadata.descripcion,
      topConceptos: getTopConceptos(a),
    },
    b: {
      titulo: b.pattern.metadata.titulo,
      foco: b.pattern.metadata.enfoqueBreve ?? b.pattern.metadata.descripcion,
      topConceptos: getTopConceptos(b),
    },
  };
}

// ─── Combined explanation ─────────────────────────────────────────────────────

/**
 * Builds the header sentence shown before combined preguntas.
 * Derived generically from pattern titles — no pair-specific text (ADR-0002).
 *
 * @example
 * "HELIOS abordará primero el problema desde Economía Política y después
 *  incorporará Pensamiento Sistémico para ampliar el análisis."
 */
export function buildExplicacionCombinada(
  primary: ThinkingPattern,
  secondary: ThinkingPattern
): string {
  return (
    `HELIOS abordará primero el problema desde ${primary.metadata.titulo} ` +
    `y después incorporará ${secondary.metadata.titulo} para ampliar el análisis.`
  );
}

/**
 * Builds the second line of the combined explanation using enfoqueBreve.
 * Generic: reads from metadata, never hardcodes pattern-specific phrasing.
 *
 * @example
 * "Primero se examinarán los incentivos, intereses y relaciones de poder.
 *  Después se analizarán las relaciones, retroalimentaciones y efectos indirectos."
 */
export function buildEnfoquesTexto(
  primary: ThinkingPattern,
  secondary: ThinkingPattern
): string {
  const pBrief = primary.metadata.enfoqueBreve;
  const sBrief = secondary.metadata.enfoqueBreve;
  if (!pBrief && !sBrief) return "";
  if (!pBrief) return `Después se analizarán ${sBrief}.`;
  if (!sBrief) return `Primero se examinarán ${pBrief}.`;
  return `Primero se examinarán ${pBrief}. Después se analizarán ${sBrief}.`;
}

// ─── Question deduplication ───────────────────────────────────────────────────

/**
 * Returns a copy of `secondary` preguntas with any question whose text
 * (normalized: trimmed + lowercased) matches a question in `primary` removed.
 *
 * Deduplication criterion: normalized pregunta text.
 * `numero` is local within a pattern so cannot serve as a global dedup key.
 * Documented per spec §9.
 */
export function deduplicarPreguntas(
  primary: ThinkingQuestion[],
  secondary: ThinkingQuestion[]
): ThinkingQuestion[] {
  const normalize = (s: string) => s.trim().toLowerCase();
  const primarySet = new Set(primary.map((p) => normalize(p.pregunta)));
  return secondary.filter((q) => !primarySet.has(normalize(q.pregunta)));
}

// ─── Question limits for combined mode ───────────────────────────────────────

/**
 * Returns the limited and deduplicated question sets for combined mode.
 *
 * Rules (spec §10):
 * - Primary: up to MAX_PREGUNTAS_PRINCIPAL questions, in preguntas.json order.
 * - Secondary: deduplicated against primary, then limited to MAX_PREGUNTAS_COMPLEMENTARIO.
 * - No new ordering heuristics; no per-question scoring.
 */
export function getPreguntasCombinadas(
  primary: ThinkingPattern,
  secondary: ThinkingPattern
): {
  principal: ThinkingQuestion[];
  complementario: ThinkingQuestion[];
} {
  const principal = primary.preguntas.slice(0, MAX_PREGUNTAS_PRINCIPAL);
  const deduped = deduplicarPreguntas(principal, secondary.preguntas);
  const complementario = deduped.slice(0, MAX_PREGUNTAS_COMPLEMENTARIO);
  return { principal, complementario };
}

// ─── Candidate lookup ─────────────────────────────────────────────────────────

/** Finds a candidate by patternId in an array. Returns undefined if not found. */
export function findCandidate(
  candidates: ThinkingCandidate[],
  patternId: string
): ThinkingCandidate | undefined {
  return candidates.find((c) => c.pattern.metadata.id === patternId);
}
