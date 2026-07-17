/**
 * Thinking Engine smoke tests — runs outside Vite via tsx.
 *
 * Tests the full ThinkingRouter (including async score, cache, and
 * injectable registry) against acceptance criteria.
 *
 * v0.3.0 (S-009): adds Pensamiento Sistémico pattern, separate-surface
 * scoring (scoreProblema / scoreNombrePack / scoreContextoPack), explicit
 * esFallback and motivoSeleccion on ThinkingCandidate.
 *
 * Usage:
 *   pnpm exec tsx src/thinking/__tests__/smoke.ts
 * from inside artifacts/juan-cobo-lab/
 */

import { KeywordThinkingAlgorithm } from "../algorithms/KeywordThinkingAlgorithm";
import { ThinkingRouter } from "../ThinkingRouter";
import { THINKING_REGISTRY, type ThinkingRegistryEntry } from "../registry";
import { THINKING_THRESHOLDS } from "../constants";
import type { ThinkingPatternMetadata, ThinkingRouterInput } from "../types";

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
  scores: string;
}> {
  const result = await router.route(input);

  let decision: Decision;
  let esFallback: boolean | null = null;
  let motivoSeleccion: string | null = null;

  if (result.decision === "seleccionado") {
    decision = `seleccionado:${result.seleccionado.pattern.metadata.id}` as Decision;
    esFallback = result.seleccionado.esFallback;
    motivoSeleccion = result.seleccionado.motivoSeleccion;
  } else if (result.decision === "candidatos") {
    decision =
      result.motivo === "empate" ? "candidatos-empate" : "candidatos-baja";
  } else {
    decision = "ninguno";
  }

  const scoreLines = (() => {
    if (result.decision === "ninguno") return "  (no candidates above threshold)";
    const candidates =
      result.decision === "seleccionado"
        ? result.candidatos
        : result.candidatos;
    return candidates
      .map((c) => {
        const terms = c.terminosCoincidentes
          .map(
            (t) =>
              `${t.esFrase ? "📌" : "·"} "${t.termino}" [${t.campo}, ${t.peso}]`
          )
          .join("\n      ");
        return (
          `  ${c.pattern.metadata.id}: ${Math.round(c.score * 1000) / 1000}` +
          ` (${c.confianza})` +
          ` esFallback=${c.esFallback} motivo=${c.motivoSeleccion}` +
          (terms ? `\n      ${terms}` : "")
        );
      })
      .join("\n");
  })();

  return { decision, esFallback, motivoSeleccion, scores: scoreLines };
}

// ─── Production router (Socrático + Sistémico) ───────────────────────────────

const prodRouter = new ThinkingRouter(new KeywordThinkingAlgorithm());

// ─── Second-pattern mock (for regression test 5) ──────────────────────────────
// Demonstrates registry injection — unchanged from S-008.

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

// Three-pattern router: production (Socrático + Sistémico) + Dialéctico (injected)
const threePatternRouter = new ThinkingRouter(new KeywordThinkingAlgorithm(), [
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
  new KeywordThinkingAlgorithm(),
  [{ metadata: sinUniversalMeta, load: async () => ({ preguntas: [] }) }]
);

// ─── Test cases ───────────────────────────────────────────────────────────────

const CASES: {
  router: ThinkingRouter;
  input: ThinkingRouterInput;
  expected: Decision;
  expectedEsFallback?: boolean;
  expectedMotivoSeleccion?: string;
  label: string;
}[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // REGRESIONES — v0.1 / S-007 / S-008
  // ═══════════════════════════════════════════════════════════════════════════

  {
    router: prodRouter,
    input: { texto: "¿Por qué persiste la brecha digital en Colombia?" },
    expected: "seleccionado:socratico",
    label: "[REGR] Problema TIC → Socrático seleccionado",
  },
  {
    router: prodRouter,
    input: { texto: "¿Por qué aumenta la deserción escolar en zonas rurales?" },
    expected: "seleccionado:socratico",
    label: "[REGR] Problema Educación → Socrático seleccionado",
  },
  {
    router: prodRouter,
    input: {
      texto: "¿Qué supuestos y evidencia sostienen la política de conectividad?",
    },
    expected: "seleccionado:socratico",
    label: "[REGR] Keywords explícitas (supuestos + evidencia) → Socrático",
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
    label: "[REGR] packContextoResumido (salud pública) → Socrático seleccionado",
  },
  {
    // Three-pattern registry: Sistémico (specific), Socrático (universal), Dialéctico (mock)
    router: threePatternRouter,
    input: {
      texto: "Analiza la tesis y antítesis de la política de conectividad rural",
    },
    expected: "seleccionado:dialectico-mock",
    label: "[REGR] Patrón Dialéctico descubierto por registry injection",
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
    router: prodRouter,
    input: {
      texto: "¿Por qué aumenta la deserción escolar en zonas rurales?",
      packId: "educacion",
      packNombre: "Educación",
      packContextoResumido:
        "Análisis de deserción escolar, cobertura educativa y condiciones socioeconómicas en zonas rurales.",
    },
    expected: "seleccionado:socratico",
    label: "[REGR] S-008 Pack Educación enriquecido → Socrático seleccionado",
  },
  {
    router: prodRouter,
    input: {
      texto: "Mejorar el acceso a internet en escuelas rurales",
      packId: "tic",
      packNombre: "Tecnología de la Información y Comunicación",
      packContextoResumido:
        "Infraestructura TIC, conectividad escolar y brecha digital en zonas rurales.",
    },
    expected: "seleccionado:socratico",
    label: "[REGR] S-008 Selección manual candidatos con pack TIC → Socrático",
  },
  {
    router: sinUniversalRouter,
    input: {
      texto: "¿Por qué persiste la brecha digital en Colombia?",
      packId: "tic",
    },
    expected: "ninguno",
    label: "[REGR] S-008 Sin patrón universal → ninguno",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NUEVOS — S-009
  // ═══════════════════════════════════════════════════════════════════════════

  {
    // Sprint req: Socrático por coincidencia-directa (esFallback=false).
    // Query contains explicit Socratic keywords: supuestos, evidencia, diagnóstico.
    router: prodRouter,
    input: {
      texto:
        "¿Qué supuestos y evidencia sustentan el diagnóstico sobre la política de brecha digital?",
    },
    expected: "seleccionado:socratico",
    expectedEsFallback: false,
    expectedMotivoSeleccion: "coincidencia-directa",
    label: "[S-009] Socrático por coincidencia-directa (no fallback)",
  },
  {
    // Sprint req: Sistémico seleccionado sobre consulta con vocabulary específica.
    // Query contains Sistémico phrases: "efectos indirectos", "consecuencias no
    // intencionadas", and single tokens: "interdependencia" (from "interdependencias"),
    // "retroalimentacion".
    router: prodRouter,
    input: {
      texto:
        "¿Qué interdependencias y efectos indirectos entre actores generan las consecuencias no intencionadas de la retroalimentación en la política de conectividad?",
    },
    expected: "seleccionado:sistemico",
    label: "[S-009] Sistémico seleccionado — interdependencias + efectos indirectos + retroalimentación",
  },
  {
    // Sprint req: Sistémico también gana con pack TIC enriquecido.
    // "No penalización por longitud": agregar contexto relevante no debe reducir
    // el score de Sistémico. La fórmula por componentes lo garantiza estructuralmente;
    // este test lo verifica empíricamente.
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
    label: "[S-009] No penalización — Sistémico con pack TIC enriquecido mantiene o mejora score",
  },
  {
    // Sprint req: Fallback universal explícito.
    // Query sin señales específicas de ningún patrón → Socrático vía universalFloor.
    // esFallback MUST be true; motivoSeleccion MUST be 'fallback-universal'.
    router: prodRouter,
    input: {
      texto: "¿Por qué no funciona bien la inversión pública en el sector?",
    },
    expected: "seleccionado:socratico",
    expectedEsFallback: true,
    expectedMotivoSeleccion: "fallback-universal",
    label: "[S-009] Fallback universal — esFallback=true, motivoSeleccion='fallback-universal'",
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  HELIOS · Thinking Engine — Smoke Tests (v0.3.0 / S-009)");
console.log(
  `  Umbrales: ninguna=${THINKING_THRESHOLDS.ninguna}  baja=${THINKING_THRESHOLDS.baja}  alta=${THINKING_THRESHOLDS.alta}  tieDelta=${THINKING_THRESHOLDS.tieDelta}  universalFloor=${THINKING_THRESHOLDS.universalFloor}`
);
console.log("═══════════════════════════════════════════════════════════\n");

for (let i = 0; i < CASES.length; i++) {
  const tc = CASES[i];
  const { decision, esFallback, motivoSeleccion, scores } = await think(
    tc.router,
    tc.input
  );

  let ok = decision === tc.expected;

  // Validate esFallback if specified
  if (ok && tc.expectedEsFallback !== undefined && esFallback !== null) {
    if (esFallback !== tc.expectedEsFallback) ok = false;
  }

  // Validate motivoSeleccion if specified
  if (ok && tc.expectedMotivoSeleccion !== undefined && motivoSeleccion !== null) {
    if (motivoSeleccion !== tc.expectedMotivoSeleccion) ok = false;
  }

  if (ok) passed++;
  else failed++;

  const icon = ok ? "✅" : "❌";
  console.log(`${icon} [${i + 1}] ${tc.label}`);
  console.log(`   texto    : "${tc.input.texto.slice(0, 80)}${tc.input.texto.length > 80 ? "…" : ""}"`);
  if (tc.input.packId) console.log(`   packId   : "${tc.input.packId}"`);
  if (tc.input.packNombre) console.log(`   packNombre: "${tc.input.packNombre}"`);
  if (tc.input.packContextoResumido)
    console.log(`   packCtx  : "${tc.input.packContextoResumido.slice(0, 60)}…"`);
  console.log(`   Esperado : ${tc.expected}${tc.expectedEsFallback !== undefined ? `  esFallback=${tc.expectedEsFallback}` : ""}${tc.expectedMotivoSeleccion ? `  motivo=${tc.expectedMotivoSeleccion}` : ""}`);
  console.log(`   Obtenido : ${decision}${esFallback !== null ? `  esFallback=${esFallback}` : ""}${motivoSeleccion ? `  motivo=${motivoSeleccion}` : ""}`);
  console.log(`   Scores   :\n${scores}`);
  console.log();
}

// ─── Cache verification ───────────────────────────────────────────────────────

console.log("── Cache verification ─────────────────────────────────────");
{
  const cacheRouter = new ThinkingRouter(new KeywordThinkingAlgorithm());
  const q = "¿Cuáles son los supuestos de la política de brecha digital?";

  // A: same instance, same key → cache hit (identical reference)
  const r1 = await cacheRouter.route({ texto: q, packId: "tic" });
  const r2 = await cacheRouter.route({ texto: q, packId: "tic" });
  const cacheHit = r1 === r2;
  if (cacheHit) passed++; else failed++;
  console.log(`${cacheHit ? "✅" : "❌"} [Cache-A] Misma instancia → caché hit (referencia idéntica)`);

  // B: clearCache() → new result (distinct reference)
  cacheRouter.clearCache();
  const r3 = await cacheRouter.route({ texto: q, packId: "tic" });
  const cacheCleared = r3 !== r2;
  if (cacheCleared) passed++; else failed++;
  console.log(`${cacheCleared ? "✅" : "❌"} [Cache-B] clearCache() → nuevo resultado`);

  // C: same text, different packId → distinct cache entries
  const r_tic = await cacheRouter.route({ texto: q, packId: "tic" });
  const r_edu = await cacheRouter.route({ texto: q, packId: "educacion" });
  const cacheDiff = r_tic !== r_edu;
  if (cacheDiff) passed++; else failed++;
  console.log(`${cacheDiff ? "✅" : "❌"} [Cache-C] Mismo texto, distinto packId → entradas de caché diferenciadas`);

  // D: same text + same packId → cache hit
  const r_tic2 = await cacheRouter.route({ texto: q, packId: "tic" });
  const cacheSamePackHit = r_tic === r_tic2;
  if (cacheSamePackHit) passed++; else failed++;
  console.log(`${cacheSamePackHit ? "✅" : "❌"} [Cache-D] Mismo texto + mismo packId → caché hit`);
}

// ─── No-penalización invariant ────────────────────────────────────────────────
// Adding context to a Sistémico query must NOT reduce its score below what it
// achieves without context. With separate-surface scoring this holds by
// construction (scores are additive), but we verify it empirically.

console.log();
console.log("── No-penalización: contexto adicional no reduce score ────");
{
  const npRouter = new ThinkingRouter(new KeywordThinkingAlgorithm());
  const texto =
    "¿Qué interdependencias y efectos indirectos entre actores generan las consecuencias no intencionadas?";

  const sinContexto = await npRouter.route({ texto });
  const conContexto = await npRouter.route({
    texto,
    packId: "tic",
    packNombre: "Tecnología de la Información y Comunicación",
    packContextoResumido:
      "Infraestructura TIC, brecha digital, conectividad y apropiación en zonas rurales.",
  });

  const scoresSin =
    sinContexto.decision === "seleccionado"
      ? sinContexto.seleccionado.score
      : sinContexto.decision === "candidatos"
      ? sinContexto.candidatos[0]?.score ?? 0
      : 0;
  const scoresCon =
    conContexto.decision === "seleccionado"
      ? conContexto.seleccionado.score
      : conContexto.decision === "candidatos"
      ? conContexto.candidatos[0]?.score ?? 0
      : 0;

  const nopenalizacion = scoresCon >= scoresSin;
  if (nopenalizacion) passed++; else failed++;
  console.log(
    `${nopenalizacion ? "✅" : "❌"} Score sin contexto=${Math.round(scoresSin * 1000) / 1000}` +
    ` ≤ score con contexto=${Math.round(scoresCon * 1000) / 1000}`
  );
}

// ─── Volver preservando problema ─────────────────────────────────────────────

console.log();
console.log("── Volver preservando problema ────────────────────────────");
{
  const volverRouter = new ThinkingRouter(new KeywordThinkingAlgorithm());
  const problema =
    "¿Qué interdependencias y efectos indirectos entre actores generan las consecuencias no intencionadas de la retroalimentación en la política de conectividad?";

  const primeraVez = await volverRouter.route({ texto: problema, packId: "tic" });
  const segundaVez = await volverRouter.route({ texto: problema, packId: "tic" });

  const mismaReferencia = primeraVez === segundaVez;
  if (mismaReferencia) passed++; else failed++;
  console.log(
    `${mismaReferencia ? "✅" : "❌"} [S-009] Volver + re-entrar → ThinkingResult desde caché (problema preservado)`
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log();
console.log("═══════════════════════════════════════════════════════════");
console.log(`  Resultado: ${passed}/${passed + failed} ✅  ${failed} ❌`);
console.log("═══════════════════════════════════════════════════════════\n");

if (failed > 0) process.exit(1);
