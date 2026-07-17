/**
 * Thinking Engine smoke tests — runs outside Vite via tsx.
 *
 * v0.5.0 (S-011): ConceptualThinkingAlgorithm, ThinkingConcept model,
 * concept-name dimensionesDetectadas, S-011 mandatory cases (8) and
 * regression cases from S-010 validation (5).
 *
 * Usage:
 *   pnpm exec tsx src/thinking/__tests__/smoke.ts
 * from inside artifacts/juan-cobo-lab/
 */

import { ConceptualThinkingAlgorithm } from "../algorithms/ConceptualThinkingAlgorithm";
import { KeywordThinkingAlgorithm } from "../algorithms/KeywordThinkingAlgorithm";
import { ThinkingRouter } from "../ThinkingRouter";
import { THINKING_REGISTRY, type ThinkingRegistryEntry } from "../registry";
import { THINKING_THRESHOLDS } from "../constants";
import type {
  ThinkingPatternMetadata,
  ThinkingRouterInput,
  ExplicacionSeleccion,
} from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Decision =
  | "seleccionado:socratico"
  | "seleccionado:sistemico"
  | "seleccionado:dialectico-mock"
  | "candidatos-empate"
  | "candidatos-baja"
  | "ninguno";

async function think(
  router: ThinkingRouter,
  input: ThinkingRouterInput
): Promise<{
  decision: Decision;
  esFallback: boolean | null;
  motivoSeleccion: string | null;
  explicacion: ExplicacionSeleccion | null;
  scores: string;
}> {
  const result = await router.route(input);

  let decision: Decision;
  let esFallback: boolean | null = null;
  let motivoSeleccion: string | null = null;
  let explicacion: ExplicacionSeleccion | null = null;

  if (result.decision === "seleccionado") {
    decision = `seleccionado:${result.seleccionado.pattern.metadata.id}` as Decision;
    esFallback = result.seleccionado.esFallback;
    motivoSeleccion = result.seleccionado.motivoSeleccion;
    explicacion = result.explicacionSeleccion;
  } else if (result.decision === "candidatos") {
    decision =
      result.motivo === "empate" ? "candidatos-empate" : "candidatos-baja";
  } else {
    decision = "ninguno";
  }

  const scoreLines = (() => {
    if (result.decision === "ninguno") return "  (no candidates above threshold)";
    const candidates = result.candidatos;
    return candidates
      .map((c) => {
        const matchLines = c.conceptMatches
          .filter((m) => m.matchType !== "sinonimo" || c.conceptMatches.length <= 3) // trim verbose sinonimo clutter
          .slice(0, 8)
          .map(
            (m) =>
              `${m.matchType === "expresion" ? "📌" : "·"} "${m.matchedText}" [${m.conceptName}, ${m.matchType}, ${m.surface}]`
          )
          .join("\n      ");
        return (
          `  ${c.pattern.metadata.id}: ${Math.round(c.score * 1000) / 1000}` +
          ` (${c.confianza})` +
          ` esFallback=${c.esFallback} motivo=${c.motivoSeleccion}` +
          (matchLines ? `\n      ${matchLines}` : "")
        );
      })
      .join("\n");
  })();

  return { decision, esFallback, motivoSeleccion, explicacion, scores: scoreLines };
}

// ─── Production router (ConceptualThinkingAlgorithm, Socrático + Sistémico) ──

const prodRouter = new ThinkingRouter(new ConceptualThinkingAlgorithm());

// ─── Second-pattern mock (legacy keyword path, for registry injection test) ───

const dialecticoMeta: ThinkingPatternMetadata = {
  id: "dialectico-mock",
  titulo: "Análisis Dialéctico",
  descripcion:
    "Marco de análisis por contradicción: tesis, antítesis y síntesis aplicados a política pública.",
  etiqueta: "Dialéctico",
  keywords: [
    "tesis",
    "antítesis",
    "síntesis",
    "contradicción",
    "dialéctica",
    "tensión",
    "oposición",
  ],
  version: "0.1.0",
  estado: "activo",
  autor: "Juan Cobo Lab (mock)",
  institucion: "Juan Cobo Lab",
  ultimaActualizacion: "2026-07-17",
  fuentes: [],
  licencia: "Todos los derechos reservados",
  estadoRevision: "experimental",
};

const dialecticoEntry: ThinkingRegistryEntry = {
  metadata: dialecticoMeta,
  load: async () => ({
    preguntas: [
      {
        numero: 1,
        categoria: "tesis",
        pregunta: "¿Cuál es la tesis dominante sobre {{problema}}?",
        proposito: "Identificar el argumento principal del diagnóstico vigente.",
        orientacion:
          "Enuncia el argumento central tal como lo formula la política actual.",
      },
    ],
  }),
};

// Three-pattern router: Socrático + Sistémico + Dialéctico (legacy keyword mock)
const threePatternRouter = new ThinkingRouter(new ConceptualThinkingAlgorithm(), [
  ...THINKING_REGISTRY,
  dialecticoEntry,
]);

// ─── No-universal router (for "ninguno" test) ─────────────────────────────────

const sinUniversalMeta: ThinkingPatternMetadata = {
  id: "xilofono-mock",
  titulo: "Análisis de Xilófono",
  descripcion: "Patrón ficticio sin relación semántica con política pública.",
  etiqueta: "Xilófono",
  keywords: ["xilofono", "cuarteto", "fiordos", "jazz", "cromatica"],
  esUniversal: false,
  version: "0.1.0",
  estado: "activo",
  autor: "Test",
  institucion: "Test",
  ultimaActualizacion: "2026-07-17",
  fuentes: [],
  licencia: "Test",
  estadoRevision: "experimental",
};

const sinUniversalRouter = new ThinkingRouter(
  new ConceptualThinkingAlgorithm(),
  [{ metadata: sinUniversalMeta, load: async () => ({ preguntas: [] }) }]
);

// ─── Test cases ───────────────────────────────────────────────────────────────

const CASES: {
  router: ThinkingRouter;
  input: ThinkingRouterInput;
  expected: Decision;
  expectedEsFallback?: boolean;
  expectedMotivoSeleccion?: string;
  expectedFuentePrincipal?: ExplicacionSeleccion["fuentePrincipal"];
  expectedDimMinCount?: number;
  expectedDimNames?: string[];       // S-011: check concept names in dims
  expectedResumenContains?: string;
  label: string;
}[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // REGRESIONES — S-007 / S-008 (pattern selection invariants)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    router: prodRouter,
    input: { texto: "¿Por qué persiste la brecha digital en Colombia?" },
    expected: "seleccionado:socratico",
    label: "[REGR] Problema TIC genérico → Socrático seleccionado",
  },
  {
    router: prodRouter,
    input: { texto: "¿Por qué aumenta la deserción escolar en zonas rurales?" },
    expected: "seleccionado:socratico",
    label: "[REGR] Problema Educación genérico → Socrático seleccionado",
  },
  {
    router: prodRouter,
    input: {
      texto: "¿Qué supuestos y evidencia sostienen la política de conectividad?",
    },
    expected: "seleccionado:socratico",
    expectedEsFallback: false,
    expectedMotivoSeleccion: "coincidencia-directa",
    label: "[REGR] Keywords socrát. explícitas (supuestos + evidencia) → coincidencia-directa",
  },
  {
    router: prodRouter,
    input: {
      texto: "¿Cómo reducir la mortalidad materna en Colombia?",
      packId: "salud-publica-mock",
      packNombre: "Salud Pública",
      packContextoResumido:
        "Análisis de determinantes de salud y brechas territoriales en Colombia.",
    },
    expected: "seleccionado:socratico",
    label: "[REGR] packContextoResumido (salud pública, sin keywords sistémicas) → Socrático",
  },
  {
    router: threePatternRouter,
    input: {
      texto: "Analiza la tesis y antítesis de la política de conectividad rural",
    },
    expected: "seleccionado:dialectico-mock",
    label: "[REGR] Patrón Dialéctico legacy keyword → registry injection",
  },
  {
    router: prodRouter,
    input: { texto: "¿Por qué persiste la brecha digital en Colombia?" },
    expected: "seleccionado:socratico",
    label: "[REGR] Caché — misma consulta que test 1 devuelve mismo resultado",
  },
  {
    router: prodRouter,
    input: {
      texto: "¿Por qué persiste la brecha digital en Colombia?",
      packId: "tic",
      packNombre: "Tecnología de la Información y Comunicación",
      packContextoResumido:
        "Análisis de brecha digital, conectividad significativa, apropiación TIC y política pública.",
    },
    expected: "seleccionado:socratico",
    label: "[REGR] S-008 Pack TIC enriquecido → Socrático seleccionado",
  },
  {
    router: sinUniversalRouter,
    input: { texto: "¿Por qué persiste la brecha digital en Colombia?", packId: "tic" },
    expected: "ninguno",
    label: "[REGR] S-008 Sin patrón universal → ninguno",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // S-009 — motivoSeleccion / esFallback / Sistémico
  // ═══════════════════════════════════════════════════════════════════════════

  {
    router: prodRouter,
    input: {
      texto:
        "¿Qué supuestos y evidencia sustentan el diagnóstico sobre la política de brecha digital?",
    },
    expected: "seleccionado:socratico",
    expectedEsFallback: false,
    expectedMotivoSeleccion: "coincidencia-directa",
    label: "[S-009] Socrático por coincidencia-directa (supuestos + evidencia)",
  },
  {
    router: prodRouter,
    input: {
      texto:
        "¿Qué interdependencias y efectos indirectos entre actores generan las consecuencias no intencionadas de la retroalimentación en la política de conectividad?",
    },
    expected: "seleccionado:sistemico",
    label: "[S-009] Sistémico — interdependencias + efectos indirectos + retroalimentación",
  },
  {
    router: prodRouter,
    input: {
      texto:
        "¿Cómo se retroalimentan los efectos indirectos y consecuencias no intencionadas entre los actores interdependientes del sistema educativo?",
      packId: "tic",
      packNombre: "Tecnología de la Información y Comunicación",
      packContextoResumido:
        "Análisis de brecha digital, conectividad significativa y apropiación TIC entre docentes, operadores y comunidades rurales.",
    },
    expected: "seleccionado:sistemico",
    label: "[S-009] No penalización — Sistémico con pack TIC mantiene o mejora score",
  },
  {
    router: prodRouter,
    input: {
      texto: "¿Por qué no funciona bien la inversión pública en el sector?",
    },
    expected: "seleccionado:socratico",
    expectedEsFallback: true,
    expectedMotivoSeleccion: "fallback-universal",
    label: "[S-009] Fallback universal — esFallback=true, motivoSeleccion=fallback-universal",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // S-010 — ExplanationService: fuentePrincipal, dimensionesDetectadas, resumen
  // ═══════════════════════════════════════════════════════════════════════════

  {
    router: prodRouter,
    input: {
      texto:
        "¿Qué retroalimentación generan los efectos indirectos entre los actores interdependientes?",
    },
    expected: "seleccionado:sistemico",
    expectedFuentePrincipal: "problema",
    expectedDimMinCount: 2,
    label: "[S-010] Sistémico directo → fuentePrincipal='problema', dims≥2",
  },
  {
    router: prodRouter,
    input: {
      texto:
        "¿Qué supuestos y evidencia sustentan el diagnóstico sobre la deserción escolar?",
    },
    expected: "seleccionado:socratico",
    expectedEsFallback: false,
    expectedFuentePrincipal: "problema",
    expectedDimMinCount: 1,
    label: "[S-010] Socrático directo → fuentePrincipal='problema', dims≥1",
  },
  {
    router: prodRouter,
    input: {
      texto: "¿Por qué no funciona bien la inversión pública en el sector?",
    },
    expected: "seleccionado:socratico",
    expectedFuentePrincipal: "fallback",
    expectedResumenContains: "señales suficientes",
    label: "[S-010] Fallback → fuentePrincipal='fallback', resumen⊃'señales suficientes'",
  },
  {
    router: prodRouter,
    input: {
      texto: "¿Qué efectos indirectos tiene la reforma en la población?",
      packId: "sistemico-pack-test",
      packNombre: "Gestión Sistémica",
      packContextoResumido:
        "Sistema de retroalimentación entre actores interdependientes en la implementación de reformas.",
    },
    expected: "seleccionado:sistemico",
    expectedFuentePrincipal: "mixta",
    expectedDimMinCount: 2,
    label: "[S-010] Mixta — problema + pack → fuentePrincipal='mixta'",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // S-011 — Casos obligatorios (8 del spec)
  // ═══════════════════════════════════════════════════════════════════════════

  // Sistémico — Caso 1
  {
    router: prodRouter,
    input: {
      texto:
        "Los efectos no intencionados de la política han trasladado el problema hacia municipios vecinos.",
    },
    expected: "seleccionado:sistemico",
    expectedEsFallback: false,
    expectedFuentePrincipal: "problema",
    expectedDimNames: ["Efectos indirectos"],
    label: "[S-011.1] Sistémico — efectos no intencionados → activa Efectos indirectos",
  },

  // Sistémico — Caso 2
  {
    router: prodRouter,
    input: {
      texto:
        "El problema persiste a pesar del aumento de recursos y se refuerza por la falta de coordinación entre entidades.",
    },
    expected: "seleccionado:sistemico",
    expectedEsFallback: false,
    expectedFuentePrincipal: "problema",
    expectedDimMinCount: 2,
    label: "[S-011.2] Sistémico — persiste a pesar de + se refuerza + falta de coordinación → Retroalimentación + Estructuras",
  },

  // Sistémico — Caso 3
  {
    router: prodRouter,
    input: {
      texto:
        "Las barreras de acceso se explican por factores institucionales, territoriales y financieros que interactúan entre sí.",
    },
    expected: "seleccionado:sistemico",
    expectedEsFallback: false,
    expectedFuentePrincipal: "problema",
    expectedDimMinCount: 2,
    label: "[S-011.3] Sistémico — barreras de acceso + interactúan entre sí → Estructuras + Interdependencia (+ Causalidad)",
  },

  // Sistémico — Caso 4
  {
    router: prodRouter,
    input: {
      texto:
        "La política produce resultados diferentes en el corto y en el largo plazo.",
    },
    expected: "seleccionado:sistemico",
    expectedEsFallback: false,
    expectedFuentePrincipal: "problema",
    expectedDimNames: ["Comportamiento temporal"],
    label: "[S-011.4] Sistémico — corto y largo plazo → activa Comportamiento temporal",
  },

  // Socrático — Caso 5
  {
    router: prodRouter,
    input: {
      texto:
        "¿Qué supuestos sostienen el diagnóstico y qué evidencia permite validarlos?",
    },
    expected: "seleccionado:socratico",
    expectedEsFallback: false,
    expectedFuentePrincipal: "problema",
    expectedDimNames: ["Supuestos", "Evidencia"],
    label: "[S-011.5] Socrático — supuestos + evidencia → activa Supuestos y Evidencia",
  },

  // Socrático — Caso 6
  {
    router: prodRouter,
    input: {
      texto:
        "La política concluye que el bajo desempeño se debe a falta de recursos, pero no explica cómo llegó a esa conclusión.",
    },
    expected: "seleccionado:socratico",
    expectedEsFallback: false,
    expectedFuentePrincipal: "problema",
    expectedDimMinCount: 1,
    label: "[S-011.6] Socrático — no explica cómo llegó a esa conclusión → Coherencia argumentativa",
  },

  // Socrático — Caso 7
  {
    router: prodRouter,
    input: {
      texto:
        "¿Qué actores o perspectivas no fueron incluidos en la formulación del problema?",
    },
    expected: "seleccionado:socratico",
    expectedEsFallback: false,
    expectedFuentePrincipal: "problema",
    expectedDimMinCount: 1,
    label: "[S-011.7] Socrático — no fueron incluidos + formulación del problema → Perspectivas ausentes",
  },

  // Fallback — Caso 8
  {
    router: prodRouter,
    input: { texto: "Quiero revisar una política pública." },
    expected: "seleccionado:socratico",
    expectedEsFallback: true,
    expectedFuentePrincipal: "fallback",
    expectedDimMinCount: 0,
    expectedResumenContains: "señales suficientes",
    label: "[S-011.8] Fallback puro — 'revisar una política pública' → Socrático universal, sin dims",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // S-011 — Regresiones de S-010 validation (los 5 casos que fallaban)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    router: prodRouter,
    input: {
      texto:
        "¿Qué factores del sistema de salud colombiano generan las barreras de acceso para la población rural?",
    },
    expected: "seleccionado:sistemico",
    expectedEsFallback: false,
    label: "[S-011.R1] (C02 validación) Sistémico — barreras de acceso + sistema → corrige regresión",
  },
  {
    router: prodRouter,
    input: {
      texto:
        "¿Por qué la deforestación en la Amazonía colombiana continúa a pesar de los incentivos de conservación?",
    },
    expected: "seleccionado:sistemico",
    expectedEsFallback: false,
    label: "[S-011.R2] (C04 validación) Sistémico — continúa a pesar de → corrige regresión",
  },
  {
    router: prodRouter,
    input: {
      texto:
        "¿Qué interdependencias entre el sistema de transporte público y la economía informal generan la congestión crónica en Bogotá?",
    },
    expected: "seleccionado:sistemico",
    expectedEsFallback: false,
    label: "[S-011.R3] (C06 validación) Sistémico — interdependencias → corrige regresión",
  },
  {
    router: prodRouter,
    input: {
      texto:
        "¿Qué efectos no intencionados genera la política de cuotas de género en la carrera administrativa sobre la cultura organizacional?",
    },
    expected: "seleccionado:sistemico",
    expectedEsFallback: false,
    label: "[S-011.R4] (C09 validación) Sistémico — efectos no intencionados → corrige regresión",
  },
  {
    router: prodRouter,
    input: {
      texto:
        "¿Cómo reducir la reincidencia delictiva en jóvenes egresados del sistema de responsabilidad penal?",
      packId: "seguridad-ciudadana",
      packNombre: "Seguridad Ciudadana y Justicia Juvenil",
      packContextoResumido:
        "Factores de riesgo, trayectorias delictivas, reintegración social, efectividad de las intervenciones de rehabilitación y retroalimentación entre sistema penal y exclusión social.",
    },
    expected: "seleccionado:sistemico",
    expectedEsFallback: false,
    label: "[S-011.R5] (C12 validación) Sistémico — sistema + retroalimentación en pack → corrige regresión",
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  HELIOS · Thinking Engine — Smoke Tests (v0.5.0 / S-011)");
console.log(
  `  Umbrales: ninguna=${THINKING_THRESHOLDS.ninguna}  baja=${THINKING_THRESHOLDS.baja}  alta=${THINKING_THRESHOLDS.alta}  tieDelta=${THINKING_THRESHOLDS.tieDelta}  floor=${THINKING_THRESHOLDS.universalFloor}`
);
console.log("═══════════════════════════════════════════════════════════\n");

for (let i = 0; i < CASES.length; i++) {
  const tc = CASES[i];
  const { decision, esFallback, motivoSeleccion, explicacion, scores } =
    await think(tc.router, tc.input);

  let ok = decision === tc.expected;

  if (ok && tc.expectedEsFallback !== undefined && esFallback !== null) {
    if (esFallback !== tc.expectedEsFallback) ok = false;
  }
  if (ok && tc.expectedMotivoSeleccion !== undefined && motivoSeleccion !== null) {
    if (motivoSeleccion !== tc.expectedMotivoSeleccion) ok = false;
  }
  if (ok && tc.expectedFuentePrincipal !== undefined) {
    if (explicacion?.fuentePrincipal !== tc.expectedFuentePrincipal) ok = false;
  }
  if (ok && tc.expectedDimMinCount !== undefined) {
    if ((explicacion?.dimensionesDetectadas.length ?? 0) < tc.expectedDimMinCount) ok = false;
  }
  if (ok && tc.expectedDimNames !== undefined) {
    const gotDims = explicacion?.dimensionesDetectadas ?? [];
    for (const name of tc.expectedDimNames) {
      if (!gotDims.includes(name)) { ok = false; break; }
    }
  }
  if (ok && tc.expectedResumenContains !== undefined) {
    if (!explicacion?.resumen.includes(tc.expectedResumenContains)) ok = false;
  }

  if (ok) passed++; else failed++;

  const icon = ok ? "✅" : "❌";
  console.log(`${icon} [${i + 1}] ${tc.label}`);
  console.log(`   texto    : "${tc.input.texto.slice(0, 88)}${tc.input.texto.length > 88 ? "…" : ""}"`);
  if (tc.input.packId) console.log(`   pack     : ${tc.input.packId}`);

  let expectedStr = `${tc.expected}`;
  if (tc.expectedEsFallback !== undefined) expectedStr += `  esFallback=${tc.expectedEsFallback}`;
  if (tc.expectedMotivoSeleccion) expectedStr += `  motivo=${tc.expectedMotivoSeleccion}`;
  if (tc.expectedFuentePrincipal) expectedStr += `  fuente=${tc.expectedFuentePrincipal}`;
  if (tc.expectedDimMinCount !== undefined) expectedStr += `  dims≥${tc.expectedDimMinCount}`;
  if (tc.expectedDimNames) expectedStr += `  names=[${tc.expectedDimNames.join(",")}]`;

  let obtStr = `${decision}`;
  if (esFallback !== null) obtStr += `  esFallback=${esFallback}`;
  if (motivoSeleccion) obtStr += `  motivo=${motivoSeleccion}`;
  if (explicacion) {
    obtStr += `  fuente=${explicacion.fuentePrincipal}`;
    obtStr += `  dims=[${explicacion.dimensionesDetectadas.join(", ")}]`;
  }

  console.log(`   Esperado : ${expectedStr}`);
  console.log(`   Obtenido : ${obtStr}`);
  if (explicacion && explicacion.resumen) {
    console.log(`   Resumen  : "${explicacion.resumen.slice(0, 110)}${explicacion.resumen.length > 110 ? "…" : ""}"`);
  }
  console.log(`   Scores   :\n${scores}`);
  console.log();
}

// ─── Cache verification ───────────────────────────────────────────────────────

console.log("── Cache verification ─────────────────────────────────────");
{
  const cacheRouter = new ThinkingRouter(new ConceptualThinkingAlgorithm());
  const q = "¿Qué interdependencias y efectos indirectos entre actores generan las consecuencias no intencionadas?";

  const r1 = await cacheRouter.route({ texto: q, packId: "tic" });
  const r2 = await cacheRouter.route({ texto: q, packId: "tic" });
  const cacheHit = r1 === r2;
  if (cacheHit) passed++; else failed++;
  console.log(`${cacheHit ? "✅" : "❌"} [Cache-A] Misma instancia → caché hit (referencia idéntica)`);

  cacheRouter.clearCache();
  const r3 = await cacheRouter.route({ texto: q, packId: "tic" });
  const cacheCleared = r3 !== r2;
  if (cacheCleared) passed++; else failed++;
  console.log(`${cacheCleared ? "✅" : "❌"} [Cache-B] clearCache() → nuevo resultado`);

  const r_tic = await cacheRouter.route({ texto: q, packId: "tic" });
  const r_edu = await cacheRouter.route({ texto: q, packId: "educacion" });
  const cacheDiff = r_tic !== r_edu;
  if (cacheDiff) passed++; else failed++;
  console.log(`${cacheDiff ? "✅" : "❌"} [Cache-C] Mismo texto, distinto packId → entradas diferenciadas`);

  const r_tic2 = await cacheRouter.route({ texto: q, packId: "tic" });
  const cacheSame = r_tic === r_tic2;
  if (cacheSame) passed++; else failed++;
  console.log(`${cacheSame ? "✅" : "❌"} [Cache-D] Mismo texto + mismo packId → caché hit`);
}

// ─── No-penalización: pack context never reduces score ────────────────────────

console.log();
console.log("── No-penalización: contexto adicional no reduce score ────");
{
  const npRouter = new ThinkingRouter(new ConceptualThinkingAlgorithm());
  const texto =
    "¿Qué interdependencias y efectos indirectos entre actores generan las consecuencias no intencionadas?";

  const sinContexto = await npRouter.route({ texto });
  const conContexto = await npRouter.route({
    texto,
    packId: "tic",
    packNombre: "Tecnología de la Información y Comunicación",
    packContextoResumido: "Infraestructura TIC, brecha digital, conectividad y apropiación en zonas rurales.",
  });

  const getScore = (r: typeof sinContexto) =>
    r.decision === "seleccionado"
      ? r.seleccionado.score
      : r.decision === "candidatos"
      ? r.candidatos[0]?.score ?? 0
      : 0;

  const s1 = getScore(sinContexto);
  const s2 = getScore(conContexto);
  const nopen = s2 >= s1;
  if (nopen) passed++; else failed++;
  console.log(`${nopen ? "✅" : "❌"} Score sin contexto=${Math.round(s1*1000)/1000} ≤ score con contexto=${Math.round(s2*1000)/1000}`);
}

// ─── Dims son nombres conceptuales (no tokens crudos) ─────────────────────────

console.log();
console.log("── Dimensiones: nombres conceptuales, no tokens literales ──");
{
  const r = await new ThinkingRouter(new ConceptualThinkingAlgorithm()).route({
    texto: "¿Qué supuestos y evidencia sustentan el diagnóstico?",
  });
  if (r.decision === "seleccionado") {
    const dims = r.explicacionSeleccion.dimensionesDetectadas;
    // Concept names start with uppercase (Supuestos, Evidencia)
    const allCapitalized = dims.length > 0 && dims.every((d) => d[0] === d[0].toUpperCase());
    // Should NOT be raw tokens like "supuestos" (lowercase) but "Supuestos" (capital S)
    const noRawTokens = !dims.some((d) => d === d.toLowerCase() && d.length < 6);
    const ok = allCapitalized && dims.length >= 1;
    if (ok) passed++; else failed++;
    console.log(`${ok ? "✅" : "❌"} Dims son nombres conceptuales (capitalizados): [${dims.join(", ")}]`);
  } else {
    failed++;
    console.log("❌ No se obtuvo seleccionado para verificar dims");
  }
}

// ─── Resumen no expone scores ni constantes internas ─────────────────────────

console.log();
console.log("── Resumen: sin scores, pesos ni constantes internas ──────");
{
  const r = await new ThinkingRouter(new ConceptualThinkingAlgorithm()).route({
    texto:
      "¿Qué efectos indirectos y retroalimentación generan los actores interdependientes?",
  });
  if (r.decision === "seleccionado") {
    const resumen = r.explicacionSeleccion.resumen;
    const noScore = !/\d+\.\d+/.test(resumen);
    const noWeight = !/(peso|weight|SCORING|THRESHOLD|ninguna|baja|alta)/.test(resumen);
    const noField = !/(keyword|campo|esFrase|superficie|conceptId|matchType)/.test(resumen);
    const ok = noScore && noWeight && noField;
    if (ok) passed++; else failed++;
    console.log(`${ok ? "✅" : "❌"} Resumen limpio de artefactos internos`);
    if (!noScore) console.log("   ⚠ número decimal encontrado");
    if (!noWeight) console.log("   ⚠ término de peso/umbral encontrado");
    if (!noField) console.log("   ⚠ campo interno encontrado");
  } else {
    failed++;
    console.log("❌ No se obtuvo seleccionado");
  }
}

// ─── Tercer patrón (legacy keyword) no rompe el router ───────────────────────

console.log();
console.log("── Compatibilidad: tercer patrón legacy keyword ───────────");
{
  const r = await threePatternRouter.route({
    texto: "Analiza la tesis y antítesis de la política de conectividad rural",
  });
  const ok = r.decision === "seleccionado" && r.seleccionado.pattern.metadata.id === "dialectico-mock";
  if (ok) passed++; else failed++;
  console.log(`${ok ? "✅" : "❌"} Dialéctico legacy keyword seleccionado sin modificar el algoritmo`);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log();
console.log("═══════════════════════════════════════════════════════════");
console.log(`  Resultado: ${passed}/${passed + failed} ✅  ${failed} ❌`);
console.log("═══════════════════════════════════════════════════════════\n");

if (failed > 0) process.exit(1);
