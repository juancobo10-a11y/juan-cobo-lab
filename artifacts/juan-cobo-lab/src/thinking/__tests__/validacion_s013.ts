/**
 * Validación S-013 — Incorporación del patrón Economía Política
 *
 * Baterías:
 *   EP  — 8 casos puros de Economía Política (lenguaje natural)
 *   MX  — 6 casos mixtos (EP vs Sistémico, EP vs Socrático, three-way)
 *   FP  — 6 casos anti-falsos-positivos (no deben activar EP)
 *   SP  — 4 casos de protección de señal del problema (corrección D05)
 *
 * Criterio de coincidencia:
 *   - Patrón seleccionado = esperado → ✅ (independientemente de esFallback)
 *   - Patrón esperado = "fallback"   → ✅ solo si esFallback=true
 *   - Patrón esperado = "ambiguo"    → 🟡 siempre (cualquier patrón aceptable)
 *   - Patrón esperado = "candidatos" → 🟡 si la decisión es "candidatos" (empate)
 */

import { ThinkingRouter } from "../ThinkingRouter";
import { ConceptualThinkingAlgorithm } from "../algorithms/ConceptualThinkingAlgorithm";
import { THINKING_REGISTRY } from "../registry";
import type { ThinkingRouterInput } from "../types";

// ─── Types ─────────────────────────────────────────────────────────────────

type ExpectedPattern =
  | "economia-politica"
  | "sistemico"
  | "socratico"
  | "fallback"
  | "ambiguo"
  | "candidatos";

interface ValidationCase {
  id: string;
  bateria: string;
  texto: string;
  packId?: string;
  packNombre?: string;
  packContexto?: string; // mapped to packContextoResumido in ThinkingRouterInput
  expectedPattern: ExpectedPattern;
  razon: string;
}

// ─── Router ────────────────────────────────────────────────────────────────

const router = new ThinkingRouter(
  new ConceptualThinkingAlgorithm(),
  THINKING_REGISTRY
);

// ─── Casos ─────────────────────────────────────────────────────────────────

const CASOS: ValidationCase[] = [

  // ── Batería EP: Economía Política pura ──────────────────────────────────

  {
    id: "EP01",
    bateria: "EP",
    texto: "Los subsidios al combustible son captados por las empresas transportistas y no llegan a los hogares de bajos ingresos. Los beneficios concentrados y los costos dispersos entre millones de contribuyentes explican por qué la reforma no avanza.",
    expectedPattern: "economia-politica",
    razon: "Distribución: beneficios concentrados y costos dispersos — señal canónica de EP.",
  },
  {
    id: "EP02",
    bateria: "EP",
    texto: "La reforma al sistema de contratación pública fue bloqueada antes de llegar al Congreso. Los gremios empresariales con acceso directo al ministerio impidieron que llegara a debate.",
    expectedPattern: "economia-politica",
    razon: "Poder institucional (bloqueo) + Actores e intereses (gremios empresariales).",
  },
  {
    id: "EP03",
    bateria: "EP",
    texto: "Los municipios con mayor capacidad de lobby ante el gobierno central reciben más transferencias del programa, independientemente de sus indicadores de necesidad.",
    expectedPattern: "economia-politica",
    razon: "Actores e intereses (lobby) + Distribución (captado por grupos).",
  },
  {
    id: "EP04",
    bateria: "EP",
    texto: "Los funcionarios locales no tienen incentivos para reportar los datos correctamente porque el sistema de evaluación premia el cumplimiento formal de metas y no los resultados reales sobre la población.",
    expectedPattern: "economia-politica",
    razon: "Incentivos incompatibles con los objetivos — señal directa de EP.",
  },
  {
    id: "EP05",
    bateria: "EP",
    texto: "El gobierno nacional quiere ajuste fiscal y los territorios quieren mayor inversión en salud. Ninguno cede porque sus objetivos son incompatibles y la negociación política lleva tres años sin resultado.",
    expectedPattern: "economia-politica",
    razon: "Conflictos: objetivos incompatibles, negociación fallida entre gobierno y territorios.",
  },
  {
    id: "EP06",
    bateria: "EP",
    texto: "El ente regulador del sector financiero fue capturado por las entidades que regula. Ha dejado de sancionar los incumplimientos y prioriza la estabilidad sectorial sobre la protección al consumidor.",
    expectedPattern: "economia-politica",
    razon: "Poder institucional: captura regulatoria — texto casi literal del concepto.",
  },
  {
    id: "EP07",
    bateria: "EP",
    texto: "¿Quién gana y quién pierde con la política de precios regulados? ¿Los grupos que pierden tienen capacidad de veto suficiente para bloquear la implementación?",
    expectedPattern: "economia-politica",
    razon: "Distribución (quién gana y pierde) + Poder institucional (capacidad de veto).",
  },
  {
    id: "EP08",
    bateria: "EP",
    texto: "La política persiste aunque produce resultados subóptimos para la mayoría. Los grupos beneficiados por el statu quo tienen organización e influencia suficiente para neutralizar cualquier intento de reforma.",
    expectedPattern: "economia-politica",
    razon: "Actores e intereses (grupos organizados) + Poder institucional (influencia política).",
  },

  // ── Batería MX: Casos mixtos ─────────────────────────────────────────────

  {
    id: "MX01",
    bateria: "MX",
    texto: "La política fracasa porque varias entidades no coordinan sus acciones y además existen incentivos para no cooperar entre niveles de gobierno.",
    expectedPattern: "economia-politica",
    razon: "EP domina (incentivos para no cooperar = señal directa). Sistémico tiene señal de coordinación pero más débil. Spec pide 'determinar cuál domina' — es EP.",
  },
  {
    id: "MX02",
    bateria: "MX",
    texto: "¿Qué evidencia demuestra que los incentivos realmente modificaron el comportamiento de los actores en los municipios piloto?",
    expectedPattern: "socratico",
    razon: "Socrático domina (evidencia + ¿qué evidencia?). 'Incentivos' es señal EP débil, no suficiente para desplazar la señal de Evidencia.",
  },
  {
    id: "MX03",
    bateria: "MX",
    texto: "El sistema de salud produce efectos de retroalimentación que perpetúan la inequidad. Los grupos de interés que se benefician del statu quo bloquean las reformas que podrían romper el ciclo.",
    expectedPattern: "sistemico",
    razon: "Sistémico domina (retroalimentación, perpetúan, se refuerza). EP activa por 'grupos de interés' pero score Sistémico es mayor. Spec pide 'determinar cuál domina' — es Sistémico.",
  },
  {
    id: "MX04",
    bateria: "MX",
    texto: "¿Qué supuestos sostiene el diagnóstico sobre el comportamiento de los grupos de interés? ¿Hay evidencia de que el lobby explica la concentración de beneficios?",
    expectedPattern: "socratico",
    razon: "Socrático domina (supuestos + evidencia). EP aparece como contexto pero Socrático tiene señal más fuerte del texto.",
  },
  {
    id: "MX05",
    bateria: "MX",
    texto: "Los costos de la política están dispersos entre millones de ciudadanos que no tienen capacidad de organizarse, mientras los beneficios se concentran en pocas empresas que sí tienen incentivos para organizarse y ejercer presión política.",
    expectedPattern: "economia-politica",
    razon: "EP claro: distribución + incentivos para organizarse + presión política. Olson en texto.",
  },
  {
    id: "MX06",
    bateria: "MX",
    texto: "Las entidades responsables del programa no coordinan entre sí porque no tienen incentivos económicos ni políticos para hacerlo, y cada una optimiza sus propias métricas de desempeño en lugar de los resultados del sistema.",
    expectedPattern: "economia-politica",
    razon: "Incentivos (no tienen incentivos para cooperar) domina; coordinación es el síntoma, los incentivos la causa. EP > Sistémico.",
  },

  // ── Batería FP: Anti-falsos-positivos ────────────────────────────────────

  {
    id: "FP01",
    bateria: "FP",
    texto: "El sistema de salud presenta múltiples retroalimentaciones entre niveles de atención. La demanda en urgencias se retroalimenta con la falta de atención primaria.",
    expectedPattern: "sistemico",
    razon: "Sistémico (retroalimentación, niveles). Sin señales EP.",
  },
  {
    id: "FP02",
    bateria: "FP",
    texto: "¿Qué supuestos sostienen el diagnóstico sobre la cobertura del programa educativo? ¿Se da por sentado que la oferta determina la demanda?",
    expectedPattern: "socratico",
    razon: "Socrático (supuestos, se da por sentado). Sin señales EP.",
  },
  {
    id: "FP03",
    bateria: "FP",
    texto: "La fragmentación institucional entre el ministerio de salud y los entes territoriales genera incentivos desalineados que perpetúan la ineficiencia.",
    expectedPattern: "sistemico",
    razon: "Sistémico (fragmentación, incentivos desalineados = expresión de Estructuras, perpetúan = Retroalimentación). Señales EP tenues.",
  },
  {
    id: "FP04",
    bateria: "FP",
    texto: "¿Qué evidencia respalda que la intervención redujo las brechas de acceso? ¿Cómo se midió el impacto en grupos vulnerables?",
    expectedPattern: "socratico",
    razon: "Socrático (evidencia, ¿qué evidencia?). Sin señales EP ni Sistémico.",
  },
  {
    id: "FP05",
    bateria: "FP",
    texto: "Los efectos de la política de vivienda se trasladaron hacia los municipios periféricos, donde la presión sobre los servicios públicos aumentó de forma inesperada.",
    expectedPattern: "sistemico",
    razon: "Sistémico (traslado del problema, efectos indirectos). Sin señales EP.",
  },
  {
    id: "FP06",
    bateria: "FP",
    texto: "El programa produjo resultados distintos entre territorios. Las causas interrelacionadas incluyen factores institucionales, financieros y geográficos.",
    expectedPattern: "sistemico",
    razon: "Sistémico (causalidad compleja: factores interrelacionados, factores institucionales). Sin señales EP.",
  },

  // ── Batería SP: Protección de señal del problema ─────────────────────────

  {
    id: "SP01",
    bateria: "SP",
    texto: "¿Qué supuestos sostienen el diagnóstico sobre la cobertura del programa?",
    packId: "sistemico-alto",
    packNombre: "Gestión Sistémica de Territorios",
    packContexto: "Programa con múltiples actores interdependientes, retroalimentación entre entidades, efectos indirectos sobre territorios, causas interrelacionadas y restricciones estructurales de coordinación.",
    expectedPattern: "socratico",
    razon: "SP: Socrático tiene señal del problema (supuestos). Pack sistémico no debe desplazarlo. Corrección del error D05 de S-012.",
  },
  {
    id: "SP02",
    bateria: "SP",
    texto: "¿Qué evidencia demuestra que la política realmente funcionó?",
    packId: "ep-alto",
    packNombre: "Reforma Tributaria y Grupos de Interés",
    packContexto: "Política afectada por captura regulatoria, grupos de interés con poder de veto, coaliciones que se oponen, distribución de costos y beneficios entre actores con intereses contrapuestos.",
    expectedPattern: "socratico",
    razon: "SP: Socrático (evidencia) tiene señal directa del problema. Pack EP denso no debe ganar.",
  },
  {
    id: "SP03",
    bateria: "SP",
    texto: "El ente regulador fue capturado por el sector. Tiene incentivos para no sancionar porque sus directivos vienen del sector privado.",
    packId: "sistemico-alto",
    packNombre: "Sistema de Salud Multinivel",
    packContexto: "Sistema con retroalimentaciones, actores interdependientes, efectos indirectos entre niveles, trayectorias históricas y comportamiento temporal de las inequidades.",
    expectedPattern: "economia-politica",
    razon: "SP: EP tiene señal del problema (captura, incentivos). Pack sistémico no debe ganar.",
  },
  {
    id: "SP04",
    bateria: "SP",
    texto: "El sistema de retroalimentación entre la falta de atención primaria y la saturación de urgencias se ha perpetuado durante décadas a pesar de los programas de reforma.",
    packId: "ep-alto",
    packNombre: "Política de Salud y Actores Políticos",
    packContexto: "Actores con poder de veto, grupos de interés que bloquean la reforma, distribución inequitativa de beneficios, costos concentrados en el sector público.",
    expectedPattern: "sistemico",
    razon: "SP: Sistémico (retroalimentación, perpetuado, a pesar de los programas) tiene señal fuerte del problema. Pack EP no debe ganar.",
  },
];

// ─── Runner ────────────────────────────────────────────────────────────────

const LARGO_TEXTO = 90;

function truncar(texto: string): string {
  return texto.length > LARGO_TEXTO ? texto.slice(0, LARGO_TEXTO) + "…" : texto;
}

async function run(): Promise<void> {
  console.log("\n" + "═".repeat(120));
  console.log("  VALIDACIÓN S-013 — Economía Política + Protección de señal");
  console.log("═".repeat(120) + "\n");

  type Resultado = {
    caso: ValidationCase;
    patronObtenido: string;
    esFallback: boolean;
    score: number;
    confianza: string;
    dims: string[];
    motivo: string;
    fuente: string;
    coincide: boolean | "parcial";
    decision: string;
  };

  const resultados: Resultado[] = [];

  for (const vc of CASOS) {
    const input: ThinkingRouterInput = {
      texto: vc.texto,
      packId: vc.packId,
      packNombre: vc.packNombre,
      packContextoResumido: vc.packContexto,
    };

    router.clearCache();
    const result = await router.route(input);

    let patronObtenido: string;
    let score = 0;
    let confianza = "—";
    let esFallback = false;
    let dims: string[] = [];
    let motivo = "—";
    let fuente = "—";
    let decision = result.decision;

    if (result.decision === "seleccionado" && result.seleccionado) {
      const w = result.seleccionado;
      patronObtenido = w.pattern.metadata.id;
      score = w.score;
      confianza = w.confianza;
      esFallback = w.esFallback;
      dims = (result.explicacionSeleccion?.dimensionesDetectadas ?? []);
      motivo = w.motivoSeleccion ?? "—";
      fuente = result.explicacionSeleccion?.fuentePrincipal ?? "—";
    } else if (result.decision === "candidatos" && result.candidatos && result.candidatos.length > 0) {
      const ids = result.candidatos.map((c) => c.pattern.metadata.id).join("+");
      patronObtenido = `CANDIDATOS(${ids})`;
      score = result.candidatos[0].score;
      confianza = result.candidatos[0].confianza;
      esFallback = result.candidatos[0].esFallback;
    } else {
      patronObtenido = "ninguno";
    }

    // Evaluate coincidence
    let coincide: boolean | "parcial";
    if (vc.expectedPattern === "ambiguo") {
      coincide = "parcial";
    } else if (vc.expectedPattern === "candidatos") {
      coincide = result.decision === "candidatos" ? "parcial" : false;
    } else if (vc.expectedPattern === "fallback") {
      coincide = esFallback;
    } else if (
      patronObtenido === vc.expectedPattern ||
      patronObtenido.includes(vc.expectedPattern)
    ) {
      coincide = true;
    } else {
      coincide = false;
    }

    resultados.push({
      caso: vc,
      patronObtenido,
      esFallback,
      score,
      confianza,
      dims,
      motivo,
      fuente,
      coincide,
      decision,
    });

    const emoji =
      coincide === true ? "✅" : coincide === "parcial" ? "🟡" : "❌";
    const fallbackTag = esFallback ? " (fb)" : "";
    console.log(
      `${emoji} ${vc.id} [${vc.bateria}] · esperado: ${vc.expectedPattern.toUpperCase().padEnd(17)} · obtenido: ${(patronObtenido + fallbackTag).padEnd(30)}`
    );
    console.log(
      `   score      : ${score.toFixed(2)}  confianza=${confianza}  esFallback=${esFallback}`
    );
    if (dims.length > 0) {
      console.log(`   dims       : ${dims.join(", ")}`);
    }
    console.log(`   razón      : ${vc.razon}`);
    if (coincide === false) {
      console.log(`   ⚠ TEXTO    : "${truncar(vc.texto)}"`);
    }
    console.log();
  }

  // ─── Métricas por batería ────────────────────────────────────────────────

  const baterias = ["EP", "MX", "FP", "SP"];

  for (const bat of baterias) {
    const br = resultados.filter((r) => r.caso.bateria === bat);
    if (br.length === 0) continue;

    const noAmbiguos = br.filter(
      (r) =>
        r.caso.expectedPattern !== "ambiguo" &&
        r.caso.expectedPattern !== "candidatos"
    );
    const aciertos = noAmbiguos.filter((r) => r.coincide === true).length;
    const fallbacks = br.filter((r) => r.esFallback).length;

    console.log(`── Batería ${bat} (n=${br.length}) ──`);
    console.log(
      `   Acuerdo sobre no-candidatos : ${aciertos}/${noAmbiguos.length} = ${noAmbiguos.length > 0 ? ((aciertos / noAmbiguos.length) * 100).toFixed(1) : "—"}%`
    );
    console.log(
      `   Fallback total              : ${fallbacks}/${br.length} = ${((fallbacks / br.length) * 100).toFixed(1)}%`
    );
  }

  // ─── Métricas globales ───────────────────────────────────────────────────

  console.log("\n" + "─".repeat(120));
  const noAmbiguosGlobal = resultados.filter(
    (r) =>
      r.caso.expectedPattern !== "ambiguo" &&
      r.caso.expectedPattern !== "candidatos"
  );
  const aciertosGlobal = noAmbiguosGlobal.filter(
    (r) => r.coincide === true
  ).length;
  const parciales = resultados.filter((r) => r.coincide === "parcial").length;
  const discrepantes = resultados.filter((r) => r.coincide === false).length;

  console.log("── GLOBAL ──");
  console.log(
    `   Acuerdo sobre no-candidatos : ${aciertosGlobal}/${noAmbiguosGlobal.length} = ${((aciertosGlobal / noAmbiguosGlobal.length) * 100).toFixed(1)}%`
  );
  console.log(`   Parciales (candidatos)      : ${parciales}`);
  console.log(`   Discrepantes                : ${discrepantes}`);

  // Precision / recall por patrón
  const patrones = ["economia-politica", "sistemico", "socratico"];
  for (const p of patrones) {
    const tp = resultados.filter(
      (r) =>
        r.coincide === true &&
        (r.patronObtenido === p || r.patronObtenido.includes(p)) &&
        r.caso.expectedPattern === p
    ).length;
    const pred = resultados.filter(
      (r) =>
        r.patronObtenido === p || r.patronObtenido.includes(p)
    ).length;
    const exp = resultados.filter((r) => r.caso.expectedPattern === p).length;
    const prec = pred > 0 ? ((tp / pred) * 100).toFixed(0) : "—";
    const rec = exp > 0 ? ((tp / exp) * 100).toFixed(0) : "—";
    console.log(
      `   ${p.padEnd(20)}: precisión=${prec}%  recall=${rec}%  (TP=${tp}  pred=${pred}  exp=${exp})`
    );
  }

  // ─── Errores ─────────────────────────────────────────────────────────────

  const errores = resultados.filter((r) => r.coincide === false);
  if (errores.length > 0) {
    console.log("\n" + "═".repeat(120));
    console.log("  ERRORES ENCONTRADOS");
    console.log("═".repeat(120));
    for (const r of errores) {
      console.log(
        `\n❌ ${r.caso.id} [${r.caso.bateria}] esperaba=${r.caso.expectedPattern} obtuvo=${r.patronObtenido} esFallback=${r.esFallback}`
      );
      console.log(`   "${truncar(r.caso.texto)}"`);
      console.log(`   dims=[${r.dims.join(", ") || "—"}]  score=${r.score.toFixed(2)}  fuente=${r.fuente}`);
      console.log(`   razón esperada: ${r.caso.razon}`);
    }
  } else {
    console.log("\n  ✅ Sin errores.");
  }

  // ─── Exit code ────────────────────────────────────────────────────────────

  if (discrepantes > 0) {
    console.log(
      `\n⚠  ${discrepantes} error(es). Ajustar metadata o documentar como limitación.`
    );
    process.exit(1);
  } else {
    console.log("\n  ✅ Validación completada sin errores.");
    process.exit(0);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
