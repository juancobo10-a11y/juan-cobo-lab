/**
 * Ejercicio de Validación Manual — Thinking Router
 * Sprint S-010 · No modifica código, no hace commit, no hace push.
 *
 * Registra por caso:
 *   texto, pack, patrón seleccionado, motivoSeleccion, fuentePrincipal,
 *   dimensionesDetectadas, resumen presentado al usuario, score interno.
 *
 * Uso:
 *   pnpm exec tsx src/thinking/__tests__/validacion_manual.ts
 * desde artifacts/juan-cobo-lab/
 */

import { KeywordThinkingAlgorithm } from "../algorithms/KeywordThinkingAlgorithm";
import { ThinkingRouter } from "../ThinkingRouter";
import type { ThinkingRouterInput } from "../types";

const router = new ThinkingRouter(new KeywordThinkingAlgorithm());

// ─── Casos de validación ────────────────────────────────────────────────────
// expectedPattern: "socratico" | "sistemico" | "ambiguo"
// rationale: razonamiento del evaluador

const CASES: Array<{
  id: string;
  input: ThinkingRouterInput;
  expectedPattern: "socratico" | "sistemico" | "ambiguo";
  rationale: string;
}> = [
  // ── Caso 1 ─────────────────────────────────────────────────────────────────
  {
    id: "C01",
    input: {
      texto:
        "¿Por qué aumenta el homicidio en barrios vulnerables de Bogotá a pesar de la presencia policial?",
    },
    expectedPattern: "socratico",
    rationale:
      "La pregunta '¿por qué?' + paradoja aparente invita a examinar supuestos del diagnóstico (efectividad policial, teoría del cambio). Sin keywords sistémicas explícitas.",
  },

  // ── Caso 2 ─────────────────────────────────────────────────────────────────
  {
    id: "C02",
    input: {
      texto:
        "¿Qué factores del sistema de salud colombiano generan las barreras de acceso para la población rural?",
    },
    expectedPattern: "sistemico",
    rationale:
      "'Sistema de salud', 'factores', 'barreras' evocan estructura y causas interrelacionadas. Debería activar Sistémico.",
  },

  // ── Caso 3 ─────────────────────────────────────────────────────────────────
  {
    id: "C03",
    input: {
      texto:
        "¿Cuáles son los supuestos del Programa Ser Pilo Paga sobre la calidad educativa y el acceso a educación superior?",
    },
    expectedPattern: "socratico",
    rationale:
      "'Supuestos' es keyword explícita de Socrático. Caso de coincidencia directa esperada.",
  },

  // ── Caso 4 ─────────────────────────────────────────────────────────────────
  {
    id: "C04",
    input: {
      texto:
        "¿Por qué la deforestación en la Amazonía colombiana continúa a pesar de los incentivos de conservación y los compromisos internacionales?",
    },
    expectedPattern: "sistemico",
    rationale:
      "Paradoja de política → deforestación-a-pesar-de-conservación implica bucles de retroalimentación y efectos no esperados. Sistémico es el marco natural. Pero sin keywords explícitas, puede caer en fallback.",
  },

  // ── Caso 5 ─────────────────────────────────────────────────────────────────
  {
    id: "C05",
    input: {
      texto:
        "¿Cómo mejorar el recaudo tributario en municipios pequeños de Colombia?",
    },
    expectedPattern: "ambiguo",
    rationale:
      "Pregunta genérica de mejora administrativa. Sin señales de supuestos ni de sistema. Fallback socrático aceptable; no hay patrón dominante.",
  },

  // ── Caso 6 ─────────────────────────────────────────────────────────────────
  {
    id: "C06",
    input: {
      texto:
        "¿Qué interdependencias entre el sistema de transporte público y la economía informal generan la congestión crónica en Bogotá?",
    },
    expectedPattern: "sistemico",
    rationale:
      "'Interdependencias', 'sistema de transporte', 'generan' → keywords sistémicas explícitas. Caso de coincidencia directa fuerte.",
  },

  // ── Caso 7 ─────────────────────────────────────────────────────────────────
  {
    id: "C07",
    input: {
      texto:
        "¿Cuál es la evidencia sobre el impacto de los subsidios de vivienda en familias víctimas del desplazamiento forzado?",
    },
    expectedPattern: "socratico",
    rationale:
      "'Evidencia' es keyword explícita de Socrático. 'Impacto' refuerza la orientación evaluativa. Coincidencia directa esperada.",
  },

  // ── Caso 8 ─────────────────────────────────────────────────────────────────
  {
    id: "C08",
    input: {
      texto:
        "¿Por qué los municipios rurales no logran sostener los acueductos comunitarios construidos con inversión pública?",
    },
    expectedPattern: "ambiguo",
    rationale:
      "Sostenibilidad post-inversión puede abordarse desde supuestos de la política (Socrático) o desde dinámicas del sistema de gestión comunitaria (Sistémico). Genuinamente ambiguo.",
  },

  // ── Caso 9 ─────────────────────────────────────────────────────────────────
  {
    id: "C09",
    input: {
      texto:
        "¿Qué efectos no intencionados genera la política de cuotas de género en la carrera administrativa sobre la cultura organizacional y el desempeño institucional?",
    },
    expectedPattern: "sistemico",
    rationale:
      "'Efectos no intencionados' es keyword de Sistémico (consecuencias no esperadas). 'Cultura organizacional' como elemento emergente del sistema. Debería activar Sistémico.",
  },

  // ── Caso 10 ────────────────────────────────────────────────────────────────
  {
    id: "C10",
    input: {
      texto:
        "¿Por qué persiste la desnutrición infantil en territorios con alto presupuesto de alimentación escolar? ¿Qué supuestos y diagnóstico sostienen el programa?",
    },
    expectedPattern: "socratico",
    rationale:
      "'Supuestos' y 'diagnóstico' son keywords explícitas de Socrático. Paradoja presupuesto-resultado invite a examinar la teoría del cambio.",
  },

  // ── Caso 11 (con pack) ─────────────────────────────────────────────────────
  {
    id: "C11",
    input: {
      texto:
        "¿Por qué la tasa de mortalidad materna no mejora en regiones con alta inversión en salud?",
      packId: "salud-materna",
      packNombre: "Salud Materna y Perinatal",
      packContextoResumido:
        "Análisis de determinantes de la mortalidad materna: barreras de acceso, calidad de atención, coordinación entre niveles del sistema y factores sociales estructurales.",
    },
    expectedPattern: "ambiguo",
    rationale:
      "Sin pack: fallback socrático probable. Con pack de salud: el contexto 'sistema', 'barreras de acceso', 'coordinación entre niveles' puede activar Sistémico via contexto. Caso donde el pack domina la decisión.",
  },

  // ── Caso 12 (con pack) ─────────────────────────────────────────────────────
  {
    id: "C12",
    input: {
      texto:
        "¿Cómo reducir la reincidencia delictiva en jóvenes egresados del sistema de responsabilidad penal?",
      packId: "seguridad-ciudadana",
      packNombre: "Seguridad Ciudadana y Justicia Juvenil",
      packContextoResumido:
        "Factores de riesgo, trayectorias delictivas, reintegración social, efectividad de las intervenciones de rehabilitación y retroalimentación entre sistema penal y exclusión social.",
    },
    expectedPattern: "sistemico",
    rationale:
      "'Retroalimentación entre sistema penal y exclusión social' en el pack debería activar Sistémico via contexto. Buen test de si el contexto del pack domina apropiada o inapropiadamente.",
  },
];

// ─── Runner ──────────────────────────────────────────────────────────────────

type RowResult = {
  id: string;
  texto: string;
  packId: string;
  packNombre: string;
  patronSeleccionado: string;
  motivoSeleccion: string;
  esFallback: boolean;
  fuentePrincipal: string;
  dimensionesDetectadas: string[];
  resumen: string;
  score: number;
  confianza: string;
  expectedPattern: string;
  coincide: boolean | "parcial";
  rationale: string;
};

const rows: RowResult[] = [];

for (const tc of CASES) {
  const result = await router.route(tc.input);

  let patronSeleccionado = "—";
  let motivoSeleccion = "—";
  let esFallback = false;
  let fuentePrincipal = "—";
  let dimensionesDetectadas: string[] = [];
  let resumen = "—";
  let score = 0;
  let confianza = "—";

  if (result.decision === "seleccionado") {
    patronSeleccionado = result.seleccionado.pattern.metadata.id;
    motivoSeleccion = result.seleccionado.motivoSeleccion;
    esFallback = result.seleccionado.esFallback;
    score = result.seleccionado.score;
    confianza = result.seleccionado.confianza;
    fuentePrincipal = result.explicacionSeleccion.fuentePrincipal;
    dimensionesDetectadas = result.explicacionSeleccion.dimensionesDetectadas;
    resumen = result.explicacionSeleccion.resumen;
  } else if (result.decision === "candidatos") {
    const top = result.candidatos[0];
    patronSeleccionado = `CANDIDATOS — top: ${top?.pattern.metadata.id ?? "?"}`;
    score = top?.score ?? 0;
    confianza = top?.confianza ?? "—";
    motivoSeleccion = top?.motivoSeleccion ?? "—";
    esFallback = top?.esFallback ?? false;
  } else {
    patronSeleccionado = "NINGUNO";
  }

  // Evaluate coincidence
  let coincide: boolean | "parcial";
  if (tc.expectedPattern === "ambiguo") {
    // Ambiguous: fallback socrático always acceptable; sistémico acceptable if pack context justifies it
    coincide = "parcial";
  } else if (patronSeleccionado === tc.expectedPattern || patronSeleccionado.includes(tc.expectedPattern)) {
    coincide = true;
  } else if (tc.expectedPattern === "sistemico" && esFallback) {
    coincide = false; // Got universal fallback when we expected systemic
  } else {
    coincide = false;
  }

  rows.push({
    id: tc.id,
    texto: tc.input.texto,
    packId: tc.input.packId ?? "—",
    packNombre: tc.input.packNombre ?? "—",
    patronSeleccionado,
    motivoSeleccion,
    esFallback,
    fuentePrincipal,
    dimensionesDetectadas,
    resumen,
    score: Math.round(score * 1000) / 1000,
    confianza,
    expectedPattern: tc.expectedPattern,
    coincide,
    rationale: tc.rationale,
  });
}

// ─── Output ───────────────────────────────────────────────────────────────────

const sep = "─".repeat(120);

console.log("\n");
console.log("═".repeat(120));
console.log("  HELIOS · Validación Manual del Thinking Router — 12 problemas de política pública real");
console.log("  Sprint S-010 · Sin modificación de código");
console.log("═".repeat(120));

for (const r of rows) {
  const icon = r.coincide === true ? "✅" : r.coincide === "parcial" ? "🟡" : "❌";

  console.log(`\n${sep}`);
  console.log(`${icon} ${r.id} · Patrón esperado: ${r.expectedPattern.toUpperCase()} · Obtenido: ${r.patronSeleccionado.toUpperCase()}`);
  console.log(sep);
  console.log(`  PROBLEMA : "${r.texto}"`);
  console.log(`  PACK     : ${r.packId === "—" ? "(sin pack)" : `${r.packId} / ${r.packNombre}`}`);
  console.log(`  PATRÓN   : ${r.patronSeleccionado}   score=${r.score}  confianza=${r.confianza}`);
  console.log(`  MOTIVO   : ${r.motivoSeleccion}  esFallback=${r.esFallback}`);
  console.log(`  FUENTE   : fuentePrincipal=${r.fuentePrincipal}`);
  console.log(`  DIMS     : [${r.dimensionesDetectadas.join(", ") || "— ninguna —"}]`);
  console.log(`  RESUMEN  : "${r.resumen}"`);
  console.log(`  EVALUADOR: ${r.rationale}`);
}

// ─── Matriz comparativa compacta ──────────────────────────────────────────────

console.log("\n\n");
console.log("═".repeat(120));
console.log("  MATRIZ COMPARATIVA");
console.log("═".repeat(120));
console.log(
  `${"ID".padEnd(5)}${"ESPERADO".padEnd(12)}${"OBTENIDO".padEnd(20)}${"MOTIVO".padEnd(25)}${"FUENTE".padEnd(16)}${"DIMS".padEnd(35)}${"SCORE".padEnd(8)}${"OK"}`
);
console.log("─".repeat(120));

for (const r of rows) {
  const icon = r.coincide === true ? "✅" : r.coincide === "parcial" ? "🟡" : "❌";
  const dims = r.dimensionesDetectadas.length
    ? r.dimensionesDetectadas.join(", ").slice(0, 32)
    : "(ninguna)";
  const patron = r.patronSeleccionado.replace("CANDIDATOS — top: ", "top:").slice(0, 18);
  console.log(
    `${r.id.padEnd(5)}${r.expectedPattern.padEnd(12)}${patron.padEnd(20)}${r.motivoSeleccion.padEnd(25)}${r.fuentePrincipal.padEnd(16)}${dims.padEnd(35)}${String(r.score).padEnd(8)}${icon}`
  );
}

// ─── Métricas ─────────────────────────────────────────────────────────────────

const total = rows.length;
const totalNonAmbiguous = rows.filter((r) => r.expectedPattern !== "ambiguo").length;
const coincidentes = rows.filter((r) => r.coincide === true).length;
const parciales = rows.filter((r) => r.coincide === "parcial").length;
const discrepantes = rows.filter((r) => r.coincide === false).length;

const acuerdo = coincidentes / totalNonAmbiguous;

console.log("\n");
console.log("═".repeat(120));
console.log("  MÉTRICAS DE ACUERDO");
console.log("═".repeat(120));
console.log(`  Total casos             : ${total}`);
console.log(`  Casos no-ambiguos       : ${totalNonAmbiguous}  (base para métrica de acuerdo)`);
console.log(`  Coincidentes ✅          : ${coincidentes}`);
console.log(`  Parciales 🟡            : ${parciales}  (ambiguos — fallback aceptable)`);
console.log(`  Discrepantes ❌          : ${discrepantes}`);
console.log(
  `\n  Acuerdo = ${coincidentes}/${totalNonAmbiguous} = ${(acuerdo * 100).toFixed(1)}%   (sobre casos con patrón esperado no ambiguo)`
);
console.log();

// ─── Clasificaciones adicionales ─────────────────────────────────────────────

console.log("═".repeat(120));
console.log("  ANÁLISIS CUALITATIVO (pre-evaluador — ver informe completo)");
console.log("═".repeat(120));

const falsosPositivos = rows.filter(
  (r) =>
    r.coincide === false &&
    r.patronSeleccionado.includes("socratico") &&
    r.expectedPattern === "sistemico"
);
const falsosNegativos = rows.filter(
  (r) =>
    r.coincide === false &&
    (r.patronSeleccionado.includes("sistemico") || r.esFallback) &&
    r.expectedPattern === "socratico"
);
const fallbackAdecuado = rows.filter(
  (r) =>
    r.esFallback &&
    (r.expectedPattern === "ambiguo" || r.coincide === true)
);
const packDomina = rows.filter(
  (r) =>
    r.fuentePrincipal === "contexto-pack" || r.fuentePrincipal === "mixta"
);
const necesitaTercerPatron = rows.filter(
  (r) =>
    r.expectedPattern === "sistemico" &&
    r.coincide === false &&
    r.esFallback
);

console.log(`\n  Falsos positivos socrático (esperaba sistémico, obtuvo socrático):`);
if (falsosPositivos.length === 0) console.log("    (ninguno)");
else falsosPositivos.forEach((r) => console.log(`    · ${r.id}: "${r.texto.slice(0, 80)}"`));

console.log(`\n  Falsos negativos socrático (esperaba socrático, obtuvo otro):`);
if (falsosNegativos.length === 0) console.log("    (ninguno)");
else falsosNegativos.forEach((r) => console.log(`    · ${r.id}: "${r.texto.slice(0, 80)}"`));

console.log(`\n  Casos donde fallback socrático es adecuado:`);
if (fallbackAdecuado.length === 0) console.log("    (ninguno)");
else
  fallbackAdecuado.forEach((r) =>
    console.log(`    · ${r.id}: score=${r.score}  expected=${r.expectedPattern}`)
  );

console.log(`\n  Casos donde el contexto del pack domina la decisión (fuente=mixta o contexto-pack):`);
if (packDomina.length === 0) console.log("    (ninguno)");
else
  packDomina.forEach((r) =>
    console.log(`    · ${r.id}: fuente=${r.fuentePrincipal}  pack="${r.packNombre}"`)
  );

console.log(`\n  Casos donde el fallback socrático es inadecuado y podría necesitar tercer patrón:`);
if (necesitaTercerPatron.length === 0) console.log("    (ninguno detectado con criterio estricto)");
else
  necesitaTercerPatron.forEach((r) =>
    console.log(`    · ${r.id}: "${r.texto.slice(0, 80)}"`)
  );

console.log();
