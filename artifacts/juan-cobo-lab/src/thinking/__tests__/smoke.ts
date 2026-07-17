/**
 * Thinking Engine smoke tests — runs outside Vite via tsx.
 *
 * Tests the full ThinkingRouter (including async score, cache, and
 * injectable registry) against acceptance criteria.
 *
 * v0.2.0 (S-008): updated for enriched ThinkingRouterInput (packId,
 * packNombre, packContextoResumido). Cache key is now texto::packId.
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
  | "seleccionado:dialectico-mock"
  | "candidatos-empate"
  | "candidatos-baja"
  | "ninguno";

async function think(
  router: ThinkingRouter,
  input: ThinkingRouterInput
): Promise<{ decision: Decision; scores: string }> {
  const result = await router.route(input);

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

// ─── No-universal router (for "ninguno" test) ─────────────────────────────────
// Contains only a non-universal pattern with vocabulary unrelated to policy —
// no esUniversal=true means no floor boost, so any policy query returns "ninguno".

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
  label: string;
}[] = [
  // ── Tests heredados (v0.1) — actualizados al nuevo ThinkingRouterInput ──────

  {
    router: prodRouter,
    input: { texto: "¿Por qué persiste la brecha digital en Colombia?" },
    expected: "seleccionado:socratico",
    label: "Problema TIC → Socrático seleccionado",
  },
  {
    router: prodRouter,
    input: { texto: "¿Por qué aumenta la deserción escolar en zonas rurales?" },
    expected: "seleccionado:socratico",
    label: "Problema Educación → Socrático seleccionado",
  },
  {
    router: prodRouter,
    input: {
      texto: "¿Qué supuestos y evidencia sostienen la política de conectividad?",
    },
    expected: "seleccionado:socratico",
    label: "Consulta con keywords explícitas (supuestos + evidencia) → Socrático",
  },
  {
    // S-007 test 4 — ctx migrado a packContextoResumido
    router: prodRouter,
    input: {
      texto: "¿Cómo reducir la mortalidad materna en Colombia?",
      packId: "salud-publica-mock",
      packNombre: "Salud Pública",
      packContextoResumido:
        "Análisis de determinantes de salud y brechas territoriales en Colombia.",
    },
    expected: "seleccionado:socratico",
    label: "Input con packContextoResumido (migrado de contexto) → Socrático seleccionado",
  },
  {
    // Second-pattern discovery: router with Dialéctico injected
    router: twoPatternRouter,
    input: {
      texto: "Analiza la tesis y antítesis de la política de conectividad rural",
    },
    expected: "seleccionado:dialectico-mock",
    label: "Segundo patrón (Dialéctico) descubierto sin modificar ThinkingRouter",
  },
  {
    // Cache: same query as test 1, same router instance
    router: prodRouter,
    input: { texto: "¿Por qué persiste la brecha digital en Colombia?" },
    expected: "seleccionado:socratico",
    label: "Caché — misma consulta que test 1 devuelve mismo resultado",
  },

  // ── Tests nuevos (S-008) ─────────────────────────────────────────────────────

  {
    // S-008 req: ThinkingRouter enriquecido con pack TIC
    router: prodRouter,
    input: {
      texto: "¿Por qué persiste la brecha digital en Colombia?",
      packId: "tic",
      packNombre: "Tecnología de la Información y Comunicación",
      packContextoResumido:
        "Análisis de brecha digital, conectividad significativa, apropiación TIC y política pública.",
    },
    expected: "seleccionado:socratico",
    label: "[S-008] Pack TIC — input enriquecido (packId + packNombre + packContextoResumido)",
  },
  {
    // S-008 req: ThinkingRouter enriquecido con pack Educación
    router: prodRouter,
    input: {
      texto: "¿Por qué aumenta la deserción escolar en zonas rurales?",
      packId: "educacion",
      packNombre: "Educación",
      packContextoResumido:
        "Análisis de deserción escolar, cobertura educativa y condiciones socioeconómicas en zonas rurales.",
    },
    expected: "seleccionado:socratico",
    label: "[S-008] Pack Educación — input enriquecido (packId + packNombre + packContextoResumido)",
  },
  {
    // S-008 req: selección manual entre candidatos —
    // simula el momento en que el usuario elige un pack de la pantalla de candidatos
    // y HELIOS llama al ThinkingRouter con el pack seleccionado.
    // La query es ambigua para el KR (TIC ↔ Educación), pero el usuario eligió TIC.
    router: prodRouter,
    input: {
      texto: "Mejorar el acceso a internet en escuelas rurales",
      packId: "tic", // pack seleccionado manualmente por el usuario
      packNombre: "Tecnología de la Información y Comunicación",
      packContextoResumido:
        "Infraestructura TIC, conectividad escolar y brecha digital en zonas rurales.",
    },
    expected: "seleccionado:socratico",
    label: "[S-008] Selección manual entre candidatos — ThinkingRouter con pack TIC seleccionado",
  },
  {
    // S-008 req: ThinkingRouter sin resultado (ninguno) —
    // router sin patrón universal + vocabulario sin coincidencia → decision: "ninguno"
    router: sinUniversalRouter,
    input: {
      texto: "¿Por qué persiste la brecha digital en Colombia?",
      packId: "tic",
    },
    expected: "ninguno",
    label:
      "[S-008] Thinking Router sin resultado — sin patrón universal ni coincidencia → ninguno",
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  HELIOS · Thinking Engine — Smoke Tests (v0.2.0 / S-008)");
console.log(
  `  Umbrales: ninguna=${THINKING_THRESHOLDS.ninguna}  baja=${THINKING_THRESHOLDS.baja}  alta=${THINKING_THRESHOLDS.alta}  tieDelta=${THINKING_THRESHOLDS.tieDelta}  universalFloor=${THINKING_THRESHOLDS.universalFloor}`
);
console.log("═══════════════════════════════════════════════════════════\n");

for (let i = 0; i < CASES.length; i++) {
  const tc = CASES[i];
  const { decision, scores } = await think(tc.router, tc.input);

  const ok = decision === tc.expected;
  if (ok) passed++;
  else failed++;

  const icon = ok ? "✅" : "❌";
  console.log(`${icon} [${i + 1}] ${tc.label}`);
  console.log(`   texto    : "${tc.input.texto}"`);
  if (tc.input.packId) console.log(`   packId   : "${tc.input.packId}"`);
  if (tc.input.packNombre)
    console.log(`   packNombre: "${tc.input.packNombre}"`);
  if (tc.input.packContextoResumido)
    console.log(
      `   packCtx  : "${tc.input.packContextoResumido.slice(0, 60)}…"`
    );
  console.log(`   Esperado : ${tc.expected}`);
  console.log(`   Obtenido : ${decision}`);
  console.log(`   Scores   :\n${scores}`);
  console.log();
}

// ─── Cache verification ───────────────────────────────────────────────────────

console.log("── Cache verification ─────────────────────────────────────");
{
  // Test A: misma instancia, misma clave → cache hit (referencia idéntica)
  const cacheRouter = new ThinkingRouter(new KeywordThinkingAlgorithm());
  const q = "¿Cuáles son los supuestos de la política de brecha digital?";

  const r1 = await cacheRouter.route({ texto: q, packId: "tic" });
  const r2 = await cacheRouter.route({ texto: q, packId: "tic" }); // cache hit
  const cacheHit = r1 === r2;
  if (cacheHit) passed++;
  else failed++;
  console.log(
    `${cacheHit ? "✅" : "❌"} Misma instancia ThinkingResult en segunda llamada (caché hit)`
  );

  // Test B: clearCache() → nuevo resultado (referencia distinta)
  cacheRouter.clearCache();
  const r3 = await cacheRouter.route({ texto: q, packId: "tic" });
  const cacheCleared = r3 !== r2;
  if (cacheCleared) passed++;
  else failed++;
  console.log(
    `${cacheCleared ? "✅" : "❌"} clearCache() genera nuevo resultado (caché vaciado)`
  );

  // [S-008] Test C: misma consulta, packId diferente → entradas de caché distintas
  const r_tic = await cacheRouter.route({ texto: q, packId: "tic" });
  const r_edu = await cacheRouter.route({ texto: q, packId: "educacion" });
  const cacheDiff = r_tic !== r_edu;
  if (cacheDiff) passed++;
  else failed++;
  console.log(
    `${cacheDiff ? "✅" : "❌"} [S-008] Mismo texto, distinto packId → entradas de caché diferenciadas`
  );

  // [S-008] Test D: mismo texto + mismo packId → cache hit entre dos packs
  const r_tic2 = await cacheRouter.route({ texto: q, packId: "tic" });
  const cacheSamePackHit = r_tic === r_tic2;
  if (cacheSamePackHit) passed++;
  else failed++;
  console.log(
    `${cacheSamePackHit ? "✅" : "❌"} [S-008] Mismo texto + mismo packId → caché hit diferenciado`
  );
}

// ─── [S-008] Volver preservando problema ─────────────────────────────────────
// Verifica que el ThinkingRouter devuelve resultado idéntico (desde caché)
// cuando el usuario regresa a la misma pantalla con el mismo problema y pack.
// La UI conserva 'problema' en el estado de Helios; el ThinkingRouter
// servirá desde caché — no hay re-cómputo.
console.log();
console.log("── [S-008] Volver preservando problema ────────────────────");
{
  const volverRouter = new ThinkingRouter(new KeywordThinkingAlgorithm());
  const problema = "¿Por qué persiste la brecha digital en Colombia?";

  // Simulación: usuario llega a pereque, presiona Volver, vuelve a entrar a pereque
  const primeraVez = await volverRouter.route({ texto: problema, packId: "tic" });
  const segundaVez  = await volverRouter.route({ texto: problema, packId: "tic" }); // desde caché

  const mismaReferencia = primeraVez === segundaVez;
  if (mismaReferencia) passed++;
  else failed++;
  console.log(
    `${mismaReferencia ? "✅" : "❌"} [S-008] Volver + re-entrar a pereque → ThinkingResult desde caché (problema preservado)`
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log();
console.log("═══════════════════════════════════════════════════════════");
console.log(`  Resultado: ${passed}/${passed + failed} ✅  ${failed} ❌`);
console.log("═══════════════════════════════════════════════════════════\n");

if (failed > 0) process.exit(1);
