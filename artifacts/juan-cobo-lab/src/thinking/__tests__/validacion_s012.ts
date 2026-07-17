/**
 * Validación S-012 — Tres baterías completas del Thinking Router conceptual
 *
 * Batería A: 12 casos originales de S-010 (re-ejecución exacta)
 * Batería B: 20 casos independientes (no usados en diseño de S-011)
 * Batería C: 12 casos adversariales (diseñados para provocar falsos positivos)
 * Batería D: 6 pares controlados (mismo texto, pack diferente)
 *
 * NO modifica código. Ejecutar ANTES de cualquier ajuste.
 *
 * Uso:
 *   pnpm exec tsx src/thinking/__tests__/validacion_s012.ts
 * desde artifacts/juan-cobo-lab/
 */

import { ConceptualThinkingAlgorithm } from "../algorithms/ConceptualThinkingAlgorithm";
import { ThinkingRouter } from "../ThinkingRouter";
import type { ThinkingRouterInput, ThinkingConceptMatch } from "../types";

const router = new ThinkingRouter(new ConceptualThinkingAlgorithm());

// ─── Types ────────────────────────────────────────────────────────────────────

type ExpectedPattern = "socratico" | "sistemico" | "ambiguo" | "fallback";

interface ValidationCase {
  id: string;
  batch: string;
  input: ThinkingRouterInput;
  expectedPattern: ExpectedPattern;
  rationale: string;
  // S-010 result for comparison (Batch A only)
  s010Result?: {
    patron: string;
    esFallback: boolean;
    coincidio: boolean | "parcial";
  };
}

interface CaseResult {
  id: string;
  batch: string;
  texto: string;
  packId: string;
  expectedPattern: ExpectedPattern;
  patronSeleccionado: string;
  score: number;
  confianza: string;
  esFallback: boolean;
  motivoSeleccion: string;
  fuentePrincipal: string;
  dimensionesDetectadas: string[];
  conceptosActivados: { nombre: string; superficie: string; matchType: string; texto: string }[];
  resumen: string;
  coincide: boolean | "parcial";
  rationale: string;
  s010Result?: ValidationCase["s010Result"];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function run(vc: ValidationCase): Promise<CaseResult> {
  const result = await router.route(vc.input);

  let patronSeleccionado = "NINGUNO";
  let score = 0;
  let confianza = "—";
  let esFallback = false;
  let motivoSeleccion = "—";
  let fuentePrincipal = "—";
  let dimensionesDetectadas: string[] = [];
  let conceptosActivados: CaseResult["conceptosActivados"] = [];
  let resumen = "—";

  if (result.decision === "seleccionado") {
    const sel = result.seleccionado;
    patronSeleccionado = sel.pattern.metadata.id;
    score = sel.score;
    confianza = sel.confianza;
    esFallback = sel.esFallback;
    motivoSeleccion = sel.motivoSeleccion;
    fuentePrincipal = result.explicacionSeleccion.fuentePrincipal;
    dimensionesDetectadas = result.explicacionSeleccion.dimensionesDetectadas;
    resumen = result.explicacionSeleccion.resumen;
    conceptosActivados = sel.conceptMatches.map((m: ThinkingConceptMatch) => ({
      nombre: m.conceptName,
      superficie: m.surface,
      matchType: m.matchType,
      texto: m.matchedText,
    }));
  } else if (result.decision === "candidatos") {
    const top = result.candidatos[0];
    patronSeleccionado = `CANDIDATOS(${top?.pattern.metadata.id})`;
    score = top?.score ?? 0;
    confianza = top?.confianza ?? "—";
    esFallback = top?.esFallback ?? false;
    motivoSeleccion = top?.motivoSeleccion ?? "—";
  }

  // Evaluate coincidence
  // For socratico/sistemico: the right pattern selected = ✅ regardless of esFallback.
  // Fallback is a quality/confidence signal, not a correctness failure.
  // For "fallback" expected: the case MUST be esFallback=true to count as correct.
  // For "ambiguo" expected: always "parcial" (either pattern acceptable).
  let coincide: boolean | "parcial";
  if (vc.expectedPattern === "ambiguo") {
    coincide = "parcial";
  } else if (vc.expectedPattern === "fallback") {
    coincide = esFallback;
  } else if (patronSeleccionado === vc.expectedPattern || patronSeleccionado.includes(vc.expectedPattern)) {
    coincide = true; // correct pattern selected, regardless of fallback path
  } else {
    coincide = false;
  }

  return {
    id: vc.id,
    batch: vc.batch,
    texto: vc.input.texto,
    packId: vc.input.packId ?? "—",
    expectedPattern: vc.expectedPattern,
    patronSeleccionado,
    score: Math.round(score * 1000) / 1000,
    confianza,
    esFallback,
    motivoSeleccion,
    fuentePrincipal,
    dimensionesDetectadas,
    conceptosActivados,
    resumen,
    coincide,
    rationale: vc.rationale,
    s010Result: vc.s010Result,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATERÍA A — 12 casos originales de S-010 (re-ejecución exacta)
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH_A: ValidationCase[] = [
  {
    id: "C01",
    batch: "A",
    input: {
      texto: "¿Por qué aumenta el homicidio en barrios vulnerables de Bogotá a pesar de la presencia policial?",
    },
    expectedPattern: "socratico",
    rationale: "Pregunta ¿por qué? + paradoja aparente → examinar supuestos del diagnóstico. Sin keywords sistémicas explícitas.",
    s010Result: { patron: "socratico", esFallback: true, coincidio: true },
  },
  {
    id: "C02",
    batch: "A",
    input: {
      texto: "¿Qué factores del sistema de salud colombiano generan las barreras de acceso para la población rural?",
    },
    expectedPattern: "sistemico",
    rationale: "'Sistema de salud', 'factores', 'barreras de acceso' → estructura y causas interrelacionadas.",
    s010Result: { patron: "socratico", esFallback: true, coincidio: false },
  },
  {
    id: "C03",
    batch: "A",
    input: {
      texto: "¿Cuáles son los supuestos del Programa Ser Pilo Paga sobre la calidad educativa y el acceso a educación superior?",
    },
    expectedPattern: "socratico",
    rationale: "'Supuestos' es señal directa de Socrático. Coincidencia directa esperada.",
    s010Result: { patron: "socratico", esFallback: false, coincidio: true },
  },
  {
    id: "C04",
    batch: "A",
    input: {
      texto: "¿Por qué la deforestación en la Amazonía colombiana continúa a pesar de los incentivos de conservación y los compromisos internacionales?",
    },
    expectedPattern: "sistemico",
    rationale: "'continúa a pesar de' → retroalimentación. Paradoja de política = bucles sistémicos.",
    s010Result: { patron: "socratico", esFallback: true, coincidio: false },
  },
  {
    id: "C05",
    batch: "A",
    input: {
      texto: "¿Cómo mejorar el recaudo tributario en municipios pequeños de Colombia?",
    },
    expectedPattern: "ambiguo",
    rationale: "Pregunta genérica de mejora administrativa. Fallback socrático aceptable.",
    s010Result: { patron: "socratico", esFallback: true, coincidio: "parcial" },
  },
  {
    id: "C06",
    batch: "A",
    input: {
      texto: "¿Qué interdependencias entre el sistema de transporte público y la economía informal generan la congestión crónica en Bogotá?",
    },
    expectedPattern: "sistemico",
    rationale: "'Interdependencias', 'generan' → señales sistémicas explícitas.",
    s010Result: { patron: "socratico", esFallback: true, coincidio: false },
  },
  {
    id: "C07",
    batch: "A",
    input: {
      texto: "¿Cuál es la evidencia sobre el impacto de los subsidios de vivienda en familias víctimas del desplazamiento forzado?",
    },
    expectedPattern: "socratico",
    rationale: "'Evidencia' → señal directa Socrático. 'Impacto' refuerza orientación evaluativa.",
    s010Result: { patron: "socratico", esFallback: false, coincidio: true },
  },
  {
    id: "C08",
    batch: "A",
    input: {
      texto: "¿Por qué los municipios rurales no logran sostener los acueductos comunitarios construidos con inversión pública?",
    },
    expectedPattern: "ambiguo",
    rationale: "Sostenibilidad post-inversión: puede ser Socrático (supuestos de diseño) o Sistémico (dinámicas de gestión). Genuinamente ambiguo.",
    s010Result: { patron: "socratico", esFallback: true, coincidio: "parcial" },
  },
  {
    id: "C09",
    batch: "A",
    input: {
      texto: "¿Qué efectos no intencionados genera la política de cuotas de género en la carrera administrativa sobre la cultura organizacional y el desempeño institucional?",
    },
    expectedPattern: "sistemico",
    rationale: "'Efectos no intencionados' → señal sistémica directa.",
    s010Result: { patron: "socratico", esFallback: true, coincidio: false },
  },
  {
    id: "C10",
    batch: "A",
    input: {
      texto: "¿Por qué persiste la desnutrición infantil en territorios con alto presupuesto de alimentación escolar? ¿Qué supuestos y diagnóstico sostienen el programa?",
    },
    expectedPattern: "socratico",
    rationale: "'Supuestos' y 'diagnóstico' son señales socrátivas directas. Paradoja presupuesto-resultado.",
    s010Result: { patron: "socratico", esFallback: false, coincidio: true },
  },
  {
    id: "C11",
    batch: "A",
    input: {
      texto: "¿Por qué la tasa de mortalidad materna no mejora en regiones con alta inversión en salud?",
      packId: "salud-materna",
      packNombre: "Salud Materna y Perinatal",
      packContextoResumido: "Análisis de determinantes de la mortalidad materna: barreras de acceso, calidad de atención, coordinación entre niveles del sistema y factores sociales estructurales.",
    },
    expectedPattern: "ambiguo",
    rationale: "Sin pack: fallback socrático probable. Pack tiene 'barreras de acceso', 'coordinación entre niveles del sistema' → puede activar Sistémico via contexto.",
    s010Result: { patron: "socratico", esFallback: true, coincidio: "parcial" },
  },
  {
    id: "C12",
    batch: "A",
    input: {
      texto: "¿Cómo reducir la reincidencia delictiva en jóvenes egresados del sistema de responsabilidad penal?",
      packId: "seguridad-ciudadana",
      packNombre: "Seguridad Ciudadana y Justicia Juvenil",
      packContextoResumido: "Factores de riesgo, trayectorias delictivas, reintegración social, efectividad de las intervenciones de rehabilitación y retroalimentación entre sistema penal y exclusión social.",
    },
    expectedPattern: "sistemico",
    rationale: "'Retroalimentación entre sistema penal y exclusión social' en el pack activa Sistémico via contexto.",
    s010Result: { patron: "socratico", esFallback: true, coincidio: false },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// BATERÍA B — 20 casos independientes (no usados en diseño de S-011)
// Lenguaje natural de política pública, evitando expresiones literales del metadata
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH_B: ValidationCase[] = [
  // ── Socráticos (7) ──────────────────────────────────────────────────────────
  {
    id: "B01",
    batch: "B",
    input: {
      texto: "¿Qué tendría que ser cierto para aceptar que la estrategia de formalización laboral está funcionando?",
    },
    expectedPattern: "socratico",
    rationale: "Variación de 'supuestos' → '¿qué tendría que ser cierto?'. Señal socrática sin usar la palabra literal.",
  },
  {
    id: "B02",
    batch: "B",
    input: {
      texto: "¿Quién definió qué es el problema y qué perspectivas quedaron fuera de ese diagnóstico inicial?",
    },
    expectedPattern: "socratico",
    rationale: "Cuestionamiento sobre definición del problema y perspectivas excluidas → Socrático (Definición + Perspectivas ausentes).",
  },
  {
    id: "B03",
    batch: "B",
    input: {
      texto: "El gobierno concluye que la baja cobertura se debe a falta de oferta, pero ¿cómo llegó a esa conclusión?",
    },
    expectedPattern: "socratico",
    rationale: "Cuestionamiento de la coherencia argumentativa del diagnóstico. Variación de 'no explica cómo llegó a esa conclusión'.",
  },
  {
    id: "B04",
    batch: "B",
    input: {
      texto: "¿Qué dice realmente la investigación disponible sobre la relación entre subsidios directos y deserción escolar?",
    },
    expectedPattern: "socratico",
    rationale: "'Qué dice la investigación' → señal de evidencia. 'Relación entre' puede confundirse con causalidad sistémica pero el tono es evaluativo.",
  },
  {
    id: "B05",
    batch: "B",
    input: {
      texto: "¿A qué grupos o comunidades no se les preguntó durante el diseño de la política de vivienda rural?",
    },
    expectedPattern: "socratico",
    rationale: "Perspectivas ausentes en el proceso de formulación → Socrático (Perspectivas ausentes).",
  },
  {
    id: "B06",
    batch: "B",
    input: {
      texto: "Si la política logra su meta de cobertura, ¿qué implicaciones tendría eso para el modelo de financiamiento del sector?",
    },
    expectedPattern: "socratico",
    rationale: "Implicaciones de alcanzar la meta → Socrático (Implicaciones). No es análisis sistémico, es prospectiva lógica.",
  },
  {
    id: "B07",
    batch: "B",
    input: {
      texto: "¿Bajo qué condiciones es válido comparar los resultados de este programa con los de países de referencia?",
    },
    expectedPattern: "socratico",
    rationale: "Validez de la comparación → cuestionamiento de supuestos metodológicos. Socrático.",
  },

  // ── Sistémicos (7) ──────────────────────────────────────────────────────────
  {
    id: "B08",
    batch: "B",
    input: {
      texto: "Lo que hace una entidad territorial altera directamente el trabajo de las demás, y ninguna tiene control sobre el resultado final.",
    },
    expectedPattern: "sistemico",
    rationale: "Variación de 'interdependencia' sin usar la palabra literal. Señal de Interdependencia sistémica.",
  },
  {
    id: "B09",
    batch: "B",
    input: {
      texto: "La intervención solucionó el problema de hacinamiento en las cárceles bogotanas, pero creó otro en los municipios receptores de la población liberada.",
    },
    expectedPattern: "sistemico",
    rationale: "Variación de 'efectos no intencionados' → 'solucionó un problema pero creó otro'. Desplazamiento del problema.",
  },
  {
    id: "B10",
    batch: "B",
    input: {
      texto: "Entre más se invierte en la solución, menos dispuestos están los actores a adoptar los cambios que requiere, generando un ciclo que se perpetúa.",
    },
    expectedPattern: "sistemico",
    rationale: "Ciclo de retroalimentación descrito en lenguaje natural. 'Se perpetúa' es sinónimo de Retroalimentación.",
  },
  {
    id: "B11",
    batch: "B",
    input: {
      texto: "Los resultados de la política son visibles a los tres años, pero los efectos negativos sobre el ecosistema tardan diez años en manifestarse.",
    },
    expectedPattern: "sistemico",
    rationale: "Diferencia temporal entre efectos a corto y largo plazo → Comportamiento temporal sistémico.",
  },
  {
    id: "B12",
    batch: "B",
    input: {
      texto: "La falta de incentivos alineados entre el nivel nacional y los municipios hace que cada nivel optimice su propio indicador a costa del resultado agregado.",
    },
    expectedPattern: "sistemico",
    rationale: "Incentivos desalineados y fragmentación → Estructuras y restricciones sistémicas.",
  },
  {
    id: "B13",
    batch: "B",
    input: {
      texto: "¿Por qué el bajo rendimiento académico se concentra en los mismos territorios generación tras generación, a pesar de los programas de mejoramiento?",
    },
    expectedPattern: "sistemico",
    rationale: "Persistencia intergeneracional a pesar de intervenciones → retroalimentación y estructuras. Variación de 'persiste a pesar de'.",
  },
  {
    id: "B14",
    batch: "B",
    input: {
      texto: "La congestión vial genera contaminación, la contaminación afecta la salud, la mala salud reduce la productividad, y la baja productividad aumenta la informalidad que recarga el transporte.",
    },
    expectedPattern: "sistemico",
    rationale: "Descripción explícita de bucle de retroalimentación. Causalidad compleja no lineal.",
  },

  // ── Ambiguos (4) ────────────────────────────────────────────────────────────
  {
    id: "B15",
    batch: "B",
    input: {
      texto: "¿Qué debería cambiar en la política de primera infancia para que tenga mayor impacto en poblaciones rurales dispersas?",
    },
    expectedPattern: "ambiguo",
    rationale: "Puede abordarse desde supuestos del diseño (Socrático) o desde barreras estructurales (Sistémico). Genuinamente ambiguo.",
  },
  {
    id: "B16",
    batch: "B",
    input: {
      texto: "¿Por qué fracasan los programas de reconversión productiva en economías extractivas?",
    },
    expectedPattern: "ambiguo",
    rationale: "Fracaso puede analizarse desde supuestos erróneos (Socrático) o desde dinámicas de lock-in sistémico. Sin señales dominantes claras.",
  },
  {
    id: "B17",
    batch: "B",
    input: {
      texto: "¿Cómo puede el gobierno aumentar la participación ciudadana en los procesos de planeación local?",
    },
    expectedPattern: "ambiguo",
    rationale: "Pregunta de diseño institucional sin señales específicas de ningún patrón. Fallback socrático aceptable.",
  },
  {
    id: "B18",
    batch: "B",
    input: {
      texto: "¿Cuáles son los principales obstáculos para la implementación de la política de catastro multipropósito en Colombia?",
    },
    expectedPattern: "ambiguo",
    rationale: "'Obstáculos' podría ser Estructuras y restricciones (Sistémico) o examen de supuestos (Socrático). Genuinamente ambiguo.",
  },

  // ── Fallback (2) ────────────────────────────────────────────────────────────
  {
    id: "B19",
    batch: "B",
    input: {
      texto: "Necesito analizar una política pública de mi municipio.",
    },
    expectedPattern: "fallback",
    rationale: "Petición genérica sin contenido analítico. Debe ser fallback socrático.",
  },
  {
    id: "B20",
    batch: "B",
    input: {
      texto: "Quiero entender mejor cómo funciona el gobierno local.",
    },
    expectedPattern: "fallback",
    rationale: "Petición muy genérica. Sin señales de ningún patrón especializado. Fallback universal.",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// BATERÍA C — 12 casos adversariales (diseñados para provocar falsos positivos)
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH_C: ValidationCase[] = [
  // ── Posibles falsos positivos sistémicos (6) ─────────────────────────────────
  {
    id: "ADV01",
    batch: "C",
    input: {
      texto: "¿Qué evidencia demuestra que el nuevo sistema de información redujo los tiempos de atención en consultorios?",
    },
    expectedPattern: "socratico",
    rationale: "'Sistema de información' ≠ pensamiento sistémico. 'Evidencia' es señal socrática dominante. No debe activar Sistémico.",
  },
  {
    id: "ADV02",
    batch: "C",
    input: {
      texto: "¿Cuáles son los actores que participaron en la formulación del presupuesto participativo y qué perspectivas aportaron?",
    },
    expectedPattern: "socratico",
    rationale: "'Actores' es sinónimo genérico de Interdependencia, pero el contexto es deliberación y perspectivas → Socrático.",
  },
  {
    id: "ADV03",
    batch: "C",
    input: {
      texto: "¿Por qué persiste la corrupción en la contratación pública a nivel municipal?",
    },
    expectedPattern: "socratico",
    rationale: "'Persiste' fue eliminado de sinonimos. 'Corrupción en contratación' no activa expresiones sistémicas. Pregunta de diagnóstico → Socrático.",
  },
  {
    id: "ADV04",
    batch: "C",
    input: {
      texto: "¿Qué estructura administrativa sería más apropiada para coordinar la política de educación inclusiva?",
    },
    expectedPattern: "socratico",
    rationale: "'Estructura administrativa' no es Estructuras y restricciones sistémicas. Pregunta de diseño → Socrático (implicaciones/supuestos).",
  },
  {
    id: "ADV05",
    batch: "C",
    input: {
      texto: "¿Qué ciclo presupuestal sigue el fondo de ciencia y tecnología y cuáles son sus restricciones legales de gasto?",
    },
    expectedPattern: "socratico",
    rationale: "'Ciclo presupuestal' ≠ ciclo de retroalimentación. 'Restricciones legales' no activa Estructuras sistémicas. Pregunta técnica/definitoria → Socrático.",
  },
  {
    id: "ADV06",
    batch: "C",
    input: {
      texto: "¿Cuál es la barrera normativa que impide a los municipios certificarse en agua potable y saneamiento básico?",
    },
    expectedPattern: "socratico",
    rationale: "'Barrera normativa' específica → pregunta jurídica/definitoria. No es análisis de sistema multicausal. Socrático.",
  },

  // ── Posibles falsos positivos socráticos (4) ──────────────────────────────────
  {
    id: "ADV07",
    batch: "C",
    input: {
      texto: "Aunque existe evidencia suficiente sobre la cobertura, la coordinación entre entidades, operadores y gobiernos territoriales sigue generando retrasos y efectos acumulativos.",
    },
    expectedPattern: "sistemico",
    rationale: "'Evidencia' está presente pero el problema dominante es coordinación + efectos acumulativos → Sistémico debe ganar.",
  },
  {
    id: "ADV08",
    batch: "C",
    input: {
      texto: "El diagnóstico documenta bien el desempleo juvenil, pero no muestra cómo las empresas, el sistema educativo y las redes informales de empleo se refuerzan mutuamente para perpetuar la exclusión.",
    },
    expectedPattern: "sistemico",
    rationale: "'Diagnóstico' es socrático superficialmente, pero 'se refuerzan mutuamente para perpetuar' → Retroalimentación sistémica dominante.",
  },
  {
    id: "ADV09",
    batch: "C",
    input: {
      texto: "Suponiendo que los incentivos económicos son el principal determinante, ¿cómo explicamos que los efectos sean tan distintos entre territorios con condiciones similares?",
    },
    expectedPattern: "sistemico",
    rationale: "'Suponiendo' es socrático, pero el núcleo es causalidad compleja territorial → Sistémico debe dominar.",
  },
  {
    id: "ADV10",
    batch: "C",
    input: {
      texto: "¿Por qué los datos sobre inclusión financiera muestran avances que no se traducen en bienestar real de la población atendida?",
    },
    expectedPattern: "socratico",
    rationale: "Brecha medición-impacto → cuestionamiento de la coherencia entre indicadores y resultados. Socrático (Evidencia + Coherencia argumentativa).",
  },

  // ── Casos neutros que no deben activar ningún patrón especializado (2) ─────────
  {
    id: "ADV11",
    batch: "C",
    input: {
      texto: "La política tributaria del sector minero en Colombia tiene múltiples reformas desde 2010.",
    },
    expectedPattern: "fallback",
    rationale: "Afirmación descriptiva sin pregunta analítica. No activa ningún patrón especializado. Fallback universal.",
  },
  {
    id: "ADV12",
    batch: "C",
    input: {
      texto: "¿Cuántos municipios implementaron el PDET y en qué año comenzó la ejecución?",
    },
    expectedPattern: "fallback",
    rationale: "Pregunta de datos factuales. No es análisis de política. Fallback universal.",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// BATERÍA D — 6 pares controlados (mismo texto, pack diferente)
// ═══════════════════════════════════════════════════════════════════════════════

const TEXTO_NEUTRAL_PAR = "¿Cómo podría mejorarse la articulación entre las entidades encargadas de atender esta problemática?";
const TEXTO_SOC_PAR = "¿Qué supuestos sostienen el diagnóstico sobre la cobertura del programa?";
const TEXTO_SIS_PAR = "Los actores interdependientes generan efectos indirectos que persisten a pesar de los incentivos de coordinación.";

const BATCH_D: ValidationCase[] = [
  {
    id: "D01",
    batch: "D",
    input: { texto: TEXTO_NEUTRAL_PAR },
    expectedPattern: "fallback",
    rationale: "Texto neutral sin pack → fallback universal esperado.",
  },
  {
    id: "D02",
    batch: "D",
    input: {
      texto: TEXTO_NEUTRAL_PAR,
      packId: "tic",
      packNombre: "Tecnología de la Información y Comunicación",
      packContextoResumido: "Brecha digital, conectividad, apropiación TIC, operadores, comunidades rurales.",
    },
    expectedPattern: "fallback",
    rationale: "Pack TIC sin señales sistémicas fuertes → texto neutral debe permanecer en fallback o elevar mínimamente.",
  },
  {
    id: "D03",
    batch: "D",
    input: {
      texto: TEXTO_NEUTRAL_PAR,
      packId: "educacion",
      packNombre: "Política Educativa",
      packContextoResumido: "Deserción escolar, calidad docente, brechas territoriales, resultados de aprendizaje, evaluación educativa.",
    },
    expectedPattern: "fallback",
    rationale: "Pack Educación sin señales sistémicas ni socrátivas fuertes → texto neutral debe seguir siendo fallback.",
  },
  {
    id: "D04",
    batch: "D",
    input: {
      texto: TEXTO_NEUTRAL_PAR,
      packId: "sistemico-alto",
      packNombre: "Gestión Sistémica de Territorios",
      packContextoResumido: "Retroalimentación entre actores interdependientes, efectos indirectos de la coordinación multinivel, ciclos de retroalimentación en la gestión territorial y estructuras de incentivos desalineados.",
    },
    expectedPattern: "sistemico",
    rationale: "Pack con alto contenido sistémico → puede activar Sistémico desde packContexto + packNombre.",
  },
  {
    id: "D05",
    batch: "D",
    input: {
      texto: TEXTO_SOC_PAR,
      packId: "sistemico-alto",
      packNombre: "Gestión Sistémica de Territorios",
      packContextoResumido: "Retroalimentación entre actores interdependientes, efectos indirectos de la coordinación multinivel, ciclos de retroalimentación en la gestión territorial.",
    },
    expectedPattern: "socratico",
    rationale: "Texto socrático explícito ('supuestos') + pack sistémico. Señal del problema debe dominar → Socrático.",
  },
  {
    id: "D06",
    batch: "D",
    input: {
      texto: TEXTO_SIS_PAR,
      packId: "socratico-pack",
      packNombre: "Marco Analítico Socrático",
      packContextoResumido: "Supuestos del diagnóstico, evidencia evaluativa, perspectivas de actores, coherencia argumentativa de las políticas, implicaciones de las conclusiones.",
    },
    expectedPattern: "sistemico",
    rationale: "Texto sistémico explícito + pack socrático. Señal del problema ('interdependientes', 'efectos indirectos', 'persiste a pesar de') debe dominar → Sistémico.",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const allCases = [...BATCH_A, ...BATCH_B, ...BATCH_C, ...BATCH_D];
const results: CaseResult[] = [];

for (const vc of allCases) {
  results.push(await run(vc));
}

// ─── Printer ──────────────────────────────────────────────────────────────────

function icon(c: boolean | "parcial"): string {
  return c === true ? "✅" : c === "parcial" ? "🟡" : "❌";
}

function printBatch(label: string, batchId: string) {
  const rows = results.filter((r) => r.batch === batchId);
  console.log("\n" + "═".repeat(130));
  console.log(`  ${label}`);
  console.log("═".repeat(130));

  for (const r of rows) {
    const ic = icon(r.coincide);
    console.log(`\n${ic} ${r.id} · esperado: ${r.expectedPattern.toUpperCase()} · obtenido: ${r.patronSeleccionado.toUpperCase()}`);
    console.log(`   texto      : "${r.texto.slice(0, 100)}${r.texto.length > 100 ? "…" : ""}"`);
    if (r.packId !== "—") console.log(`   pack       : ${r.packId}`);
    console.log(`   score      : ${r.score}  confianza=${r.confianza}  esFallback=${r.esFallback}`);
    console.log(`   motivo     : ${r.motivoSeleccion}  fuente=${r.fuentePrincipal}`);
    console.log(`   dims       : [${r.dimensionesDetectadas.join(", ") || "—"}]`);
    if (r.conceptosActivados.length > 0) {
      const top = r.conceptosActivados.slice(0, 5);
      const lines = top
        .map((c) => `${c.matchType === "expresion" ? "📌" : "·"} "${c.texto}" [${c.nombre}, ${c.matchType}, ${c.superficie}]`)
        .join("\n              ");
      console.log(`   conceptos  : ${lines}`);
    }
    console.log(`   resumen    : "${r.resumen.slice(0, 100)}${r.resumen.length > 100 ? "…" : ""}"`);
    if (batchId === "A" && r.s010Result) {
      const wasOk = r.s010Result.coincidio;
      const isOk = r.coincide;
      const change =
        wasOk === false && isOk === true
          ? "📈 MEJORA"
          : wasOk === true && isOk === false
          ? "📉 REGRESIÓN"
          : wasOk === isOk
          ? "→ SIN CAMBIO"
          : "🔄 CAMBIO";
      console.log(`   S-010      : ${r.s010Result.patron} (fallback=${r.s010Result.esFallback}) → ${change}`);
    }
    console.log(`   razón      : ${r.rationale}`);
  }
}

printBatch("BATERÍA A — Casos originales S-010 (re-ejecución)", "A");
printBatch("BATERÍA B — Casos independientes (lenguaje natural)", "B");
printBatch("BATERÍA C — Casos adversariales", "C");
printBatch("BATERÍA D — Pares controlados (pack context)", "D");

// ─── Métricas ─────────────────────────────────────────────────────────────────

console.log("\n\n" + "═".repeat(130));
console.log("  MÉTRICAS CONSOLIDADAS");
console.log("═".repeat(130));

function computeMetrics(label: string, rows: CaseResult[]) {
  const total = rows.length;
  const nonAmbiguous = rows.filter((r) => r.expectedPattern !== "ambiguo");
  const correct = rows.filter((r) => r.coincide === true);
  const partial = rows.filter((r) => r.coincide === "parcial");
  const wrong = rows.filter((r) => r.coincide === false);
  const fallbacks = rows.filter((r) => r.esFallback);
  const fuenteProblema = rows.filter((r) => r.fuentePrincipal === "problema");
  const fuenteMixta = rows.filter((r) => r.fuentePrincipal === "mixta");

  // Precision/Recall for socratico
  const expectedSoc = rows.filter((r) => r.expectedPattern === "socratico");
  const predictedSoc = rows.filter((r) => r.patronSeleccionado === "socratico");
  const tpSoc = rows.filter(
    (r) => r.expectedPattern === "socratico" && r.patronSeleccionado === "socratico" && !r.esFallback
  );
  const tpSocFallback = rows.filter(
    (r) => r.expectedPattern === "socratico" && r.patronSeleccionado === "socratico"
  );

  // Precision/Recall for sistemico
  const expectedSis = rows.filter((r) => r.expectedPattern === "sistemico");
  const predictedSis = rows.filter((r) => r.patronSeleccionado === "sistemico");
  const tpSis = rows.filter(
    (r) => r.expectedPattern === "sistemico" && r.patronSeleccionado === "sistemico"
  );

  const precisSoc = predictedSoc.length ? tpSocFallback.length / predictedSoc.length : 0;
  const recallSoc = expectedSoc.length ? tpSocFallback.length / expectedSoc.length : 0;
  const precisSis = predictedSis.length ? tpSis.length / predictedSis.length : 0;
  const recallSis = expectedSis.length ? tpSis.length / expectedSis.length : 0;

  const acuerdo = nonAmbiguous.length ? correct.length / nonAmbiguous.length : 0;

  console.log(`\n── ${label} (n=${total}) ──`);
  console.log(`   Acuerdo sobre no-ambiguos : ${correct.length}/${nonAmbiguous.length} = ${(acuerdo * 100).toFixed(1)}%`);
  console.log(`   Parciales (ambiguos)       : ${partial.length}`);
  console.log(`   Discrepantes               : ${wrong.length}`);
  console.log(`   Fallback total             : ${fallbacks.length}/${total} = ${(fallbacks.length / total * 100).toFixed(1)}%`);
  console.log(`   Fuente=problema            : ${fuenteProblema.length}/${total} = ${(fuenteProblema.length / total * 100).toFixed(1)}%`);
  console.log(`   Fuente=mixta               : ${fuenteMixta.length}/${total} = ${(fuenteMixta.length / total * 100).toFixed(1)}%`);
  console.log(`   Socrático: precisión=${(precisSoc * 100).toFixed(0)}%  recall=${(recallSoc * 100).toFixed(0)}%  (TP=${tpSocFallback.length}  pred=${predictedSoc.length}  exp=${expectedSoc.length})`);
  console.log(`   Sistémico: precisión=${(precisSis * 100).toFixed(0)}%  recall=${(recallSis * 100).toFixed(0)}%  (TP=${tpSis.length}  pred=${predictedSis.length}  exp=${expectedSis.length})`);

  return { acuerdo, correct: correct.length, nonAmbiguous: nonAmbiguous.length, wrong, tpSis, tpSocFallback, predictedSis, predictedSoc, expectedSis, expectedSoc, fallbacks };
}

const mA = computeMetrics("Batería A (original S-010)", results.filter((r) => r.batch === "A"));
const mB = computeMetrics("Batería B (independiente)", results.filter((r) => r.batch === "B"));
const mC = computeMetrics("Batería C (adversarial)", results.filter((r) => r.batch === "C"));
const mD = computeMetrics("Batería D (pares controlados)", results.filter((r) => r.batch === "D"));

// Global
const allNonAdv = results.filter((r) => r.batch !== "C");
const mGlobal = computeMetrics("GLOBAL (A+B+D)", allNonAdv);

// ─── Matriz comparativa A vs S-010 ────────────────────────────────────────────

console.log("\n\n" + "═".repeat(130));
console.log("  MATRIZ COMPARATIVA: S-010 → S-012 (Batería A)");
console.log("═".repeat(130));
console.log(`${"ID".padEnd(5)}${"ESPERADO".padEnd(12)}${"S-010".padEnd(22)}${"S-012".padEnd(22)}${"SCORE".padEnd(8)}${"DIMS".padEnd(40)}${"CAMBIO"}`);
console.log("─".repeat(130));

const batchA = results.filter((r) => r.batch === "A");
for (const r of batchA) {
  const s010Pat = r.s010Result?.patron ?? "?";
  const s010Fb = r.s010Result?.esFallback ? "(fb)" : "";
  const chg =
    r.s010Result?.coincidio === false && r.coincide === true
      ? "📈 MEJORA"
      : r.s010Result?.coincidio === true && r.coincide === false
      ? "📉 REGRESIÓN"
      : r.coincide === "parcial" || r.s010Result?.coincidio === "parcial"
      ? "🟡 AMBIGU"
      : "→ IGUAL";
  const dims = r.dimensionesDetectadas.slice(0, 3).join(",").slice(0, 38) || "—";
  console.log(
    `${r.id.padEnd(5)}${r.expectedPattern.padEnd(12)}${(s010Pat + s010Fb).padEnd(22)}${(r.patronSeleccionado + (r.esFallback ? "(fb)" : "")).padEnd(22)}${String(r.score).padEnd(8)}${dims.padEnd(40)}${chg}`
  );
}

// ─── Errores detallados ────────────────────────────────────────────────────────

console.log("\n\n" + "═".repeat(130));
console.log("  ERRORES ENCONTRADOS");
console.log("═".repeat(130));

const errors = results.filter((r) => r.coincide === false);
if (errors.length === 0) {
  console.log("  (ningún error en decisión correcta — ver análisis de confianza y fuente)");
} else {
  for (const r of errors) {
    console.log(`\n❌ ${r.id} [${r.batch}] esperaba=${r.expectedPattern} obtuvo=${r.patronSeleccionado} esFallback=${r.esFallback}`);
    console.log(`   "${r.texto.slice(0, 100)}"`);
    console.log(`   dims=[${r.dimensionesDetectadas.join(", ") || "—"}]  score=${r.score}  fuente=${r.fuentePrincipal}`);
    // Diagnose root cause
    if (r.expectedPattern === "sistemico" && r.esFallback) {
      console.log(`   → CAUSA: ningún concepto sistémico activado en problema ni pack`);
    } else if (r.expectedPattern === "sistemico" && r.patronSeleccionado === "socratico" && !r.esFallback) {
      console.log(`   → CAUSA: señales socrátivas superaron señales sistémicas`);
    } else if (r.expectedPattern === "socratico" && r.patronSeleccionado === "sistemico") {
      console.log(`   → CAUSA: falso positivo sistémico — revisión de vocabulario requerida`);
    } else if (r.expectedPattern === "fallback" && !r.esFallback) {
      console.log(`   → CAUSA: término genérico activó patrón especializado — vocabulario demasiado amplio`);
    }
    const conceptActivados = r.conceptosActivados.map((c) => `${c.nombre}(${c.matchType})`).join(", ");
    console.log(`   → conceptos: ${conceptActivados || "(ninguno)"}`);
  }
}

console.log("\n");
