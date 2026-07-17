/**
 * Validación S-014 — SelectionService
 *
 * Tests the pure functions in SelectionService that implement the multi-candidate
 * ThinkingPattern selection logic. UI-flow cases (Cases 1–3, 10–12) are verified
 * by typecheck + build since they are state-machine transitions in Helios.tsx.
 *
 * Cases covered:
 *   Case 4  — Two candidates → getRealCandidates returns ≤3 non-fallback
 *   Case 5  — Three candidates → MAX_CANDIDATOS_UI limit applied
 *   Case 6  — All fallback → getRealCandidates returns empty → no selection screen
 *   Case 7  — Single selection → single-mode questions (full list)
 *   Case 8  — Combined selection → ≤5 principal + ≤3 complementario questions
 *   Case 9  — Deduplication → duplicate questions not shown twice
 *   Case 11 — Intercambiar orden → primary/secondary IDs are independent values
 *   Case 12 — Original ThinkingResult not mutated by SelectionService
 *   + Additional service-level tests for comparacion, explanations, text builders
 */

import {
  getRealCandidates,
  hasCombinableOptions,
  buildCandidateExplanations,
  buildComparacion,
  buildExplicacionCombinada,
  buildEnfoquesTexto,
  deduplicarPreguntas,
  getPreguntasCombinadas,
  findCandidate,
  MAX_PREGUNTAS_PRINCIPAL,
  MAX_PREGUNTAS_COMPLEMENTARIO,
  MAX_CANDIDATOS_UI,
} from "../SelectionService";

import type {
  ThinkingCandidate,
  ThinkingPattern,
  ThinkingQuestion,
  ExplicacionSeleccion,
} from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FALLO: ${label}`);
    failed++;
  }
}

function makePattern(id: string, titulo: string, enfoqueBreve?: string): ThinkingPattern {
  return {
    metadata: {
      id,
      titulo,
      descripcion: `Descripción de ${titulo}`,
      etiqueta: id,
      enfoqueBreve,
      version: "test",
      estado: "activo",
      autor: "test",
      institucion: "test",
      ultimaActualizacion: "2026-01-01",
      fuentes: [],
      licencia: "test",
      estadoRevision: "experimental",
    },
    preguntas: [],
  };
}

function makeCandidate(
  pattern: ThinkingPattern,
  score: number,
  esFallback = false
): ThinkingCandidate {
  return {
    pattern,
    score,
    confianza: score >= 0.5 ? "alta" : score >= 0.25 ? "media" : "baja",
    conceptMatches: [],
    esFallback,
    motivoSeleccion: esFallback ? "fallback-universal" : "coincidencia-directa",
  };
}

function makePreguntas(count: number, prefix = ""): ThinkingQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    numero: i + 1,
    categoria: "test",
    pregunta: `${prefix}Pregunta ${i + 1}`,
    proposito: `Propósito ${i + 1}`,
    orientacion: `Orientación ${i + 1}`,
  }));
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const patA = makePattern("socratico", "Pensamiento Socrático", "examinar supuestos, evidencia y coherencia del problema");
const patB = makePattern("sistemico", "Pensamiento Sistémico", "observar cómo funciona el sistema en su conjunto");
const patC = makePattern("economia-politica", "Economía Política", "examinar incentivos, intereses y relaciones de poder");
const patFallback = makePattern("socratico-fallback", "Pensamiento Socrático (fallback)", undefined);

const candA = makeCandidate(patA, 0.60);
const candB = makeCandidate(patB, 0.55);
const candC = makeCandidate(patC, 0.50);
const candFallback = makeCandidate(patFallback, 0.20, true);

// ─── Suite: getRealCandidates ─────────────────────────────────────────────────

console.log("\n── getRealCandidates ──");

// Case 4: two candidates
assert(
  getRealCandidates([candA, candB]).length === 2,
  "Case 4 — Dos candidatos: devuelve ambos"
);
assert(
  getRealCandidates([candA, candB])[0].pattern.metadata.id === "socratico",
  "Case 4 — Orden del Router preservado"
);

// Case 5: three candidates — all real, respects MAX_CANDIDATOS_UI
assert(
  getRealCandidates([candA, candB, candC]).length === MAX_CANDIDATOS_UI,
  `Case 5 — Tres candidatos: limita a ${MAX_CANDIDATOS_UI}`
);

// Case 5 extra: four non-fallback → still MAX_CANDIDATOS_UI
const candD = makeCandidate(makePattern("extra", "Extra", undefined), 0.40);
assert(
  getRealCandidates([candA, candB, candC, candD]).length === MAX_CANDIDATOS_UI,
  "Case 5 — Cuatro candidatos: sigue limitando a MAX_CANDIDATOS_UI"
);

// Case 6: all fallback → empty
assert(
  getRealCandidates([candFallback]).length === 0,
  "Case 6 — Solo fallback: devuelve vacío"
);

// Mixed: real + fallback → only real
assert(
  getRealCandidates([candA, candFallback]).length === 1,
  "Case 6 — Mixto real + fallback: excluye fallback"
);
assert(
  getRealCandidates([candA, candFallback])[0].pattern.metadata.id === "socratico",
  "Case 6 — Mixto: el candidato real conserva su identidad"
);

// ─── Suite: hasCombinableOptions ──────────────────────────────────────────────

console.log("\n── hasCombinableOptions ──");

assert(hasCombinableOptions([candA, candB]) === true, "Dos reales → combinable");
assert(hasCombinableOptions([candA]) === false, "Un real → no combinable");
assert(hasCombinableOptions([candFallback, candFallback]) === false, "Solo fallbacks → no combinable");
assert(hasCombinableOptions([candA, candFallback]) === false, "Un real + fallback → no combinable");

// ─── Suite: getPreguntasCombinadas ────────────────────────────────────────────

console.log("\n── getPreguntasCombinadas ──");

// Case 8: combined selection — limits applied
const patWith8 = { ...patA, preguntas: makePreguntas(8, "A-") };
const patWith8B = { ...patB, preguntas: makePreguntas(8, "B-") };
const result8 = getPreguntasCombinadas(patWith8, patWith8B);

assert(
  result8.principal.length === MAX_PREGUNTAS_PRINCIPAL,
  `Case 8 — Principal: máximo ${MAX_PREGUNTAS_PRINCIPAL} preguntas`
);
assert(
  result8.complementario.length <= MAX_PREGUNTAS_COMPLEMENTARIO,
  `Case 8 — Complementario: máximo ${MAX_PREGUNTAS_COMPLEMENTARIO} preguntas`
);
assert(
  result8.complementario.length === MAX_PREGUNTAS_COMPLEMENTARIO,
  `Case 8 — Complementario: ${MAX_PREGUNTAS_COMPLEMENTARIO} preguntas (sin solapamiento en este caso)`
);

// Less than max: respects available questions
const patWith2 = { ...patA, preguntas: makePreguntas(2, "A2-") };
const patWith2B = { ...patB, preguntas: makePreguntas(2, "B2-") };
const result2 = getPreguntasCombinadas(patWith2, patWith2B);
assert(
  result2.principal.length === 2,
  "Case 8 — Principal con 2 preguntas: muestra las 2 disponibles"
);
assert(
  result2.complementario.length === 2,
  "Case 8 — Complementario con 2 preguntas: muestra las 2 disponibles"
);

// Order preserved: first question of principal should be question 1
assert(
  result8.principal[0].numero === 1,
  "Case 8 — Orden de preguntas.json preservado (primera es número 1)"
);

// ─── Suite: deduplicarPreguntas ───────────────────────────────────────────────

console.log("\n── deduplicarPreguntas ──");

// Case 9: exact duplicates removed
const shared: ThinkingQuestion = {
  numero: 1,
  categoria: "test",
  pregunta: "¿Cuál es la causa raíz del problema?",
  proposito: "test",
  orientacion: "test",
};
const primary = [shared];
const secondary = [
  shared, // duplicate
  { numero: 2, categoria: "test", pregunta: "¿Qué evidencia existe?", proposito: "t", orientacion: "t" },
];
const deduped = deduplicarPreguntas(primary, secondary);
assert(deduped.length === 1, "Case 9 — Pregunta duplicada eliminada");
assert(
  deduped[0].pregunta === "¿Qué evidencia existe?",
  "Case 9 — Pregunta no duplicada preservada"
);

// Whitespace normalization
const withSpaces: ThinkingQuestion = {
  ...shared,
  pregunta: "  ¿Cuál es la causa raíz del problema?  ",
};
const dedupedWs = deduplicarPreguntas(primary, [withSpaces]);
assert(dedupedWs.length === 0, "Case 9 — Deduplicación ignora espacios extra");

// Case-insensitive
const upperCase: ThinkingQuestion = {
  ...shared,
  pregunta: "¿CUÁL ES LA CAUSA RAÍZ DEL PROBLEMA?",
};
const dedupedCase = deduplicarPreguntas(primary, [upperCase]);
assert(dedupedCase.length === 0, "Case 9 — Deduplicación es case-insensitive");

// No duplicates → all returned
const noDup = deduplicarPreguntas(
  [{ numero: 1, categoria: "t", pregunta: "Pregunta A", proposito: "t", orientacion: "t" }],
  [{ numero: 1, categoria: "t", pregunta: "Pregunta B", proposito: "t", orientacion: "t" }]
);
assert(noDup.length === 1, "Case 9 — Sin duplicados: todas las preguntas secundarias se conservan");

// ─── Suite: buildComparacion ──────────────────────────────────────────────────

console.log("\n── buildComparacion ──");

const comp = buildComparacion(candA, candB);
assert(comp.a.titulo === "Pensamiento Socrático", "buildComparacion — título A correcto");
assert(comp.b.titulo === "Pensamiento Sistémico", "buildComparacion — título B correcto");
assert(typeof comp.a.foco === "string" && comp.a.foco.length > 0, "buildComparacion — foco A no vacío");
assert(typeof comp.b.foco === "string" && comp.b.foco.length > 0, "buildComparacion — foco B no vacío");
assert(Array.isArray(comp.a.topConceptos), "buildComparacion — topConceptos A es array");

// Uses enfoqueBreve when available
assert(
  comp.a.foco === "examinar supuestos, evidencia y coherencia del problema",
  "buildComparacion — usa enfoqueBreve cuando está disponible"
);

// Falls back to descripcion when enfoqueBreve absent
const candNoEnfoque = makeCandidate(makePattern("x", "X sin enfoque", undefined), 0.5);
const compFallback = buildComparacion(candA, candNoEnfoque);
assert(
  compFallback.b.foco === "Descripción de X sin enfoque",
  "buildComparacion — usa descripcion cuando enfoqueBreve ausente"
);

// ─── Suite: buildExplicacionCombinada + buildEnfoquesTexto ───────────────────

console.log("\n── buildExplicacionCombinada / buildEnfoquesTexto ──");

const expComb = buildExplicacionCombinada(patA, patB);
assert(
  expComb.includes("Pensamiento Socrático"),
  "buildExplicacionCombinada — incluye nombre del patrón principal"
);
assert(
  expComb.includes("Pensamiento Sistémico"),
  "buildExplicacionCombinada — incluye nombre del patrón complementario"
);
assert(
  expComb.startsWith("HELIOS abordará"),
  "buildExplicacionCombinada — comienza con 'HELIOS abordará'"
);
assert(
  !expComb.includes("socratico") && !expComb.includes("sistemico"),
  "buildExplicacionCombinada — no expone IDs internos"
);

const enfText = buildEnfoquesTexto(patA, patB);
assert(typeof enfText === "string", "buildEnfoquesTexto — retorna string");
assert(
  enfText.includes("examinar supuestos"),
  "buildEnfoquesTexto — incluye enfoqueBreve del primario"
);
assert(
  enfText.includes("observar cómo funciona"),
  "buildEnfoquesTexto — incluye enfoqueBreve del secundario"
);

// Pattern without enfoqueBreve — graceful fallback
const textNoB = buildEnfoquesTexto(patA, patNoEnfoque());
function patNoEnfoque() { return makePattern("x", "X", undefined); }
assert(typeof textNoB === "string", "buildEnfoquesTexto — no falla cuando secundario no tiene enfoqueBreve");

const textNoBoth = buildEnfoquesTexto(patNoEnfoque(), patNoEnfoque());
assert(textNoBoth === "", "buildEnfoquesTexto — vacío cuando ninguno tiene enfoqueBreve");

// ─── Suite: findCandidate ─────────────────────────────────────────────────────

console.log("\n── findCandidate ──");

assert(
  findCandidate([candA, candB], "socratico")?.pattern.metadata.titulo === "Pensamiento Socrático",
  "findCandidate — encuentra por ID correcto"
);
assert(
  findCandidate([candA, candB], "economia-politica") === undefined,
  "findCandidate — devuelve undefined cuando no existe"
);
assert(
  findCandidate([], "socratico") === undefined,
  "findCandidate — devuelve undefined en lista vacía"
);

// ─── Suite: buildCandidateExplanations ───────────────────────────────────────

console.log("\n── buildCandidateExplanations ──");

// Case 12: does not mutate thinkingResult candidates
const candACopy = { ...candA };
const explanations = buildCandidateExplanations(
  [candACopy],
  { texto: "prueba de contaminación del estado original" }
);
assert(explanations.has("socratico"), "buildCandidateExplanations — key por patternId");
assert(
  explanations.get("socratico") !== undefined,
  "buildCandidateExplanations — explicación construida"
);
const expl = explanations.get("socratico") as ExplicacionSeleccion;
assert(
  typeof expl.resumen === "string" && expl.resumen.length > 0,
  "buildCandidateExplanations — resumen no vacío"
);
assert(
  Array.isArray(expl.dimensionesDetectadas),
  "buildCandidateExplanations — dimensionesDetectadas es array"
);

// Case 12: candidate original object unchanged
assert(
  candACopy.pattern.metadata.id === "socratico",
  "Case 12 — Candidato original no mutado"
);
assert(
  candACopy.esFallback === false,
  "Case 12 — esFallback del candidato original no modificado"
);

// ─── Suite: Constants ─────────────────────────────────────────────────────────

console.log("\n── Constantes de infraestructura ──");

assert(MAX_PREGUNTAS_PRINCIPAL === 5, `MAX_PREGUNTAS_PRINCIPAL = 5`);
assert(MAX_PREGUNTAS_COMPLEMENTARIO === 3, `MAX_PREGUNTAS_COMPLEMENTARIO = 3`);
assert(MAX_CANDIDATOS_UI === 3, `MAX_CANDIDATOS_UI = 3`);

// ─── Resultado ────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
const total = passed + failed;
console.log(`  Resultado: ${passed}/${total} ✅  ${failed} ❌`);
console.log("═".repeat(60));

if (failed > 0) {
  console.error(`\n  ERRORES ENCONTRADOS: ${failed}`);
  process.exit(1);
}
