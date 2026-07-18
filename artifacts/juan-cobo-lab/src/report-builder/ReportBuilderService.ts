/**
 * S-023 — ReportBuilderService
 *
 * Pure functions. No UI access. No state mutation.
 * Each section is generated dynamically from the session model — never stored.
 *
 * ADR-0012: The report is a projection of the Knowledge Graph.
 */

// Use Web Crypto UUID (available in Node 14.17+ and all modern browsers)
function nanoid(): string {
  return crypto.randomUUID();
}
import type {
  ReportDefinition,
  ReportSectionConfig,
  ReportSectionType,
  ReportBuildInput,
  ReportBlock,
  GeneratedSection,
  GeneratedReport,
  TraceabilityEntry,
  ReportValidationResult,
  ReportValidationIssue,
  ReportGenerationSummary,
  ReportDocument,
} from "./types";
import {
  DEFAULT_SECTION_ORDER,
  SECTION_TITLES,
} from "./types";
import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type { OperationalizationMatrix } from "@/operationalization/types";
import type { ContrastationMatrix } from "@/contrastation/types";
import type { EvidenceEvaluationMatrix, HypothesisEvidenceConclusion } from "@/evidence-evaluation/types";
import type { MethodologicalAudit } from "@/methodological-consistency/types";
import {
  EVIDENCE_DIRECTION_LABELS,
  EVIDENCE_CONFIDENCE_LABELS,
  CONCLUSION_STATUS_LABELS,
} from "@/evidence-evaluation/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blockId(sectionType: ReportSectionType, suffix: string): string {
  return `${sectionType}::${suffix}`;
}

function heading(
  id: string,
  nivel: 1 | 2 | 3 | 4,
  contenido: string,
  entityType?: string,
  entityId?: string
): ReportBlock {
  return { id, tipo: "heading", nivel, contenido, entityType, entityId };
}

function paragraph(
  id: string,
  contenido: string,
  entityType?: string,
  entityId?: string
): ReportBlock {
  return { id, tipo: "paragraph", contenido, entityType, entityId };
}

function meta(
  id: string,
  contenido: string,
  entityType?: string,
  entityId?: string
): ReportBlock {
  return { id, tipo: "metadata", contenido, entityType, entityId };
}

function table(
  id: string,
  headers: string[],
  tableRows: string[][],
  entityType?: string,
  entityId?: string
): ReportBlock {
  return { id, tipo: "table", contenido: "", headers, tableRows, entityType, entityId };
}

function list(
  id: string,
  contenido: string,
  items: string[],
  entityType?: string,
  entityId?: string
): ReportBlock {
  return { id, tipo: "list", contenido, items, entityType, entityId };
}

function divider(id: string): ReportBlock {
  return { id, tipo: "divider", contenido: "" };
}

function findHypothesis(
  input: ReportBuildInput,
  hypothesisId: string
): PolicyHypothesis | undefined {
  return input.hypotheses.find((h) => h.id === hypothesisId);
}

function findModel(
  input: ReportBuildInput,
  hypothesisId: string
): ConceptualModel | undefined {
  return input.conceptualModels.find((m) => m.hypothesisId === hypothesisId);
}

function findOpMatrix(
  input: ReportBuildInput,
  hypothesisId: string
): OperationalizationMatrix | undefined {
  return input.operationalizationMatrices.find((m) => m.hypothesisId === hypothesisId);
}

function findCtMatrix(
  input: ReportBuildInput,
  hypothesisId: string
): ContrastationMatrix | undefined {
  return input.contrastationMatrices.find((m) => m.hypothesisId === hypothesisId);
}

function findEEM(
  input: ReportBuildInput,
  hypothesisId: string
): EvidenceEvaluationMatrix | undefined {
  return input.evidenceEvaluationMatrices?.find((m) => m.hypothesisId === hypothesisId);
}

function findConclusion(
  input: ReportBuildInput,
  hypothesisId: string
): HypothesisEvidenceConclusion | undefined {
  return input.hypothesisEvidenceConclusions?.find((c) => c.hypothesisId === hypothesisId);
}

// ─── Section builders ─────────────────────────────────────────────────────────

function buildPortada(
  def: ReportDefinition,
  input: ReportBuildInput,
  hyp: PolicyHypothesis
): GeneratedSection {
  const st: ReportSectionType = "portada";
  const blocks: ReportBlock[] = [
    heading(blockId(st, "title"), 1, def.nombre, "report-definition", def.id),
    meta(blockId(st, "fecha"), `Fecha: ${def.fecha}`, "report-definition", def.id),
    meta(blockId(st, "hipotesis-ref"), `Hipótesis: ${hyp.titulo}`, "hypothesis", hyp.id),
    meta(blockId(st, "problema-ref"), `Problema: ${input.problema}`, "problem", "problema"),
  ];
  if (def.descripcion) {
    blocks.push(paragraph(blockId(st, "desc"), def.descripcion, "report-definition", def.id));
  }
  return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds: [def.id, hyp.id] };
}

function buildResumenEjecutivo(
  input: ReportBuildInput,
  hyp: PolicyHypothesis
): GeneratedSection {
  const st: ReportSectionType = "resumen-ejecutivo";
  const conclusion = findConclusion(input, hyp.id);
  const audit = input.audit;
  const blocks: ReportBlock[] = [
    heading(blockId(st, "h"), 2, SECTION_TITLES[st]),
    paragraph(blockId(st, "problema"), `Problema: ${input.problema}`, "problem", "problema"),
    paragraph(blockId(st, "hipotesis"), `Hipótesis: ${hyp.formulacion}`, "hypothesis", hyp.id),
  ];
  if (conclusion) {
    const statusLabel = CONCLUSION_STATUS_LABELS[conclusion.conclusionStatus];
    blocks.push(
      paragraph(
        blockId(st, "conclusion-status"),
        `Conclusión metodológica: ${statusLabel} (confianza: ${EVIDENCE_CONFIDENCE_LABELS[conclusion.confidence]})`,
        "hypothesis-conclusion",
        conclusion.id
      )
    );
    if (conclusion.conclusionText) {
      blocks.push(
        paragraph(blockId(st, "conclusion-text"), conclusion.conclusionText, "hypothesis-conclusion", conclusion.id)
      );
    }
  }
  if (audit) {
    const { totalFindings, errors, warnings } = audit.summary;
    blocks.push(
      meta(
        blockId(st, "audit-summary"),
        `Auditoría metodológica: ${totalFindings} hallazgos (${errors} errores, ${warnings} advertencias).`,
        "methodological-audit",
        "audit"
      )
    );
  }
  const entityIds = [hyp.id, ...(conclusion ? [conclusion.id] : [])];
  return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds };
}

function buildProblema(input: ReportBuildInput): GeneratedSection {
  const st: ReportSectionType = "problema";
  const blocks: ReportBlock[] = [
    heading(blockId(st, "h"), 2, SECTION_TITLES[st]),
    paragraph(blockId(st, "text"), input.problema, "problem", "problema"),
  ];
  return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds: ["problema"] };
}

function buildThinkingPattern(input: ReportBuildInput): GeneratedSection {
  const st: ReportSectionType = "thinking-pattern";
  const blocks: ReportBlock[] = [
    heading(blockId(st, "h"), 2, SECTION_TITLES[st]),
  ];
  if (input.perequePatternTitulo) {
    blocks.push(
      paragraph(blockId(st, "pattern"), `Patrón aplicado: ${input.perequePatternTitulo}`, "thinking-pattern", "pattern")
    );
  } else {
    blocks.push(paragraph(blockId(st, "none"), "(No se aplicó un patrón de pensamiento específico.)"));
  }
  return { sectionType: st, titulo: SECTION_TITLES[st], blocks };
}

function buildHipotesis(hyp: PolicyHypothesis): GeneratedSection {
  const st: ReportSectionType = "hipotesis";
  const blocks: ReportBlock[] = [
    heading(blockId(st, "h"), 2, SECTION_TITLES[st], "hypothesis", hyp.id),
    heading(blockId(st, "h-titulo"), 3, hyp.titulo, "hypothesis", hyp.id),
    paragraph(blockId(st, "formulacion"), hyp.formulacion, "hypothesis", hyp.id),
  ];

  const rows: [string, string][] = [
    ["Causa / condición", hyp.causa],
    ["Mecanismo", hyp.mecanismo],
    ["Resultado esperado", hyp.resultadoEsperado],
  ];
  if (hyp.condiciones) rows.push(["Condiciones", hyp.condiciones]);
  if (hyp.limites) rows.push(["Límites", hyp.limites]);
  if (hyp.evidenciaNecesaria) rows.push(["Evidencia necesaria", hyp.evidenciaNecesaria]);

  blocks.push(
    table(
      blockId(st, "causal-table"),
      ["Elemento", "Contenido"],
      rows.map(([k, v]) => [k, v]),
      "hypothesis",
      hyp.id
    )
  );

  if (hyp.variables.length > 0) {
    blocks.push(
      list(
        blockId(st, "variables"),
        "Variables de la hipótesis:",
        hyp.variables.map((v) => `${v.nombre} (${v.rol})`),
        "hypothesis",
        hyp.id
      )
    );
  }

  return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds: [hyp.id] };
}

function buildModeloConceptual(model: ConceptualModel | undefined, hyp: PolicyHypothesis): GeneratedSection {
  const st: ReportSectionType = "modelo-conceptual";
  const blocks: ReportBlock[] = [
    heading(blockId(st, "h"), 2, SECTION_TITLES[st]),
  ];

  if (!model) {
    blocks.push(paragraph(blockId(st, "missing"), "(Modelo conceptual no disponible para esta hipótesis.)"));
    return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds: [hyp.id] };
  }

  // Variables
  heading(blockId(st, "h-vars"), 3, "Variables");
  blocks.push(heading(blockId(st, "h-vars"), 3, "Variables", "conceptual-model", model.id));
  if (model.variables.length > 0) {
    blocks.push(
      table(
        blockId(st, "variables-table"),
        ["Variable", "Rol", "Descripción"],
        model.variables.map((v) => [v.nombre, v.rol ?? "", v.descripcion ?? ""]),
        "conceptual-model",
        model.id
      )
    );
  }

  // Indicators
  blocks.push(heading(blockId(st, "h-inds"), 3, "Indicadores", "conceptual-model", model.id));
  if (model.indicators.length > 0) {
    blocks.push(
      table(
        blockId(st, "indicators-table"),
        ["Indicador", "Descripción"],
        model.indicators.map((i) => [i.nombre, i.descripcion ?? ""]),
        "conceptual-model",
        model.id
      )
    );
  }

  // Evidence sources
  blocks.push(heading(blockId(st, "h-srcs"), 3, "Fuentes de evidencia", "conceptual-model", model.id));
  if (model.evidenceSources.length > 0) {
    blocks.push(
      table(
        blockId(st, "sources-table"),
        ["Fuente", "Tipo"],
        model.evidenceSources.map((s) => [s.nombre, s.tipo ?? ""]),
        "conceptual-model",
        model.id
      )
    );
  }

  return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds: [model.id] };
}

function buildOperacionalizacion(
  opMatrix: OperationalizationMatrix | undefined,
  input: ReportBuildInput,
  hyp: PolicyHypothesis
): GeneratedSection {
  const st: ReportSectionType = "operacionalizacion";
  const model = findModel(input, hyp.id);
  const blocks: ReportBlock[] = [
    heading(blockId(st, "h"), 2, SECTION_TITLES[st]),
  ];

  if (!opMatrix) {
    blocks.push(paragraph(blockId(st, "missing"), "(Matriz de operacionalización no disponible.)"));
    return { sectionType: st, titulo: SECTION_TITLES[st], blocks };
  }

  if (opMatrix.rows.length === 0) {
    blocks.push(paragraph(blockId(st, "empty"), "(Sin filas de operacionalización registradas.)"));
    return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds: [opMatrix.id] };
  }

  const rowData = opMatrix.rows.map((r, i) => {
    const varName = model?.variables.find((v) => v.id === r.variableId)?.nombre ?? r.variableId;
    const indName = r.indicatorId
      ? (model?.indicators.find((ind) => ind.id === r.indicatorId)?.nombre ?? r.indicatorId)
      : "";
    const srcName = r.sourceId
      ? (model?.evidenceSources.find((s) => s.id === r.sourceId)?.nombre ?? r.sourceId)
      : "";
    return [`${i + 1}`, varName, r.dimension.nombre, indName, r.escala || "", srcName];
  });

  blocks.push(
    table(
      blockId(st, "rows-table"),
      ["#", "Variable", "Dimensión", "Indicador", "Escala", "Fuente"],
      rowData,
      "operationalization-matrix",
      opMatrix.id
    )
  );

  return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds: [opMatrix.id] };
}

function buildContrastacion(
  ctMatrix: ContrastationMatrix | undefined,
  input: ReportBuildInput,
  hyp: PolicyHypothesis
): GeneratedSection {
  const st: ReportSectionType = "contrastacion";
  const model = findModel(input, hyp.id);
  const blocks: ReportBlock[] = [
    heading(blockId(st, "h"), 2, SECTION_TITLES[st]),
  ];

  if (!ctMatrix) {
    blocks.push(paragraph(blockId(st, "missing"), "(Matriz de contrastación no disponible.)"));
    return { sectionType: st, titulo: SECTION_TITLES[st], blocks };
  }

  if (ctMatrix.rows.length === 0) {
    blocks.push(paragraph(blockId(st, "empty"), "(Sin criterios de contrastación registrados.)"));
    return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds: [ctMatrix.id] };
  }

  const rowData = ctMatrix.rows.map((r, i) => {
    const indName = r.indicadorId
      ? (model?.indicators.find((ind) => ind.id === r.indicadorId)?.nombre ?? r.indicadorId)
      : "";
    const srcName = r.fuenteId
      ? (model?.evidenceSources.find((s) => s.id === r.fuenteId)?.nombre ?? r.fuenteId)
      : "";
    return [
      `${i + 1}`,
      indName,
      srcName,
      r.evidenciaEsperada,
      r.evidenciaContraria ?? "",
      r.criterioInterpretacion ?? "",
      r.prioridad,
    ];
  });

  blocks.push(
    table(
      blockId(st, "rows-table"),
      ["#", "Indicador", "Fuente", "Evidencia esperada", "Evidencia contraria", "Criterio de interpretación", "Prioridad"],
      rowData,
      "contrastation-matrix",
      ctMatrix.id
    )
  );

  return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds: [ctMatrix.id] };
}

function buildEvidencia(
  eem: EvidenceEvaluationMatrix | undefined,
  input: ReportBuildInput,
  hyp: PolicyHypothesis
): GeneratedSection {
  const st: ReportSectionType = "evidencia";
  const ctMatrix = findCtMatrix(input, hyp.id);
  const model = findModel(input, hyp.id);
  const blocks: ReportBlock[] = [
    heading(blockId(st, "h"), 2, SECTION_TITLES[st]),
  ];

  if (!eem || eem.observedEvidence.length === 0) {
    blocks.push(paragraph(blockId(st, "missing"), "(Sin evidencia observada registrada.)"));
    return { sectionType: st, titulo: SECTION_TITLES[st], blocks };
  }

  // Group by contrastationRowId
  const rowMap = new Map<string, typeof eem.observedEvidence>();
  for (const ev of eem.observedEvidence) {
    const existing = rowMap.get(ev.contrastationRowId) ?? [];
    existing.push(ev);
    rowMap.set(ev.contrastationRowId, existing);
  }

  let idx = 0;
  for (const [rowId, evidences] of rowMap) {
    const ctRow = ctMatrix?.rows.find((r) => r.id === rowId);
    const indName = ctRow?.indicadorId
      ? (model?.indicators.find((i) => i.id === ctRow.indicadorId)?.nombre ?? ctRow.indicadorId)
      : "(criterio)";

    blocks.push(heading(blockId(st, `row-${idx}`), 3, `Criterio: ${indName}`, "contrastation-row", rowId));

    const evRows = evidences.map((ev) => [
      ev.title,
      ev.description,
      ev.observedValue ?? "",
      ev.observationDate ?? "",
      ev.sourceReference ?? "",
    ]);
    blocks.push(
      table(
        blockId(st, `ev-table-${idx}`),
        ["Título", "Descripción", "Valor observado", "Fecha", "Fuente"],
        evRows,
        "evidence-evaluation-matrix",
        eem.id
      )
    );
    idx++;
  }

  return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds: [eem.id] };
}

function buildEvaluacion(
  eem: EvidenceEvaluationMatrix | undefined,
  hyp: PolicyHypothesis
): GeneratedSection {
  const st: ReportSectionType = "evaluacion";
  const blocks: ReportBlock[] = [
    heading(blockId(st, "h"), 2, SECTION_TITLES[st]),
  ];

  if (!eem || eem.assessments.length === 0) {
    blocks.push(paragraph(blockId(st, "missing"), "(Sin evaluaciones de evidencia registradas.)"));
    return { sectionType: st, titulo: SECTION_TITLES[st], blocks };
  }

  const rowData = eem.assessments.map((a, i) => {
    const evTitle =
      eem.observedEvidence.find((e) => e.id === a.observedEvidenceId)?.title ?? a.observedEvidenceId;
    const dirLabel = EVIDENCE_DIRECTION_LABELS[a.direction];
    const confLabel = EVIDENCE_CONFIDENCE_LABELS[a.confidence];
    return [
      `${i + 1}`,
      evTitle,
      dirLabel,
      confLabel,
      a.justification ?? "",
      a.limitations ?? "",
    ];
  });

  blocks.push(
    table(
      blockId(st, "assessments-table"),
      ["#", "Evidencia evaluada", "Dirección", "Confianza", "Justificación", "Limitaciones"],
      rowData,
      "evidence-evaluation-matrix",
      eem.id
    )
  );

  // Summary counts
  const supports = eem.assessments.filter((a) => a.direction === "supports").length;
  const weakens = eem.assessments.filter((a) => a.direction === "weakens").length;
  const other = eem.assessments.filter(
    (a) => a.direction !== "supports" && a.direction !== "weakens"
  ).length;

  blocks.push(
    list(
      blockId(st, "summary"),
      "Resumen de evaluaciones:",
      [
        `Apoya la hipótesis: ${supports}`,
        `Debilita la hipótesis: ${weakens}`,
        `Mixto / inconcluso / no aplica: ${other}`,
      ],
      "evidence-evaluation-matrix",
      eem.id
    )
  );

  return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds: [eem.id] };
}

function buildConclusiones(
  conclusion: HypothesisEvidenceConclusion | undefined,
  hyp: PolicyHypothesis
): GeneratedSection {
  const st: ReportSectionType = "conclusiones";
  const blocks: ReportBlock[] = [
    heading(blockId(st, "h"), 2, SECTION_TITLES[st]),
  ];

  if (!conclusion) {
    blocks.push(
      paragraph(
        blockId(st, "missing"),
        "(Conclusión metodológica no formulada para esta hipótesis.)"
      )
    );
    return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds: [hyp.id] };
  }

  const statusLabel = CONCLUSION_STATUS_LABELS[conclusion.conclusionStatus];
  const confLabel = EVIDENCE_CONFIDENCE_LABELS[conclusion.confidence];

  blocks.push(
    meta(blockId(st, "status"), `Estado: ${statusLabel}`, "hypothesis-conclusion", conclusion.id)
  );
  blocks.push(
    meta(blockId(st, "confidence"), `Confianza: ${confLabel}`, "hypothesis-conclusion", conclusion.id)
  );

  if (conclusion.conclusionText) {
    blocks.push(
      paragraph(blockId(st, "text"), conclusion.conclusionText, "hypothesis-conclusion", conclusion.id)
    );
  }

  if (conclusion.limitations) {
    blocks.push(
      paragraph(
        blockId(st, "limitations"),
        `Limitaciones: ${conclusion.limitations}`,
        "hypothesis-conclusion",
        conclusion.id
      )
    );
  }

  if (conclusion.additionalEvidenceNeeded) {
    blocks.push(
      paragraph(
        blockId(st, "additional"),
        `Evidencia adicional necesaria: ${conclusion.additionalEvidenceNeeded}`,
        "hypothesis-conclusion",
        conclusion.id
      )
    );
  }

  return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds: [conclusion.id] };
}

function buildAuditoria(audit: MethodologicalAudit | undefined): GeneratedSection {
  const st: ReportSectionType = "auditoria-metodologica";
  const blocks: ReportBlock[] = [
    heading(blockId(st, "h"), 2, SECTION_TITLES[st]),
  ];

  if (!audit) {
    blocks.push(
      paragraph(blockId(st, "missing"), "(Auditoría metodológica no ejecutada.)")
    );
    return { sectionType: st, titulo: SECTION_TITLES[st], blocks };
  }

  const { totalFindings, errors, warnings, suggestions } = audit.summary;
  blocks.push(
    meta(
      blockId(st, "summary"),
      `Total de hallazgos: ${totalFindings} (${errors} errores, ${warnings} advertencias, ${suggestions} sugerencias)`,
      "methodological-audit",
      "audit"
    )
  );

  if (audit.findings.length === 0) {
    blocks.push(
      paragraph(blockId(st, "clean"), "✓ Sin hallazgos metodológicos. La cadena es consistente.")
    );
    return { sectionType: st, titulo: SECTION_TITLES[st], blocks };
  }

  // Group by severity
  const errFindings = audit.findings.filter((f) => f.severity === "error");
  const warnFindings = audit.findings.filter((f) => f.severity === "warning");
  const sugFindings = audit.findings.filter((f) => f.severity === "suggestion");

  for (const [label, findings] of [
    ["Errores", errFindings],
    ["Advertencias", warnFindings],
    ["Sugerencias", sugFindings],
  ] as [string, typeof audit.findings][]) {
    if (findings.length === 0) continue;
    blocks.push(heading(blockId(st, `h-${label}`), 3, label));
    const rowData = findings.map((f) => [
      f.ruleId,
      f.explanation ?? f.title,
      f.entityRefs?.[0]?.type ?? "",
    ]);
    blocks.push(
      table(
        blockId(st, `table-${label}`),
        ["Regla", "Hallazgo", "Entidad"],
        rowData,
        "methodological-audit",
        "audit"
      )
    );
  }

  return { sectionType: st, titulo: SECTION_TITLES[st], blocks };
}

function buildAnexos(input: ReportBuildInput, hyp: PolicyHypothesis): GeneratedSection {
  const st: ReportSectionType = "anexos";
  const model = findModel(input, hyp.id);
  const opMatrix = findOpMatrix(input, hyp.id);
  const ctMatrix = findCtMatrix(input, hyp.id);
  const eem = findEEM(input, hyp.id);
  const conclusion = findConclusion(input, hyp.id);

  const items: string[] = [
    `Problema: "${input.problema}"`,
    `Hipótesis ID: ${hyp.id}`,
    `Hipótesis: "${hyp.titulo}"`,
    `Modelo conceptual: ${model ? `ID ${model.id} (${model.variables.length} variables, ${model.indicators.length} indicadores, ${model.evidenceSources.length} fuentes)` : "no disponible"}`,
    `Operacionalización: ${opMatrix ? `ID ${opMatrix.id} (${opMatrix.rows.length} filas)` : "no disponible"}`,
    `Contrastación: ${ctMatrix ? `ID ${ctMatrix.id} (${ctMatrix.rows.length} criterios)` : "no disponible"}`,
    `Evaluación de evidencia: ${eem ? `ID ${eem.id} (${eem.observedEvidence.length} evidencias, ${eem.assessments.length} evaluaciones)` : "no disponible"}`,
    `Conclusión metodológica: ${conclusion ? `ID ${conclusion.id} — ${CONCLUSION_STATUS_LABELS[conclusion.conclusionStatus]}` : "no formulada"}`,
    ...(input.perequePatternTitulo ? [`Patrón de pensamiento: ${input.perequePatternTitulo}`] : []),
    ...(input.audit ? [`Auditoría ejecutada: sí (${input.audit.summary.totalFindings} hallazgos, generada ${input.audit.generatedAt})`] : []),
  ];

  const blocks: ReportBlock[] = [
    heading(blockId(st, "h"), 2, SECTION_TITLES[st]),
    heading(blockId(st, "h-cadena"), 3, "Cadena de trazabilidad metodológica"),
    list(blockId(st, "cadena"), "", items, "hypothesis", hyp.id),
  ];

  return { sectionType: st, titulo: SECTION_TITLES[st], blocks, entityIds: [hyp.id] };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Create a default ReportDefinition for a hypothesis */
export function createReportDefinition(
  hypothesisId: string,
  overrides?: Partial<Pick<ReportDefinition, "nombre" | "descripcion" | "fecha">>
): ReportDefinition {
  const now = new Date().toISOString();
  const secciones: ReportSectionConfig[] = DEFAULT_SECTION_ORDER.map((tipo, i) => ({
    tipo,
    visible: true,
    orden: i,
  }));
  return {
    id: nanoid(),
    nombre: overrides?.nombre ?? "Informe metodológico HELIOS",
    descripcion: overrides?.descripcion ?? "",
    fecha: overrides?.fecha ?? now.slice(0, 10),
    hypothesisId,
    secciones,
    createdAt: now,
    updatedAt: now,
  };
}

/** Update metadata on a ReportDefinition (immutable) */
export function updateReportDefinition(
  def: ReportDefinition,
  updates: Partial<Pick<ReportDefinition, "nombre" | "descripcion" | "fecha">>
): ReportDefinition {
  return { ...def, ...updates, updatedAt: new Date().toISOString() };
}

/** Toggle visibility of a section */
export function toggleSection(
  def: ReportDefinition,
  tipo: ReportSectionType
): ReportDefinition {
  const secciones = def.secciones.map((s) =>
    s.tipo === tipo ? { ...s, visible: !s.visible } : s
  );
  return { ...def, secciones, updatedAt: new Date().toISOString() };
}

/** Reorder sections by providing ordered list of types */
export function reorderSections(
  def: ReportDefinition,
  ordered: ReportSectionType[]
): ReportDefinition {
  const secciones = [...def.secciones].sort((a, b) => {
    const ai = ordered.indexOf(a.tipo);
    const bi = ordered.indexOf(b.tipo);
    if (ai === -1 && bi === -1) return a.orden - b.orden;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  }).map((s, i) => ({ ...s, orden: i }));
  return { ...def, secciones, updatedAt: new Date().toISOString() };
}

/** Generate a single section */
export function generateSection(
  sectionType: ReportSectionType,
  def: ReportDefinition,
  input: ReportBuildInput
): GeneratedSection {
  const hyp = findHypothesis(input, def.hypothesisId);
  if (!hyp) {
    return {
      sectionType,
      titulo: SECTION_TITLES[sectionType],
      blocks: [paragraph(blockId(sectionType, "no-hyp"), "(Hipótesis no encontrada.)")],
    };
  }

  switch (sectionType) {
    case "portada":
      return buildPortada(def, input, hyp);
    case "resumen-ejecutivo":
      return buildResumenEjecutivo(input, hyp);
    case "problema":
      return buildProblema(input);
    case "thinking-pattern":
      return buildThinkingPattern(input);
    case "hipotesis":
      return buildHipotesis(hyp);
    case "modelo-conceptual":
      return buildModeloConceptual(findModel(input, hyp.id), hyp);
    case "operacionalizacion":
      return buildOperacionalizacion(findOpMatrix(input, hyp.id), input, hyp);
    case "contrastacion":
      return buildContrastacion(findCtMatrix(input, hyp.id), input, hyp);
    case "evidencia":
      return buildEvidencia(findEEM(input, hyp.id), input, hyp);
    case "evaluacion":
      return buildEvaluacion(findEEM(input, hyp.id), hyp);
    case "conclusiones":
      return buildConclusiones(findConclusion(input, hyp.id), hyp);
    case "auditoria-metodologica":
      return buildAuditoria(input.audit);
    case "anexos":
      return buildAnexos(input, hyp);
  }
}

/** Generate the full report from a definition and input */
export function generateReport(
  def: ReportDefinition,
  input: ReportBuildInput
): GeneratedReport {
  const activeSections = [...def.secciones]
    .filter((s) => s.visible)
    .sort((a, b) => a.orden - b.orden);

  const sections: GeneratedSection[] = activeSections.map((s) =>
    generateSection(s.tipo, def, input)
  );

  const traceabilityMap: TraceabilityEntry[] = [];
  for (const sec of sections) {
    for (const block of sec.blocks) {
      if (block.entityType && block.entityId) {
        traceabilityMap.push({
          blockId: block.id,
          entityType: block.entityType,
          entityId: block.entityId,
          sectionType: sec.sectionType,
        });
      }
    }
  }

  return {
    reportDefinitionId: def.id,
    generatedAt: new Date().toISOString(),
    nombre: def.nombre,
    problema: input.problema,
    sections,
    traceabilityMap,
  };
}

/** Find all traceability entries for a given entityId */
export function findTraceability(
  report: GeneratedReport,
  entityId: string
): TraceabilityEntry[] {
  return report.traceabilityMap.filter((e) => e.entityId === entityId);
}

/** Validate a report definition against the input */
export function validateReport(
  def: ReportDefinition,
  input: ReportBuildInput
): ReportValidationResult {
  const issues: ReportValidationIssue[] = [];

  // Errors (block generation)
  if (!def.hypothesisId) {
    issues.push({ tipo: "error", codigo: "RPT-001", mensaje: "El informe no tiene una hipótesis asignada." });
  }

  if (!findHypothesis(input, def.hypothesisId)) {
    issues.push({ tipo: "error", codigo: "RPT-002", mensaje: "La hipótesis referenciada no existe en la sesión actual." });
  }

  const visibleSections = def.secciones.filter((s) => s.visible);
  if (visibleSections.length === 0) {
    issues.push({ tipo: "error", codigo: "RPT-003", mensaje: "El informe no tiene secciones activas." });
  }

  if (!input.problema || input.problema.trim().length === 0) {
    issues.push({ tipo: "error", codigo: "RPT-004", mensaje: "El problema de política pública está vacío." });
  }

  // Warnings (informational)
  if (!findConclusion(input, def.hypothesisId)) {
    const conclusionSection = def.secciones.find((s) => s.tipo === "conclusiones" && s.visible);
    if (conclusionSection) {
      issues.push({
        tipo: "warning",
        codigo: "RPT-W001",
        mensaje: "La sección de conclusiones está activa pero no se ha formulado una conclusión metodológica.",
        sectionType: "conclusiones",
      });
    }
  }

  if (!input.audit) {
    const auditSection = def.secciones.find((s) => s.tipo === "auditoria-metodologica" && s.visible);
    if (auditSection) {
      issues.push({
        tipo: "warning",
        codigo: "RPT-W002",
        mensaje: "La sección de auditoría está activa pero no se ha ejecutado la auditoría metodológica.",
        sectionType: "auditoria-metodologica",
      });
    }
  }

  const eem = findEEM(input, def.hypothesisId);
  if (!eem) {
    const evSection = def.secciones.find((s) => s.tipo === "evidencia" && s.visible);
    if (evSection) {
      issues.push({
        tipo: "warning",
        codigo: "RPT-W003",
        mensaje: "La sección de evidencia está activa pero no hay matrices de evaluación de evidencia.",
        sectionType: "evidencia",
      });
    }
  }

  const annexVisible = def.secciones.find((s) => s.tipo === "anexos" && s.visible);
  if (annexVisible && !findCtMatrix(input, def.hypothesisId) && !findModel(input, def.hypothesisId)) {
    issues.push({
      tipo: "warning",
      codigo: "RPT-W004",
      mensaje: "Los anexos estarán mayormente vacíos — no hay modelo conceptual ni contrastación disponibles.",
      sectionType: "anexos",
    });
  }

  const canGenerate = !issues.some((i) => i.tipo === "error");
  return { canGenerate, issues };
}

/** Summarize a generated report */
export function summarizeReport(generated: GeneratedReport): ReportGenerationSummary {
  const seccionesGeneradas = generated.sections.length;
  const bloques = generated.sections.reduce((acc, s) => acc + s.blocks.length, 0);
  const entityIds = new Set(generated.traceabilityMap.map((e) => e.entityId));

  return {
    seccionesGeneradas,
    bloques,
    entidadesReferenciadas: entityIds.size,
    errores: 0,
    advertencias: 0,
  };
}

/** Build a full ReportDocument (definition + generated + validation + summary) */
export function buildReportDocument(
  def: ReportDefinition,
  input: ReportBuildInput
): ReportDocument {
  const validation = validateReport(def, input);
  const generated = generateReport(def, input);
  const summary = summarizeReport(generated);
  return { definition: def, generated, validation, summary };
}

/** Upsert a ReportDefinition into the session array */
export function upsertReportDefinition(
  defs: ReportDefinition[],
  def: ReportDefinition
): ReportDefinition[] {
  const idx = defs.findIndex((d) => d.id === def.id);
  if (idx === -1) return [...defs, def];
  const next = [...defs];
  next[idx] = def;
  return next;
}

/** Find report definition by hypothesis */
export function findReportDefinitionByHypothesis(
  defs: ReportDefinition[],
  hypothesisId: string
): ReportDefinition | null {
  return defs.find((d) => d.hypothesisId === hypothesisId) ?? null;
}

/** Remove a report definition */
export function removeReportDefinition(
  defs: ReportDefinition[],
  id: string
): ReportDefinition[] {
  return defs.filter((d) => d.id !== id);
}
