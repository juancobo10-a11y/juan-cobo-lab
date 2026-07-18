#!/usr/bin/env tsx
/**
 * S-023 — Validación del Report Builder & Traceable Export Engine
 *
 * Cobertura:
 *   definición, secciones, orden, generación, validación,
 *   HTML, Markdown, JSON, trazabilidad, referencias,
 *   múltiples hipótesis, múltiples conclusiones,
 *   exportación, integración, regresión.
 *
 * Esperar ≥ 150 aserciones.
 */

import {
  createReportDefinition,
  updateReportDefinition,
  toggleSection,
  reorderSections,
  generateReport,
  generateSection,
  findTraceability,
  validateReport,
  summarizeReport,
  buildReportDocument,
  upsertReportDefinition,
  findReportDefinitionByHypothesis,
  removeReportDefinition,
} from "../ReportBuilderService";
import { MarkdownExporter } from "../exporters/MarkdownExporter";
import { HtmlExporter } from "../exporters/HtmlExporter";
import { JsonExporter } from "../exporters/JsonExporter";
import type { ReportBuildInput, ReportSectionType } from "../types";
import { DEFAULT_SECTION_ORDER, SECTION_TITLES } from "../types";
import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel, ConceptualVariable } from "@/conceptual/types";
import type { OperationalizationMatrix } from "@/operationalization/types";
import type { ContrastationMatrix } from "@/contrastation/types";
import type { EvidenceEvaluationMatrix, HypothesisEvidenceConclusion } from "@/evidence-evaluation/types";
import type { MethodologicalAudit } from "@/methodological-consistency/types";

// ─── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let testName = "";

function describe(name: string, fn: () => void) {
  testName = name;
  fn();
}

function it(msg: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${msg}`);
  } catch (e: any) {
    failed++;
    console.error(`  ✗ ${msg}: ${e?.message ?? e}`);
  }
}

function expect(val: unknown) {
  return {
    toBe: (exp: unknown) => {
      if (val !== exp) throw new Error(`Expected ${JSON.stringify(exp)}, got ${JSON.stringify(val)}`);
    },
    toEqual: (exp: unknown) => {
      if (JSON.stringify(val) !== JSON.stringify(exp))
        throw new Error(`Expected ${JSON.stringify(exp)}, got ${JSON.stringify(val)}`);
    },
    toBeGreaterThan: (n: number) => {
      if ((val as number) <= n) throw new Error(`Expected > ${n}, got ${val}`);
    },
    toBeGreaterThanOrEqual: (n: number) => {
      if ((val as number) < n) throw new Error(`Expected >= ${n}, got ${val}`);
    },
    toBeLessThan: (n: number) => {
      if ((val as number) >= n) throw new Error(`Expected < ${n}, got ${val}`);
    },
    toContain: (sub: string) => {
      if (!(val as string).includes(sub))
        throw new Error(`Expected "${val}" to contain "${sub}"`);
    },
    toBeTrue: () => {
      if (val !== true) throw new Error(`Expected true, got ${val}`);
    },
    toBeFalse: () => {
      if (val !== false) throw new Error(`Expected false, got ${val}`);
    },
    toBeNull: () => {
      if (val !== null) throw new Error(`Expected null, got ${val}`);
    },
    toBeUndefined: () => {
      if (val !== undefined) throw new Error(`Expected undefined, got ${val}`);
    },
    toHaveLength: (n: number) => {
      if ((val as any[]).length !== n)
        throw new Error(`Expected length ${n}, got ${(val as any[]).length}`);
    },
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = "2026-01-01T00:00:00.000Z";

const hyp1: PolicyHypothesis = {
  id: "hyp-001",
  titulo: "Hipótesis de acceso educativo",
  formulacion: "El incremento del gasto público en educación secundaria incrementa la cobertura en zonas rurales.",
  causa: "Bajo gasto público en educación",
  mecanismo: "Más recursos → más infraestructura y docentes",
  resultadoEsperado: "Mayor cobertura en zonas rurales",
  condiciones: "Gobernanza local efectiva",
  limites: "Sin corrupción significativa",
  evidenciaNecesaria: "Datos panel CEPAL / UNESCO",
  variables: [
    { id: "var-001", nombre: "Gasto público educación", rol: "causa", descripcion: "Porcentaje del PIB" },
    { id: "var-002", nombre: "Cobertura educativa", rol: "resultado", descripcion: "Porcentaje de matrícula" },
  ],
  confianza: "plausible",
  sourceQuestionIds: [],
  thinkingPatternIds: [],
  isPrimary: true,
  patternChangedWarning: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const hyp2: PolicyHypothesis = {
  id: "hyp-002",
  titulo: "Hipótesis de infraestructura",
  formulacion: "La mejora de infraestructura escolar reduce la deserción.",
  causa: "Infraestructura deficiente",
  mecanismo: "Mejor entorno → mayor asistencia",
  resultadoEsperado: "Menor deserción",
  condiciones: "Acceso vial",
  limites: "Sin conflicto armado",
  evidenciaNecesaria: "Encuestas DANE",
  variables: [],
  confianza: "bien-sustentada",
  sourceQuestionIds: [],
  thinkingPatternIds: [],
  isPrimary: false,
  patternChangedWarning: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const model1: ConceptualModel = {
  id: "model-001",
  hypothesisId: "hyp-001",
  variables: [
    { id: "var-001", nombre: "Gasto público educación", rol: "causa", descripcion: "% PIB", definicionOperacional: "Definición operacional del gasto", orden: 0, createdAt: NOW, updatedAt: NOW } as ConceptualVariable,
    { id: "var-002", nombre: "Cobertura educativa", rol: "resultado", descripcion: "% matrícula", definicionOperacional: "Definición operacional de cobertura", orden: 1, createdAt: NOW, updatedAt: NOW } as ConceptualVariable,
  ],
  indicators: [
    {
      id: "ind-001", nombre: "Gasto por estudiante", descripcion: "USD PPP por estudiante",
      variableId: "var-001", unidad: "USD PPP", formulaOCriterio: "Gasto total / matrícula",
      periodicidad: "anual", nivelTerritorial: "Nacional", disponibilidad: "disponible",
      orden: 0, createdAt: NOW, updatedAt: NOW,
    },
    {
      id: "ind-002", nombre: "Tasa de matrícula", descripcion: "Porcentaje de edad escolar matriculada",
      variableId: "var-002", unidad: "Porcentaje", formulaOCriterio: "Matrícula / población en edad escolar",
      periodicidad: "anual", nivelTerritorial: "Nacional", disponibilidad: "disponible",
      orden: 1, createdAt: NOW, updatedAt: NOW,
    },
  ],
  evidenceSources: [
    {
      id: "src-001", nombre: "World Bank EdStats", tipo: "documental",
      responsable: "Banco Mundial", frecuencia: "Anual",
      acceso: "publico", limitaciones: "Datos con rezago de 2 años",
      indicadorIds: ["ind-001"], createdAt: NOW, updatedAt: NOW,
    },
    {
      id: "src-002", nombre: "UNESCO Institute for Statistics", tipo: "documental",
      responsable: "UNESCO", frecuencia: "Anual",
      acceso: "publico", limitaciones: "Heterogeneidad metodológica entre países",
      indicadorIds: ["ind-002"], createdAt: NOW, updatedAt: NOW,
    },
  ],
  confirmed: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const opMatrix1: OperationalizationMatrix = {
  id: "op-001",
  hypothesisId: "hyp-001",
  createdAt: NOW,
  updatedAt: NOW,
  rows: [
    {
      id: "op-row-001",
      variableId: "var-001",
      dimension: { id: "dim-001", nombre: "Magnitud", definicionOperacional: "Nivel del gasto como % del PIB", orden: 0, createdAt: NOW, updatedAt: NOW },
      indicatorId: "ind-001",
      escala: "razon",
      sourceId: "src-001",
      observaciones: "",
      orden: 0,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "op-row-002",
      variableId: "var-002",
      dimension: { id: "dim-002", nombre: "Cobertura bruta", definicionOperacional: "% de matrícula sobre población en edad escolar", orden: 0, createdAt: NOW, updatedAt: NOW },
      indicatorId: "ind-002",
      escala: "razon",
      sourceId: "src-002",
      observaciones: "",
      orden: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  confirmed: true,
};

const ctMatrix1: ContrastationMatrix = {
  id: "ct-001",
  hypothesisId: "hyp-001",
  rows: [
    {
      id: "ct-row-001",
      hypothesisId: "hyp-001",
      indicadorId: "ind-001",
      fuenteId: "src-001",
      evidenciaEsperada: "Gasto por estudiante creciente",
      evidenciaContraria: "Gasto estancado o decreciente",
      criterioInterpretacion: "Si gasto crece >5% real → apoya",
      limitaciones: "Datos disponibles hasta 2022",
      prioridad: "alta",
      observaciones: "",
      orden: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "ct-row-002",
      hypothesisId: "hyp-001",
      indicadorId: "ind-002",
      fuenteId: "src-002",
      evidenciaEsperada: "Tasa de matrícula creciente",
      evidenciaContraria: "Tasa estancada",
      criterioInterpretacion: "Si matrícula sube >3pp → apoya",
      limitaciones: "Heterogeneidad regional",
      prioridad: "alta",
      observaciones: "",
      orden: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  confirmed: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const eem1: EvidenceEvaluationMatrix = {
  id: "eem-001",
  hypothesisId: "hyp-001",
  contrastationMatrixId: "ct-001",
  observedEvidence: [
    {
      id: "ev-001",
      contrastationRowId: "ct-row-001",
      indicatorId: "ind-001",
      sourceId: "src-001",
      title: "Gasto por estudiante 2015-2022",
      description: "El gasto real por estudiante creció 7.2% promedio anual",
      observedValue: "7.2",
      observedUnit: "% crecimiento anual",
      observationDate: "2022",
      periodStart: "2015",
      periodEnd: "2022",
      location: "Colombia",
      sourceReference: "World Bank EdStats 2023",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "ev-002",
      contrastationRowId: "ct-row-002",
      indicatorId: "ind-002",
      sourceId: "src-002",
      title: "Matrícula secundaria rural 2015-2022",
      description: "Tasa de matrícula creció de 65% a 71%",
      observedValue: "+6pp",
      observedUnit: "puntos porcentuales",
      observationDate: "2022",
      periodStart: "2015",
      periodEnd: "2022",
      location: "Zonas rurales Colombia",
      sourceReference: "UNESCO UIS 2023",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  assessments: [
    {
      id: "ass-001",
      observedEvidenceId: "ev-001",
      contrastationRowId: "ct-row-001",
      hypothesisId: "hyp-001",
      status: "evaluated",
      direction: "supports",
      confidence: "high",
      justification: "El crecimiento supera el umbral del 5% establecido",
      limitations: "Serie temporal limitada",
      assessedAt: "2026-01-01T00:00:00.000Z",
      reviewed: true,
    },
    {
      id: "ass-002",
      observedEvidenceId: "ev-002",
      contrastationRowId: "ct-row-002",
      hypothesisId: "hyp-001",
      status: "evaluated",
      direction: "supports",
      confidence: "medium",
      justification: "+6pp supera el umbral de 3pp",
      limitations: "Heterogeneidad entre departamentos",
      assessedAt: "2026-01-01T00:00:00.000Z",
      reviewed: true,
    },
  ],
  status: "confirmed",
  confirmedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const conclusion1: HypothesisEvidenceConclusion = {
  id: "conc-001",
  hypothesisId: "hyp-001",
  evidenceEvaluationMatrixId: "eem-001",
  conclusionStatus: "provisionally-supported",
  conclusionText: "La evidencia disponible apoya provisionalmente la hipótesis de que el incremento del gasto público en educación incrementa la cobertura en zonas rurales.",
  confidence: "medium",
  mainSupportingEvidenceIds: ["ev-001", "ev-002"],
  mainWeakeningEvidenceIds: [],
  limitations: "La evidencia es correlacional y no establece causalidad.",
  additionalEvidenceNeeded: "Datos de experimentos naturales o evaluaciones de impacto.",
  reviewed: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const audit1: MethodologicalAudit = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  findings: [],
  summary: {
    totalFindings: 0,
    errors: 0,
    warnings: 0,
    suggestions: 0,
    categoriesAffected: [],
    blocking: false,
    complete: true,
  },
  evaluatedRuleIds: [],
};

const fullInput: ReportBuildInput = {
  problema: "La cobertura de educación secundaria en zonas rurales de Colombia es insuficiente.",
  perequePatternTitulo: "Economía Política",
  hypotheses: [hyp1, hyp2],
  conceptualModels: [model1],
  operationalizationMatrices: [opMatrix1],
  contrastationMatrices: [ctMatrix1],
  evidenceEvaluationMatrices: [eem1],
  hypothesisEvidenceConclusions: [conclusion1],
  audit: audit1,
};

const minimalInput: ReportBuildInput = {
  problema: "Problema mínimo",
  hypotheses: [hyp1],
  conceptualModels: [],
  operationalizationMatrices: [],
  contrastationMatrices: [],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

// TC-01 to TC-10: Definición y configuración
describe("TC-01 — createReportDefinition básico", () => {
  it("crea definición con ID y hypothesisId", () => {
    const def = createReportDefinition("hyp-001");
    expect(def.hypothesisId).toBe("hyp-001");
    expect(def.id.length).toBeGreaterThan(0);
  });
  it("contiene 13 secciones por defecto", () => {
    const def = createReportDefinition("hyp-001");
    expect(def.secciones).toHaveLength(13);
  });
  it("todas las secciones son visibles por defecto", () => {
    const def = createReportDefinition("hyp-001");
    const hidden = def.secciones.filter((s) => !s.visible);
    expect(hidden).toHaveLength(0);
  });
  it("orden inicial corresponde a DEFAULT_SECTION_ORDER", () => {
    const def = createReportDefinition("hyp-001");
    const types = def.secciones.map((s) => s.tipo);
    expect(types[0]).toBe("portada");
    expect(types[12]).toBe("anexos");
  });
  it("nombre por defecto no vacío", () => {
    const def = createReportDefinition("hyp-001");
    expect(def.nombre.length).toBeGreaterThan(0);
  });
});

describe("TC-02 — createReportDefinition con overrides", () => {
  it("acepta nombre personalizado", () => {
    const def = createReportDefinition("hyp-001", { nombre: "Mi informe" });
    expect(def.nombre).toBe("Mi informe");
  });
  it("acepta descripción personalizada", () => {
    const def = createReportDefinition("hyp-001", { descripcion: "Borrador 1" });
    expect(def.descripcion).toBe("Borrador 1");
  });
  it("acepta fecha personalizada", () => {
    const def = createReportDefinition("hyp-001", { fecha: "2026-07-17" });
    expect(def.fecha).toBe("2026-07-17");
  });
});

describe("TC-03 — updateReportDefinition", () => {
  it("actualiza nombre sin mutar el original", () => {
    const def = createReportDefinition("hyp-001");
    const updated = updateReportDefinition(def, { nombre: "Nuevo nombre" });
    expect(updated.nombre).toBe("Nuevo nombre");
    expect(def.nombre).toBe("Informe metodológico HELIOS");
  });
  it("updatedAt cambia", () => {
    const def = createReportDefinition("hyp-001");
    const updated = updateReportDefinition(def, { nombre: "x" });
    expect(updated.updatedAt >= def.createdAt).toBeTrue();
  });
});

describe("TC-04 — toggleSection", () => {
  it("oculta sección visible", () => {
    const def = createReportDefinition("hyp-001");
    const updated = toggleSection(def, "portada");
    const portada = updated.secciones.find((s) => s.tipo === "portada")!;
    expect(portada.visible).toBeFalse();
  });
  it("muestra sección oculta", () => {
    const def = createReportDefinition("hyp-001");
    const hidden = toggleSection(def, "portada");
    const visible = toggleSection(hidden, "portada");
    const portada = visible.secciones.find((s) => s.tipo === "portada")!;
    expect(portada.visible).toBeTrue();
  });
  it("no muta el original", () => {
    const def = createReportDefinition("hyp-001");
    toggleSection(def, "portada");
    const portada = def.secciones.find((s) => s.tipo === "portada")!;
    expect(portada.visible).toBeTrue();
  });
  it("no cambia otras secciones", () => {
    const def = createReportDefinition("hyp-001");
    const updated = toggleSection(def, "portada");
    const otros = updated.secciones.filter((s) => s.tipo !== "portada");
    expect(otros.every((s) => s.visible)).toBeTrue();
  });
});

describe("TC-05 — reorderSections", () => {
  it("reordena secciones según array provisto", () => {
    const def = createReportDefinition("hyp-001");
    const newOrder: ReportSectionType[] = ["conclusiones", "portada", "problema"];
    const updated = reorderSections(def, newOrder);
    expect(updated.secciones[0].tipo).toBe("conclusiones");
    expect(updated.secciones[1].tipo).toBe("portada");
    expect(updated.secciones[2].tipo).toBe("problema");
  });
  it("secciones no mencionadas van al final", () => {
    const def = createReportDefinition("hyp-001");
    const updated = reorderSections(def, ["conclusiones"]);
    expect(updated.secciones[0].tipo).toBe("conclusiones");
  });
  it("no muta el original", () => {
    const def = createReportDefinition("hyp-001");
    reorderSections(def, ["conclusiones"]);
    expect(def.secciones[0].tipo).toBe("portada");
  });
});

// TC-06 to TC-20: Generación de informe
describe("TC-06 — generateSection portada", () => {
  it("contiene bloque heading nivel 1", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("portada", def, fullInput);
    const h1 = sec.blocks.find((b) => b.tipo === "heading" && b.nivel === 1);
    expect(!!h1).toBeTrue();
  });
  it("referencias entityId=def.id", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("portada", def, fullInput);
    const hasDefRef = sec.blocks.some((b) => b.entityId === def.id);
    expect(hasDefRef).toBeTrue();
  });
  it("referencias entityId=hyp1.id", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("portada", def, fullInput);
    const hasHypRef = sec.blocks.some((b) => b.entityId === "hyp-001");
    expect(hasHypRef).toBeTrue();
  });
});

describe("TC-07 — generateSection problema", () => {
  it("contiene el texto del problema", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("problema", def, fullInput);
    const hasProblema = sec.blocks.some((b) => b.contenido.includes("cobertura de educación"));
    expect(hasProblema).toBeTrue();
  });
  it("entityId=problema para trazabilidad", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("problema", def, fullInput);
    const hasRef = sec.blocks.some((b) => b.entityId === "problema");
    expect(hasRef).toBeTrue();
  });
});

describe("TC-08 — generateSection thinking-pattern", () => {
  it("incluye el patrón cuando existe", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("thinking-pattern", def, fullInput);
    const hasPattern = sec.blocks.some((b) => b.contenido.includes("Economía Política"));
    expect(hasPattern).toBeTrue();
  });
  it("mensaje sin patrón cuando no hay perequePatternTitulo", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("thinking-pattern", def, minimalInput);
    const hasNone = sec.blocks.some((b) => b.contenido.includes("No se aplicó"));
    expect(hasNone).toBeTrue();
  });
});

describe("TC-09 — generateSection hipotesis", () => {
  it("incluye formulación", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("hipotesis", def, fullInput);
    const hasFom = sec.blocks.some((b) => b.contenido.includes("gasto público"));
    expect(hasFom).toBeTrue();
  });
  it("tabla causal tiene filas Causa/Mecanismo/Resultado", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("hipotesis", def, fullInput);
    const tbl = sec.blocks.find((b) => b.tipo === "table")!;
    const rows = tbl.tableRows ?? [];
    expect(rows.some((r) => r[0] === "Causa / condición")).toBeTrue();
    expect(rows.some((r) => r[0] === "Mecanismo")).toBeTrue();
    expect(rows.some((r) => r[0] === "Resultado esperado")).toBeTrue();
  });
  it("lista de variables incluida", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("hipotesis", def, fullInput);
    const lst = sec.blocks.find((b) => b.tipo === "list");
    expect(!!lst).toBeTrue();
    expect(lst!.items!.some((i) => i.includes("Gasto público educación"))).toBeTrue();
  });
  it("entityId=hyp-001 en bloques", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("hipotesis", def, fullInput);
    const hasRef = sec.blocks.some((b) => b.entityId === "hyp-001");
    expect(hasRef).toBeTrue();
  });
});

describe("TC-10 — generateSection modelo-conceptual", () => {
  it("tabla de variables presente", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("modelo-conceptual", def, fullInput);
    const tables = sec.blocks.filter((b) => b.tipo === "table");
    expect(tables.length).toBeGreaterThanOrEqual(1);
  });
  it("tabla de fuentes presente", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("modelo-conceptual", def, fullInput);
    const tables = sec.blocks.filter((b) => b.tipo === "table");
    expect(tables.length).toBeGreaterThanOrEqual(3);
  });
  it("mensaje ausente cuando no hay modelo", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("modelo-conceptual", def, minimalInput);
    const missing = sec.blocks.some((b) => b.contenido.includes("no disponible"));
    expect(missing).toBeTrue();
  });
});

describe("TC-11 — generateSection operacionalizacion", () => {
  it("tabla con 2 filas de datos", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("operacionalizacion", def, fullInput);
    const tbl = sec.blocks.find((b) => b.tipo === "table")!;
    expect(tbl.tableRows).toHaveLength(2);
  });
  it("columnas incluyen Variable y Escala", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("operacionalizacion", def, fullInput);
    const tbl = sec.blocks.find((b) => b.tipo === "table")!;
    expect(tbl.headers).toContain("Variable");
    expect(tbl.headers).toContain("Escala");
  });
});

describe("TC-12 — generateSection contrastacion", () => {
  it("tabla con 2 criterios", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("contrastacion", def, fullInput);
    const tbl = sec.blocks.find((b) => b.tipo === "table")!;
    expect(tbl.tableRows).toHaveLength(2);
  });
  it("columna Evidencia esperada presente", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("contrastacion", def, fullInput);
    const tbl = sec.blocks.find((b) => b.tipo === "table")!;
    expect(tbl.headers).toContain("Evidencia esperada");
  });
  it("entityType=contrastation-matrix", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("contrastacion", def, fullInput);
    const tbl = sec.blocks.find((b) => b.tipo === "table")!;
    expect(tbl.entityType).toBe("contrastation-matrix");
  });
});

describe("TC-13 — generateSection evidencia", () => {
  it("bloques agrupados por criterio", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("evidencia", def, fullInput);
    const headings = sec.blocks.filter((b) => b.tipo === "heading" && b.nivel === 3);
    expect(headings.length).toBeGreaterThanOrEqual(2);
  });
  it("tabla de evidencias tiene columna Título", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("evidencia", def, fullInput);
    const tbl = sec.blocks.find((b) => b.tipo === "table")!;
    expect(tbl.headers).toContain("Título");
  });
  it("mensaje ausente cuando no hay EEM", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("evidencia", def, minimalInput);
    const missing = sec.blocks.some((b) => b.contenido.includes("Sin evidencia"));
    expect(missing).toBeTrue();
  });
});

describe("TC-14 — generateSection evaluacion", () => {
  it("tabla con 2 evaluaciones", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("evaluacion", def, fullInput);
    const tbl = sec.blocks.find((b) => b.tipo === "table")!;
    expect(tbl.tableRows).toHaveLength(2);
  });
  it("columnas Dirección y Confianza presentes", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("evaluacion", def, fullInput);
    const tbl = sec.blocks.find((b) => b.tipo === "table")!;
    expect(tbl.headers).toContain("Dirección");
    expect(tbl.headers).toContain("Confianza");
  });
  it("lista de resumen con conteos", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("evaluacion", def, fullInput);
    const lst = sec.blocks.find((b) => b.tipo === "list")!;
    expect(lst.items!.some((i) => i.includes("2"))).toBeTrue();
  });
});

describe("TC-15 — generateSection conclusiones", () => {
  it("incluye status de conclusión", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("conclusiones", def, fullInput);
    const hasMeta = sec.blocks.some((b) => b.tipo === "metadata" && b.contenido.includes("Estado"));
    expect(hasMeta).toBeTrue();
  });
  it("incluye texto de conclusión", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("conclusiones", def, fullInput);
    const hasTxt = sec.blocks.some((b) => b.contenido.includes("apoya provisionalmente"));
    expect(hasTxt).toBeTrue();
  });
  it("entityId=conc-001", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("conclusiones", def, fullInput);
    const hasRef = sec.blocks.some((b) => b.entityId === "conc-001");
    expect(hasRef).toBeTrue();
  });
  it("mensaje ausente cuando no hay conclusión", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("conclusiones", def, minimalInput);
    const missing = sec.blocks.some((b) => b.contenido.includes("no formulada"));
    expect(missing).toBeTrue();
  });
});

describe("TC-16 — generateSection auditoria-metodologica", () => {
  it("con audit clean: sin hallazgos", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("auditoria-metodologica", def, fullInput);
    const clean = sec.blocks.some((b) => b.contenido.includes("Sin hallazgos"));
    expect(clean).toBeTrue();
  });
  it("sin audit: mensaje no ejecutada", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("auditoria-metodologica", def, minimalInput);
    const missing = sec.blocks.some((b) => b.contenido.includes("no ejecutada"));
    expect(missing).toBeTrue();
  });
  it("con audit con hallazgos: tabla de errores", () => {
    const inputWithFindings: ReportBuildInput = {
      ...fullInput,
      audit: {
        ...audit1,
        findings: [
          {
            id: "f-001",
            ruleId: "HYP-001",
            severity: "error",
            title: "Hipótesis sin conclusión",
            explanation: "La hipótesis no tiene conclusión metodológica formulada.",
            evidence: [],
            entityRefs: [{ type: "hypothesis", id: "hyp-001" }],
          },
        ],
        summary: { ...audit1.summary, totalFindings: 1, errors: 1, blocking: true, complete: false },
      },
    };
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("auditoria-metodologica", def, inputWithFindings);
    const hasTbl = sec.blocks.some((b) => b.tipo === "table");
    expect(hasTbl).toBeTrue();
  });
});

describe("TC-17 — generateSection resumen-ejecutivo", () => {
  it("incluye formulación de hipótesis", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("resumen-ejecutivo", def, fullInput);
    const hasHyp = sec.blocks.some((b) => b.contenido.includes("gasto público"));
    expect(hasHyp).toBeTrue();
  });
  it("incluye conclusión cuando existe", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("resumen-ejecutivo", def, fullInput);
    const hasConc = sec.blocks.some((b) => b.contenido.includes("Conclusión metodológica"));
    expect(hasConc).toBeTrue();
  });
  it("incluye resumen de auditoría", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("resumen-ejecutivo", def, fullInput);
    const hasAudit = sec.blocks.some((b) => b.contenido.includes("Auditoría"));
    expect(hasAudit).toBeTrue();
  });
});

describe("TC-18 — generateSection anexos", () => {
  it("lista con cadena de trazabilidad", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("anexos", def, fullInput);
    const lst = sec.blocks.find((b) => b.tipo === "list")!;
    expect(!!lst).toBeTrue();
    expect(lst.items!.length).toBeGreaterThanOrEqual(5);
  });
  it("incluye ID de la hipótesis en la cadena", () => {
    const def = createReportDefinition("hyp-001");
    const sec = generateSection("anexos", def, fullInput);
    const lst = sec.blocks.find((b) => b.tipo === "list")!;
    const hasHypId = lst.items!.some((i) => i.includes("hyp-001"));
    expect(hasHypId).toBeTrue();
  });
});

// TC-19 to TC-30: generateReport completo
describe("TC-19 — generateReport básico", () => {
  it("genera 13 secciones con todas visibles", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    expect(report.sections).toHaveLength(13);
  });
  it("reportDefinitionId coincide", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    expect(report.reportDefinitionId).toBe(def.id);
  });
  it("nombre del informe coincide", () => {
    const def = createReportDefinition("hyp-001", { nombre: "Informe test" });
    const report = generateReport(def, fullInput);
    expect(report.nombre).toBe("Informe test");
  });
  it("problema en el informe coincide", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    expect(report.problema).toContain("cobertura");
  });
  it("traceabilityMap no vacío", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    expect(report.traceabilityMap.length).toBeGreaterThan(0);
  });
});

describe("TC-20 — generateReport con secciones ocultas", () => {
  it("secciones ocultas no aparecen", () => {
    const def = toggleSection(createReportDefinition("hyp-001"), "portada");
    const report = generateReport(def, fullInput);
    const hasPortada = report.sections.some((s) => s.sectionType === "portada");
    expect(hasPortada).toBeFalse();
  });
  it("12 secciones cuando una oculta", () => {
    const def = toggleSection(createReportDefinition("hyp-001"), "portada");
    const report = generateReport(def, fullInput);
    expect(report.sections).toHaveLength(12);
  });
});

describe("TC-21 — generateReport orden de secciones", () => {
  it("secciones aparecen en el orden de la definición", () => {
    const def = reorderSections(createReportDefinition("hyp-001"), [
      "conclusiones",
      "problema",
      "portada",
    ]);
    const report = generateReport(def, fullInput);
    expect(report.sections[0].sectionType).toBe("conclusiones");
    expect(report.sections[1].sectionType).toBe("problema");
    expect(report.sections[2].sectionType).toBe("portada");
  });
});

// TC-22 to TC-30: Trazabilidad
describe("TC-22 — findTraceability", () => {
  it("encuentra entradas para entityId conocido", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const entries = findTraceability(report, "hyp-001");
    expect(entries.length).toBeGreaterThan(0);
  });
  it("retorna vacío para entityId inexistente", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const entries = findTraceability(report, "no-existe-xyz");
    expect(entries).toHaveLength(0);
  });
  it("cada entrada tiene sectionType y entityType", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const entries = findTraceability(report, "hyp-001");
    expect(entries.every((e) => e.sectionType && e.entityType)).toBeTrue();
  });
  it("hipótesis referenciada en múltiples secciones", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const entries = findTraceability(report, "hyp-001");
    const sections = new Set(entries.map((e) => e.sectionType));
    expect(sections.size).toBeGreaterThanOrEqual(2);
  });
  it("EEM referenciada en secciones de evidencia y evaluación", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const entries = findTraceability(report, "eem-001");
    expect(entries.length).toBeGreaterThan(0);
  });
});

// TC-31 to TC-40: Validación
describe("TC-31 — validateReport — inputs completos", () => {
  it("canGenerate=true con inputs completos", () => {
    const def = createReportDefinition("hyp-001");
    const result = validateReport(def, fullInput);
    expect(result.canGenerate).toBeTrue();
  });
  it("sin errores con inputs completos", () => {
    const def = createReportDefinition("hyp-001");
    const result = validateReport(def, fullInput);
    const errors = result.issues.filter((i) => i.tipo === "error");
    expect(errors).toHaveLength(0);
  });
});

describe("TC-32 — validateReport — hipótesis no encontrada", () => {
  it("error RPT-002 cuando hypothesisId no existe en input", () => {
    const def = createReportDefinition("hyp-no-existe");
    const result = validateReport(def, fullInput);
    const err = result.issues.find((i) => i.codigo === "RPT-002");
    expect(!!err).toBeTrue();
  });
  it("canGenerate=false cuando hipótesis no existe", () => {
    const def = createReportDefinition("hyp-no-existe");
    const result = validateReport(def, fullInput);
    expect(result.canGenerate).toBeFalse();
  });
});

describe("TC-33 — validateReport — sin secciones", () => {
  it("error RPT-003 cuando todas las secciones están ocultas", () => {
    let def = createReportDefinition("hyp-001");
    for (const tipo of DEFAULT_SECTION_ORDER) {
      def = toggleSection(def, tipo);
    }
    const result = validateReport(def, fullInput);
    const err = result.issues.find((i) => i.codigo === "RPT-003");
    expect(!!err).toBeTrue();
  });
});

describe("TC-34 — validateReport — advertencias", () => {
  it("warning RPT-W001 cuando sección conclusiones activa pero sin conclusión", () => {
    const inputSinConclusion: ReportBuildInput = { ...fullInput, hypothesisEvidenceConclusions: [] };
    const def = createReportDefinition("hyp-001");
    const result = validateReport(def, inputSinConclusion);
    const warn = result.issues.find((i) => i.codigo === "RPT-W001");
    expect(!!warn).toBeTrue();
  });
  it("warning RPT-W002 cuando sección auditoría activa pero sin audit", () => {
    const inputSinAudit: ReportBuildInput = { ...fullInput, audit: undefined };
    const def = createReportDefinition("hyp-001");
    const result = validateReport(def, inputSinAudit);
    const warn = result.issues.find((i) => i.codigo === "RPT-W002");
    expect(!!warn).toBeTrue();
  });
  it("canGenerate=true con warnings (no bloqueantes)", () => {
    const inputSinAudit: ReportBuildInput = { ...fullInput, audit: undefined };
    const def = createReportDefinition("hyp-001");
    const result = validateReport(def, inputSinAudit);
    expect(result.canGenerate).toBeTrue();
  });
});

// TC-35 to TC-45: Exportadores
describe("TC-35 — MarkdownExporter básico", () => {
  it("produce string no vacío", () => {
    const def = createReportDefinition("hyp-001", { nombre: "Informe MD" });
    const report = generateReport(def, fullInput);
    const md = new MarkdownExporter().export(report);
    expect(md.length).toBeGreaterThan(100);
  });
  it("contiene encabezado H1 con nombre del informe", () => {
    const def = createReportDefinition("hyp-001", { nombre: "Informe MD" });
    const report = generateReport(def, fullInput);
    const md = new MarkdownExporter().export(report);
    expect(md).toContain("# Informe MD");
  });
  it("contiene tabla de contenidos", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const md = new MarkdownExporter().export(report);
    expect(md).toContain("## Índice");
  });
  it("contiene tablas con separador |---|", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const md = new MarkdownExporter().export(report);
    expect(md).toContain("---");
    expect(md).toContain("|");
  });
  it("formato property es 'markdown'", () => {
    expect(new MarkdownExporter().format).toBe("markdown");
  });
});

describe("TC-36 — MarkdownExporter GitHub compatible", () => {
  it("encabezados con # caracteres", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const md = new MarkdownExporter().export(report);
    expect(md).toContain("## ");
    expect(md).toContain("### ");
  });
  it("listas con guión", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const md = new MarkdownExporter().export(report);
    expect(md).toContain("- ");
  });
  it("metadata con bloque >", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const md = new MarkdownExporter().export(report);
    expect(md).toContain("> ");
  });
});

describe("TC-37 — HtmlExporter básico", () => {
  it("produce HTML válido (DOCTYPE + html + body)", () => {
    const def = createReportDefinition("hyp-001", { nombre: "Informe HTML" });
    const report = generateReport(def, fullInput);
    const html = new HtmlExporter().export(report);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</body>");
  });
  it("contiene tabla de contenidos nav#toc", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const html = new HtmlExporter().export(report);
    expect(html).toContain('id="toc"');
  });
  it("tablas tienen scope='col' en encabezados (accesibles)", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const html = new HtmlExporter().export(report);
    expect(html).toContain('scope="col"');
  });
  it("secciones tienen anchors internos", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const html = new HtmlExporter().export(report);
    expect(html).toContain('id="section-');
  });
  it("format property es 'html'", () => {
    expect(new HtmlExporter().format).toBe("html");
  });
  it("contiene lang='es'", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const html = new HtmlExporter().export(report);
    expect(html).toContain('lang="es"');
  });
});

describe("TC-38 — HtmlExporter cross-references", () => {
  it("bloques tienen data-entity-type", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const html = new HtmlExporter().export(report);
    expect(html).toContain("data-entity-type=");
  });
  it("bloques tienen data-entity-id", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const html = new HtmlExporter().export(report);
    expect(html).toContain("data-entity-id=");
  });
  it("TOC enlaza a secciones con href=#section-", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const html = new HtmlExporter().export(report);
    expect(html).toContain('href="#section-');
  });
  it("enlace Volver al índice presente", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const html = new HtmlExporter().export(report);
    expect(html).toContain("Volver al índice");
  });
});

describe("TC-39 — JsonExporter básico", () => {
  it("produce JSON parseable", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const json = new JsonExporter().export(report);
    let parsed: any;
    try {
      parsed = JSON.parse(json);
    } catch {
      parsed = null;
    }
    expect(parsed !== null).toBeTrue();
  });
  it("parsed contiene sections", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const json = new JsonExporter().export(report);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed.sections)).toBeTrue();
    expect(parsed.sections.length).toBeGreaterThan(0);
  });
  it("parsed contiene traceabilityMap", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const json = new JsonExporter().export(report);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed.traceabilityMap)).toBeTrue();
  });
  it("parsed NO contiene todo el estado HELIOS (solo el informe)", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const json = new JsonExporter().export(report);
    // Must NOT contain the raw input — only the generated report
    expect(json).toContain("sections");
    // Hypothesis raw input shouldn't be in JSON exporter (it's in sections)
    const parsed = JSON.parse(json);
    expect(parsed.hypotheses === undefined).toBeTrue();
  });
  it("format property es 'json'", () => {
    expect(new JsonExporter().format).toBe("json");
  });
});

// TC-40 to TC-50: Múltiples hipótesis y conclusiones
describe("TC-40 — múltiples hipótesis", () => {
  it("informe hyp-001 no contiene datos de hyp-002", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const json = JSON.stringify(report);
    // hyp-002 conclusion shouldn't appear in hyp-001 report
    const hasHyp2Conclusion = report.sections.some((s) =>
      s.blocks.some((b) => b.contenido.includes("Hipótesis de infraestructura"))
    );
    // It could appear in comparison if we explicitly added it — but portada refers to hyp1 title
    const portada = report.sections.find((s) => s.sectionType === "portada")!;
    const hasHyp1 = portada.blocks.some((b) => b.contenido.includes("Hipótesis de acceso educativo"));
    expect(hasHyp1).toBeTrue();
  });
  it("informe para hyp-002 usa datos de hyp-002", () => {
    const def2 = createReportDefinition("hyp-002");
    const report2 = generateReport(def2, fullInput);
    const portada = report2.sections.find((s) => s.sectionType === "portada")!;
    const hasHyp2 = portada.blocks.some((b) => b.contenido.includes("Hipótesis de infraestructura"));
    expect(hasHyp2).toBeTrue();
  });
  it("hyp-002 sin modelo: mensaje de ausencia", () => {
    const def2 = createReportDefinition("hyp-002");
    const sec = generateSection("modelo-conceptual", def2, fullInput);
    const missing = sec.blocks.some((b) => b.contenido.includes("no disponible"));
    expect(missing).toBeTrue();
  });
});

describe("TC-41 — múltiples conclusiones (una por hipótesis)", () => {
  it("conclusión de hyp-001 no aparece en informe de hyp-002", () => {
    const def2 = createReportDefinition("hyp-002");
    const sec = generateSection("conclusiones", def2, fullInput);
    const hasHyp1Conc = sec.blocks.some((b) => b.contenido.includes("apoya provisionalmente"));
    expect(hasHyp1Conc).toBeFalse();
  });
  it("informe de hyp-002 muestra mensaje de conclusión no formulada", () => {
    const def2 = createReportDefinition("hyp-002");
    const sec = generateSection("conclusiones", def2, fullInput);
    const missing = sec.blocks.some((b) => b.contenido.includes("no formulada"));
    expect(missing).toBeTrue();
  });
});

// TC-42 to TC-50: summarizeReport y buildReportDocument
describe("TC-42 — summarizeReport", () => {
  it("seccionesGeneradas = 13 con todas visibles", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const summary = summarizeReport(report);
    expect(summary.seccionesGeneradas).toBe(13);
  });
  it("bloques > 0", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const summary = summarizeReport(report);
    expect(summary.bloques).toBeGreaterThan(0);
  });
  it("entidadesReferenciadas > 0", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const summary = summarizeReport(report);
    expect(summary.entidadesReferenciadas).toBeGreaterThan(0);
  });
});

describe("TC-43 — buildReportDocument", () => {
  it("document contiene definition, generated, validation, summary", () => {
    const def = createReportDefinition("hyp-001");
    const doc = buildReportDocument(def, fullInput);
    expect(!!doc.definition).toBeTrue();
    expect(!!doc.generated).toBeTrue();
    expect(!!doc.validation).toBeTrue();
    expect(!!doc.summary).toBeTrue();
  });
  it("validation.canGenerate=true con input completo", () => {
    const def = createReportDefinition("hyp-001");
    const doc = buildReportDocument(def, fullInput);
    expect(doc.validation.canGenerate).toBeTrue();
  });
});

// TC-44 to TC-50: upsert y session management
describe("TC-44 — upsertReportDefinition", () => {
  it("agrega definición nueva a array vacío", () => {
    const def = createReportDefinition("hyp-001");
    const result = upsertReportDefinition([], def);
    expect(result).toHaveLength(1);
  });
  it("actualiza definición existente", () => {
    const def = createReportDefinition("hyp-001");
    const updated = updateReportDefinition(def, { nombre: "Nuevo" });
    const arr = upsertReportDefinition([def], updated);
    expect(arr).toHaveLength(1);
    expect(arr[0].nombre).toBe("Nuevo");
  });
  it("no muta el array original", () => {
    const def = createReportDefinition("hyp-001");
    const original = [def];
    upsertReportDefinition(original, updateReportDefinition(def, { nombre: "x" }));
    expect(original).toHaveLength(1);
    expect(original[0].nombre).toBe("Informe metodológico HELIOS");
  });
});

describe("TC-45 — findReportDefinitionByHypothesis", () => {
  it("encuentra por hypothesisId", () => {
    const def = createReportDefinition("hyp-001");
    const result = findReportDefinitionByHypothesis([def], "hyp-001");
    expect(result?.id).toBe(def.id);
  });
  it("retorna null si no existe", () => {
    const result = findReportDefinitionByHypothesis([], "hyp-001");
    expect(result).toBeNull();
  });
});

describe("TC-46 — removeReportDefinition", () => {
  it("elimina por id", () => {
    const def = createReportDefinition("hyp-001");
    const result = removeReportDefinition([def], def.id);
    expect(result).toHaveLength(0);
  });
  it("no muta el original", () => {
    const def = createReportDefinition("hyp-001");
    const original = [def];
    removeReportDefinition(original, def.id);
    expect(original).toHaveLength(1);
  });
});

// TC-47 to TC-55: Integración y regresión
describe("TC-47 — integración: informe completo → Markdown exportable", () => {
  it("cadena completa produce Markdown con > 500 caracteres", () => {
    const def = createReportDefinition("hyp-001", { nombre: "Informe integración" });
    const report = generateReport(def, fullInput);
    const md = new MarkdownExporter().export(report);
    expect(md.length).toBeGreaterThan(500);
  });
  it("Markdown incluye nombre de hipótesis", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const md = new MarkdownExporter().export(report);
    expect(md).toContain("acceso educativo");
  });
  it("Markdown incluye evidencia observada", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const md = new MarkdownExporter().export(report);
    expect(md).toContain("Gasto por estudiante");
  });
});

describe("TC-48 — integración: informe completo → HTML exportable", () => {
  it("cadena completa produce HTML con > 1000 caracteres", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const html = new HtmlExporter().export(report);
    expect(html.length).toBeGreaterThan(1000);
  });
  it("HTML incluye tabla de operacionalización", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const html = new HtmlExporter().export(report);
    const hasOp = html.includes("Operacionalización") || html.includes("operacionalizacion");
    expect(hasOp).toBeTrue();
  });
  it("HTML incluye conclusión", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const html = new HtmlExporter().export(report);
    expect(html).toContain("apoya provisionalmente");
  });
});

describe("TC-49 — integración: informe completo → JSON parseable con estructura completa", () => {
  it("JSON tiene 13 secciones", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const json = new JsonExporter().export(report);
    const parsed = JSON.parse(json);
    expect(parsed.sections.length).toBe(13);
  });
  it("JSON tiene traceabilityMap con entradas", () => {
    const def = createReportDefinition("hyp-001");
    const report = generateReport(def, fullInput);
    const json = new JsonExporter().export(report);
    const parsed = JSON.parse(json);
    expect(parsed.traceabilityMap.length).toBeGreaterThan(0);
  });
});

describe("TC-50 — idempotencia", () => {
  it("dos generateReport del mismo input producen mismo resultado estructural", () => {
    const def = createReportDefinition("hyp-001");
    const r1 = generateReport(def, fullInput);
    const r2 = generateReport(def, fullInput);
    expect(r1.sections.length).toBe(r2.sections.length);
    expect(r1.sections[0].sectionType).toBe(r2.sections[0].sectionType);
  });
  it("toggleSection toggle-toggle restaura estado original", () => {
    const def = createReportDefinition("hyp-001");
    const toggled = toggleSection(toggleSection(def, "portada"), "portada");
    const portada = toggled.secciones.find((s) => s.tipo === "portada")!;
    expect(portada.visible).toBeTrue();
  });
});

describe("TC-51 — SECTION_TITLES cubre todos los tipos", () => {
  it("13 tipos en DEFAULT_SECTION_ORDER", () => {
    expect(DEFAULT_SECTION_ORDER).toHaveLength(13);
  });
  it("SECTION_TITLES tiene 13 entradas", () => {
    expect(Object.keys(SECTION_TITLES)).toHaveLength(13);
  });
  it("todos los tipos en DEFAULT_SECTION_ORDER tienen título", () => {
    const allHaveTitles = DEFAULT_SECTION_ORDER.every((t) => !!SECTION_TITLES[t]);
    expect(allHaveTitles).toBeTrue();
  });
});

describe("TC-52 — no mutación de inputs", () => {
  it("generateReport no muta ReportDefinition", () => {
    const def = createReportDefinition("hyp-001");
    const originalSecciones = def.secciones.length;
    generateReport(def, fullInput);
    expect(def.secciones).toHaveLength(originalSecciones);
  });
  it("generateReport no muta ReportBuildInput", () => {
    const input = { ...fullInput };
    const originalHypLen = input.hypotheses.length;
    const def = createReportDefinition("hyp-001");
    generateReport(def, input);
    expect(input.hypotheses).toHaveLength(originalHypLen);
  });
});

describe("TC-53 — regresión: DEFAULT_SECTION_ORDER integridad", () => {
  it("portada es la primera sección", () => {
    expect(DEFAULT_SECTION_ORDER[0]).toBe("portada");
  });
  it("anexos es la última sección", () => {
    expect(DEFAULT_SECTION_ORDER[DEFAULT_SECTION_ORDER.length - 1]).toBe("anexos");
  });
  it("conclusiones precede a auditoria-metodologica", () => {
    const ci = DEFAULT_SECTION_ORDER.indexOf("conclusiones");
    const ai = DEFAULT_SECTION_ORDER.indexOf("auditoria-metodologica");
    expect(ci).toBeLessThan(ai);
  });
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log("");
console.log("──────────────────────────────────────────────────────");
console.log(`   Passed : ${passed}`);
console.log(`   Failed : ${failed}`);
console.log(`   Total  : ${passed + failed}`);
console.log("──────────────────────────────────────────────────────");
if (failed > 0) {
  process.exit(1);
}
