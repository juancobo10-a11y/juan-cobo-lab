/**
 * Thinking Engine smoke tests — runs outside Vite via tsx.
 *
 * Tests the full ThinkingRouter (including async score, cache, and
 * injectable registry) against 6 acceptance criteria.
 *
 * Usage:
 *   pnpm exec tsx src/thinking/__tests__/smoke.ts
 * from inside artifacts/juan-cobo-lab/
 */

import { KeywordThinkingAlgorithm } from "../algorithms/KeywordThinkingAlgorithm";
import { ThinkingRouter } from "../ThinkingRouter";
import { THINKING_REGISTRY, type ThinkingRegistryEntry } from "../registry";
import { THINKING_THRESHOLDS } from "../constants";
import type { ThinkingPatternMetadata } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Decision =
  | "seleccionado:socratico"
  | "seleccionado:dialectico-mock"
  | "candidatos-empate"
  | "candidatos-baja"
  | "ninguno";

async function think(
  router: ThinkingRouter,
  query: string,
  contexto?: string
): Promise<{ decision: Decision; scores: string }> {
  const result = await router.route({ texto: query, contexto });

  let decision: Decision;
  if (result.decision === "seleccionado") {
    decision = `seleccionado:${result.seleccionado.pattern.metadata.id}` as Decision;
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
          (terms ? `\n      ${terms}` : "")
        );
      })
      .join("\n");
  })();

  return { decision, scores: scoreLines };
}

// ─── Production router ────────────────────────────────────────────────────────

const prodRouter = new ThinkingRouter(new KeywordThinkingAlgorithm());

// ─── Second-pattern mock (for test 5) ────────────────────────────────────────
// Demonstrates that new thinking patterns are discoverable via registry injection
// without modifying ThinkingRouter or any UI code.

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
  ultimaActualizacion: "2026-07-16",
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
        orientacion: "Enuncia el argumento central tal como lo formula la política actual.",
      },
    ],
  }),
};

// Two-pattern router: production (Socrático) + Dialéctico (injected)
const twoPatternRouter = new ThinkingRouter(new KeywordThinkingAlgorithm(), [
  ...THINKING_REGISTRY,
  dialecticoEntry,
]);

// ─── Test cases ───────────────────────────────────────────────────────────────

const CASES: {
  router: ThinkingRouter;
  query: string;
  contexto?: string;
  expected: Decision;
  label: string;
}[] = [
  {
    router: prodRouter,
    query: "¿Por qué persiste la brecha digital en Colombia?",
    expected: "seleccionado:socratico",
    label: "Problema TIC → Socrático seleccionado",
  },
  {
    router: prodRouter,
    query: "¿Por qué aumenta la deserción escolar en zonas rurales?",
    expected: "seleccionado:socratico",
    label: "Problema Educación → Socrático seleccionado",
  },
  {
    router: prodRouter,
    query: "¿Qué supuestos y evidencia sostienen la política de conectividad?",
    expected: "seleccionado:socratico",
    label: "Consulta con keywords explícitas (supuestos + evidencia) → Socrático",
  },
  {
    router: prodRouter,
    query: "¿Cómo reducir la mortalidad materna en Colombia?",
    contexto: "Análisis de determinantes de salud y brechas territoriales.",
    expected: "seleccionado:socratico",
    label: "Input con contexto de pack → Socrático seleccionado",
  },
  {
    // Second-pattern discovery: router with Dialéctico injected; ThinkingRouter code not modified
    router: twoPatternRouter,
    query: "Analiza la tesis y antítesis de la política de conectividad rural",
    expected: "seleccionado:dialectico-mock",
    label: "Segundo patrón (Dialéctico) descubierto sin modificar ThinkingRouter",
  },
  {
    // Cache: same query as test 1, same router instance
    router: prodRouter,
    query: "¿Por qué persiste la brecha digital en Colombia?",
    expected: "seleccionado:socratico",
    label: "Caché — misma consulta que test 1 devuelve mismo resultado",
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  HELIOS · Thinking Engine — Smoke Tests (v0.1.0)");
console.log(
  `  Umbrales: ninguna=${THINKING_THRESHOLDS.ninguna}  baja=${THINKING_THRESHOLDS.baja}  alta=${THINKING_THRESHOLDS.alta}  tieDelta=${THINKING_THRESHOLDS.tieDelta}`
);
console.log("═══════════════════════════════════════════════════════════\n");

for (let i = 0; i < CASES.length; i++) {
  const tc = CASES[i];
  const { decision, scores } = await think(tc.router, tc.query, tc.contexto);

  const ok = decision === tc.expected;
  if (ok) passed++;
  else failed++;

  const icon = ok ? "✅" : "❌";
  console.log(`${icon} [${i + 1}] ${tc.label}`);
  console.log(`   Query    : "${tc.query}"`);
  if (tc.contexto) console.log(`   Contexto : "${tc.contexto}"`);
  console.log(`   Esperado : ${tc.expected}`);
  console.log(`   Obtenido : ${decision}`);
  console.log(`   Scores   :\n${scores}`);
  console.log();
}

// ─── Cache verification ───────────────────────────────────────────────────────

console.log("── Cache verification ─────────────────────────────────────");
{
  const cacheRouter = new ThinkingRouter(new KeywordThinkingAlgorithm());
  const q = "¿Cuáles son los supuestos de la política de brecha digital?";

  const r1 = await cacheRouter.route({ texto: q });
  const r2 = await cacheRouter.route({ texto: q }); // should hit cache

  const cacheHit = r1 === r2;
  if (cacheHit) passed++;
  else failed++;
  console.log(
    `${cacheHit ? "✅" : "❌"} Misma instancia ThinkingResult en segunda llamada (caché hit)`
  );

  cacheRouter.clearCache();
  const r3 = await cacheRouter.route({ texto: q });
  const cacheCleared = r3 !== r2;
  if (cacheCleared) passed++;
  else failed++;
  console.log(
    `${cacheCleared ? "✅" : "❌"} clearCache() genera nuevo resultado (caché vaciado)`
  );
}

console.log();
console.log("═══════════════════════════════════════════════════════════");
console.log(`  Resultado: ${passed}/${passed + failed} ✅  ${failed} ❌`);
console.log("═══════════════════════════════════════════════════════════\n");

if (failed > 0) process.exit(1);
