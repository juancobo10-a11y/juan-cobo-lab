/**
 * Router smoke tests — runs outside Vite via tsx.
 *
 * Tests the full KnowledgeRouter (including async score, cache, and
 * injectable registry) against 7 acceptance criteria.
 *
 * Usage:
 *   pnpm exec tsx src/router/__tests__/smoke.ts
 * from inside artifacts/juan-cobo-lab/
 */

import { KeywordAlgorithm } from "../algorithms/KeywordAlgorithm";
import { KnowledgeRouter } from "../KnowledgeRouter";
import { REGISTRY, type RegistryEntry } from "../registry";
import { ROUTER_THRESHOLDS } from "../constants";
import type { PackMetadata } from "../types";

// ─── Helpers ────────────────────────────────────────────────────────────────

type Decision =
  | "seleccionado:brecha-digital-colombia"
  | "seleccionado:desercion-escolar-colombia"
  | "seleccionado:salud-materna-colombia"
  | "candidatos-empate"
  | "candidatos-baja"
  | "ninguno";

async function route(
  router: KnowledgeRouter,
  query: string
): Promise<{ decision: Decision; scores: string }> {
  const result = await router.route({ texto: query });

  let decision: Decision;
  if (result.decision === "seleccionado") {
    decision = `seleccionado:${result.seleccionado.pack.metadata.id}` as Decision;
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
          .map((t) => `${t.esFrase ? "📌" : "·"} "${t.termino}" [${t.campo}, ${t.peso}]`)
          .join("\n      ");
        return `  ${c.pack.metadata.id}: ${Math.round(c.score * 1000) / 1000} (${c.confianza})\n      ${terms}`;
      })
      .join("\n");
  })();

  return { decision, scores: scoreLines };
}

// ─── Production router ───────────────────────────────────────────────────────

const prodRouter = new KnowledgeRouter(new KeywordAlgorithm());

// ─── Third-pack mock (for test 7) ────────────────────────────────────────────
// Demonstrates that Helios.tsx never needs to change to support a new pack.
// Only the registry entry is added (here, injected via constructor).

const saludMeta: PackMetadata = {
  id: "salud-materna-colombia",
  titulo: "Salud Materna en Colombia",
  descripcion:
    "Análisis de los determinantes de la mortalidad materna en Colombia: acceso a servicios obstétricos, brechas territoriales y calidad de la atención prenatal.",
  tema: "Salud",
  keywords: [
    "mortalidad materna",
    "salud materna",
    "atención prenatal",
    "parto",
    "embarazo",
    "gestante",
    "obstetricia",
    "morbilidad materna",
    "parto institucional",
    "razón de mortalidad materna",
  ],
  herramienta: "PESTEL",
  nivelComplejidad: "Intermedio",
  version: "0.1",
  estado: "activo",
  autor: "Juan Cobo Lab",
  institucion: "Juan Cobo Lab",
  ultimaActualizacion: "2026-07-15",
  fuentes: [],
  licencia: "Todos los derechos reservados",
  estadoRevision: "experimental",
};

const saludEntry: RegistryEntry = {
  metadata: saludMeta,
  load: async () => ({
    contexto: {
      texto: "Contexto provisional: análisis de mortalidad materna en Colombia.",
    },
    hipotesis: [],
    pestel: [],
    chips: { ejemplos: [], explorados: [] },
  }),
};

// Three-pack router: production packs + Salud (injected without touching Helios.tsx)
const threePackRouter = new KnowledgeRouter(new KeywordAlgorithm(), [
  ...REGISTRY,
  saludEntry,
]);

// ─── Test cases ────────────────────────────────────────────────────────────

const CASES: {
  router: KnowledgeRouter;
  query: string;
  expected: Decision;
  label: string;
}[] = [
  {
    router: prodRouter,
    query: "¿Por qué persiste la brecha digital en Colombia?",
    expected: "seleccionado:brecha-digital-colombia",
    label: "TIC → brecha digital",
  },
  {
    router: prodRouter,
    query: "¿Por qué aumenta la deserción escolar?",
    expected: "seleccionado:desercion-escolar-colombia",
    label: "Educación → deserción escolar",
  },
  {
    router: prodRouter,
    query: "Habilidades digitales en adultos mayores",
    expected: "seleccionado:brecha-digital-colombia",
    label: "TIC → habilidades digitales",
  },
  {
    router: prodRouter,
    query: "¿Cómo reducir la mortalidad materna?",
    expected: "ninguno",
    label: "ningún pack (2-pack router)",
  },
  {
    router: prodRouter,
    query: "Conectividad en escuelas rurales",
    expected: "candidatos-empate",
    label: "empate TIC + Educación",
  },
  {
    // Cache test: same query as test 1, run twice against same router instance
    router: prodRouter,
    query: "¿Por qué persiste la brecha digital en Colombia?",
    expected: "seleccionado:brecha-digital-colombia",
    label: "caché — misma consulta que test 1 devuelve mismo resultado",
  },
  {
    // Third-pack discovery: router with Salud injected; Helios.tsx not modified
    router: threePackRouter,
    query: "¿Cómo reducir la mortalidad materna?",
    expected: "seleccionado:salud-materna-colombia",
    label: "tercer pack (Salud) descubierto sin modificar Helios.tsx",
  },
];

// ─── Runner ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  HELIOS · Knowledge Router — Smoke Tests (v0.5.1)");
console.log(`  Umbrales: ninguna=${ROUTER_THRESHOLDS.ninguna}  baja=${ROUTER_THRESHOLDS.baja}  alta=${ROUTER_THRESHOLDS.alta}  tieDelta=${ROUTER_THRESHOLDS.tieDelta}`);
console.log("═══════════════════════════════════════════════════════════\n");

for (let i = 0; i < CASES.length; i++) {
  const tc = CASES[i];
  const { decision, scores } = await route(tc.router, tc.query);

  const ok = decision === tc.expected;
  if (ok) passed++; else failed++;

  const icon = ok ? "✅" : "❌";
  console.log(`${icon} [${i + 1}] ${tc.label}`);
  console.log(`   Query    : "${tc.query}"`);
  console.log(`   Esperado : ${tc.expected}`);
  console.log(`   Obtenido : ${decision}`);
  console.log(`   Scores   :\n${scores}`);
  console.log();
}

// ─── Cache verification ──────────────────────────────────────────────────────

console.log("── Cache verification ─────────────────────────────────────");
{
  const cacheRouter = new KnowledgeRouter(new KeywordAlgorithm());
  const q = "¿Por qué persiste la brecha digital?";

  const r1 = await cacheRouter.route({ texto: q });
  const r2 = await cacheRouter.route({ texto: q }); // should hit cache

  // Same object reference means cache was used (Map returns the same RouterResult)
  const cacheHit = r1 === r2;
  if (cacheHit) passed++; else failed++;
  console.log(`${cacheHit ? "✅" : "❌"} Misma instancia RouterResult en segunda llamada (caché hit)`);

  cacheRouter.clearCache();
  const r3 = await cacheRouter.route({ texto: q });
  const cacheCleared = r3 !== r2;
  if (cacheCleared) passed++; else failed++;
  console.log(`${cacheCleared ? "✅" : "❌"} clearCache() genera nuevo resultado (caché vaciado)`);
}

console.log();
console.log("═══════════════════════════════════════════════════════════");
console.log(`  Resultado: ${passed}/${passed + failed} ✅  ${failed} ❌`);
console.log("═══════════════════════════════════════════════════════════\n");

if (failed > 0) process.exit(1);
