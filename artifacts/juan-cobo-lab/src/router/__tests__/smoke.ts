/**
 * Router smoke tests — runs outside Vite via tsx.
 *
 * Tests the KeywordAlgorithm directly (pure TS, no Vite globals) by
 * manually supplying metadata from both packs and simulating the routing
 * decision logic.
 *
 * Usage:
 *   pnpm exec tsx src/router/__tests__/smoke.ts
 * from inside artifacts/juan-cobo-lab/
 */

import { KeywordAlgorithm } from "../algorithms/KeywordAlgorithm";
import ticMeta from "../../../../../content/tic/metadata.json";
import educacionMeta from "../../../../../content/educacion/metadata.json";
import type { PackMetadata } from "../types";

const algorithm = new KeywordAlgorithm();
const packs = [ticMeta as PackMetadata, educacionMeta as PackMetadata];

const THRESHOLD_NINGUNA = 0.05;
const THRESHOLD_BAJA = 0.20;
const THRESHOLD_ALTA = 0.42;
const TIE_DELTA = 0.09;

type Decision = "seleccionado" | "candidatos-empate" | "candidatos-baja" | "ninguno";

interface TestResult {
  query: string;
  scores: { id: string; score: number; confianza: string; terminos: string[] }[];
  decision: Decision;
  winner: string | null;
}

function route(query: string): TestResult {
  const input = { texto: query };
  const scored = packs
    .map((meta) => {
      const { score, terminosCoincidentes } = algorithm.score(input, meta);
      return { meta, score, terminosCoincidentes };
    })
    .sort((a, b) => b.score - a.score);

  const above = scored.filter((s) => s.score >= THRESHOLD_NINGUNA);

  const scores = scored.map((s) => ({
    id: s.meta.id,
    score: Math.round(s.score * 1000) / 1000,
    confianza:
      s.score >= THRESHOLD_ALTA
        ? "alta"
        : s.score >= THRESHOLD_BAJA
        ? "media"
        : s.score >= THRESHOLD_NINGUNA
        ? "baja"
        : "ninguna",
    terminos: s.terminosCoincidentes.map(
      (t) => `${t.esFrase ? "📌" : "·"} "${t.termino}" [${t.campo}, ${t.peso}]`
    ),
  }));

  let decision: Decision;
  let winner: string | null = null;

  if (above.length === 0) {
    decision = "ninguno";
  } else if (
    above.length >= 2 &&
    above[0].score - above[1].score <= TIE_DELTA
  ) {
    decision = "candidatos-empate";
  } else if (above[0].score < THRESHOLD_BAJA) {
    decision = "candidatos-baja";
  } else {
    decision = "seleccionado";
    winner = above[0].meta.id;
  }

  return { query, scores, decision, winner };
}

// ─── Test cases ────────────────────────────────────────────────────────────

const CASES: { query: string; expected: string }[] = [
  {
    query: "¿Por qué persiste la brecha digital?",
    expected: "TIC → brecha-digital-colombia",
  },
  {
    query: "¿Por qué aumenta la deserción escolar?",
    expected: "Educación → desercion-escolar-colombia",
  },
  {
    query: "Habilidades digitales en adultos mayores",
    expected: "TIC → brecha-digital-colombia",
  },
  {
    query: "¿Cómo reducir la mortalidad materna?",
    expected: "ninguno",
  },
  {
    query: "Conectividad en escuelas rurales",
    expected: "candidatos (ambiguo — TIC + Educación)",
  },
];

let passed = 0;
let failed = 0;

console.log("\n═══════════════════════════════════════════════════════");
console.log("  HELIOS · Knowledge Router — Smoke Tests");
console.log("═══════════════════════════════════════════════════════\n");

for (const tc of CASES) {
  const r = route(tc.query);
  const ok = (() => {
    if (r.decision === "seleccionado" && r.winner === "brecha-digital-colombia")
      return tc.expected.includes("brecha-digital");
    if (r.decision === "seleccionado" && r.winner === "desercion-escolar-colombia")
      return tc.expected.includes("desercion-escolar");
    if (r.decision === "ninguno") return tc.expected.includes("ninguno");
    if (r.decision === "candidatos-empate" || r.decision === "candidatos-baja")
      return tc.expected.includes("candidatos");
    return false;
  })();

  if (ok) passed++;
  else failed++;

  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${tc.query}`);
  console.log(`   Esperado : ${tc.expected}`);
  console.log(`   Decisión : ${r.decision}${r.winner ? ` → ${r.winner}` : ""}`);
  console.log("   Scores   :");
  for (const s of r.scores) {
    console.log(`     ${s.id}: ${s.score} (${s.confianza})`);
    for (const t of s.terminos) console.log(`       ${t}`);
  }
  console.log();
}

console.log("═══════════════════════════════════════════════════════");
console.log(`  Resultado: ${passed}/${CASES.length} ✅  ${failed} ❌`);
console.log("═══════════════════════════════════════════════════════\n");

if (failed > 0) process.exit(1);
