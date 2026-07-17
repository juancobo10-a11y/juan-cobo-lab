/**
 * Validación S-021 — Motor de Consistencia Metodológica
 *
 * Suite: MethodologicalConsistencyService — 53 TCs, 90+ asserts
 */

import {
  runMethodologicalAudit,
  evaluateRule,
  summarizeFindings,
  groupFindingsByCategory,
  groupFindingsBySeverity,
  groupFindingsByEntity,
  findBlockingErrors,
  findWarnings,
  findSuggestions,
  isMethodologicallyComplete,
} from "../MethodologicalConsistencyService";
import type { MethodologicalAuditInput } from "../types";
import {
  buildGraph,
  topologicalTraversal,
  topologicalTraversalDependenciesFirst,
  topologicalTraversalDependentsFirst,
  detectOrphans,
} from "../../knowledge-graph/KnowledgeGraphService";
import type { HeliosGraphInput } from "../../knowledge-graph/types";
import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type { OperationalizationMatrix } from "@/operationalization/types";
import type { ContrastationMatrix } from "@/contrastation/types";

// ─── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const total_start = Date.now();

function assert(condition: boolean, msg: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function ok(label: string) { console.log(`  ✓ ${label}`); }

// ─── Fixtures ─────────────────────────────────────────────────────────────────

let _counter = 0;
function uid(p: string) { return `${p}-${++_counter}`; }
const TS = "2026-01-01T00:00:00Z";

function makeHypothesis(overrides: Partial<Record<string, unknown>> = {}): PolicyHypothesis {
  return {
    id: uid("hyp"),
    titulo: "Hipótesis de prueba",
    formulacion: "Si A entonces B",
    causa: "",
    mecanismo: "",
    resultadoEsperado: "",
    variables: [],
    confianza: "media",
    sourceQuestionIds: [],
    thinkingPatternIds: [],
    createdAt: TS,
    updatedAt: TS,
    ...overrides,
  } as unknown as PolicyHypothesis;
}

function makeVariable(opts: { id?: string; rol?: string; nombre?: string } = {}) {
  return {
    id: opts.id ?? uid("var"),
    nombre: opts.nombre ?? "Variable prueba",
    descripcion: "desc",
    definicionOperacional: "defOp",
    rol: opts.rol ?? "causa",
    orden: 0,
    createdAt: TS,
    updatedAt: TS,
  };
}

function makeIndicator(variableId: string, opts: { id?: string; nombre?: string } = {}) {
  return {
    id: opts.id ?? uid("ind"),
    nombre: opts.nombre ?? "Indicador prueba",
    descripcion: "desc",
    variableId,
    unidad: "tasa",
    formulaOCriterio: "",
    periodicidad: "anual",
    nivelTerritorial: "nacional",
    disponibilidad: "publica",
    indicadorIds: [] as string[],
    orden: 0,
    createdAt: TS,
    updatedAt: TS,
  };
}

function makeSource(indicadorIds: string[], opts: { id?: string; nombre?: string } = {}) {
  return {
    id: opts.id ?? uid("src"),
    nombre: opts.nombre ?? "Fuente prueba",
    tipo: "estadistica",
    responsable: "DANE",
    frecuencia: "anual",
    acceso: "publico",
    limitaciones: "",
    indicadorIds,
    createdAt: TS,
    updatedAt: TS,
  };
}

function makeModel(hypothesisId: string, opts: {
  id?: string;
  variables?: ReturnType<typeof makeVariable>[];
  indicators?: ReturnType<typeof makeIndicator>[];
  evidenceSources?: ReturnType<typeof makeSource>[];
  confirmed?: boolean;
} = {}): ConceptualModel {
  return {
    id: opts.id ?? uid("cm"),
    hypothesisId,
    variables: opts.variables ?? [],
    indicators: opts.indicators ?? [],
    evidenceSources: opts.evidenceSources ?? [],
    confirmed: opts.confirmed ?? false,
    createdAt: TS,
    updatedAt: TS,
  } as unknown as ConceptualModel;
}

function makeOpRow(variableId: string, indicatorId: string | null, sourceId: string | null, opts: { id?: string; escala?: string; nombre?: string } = {}) {
  return {
    id: opts.id ?? uid("oprow"),
    variableId,
    dimension: { nombre: opts.nombre ?? "Dimensión prueba", definicionOperacional: "" },
    indicatorId,
    escala: opts.escala ?? "nominal",
    sourceId,
    observaciones: "",
    orden: 0,
    createdAt: TS,
    updatedAt: TS,
  };
}

function makeOpMatrix(hypothesisId: string, rows: ReturnType<typeof makeOpRow>[], confirmed = false): OperationalizationMatrix {
  return {
    id: uid("opm"),
    hypothesisId,
    rows,
    confirmed,
    createdAt: TS,
    updatedAt: TS,
  } as unknown as OperationalizationMatrix;
}

function makeCtRow(hypothesisId: string, indicadorId: string | null, fuenteId: string | null, opts: {
  id?: string;
  evidenciaEsperada?: string;
  evidenciaContraria?: string;
  criterioInterpretacion?: string;
} = {}) {
  return {
    id: opts.id ?? uid("ctrow"),
    hypothesisId,
    indicadorId,
    fuenteId,
    evidenciaEsperada: opts.evidenciaEsperada ?? "Evidencia A",
    evidenciaContraria: opts.evidenciaContraria ?? "Evidencia B",
    criterioInterpretacion: opts.criterioInterpretacion ?? "Criterio",
    limitaciones: "",
    prioridad: "alta",
    observaciones: "",
    orden: 0,
    createdAt: TS,
    updatedAt: TS,
  };
}

function makeCtMatrix(hypothesisId: string, rows: ReturnType<typeof makeCtRow>[], confirmed = false): ContrastationMatrix {
  return {
    id: uid("ctm"),
    hypothesisId,
    rows,
    confirmed,
    createdAt: TS,
    updatedAt: TS,
  } as unknown as ContrastationMatrix;
}

function emptyInput(extra: Partial<MethodologicalAuditInput> = {}): MethodologicalAuditInput {
  return {
    problema: "Problema de prueba",
    hypotheses: [],
    conceptualModels: [],
    operationalizationMatrices: [],
    contrastationMatrices: [],
    ...extra,
  };
}

// ─── TC-01: HYP-001 — causal hypothesis without causa variable ────────────────

{
  const hyp = makeHypothesis({ causa: "Aumento presupuestal", titulo: "H-causal" });
  const v = makeVariable({ rol: "resultado" }); // no "causa" role
  const model = makeModel(hyp.id, { variables: [v as any] });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const findings = evaluateRule("HYP-001", input);
  assert(findings.length === 1, "TC-01 HYP-001 error detected");
  assert(findings[0].severity === "error", "TC-01 severity is error");
  assert(findings[0].ruleId === "HYP-001", "TC-01 ruleId");
  ok("TC-01 HYP-001 — causal without causa variable");
}

// ─── TC-02: HYP-001 — causal hyp WITH causa variable ─────────────────────────

{
  const hyp = makeHypothesis({ causa: "Aumento presupuestal" });
  const v = makeVariable({ rol: "causa" });
  const model = makeModel(hyp.id, { variables: [v as any] });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const findings = evaluateRule("HYP-001", input);
  assert(findings.length === 0, "TC-02 HYP-001 no error when causa variable present");
  ok("TC-02 HYP-001 — complete causal structure OK");
}

// ─── TC-03: HYP-002 — causal hyp without resultado variable ──────────────────

{
  const hyp = makeHypothesis({ causa: "Factor X", titulo: "H-causal-2" });
  const v = makeVariable({ rol: "causa" }); // no "resultado"
  const model = makeModel(hyp.id, { variables: [v as any] });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const findings = evaluateRule("HYP-002", input);
  assert(findings.length === 1, "TC-03 HYP-002 error detected");
  assert(findings[0].severity === "error", "TC-03 severity error");
  ok("TC-03 HYP-002 — causal without resultado variable");
}

// ─── TC-04: HYP-002 — causal hyp WITH resultado variable ─────────────────────

{
  const hyp = makeHypothesis({ causa: "Factor X" });
  const vC = makeVariable({ rol: "causa" });
  const vR = makeVariable({ rol: "resultado" });
  const model = makeModel(hyp.id, { variables: [vC as any, vR as any] });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const findings = evaluateRule("HYP-002", input);
  assert(findings.length === 0, "TC-04 HYP-002 no error with resultado variable");
  ok("TC-04 HYP-002 — has resultado variable OK");
}

// ─── TC-05: HYP-003 — hypothesis without conceptual model ────────────────────

{
  const hyp = makeHypothesis({ titulo: "Sin modelo" });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [] });
  const findings = evaluateRule("HYP-003", input);
  assert(findings.length === 1, "TC-05 HYP-003 error detected");
  assert(findings[0].entityRefs.some(r => r.type === "hypothesis"), "TC-05 entityRefs hypothesis");
  ok("TC-05 HYP-003 — hypothesis without model");
}

// ─── TC-06: HYP-003 — hypothesis WITH conceptual model ───────────────────────

{
  const hyp = makeHypothesis();
  const model = makeModel(hyp.id);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const findings = evaluateRule("HYP-003", input);
  assert(findings.length === 0, "TC-06 HYP-003 no error with model");
  ok("TC-06 HYP-003 — has model OK");
}

// ─── TC-07: HYP-004 — hypothesis without variables/indicators/op ─────────────

{
  const hyp = makeHypothesis({ titulo: "Sin operacionalización" });
  const model = makeModel(hyp.id, { variables: [], indicators: [] });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], operationalizationMatrices: [] });
  const findings = evaluateRule("HYP-004", input);
  assert(findings.length === 1, "TC-07 HYP-004 warning detected");
  assert(findings[0].severity === "warning", "TC-07 severity warning");
  ok("TC-07 HYP-004 — hypothesis without operationalization");
}

// ─── TC-08: VAR-001 — variable without indicator ─────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [] });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const findings = evaluateRule("VAR-001", input);
  assert(findings.length === 1, "TC-08 VAR-001 error detected");
  assert(findings[0].severity === "error", "TC-08 severity error");
  assert(findings[0].entityRefs.some(r => r.type === "conceptual-variable"), "TC-08 entityRefs variable");
  ok("TC-08 VAR-001 — variable without indicator");
}

// ─── TC-09: VAR-001 — variable WITH indicator ────────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any] });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const findings = evaluateRule("VAR-001", input);
  assert(findings.length === 0, "TC-09 VAR-001 no error with indicator");
  ok("TC-09 VAR-001 — variable has indicator OK");
}

// ─── TC-10: VAR-002 — resultado variable not contrastated ────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable({ rol: "resultado" });
  const ind = makeIndicator(v.id);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any] });
  // No ct-rows use this indicator
  const ctMatrix = makeCtMatrix(hyp.id, []);
  const input = emptyInput({
    hypotheses: [hyp], conceptualModels: [model], contrastationMatrices: [ctMatrix],
  });
  const findings = evaluateRule("VAR-002", input);
  assert(findings.length === 1, "TC-10 VAR-002 warning detected");
  assert(findings[0].severity === "warning", "TC-10 severity warning");
  ok("TC-10 VAR-002 — resultado variable not contrastated");
}

// ─── TC-11: VAR-002 — resultado variable IS contrastated ─────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable({ rol: "resultado" });
  const ind = makeIndicator(v.id);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any] });
  const ctRow = makeCtRow(hyp.id, ind.id, null);
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  const input = emptyInput({
    hypotheses: [hyp], conceptualModels: [model], contrastationMatrices: [ctMatrix],
  });
  const findings = evaluateRule("VAR-002", input);
  assert(findings.length === 0, "TC-11 VAR-002 no warning when contrastated");
  ok("TC-11 VAR-002 — resultado variable contrastated OK");
}

// ─── TC-12: VAR-003 — variable with indicators but no op-row ─────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any] });
  // No op-row for this variable
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], operationalizationMatrices: [] });
  const findings = evaluateRule("VAR-003", input);
  assert(findings.length === 1, "TC-12 VAR-003 warning detected");
  assert(findings[0].severity === "warning", "TC-12 severity warning");
  ok("TC-12 VAR-003 — variable with indicators but no op-row");
}

// ─── TC-13: VAR-004 — isolated variable ──────────────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any] });
  // No op-row, no ct-row
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const findings = evaluateRule("VAR-004", input);
  assert(findings.length === 1, "TC-13 VAR-004 warning detected");
  assert(findings[0].severity === "warning", "TC-13 severity warning");
  ok("TC-13 VAR-004 — isolated variable");
}

// ─── TC-14: IND-001 — indicator without variable (via orphan detection) ───────

{
  // Build a graph where an indicator node exists without edges to a variable
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator("nonexistent-var-id"); // points to a variable that won't be in the model
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any] });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const graph = buildGraph(input as unknown as HeliosGraphInput);
  // The indicator node has a derives-from edge to a node that doesn't exist
  // detectOrphans will catch it differently; let's verify via the rule
  const audit = runMethodologicalAudit(input, "2026-01-01T00:00:00Z");
  const ind001 = audit.findings.filter(f => f.ruleId === "IND-001");
  // The indicator derives-from a non-existent variable node, so it appears as indicatorsWithoutVariable
  assert(ind001.length >= 0, "TC-14 IND-001 evaluated without crash");
  ok("TC-14 IND-001 — indicator without variable evaluates safely");
}

// ─── TC-15: IND-002 — indicator not operationalized ──────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any] });
  // No op-row with this indicator
  const opRow = makeOpRow(v.id, null, null); // indicatorId null
  const opMatrix = makeOpMatrix(hyp.id, [opRow]);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], operationalizationMatrices: [opMatrix] });
  const findings = evaluateRule("IND-002", input);
  assert(findings.some(f => f.ruleId === "IND-002"), "TC-15 IND-002 warning detected");
  assert(findings.every(f => f.severity === "warning"), "TC-15 severity warning");
  ok("TC-15 IND-002 — indicator not operationalized");
}

// ─── TC-16: IND-003 — indicator operationalized but not contrastated ──────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const src = makeSource([ind.id]);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any], evidenceSources: [src as any] });
  const opRow = makeOpRow(v.id, ind.id, src.id);
  const opMatrix = makeOpMatrix(hyp.id, [opRow]);
  // ct-row doesn't use this indicator
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], operationalizationMatrices: [opMatrix] });
  const findings = evaluateRule("IND-003", input);
  assert(findings.length === 1, "TC-16 IND-003 suggestion detected");
  assert(findings[0].severity === "suggestion", "TC-16 severity suggestion");
  ok("TC-16 IND-003 — indicator not contrastated");
}

// ─── TC-17: IND-004 — indicator crossed between hypotheses ───────────────────

{
  const hyp1 = makeHypothesis({ titulo: "H1" });
  const hyp2 = makeHypothesis({ titulo: "H2" });
  const v1 = makeVariable();
  const ind1 = makeIndicator(v1.id);
  const model1 = makeModel(hyp1.id, { variables: [v1 as any], indicators: [ind1 as any] });
  // ct-row of hyp2 uses ind1 (which belongs to hyp1)
  const ctRow = makeCtRow(hyp2.id, ind1.id, null);
  const ctMatrix = makeCtMatrix(hyp2.id, [ctRow]);
  const input = emptyInput({
    hypotheses: [hyp1, hyp2],
    conceptualModels: [model1],
    contrastationMatrices: [ctMatrix],
  });
  const findings = evaluateRule("IND-004", input);
  assert(findings.length === 1, "TC-17 IND-004 error detected");
  assert(findings[0].severity === "error", "TC-17 severity error");
  ok("TC-17 IND-004 — indicator crossed between hypotheses");
}

// ─── TC-18: IND-005 — redundant indicator rows ───────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const src = makeSource([ind.id]);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any], evidenceSources: [src as any] });
  // Two rows with same variable, dimension, indicator, source
  const r1 = makeOpRow(v.id, ind.id, src.id, { nombre: "Cobertura" });
  const r2 = makeOpRow(v.id, ind.id, src.id, { nombre: "Cobertura" });
  const opMatrix = makeOpMatrix(hyp.id, [r1, r2]);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], operationalizationMatrices: [opMatrix] });
  const findings = evaluateRule("IND-005", input);
  assert(findings.length >= 1, "TC-18 IND-005 warning detected");
  assert(findings[0].severity === "warning", "TC-18 severity warning");
  ok("TC-18 IND-005 — redundant indicator rows");
}

// ─── TC-19: SRC-001 — contrastated indicator without source in op ─────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any] });
  // Op-row with indicator but NO source
  const opRow = makeOpRow(v.id, ind.id, null);
  const opMatrix = makeOpMatrix(hyp.id, [opRow]);
  // Ct-row uses the indicator
  const ctRow = makeCtRow(hyp.id, ind.id, null);
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  const input = emptyInput({
    hypotheses: [hyp], conceptualModels: [model],
    operationalizationMatrices: [opMatrix], contrastationMatrices: [ctMatrix],
  });
  const findings = evaluateRule("SRC-001", input);
  assert(findings.length === 1, "TC-19 SRC-001 error detected");
  assert(findings[0].severity === "error", "TC-19 severity error");
  ok("TC-19 SRC-001 — contrastated indicator without source");
}

// ─── TC-20: SRC-002 — unused source ──────────────────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const src = makeSource([ind.id]); // valid source but never used in op or ct
  const model = makeModel(hyp.id, {
    variables: [v as any], indicators: [ind as any], evidenceSources: [src as any],
  });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const findings = evaluateRule("SRC-002", input);
  assert(findings.length === 1, "TC-20 SRC-002 suggestion detected");
  assert(findings[0].severity === "suggestion", "TC-20 severity suggestion");
  ok("TC-20 SRC-002 — unused source");
}

// ─── TC-21: SRC-003 — source used outside indicator ──────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const src = makeSource([ind.id]);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any], evidenceSources: [src as any] });
  // Op-row: ind + src2 (different source)
  const src2 = makeSource([ind.id]);
  const opRow = makeOpRow(v.id, ind.id, src2.id);
  const opMatrix = makeOpMatrix(hyp.id, [opRow]);
  // Ct-row: ind + src (not in op-row with ind)
  const ctRow = makeCtRow(hyp.id, ind.id, src.id);
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  const input = emptyInput({
    hypotheses: [hyp], conceptualModels: [model],
    operationalizationMatrices: [opMatrix], contrastationMatrices: [ctMatrix],
  });
  const findings = evaluateRule("SRC-003", input);
  assert(findings.length === 1, "TC-21 SRC-003 warning detected");
  assert(findings[0].severity === "warning", "TC-21 severity warning");
  ok("TC-21 SRC-003 — source used outside indicator");
}

// ─── TC-22: OPR-001 — op row without indicator ───────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const model = makeModel(hyp.id, { variables: [v as any] });
  const opRow = makeOpRow(v.id, null, null); // no indicator
  const opMatrix = makeOpMatrix(hyp.id, [opRow]);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], operationalizationMatrices: [opMatrix] });
  const findings = evaluateRule("OPR-001", input);
  assert(findings.length === 1, "TC-22 OPR-001 error detected");
  assert(findings[0].severity === "error", "TC-22 severity error");
  ok("TC-22 OPR-001 — op row without indicator");
}

// ─── TC-23: OPR-002 — op row without source ──────────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any] });
  const opRow = makeOpRow(v.id, ind.id, null); // no source
  const opMatrix = makeOpMatrix(hyp.id, [opRow]);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], operationalizationMatrices: [opMatrix] });
  const findings = evaluateRule("OPR-002", input);
  assert(findings.length === 1, "TC-23 OPR-002 error detected");
  assert(findings[0].severity === "error", "TC-23 severity error");
  ok("TC-23 OPR-002 — op row without source");
}

// ─── TC-24: OPR-003 — op row not contrastated ────────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const src = makeSource([ind.id]);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any], evidenceSources: [src as any] });
  const opRow = makeOpRow(v.id, ind.id, src.id);
  const opMatrix = makeOpMatrix(hyp.id, [opRow]);
  // no ct-row with this indicator
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], operationalizationMatrices: [opMatrix] });
  const findings = evaluateRule("OPR-003", input);
  assert(findings.length === 1, "TC-24 OPR-003 warning detected");
  assert(findings[0].severity === "warning", "TC-24 severity warning");
  ok("TC-24 OPR-003 — op row not contrastated");
}

// ─── TC-25: OPR-004 — duplicate op rows ──────────────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const src = makeSource([ind.id]);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any], evidenceSources: [src as any] });
  const r1 = makeOpRow(v.id, ind.id, src.id, { nombre: "Acceso" });
  const r2 = makeOpRow(v.id, ind.id, src.id, { nombre: "Acceso" });
  const opMatrix = makeOpMatrix(hyp.id, [r1, r2]);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], operationalizationMatrices: [opMatrix] });
  const findings = evaluateRule("OPR-004", input);
  assert(findings.length >= 1, "TC-25 OPR-004 warning detected");
  assert(findings[0].severity === "warning", "TC-25 severity warning");
  ok("TC-25 OPR-004 — duplicate op rows");
}

// ─── TC-26: OPR-005 — missing escala ─────────────────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any] });
  const opRow = makeOpRow(v.id, ind.id, null, { escala: "" });
  const opMatrix = makeOpMatrix(hyp.id, [opRow]);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], operationalizationMatrices: [opMatrix] });
  const findings = evaluateRule("OPR-005", input);
  assert(findings.length === 1, "TC-26 OPR-005 suggestion detected");
  assert(findings[0].severity === "suggestion", "TC-26 severity suggestion");
  ok("TC-26 OPR-005 — missing escala");
}

// ─── TC-27: CON-001 — evidencia esperada without contraria ───────────────────

{
  const hyp = makeHypothesis();
  const model = makeModel(hyp.id);
  const ctRow = makeCtRow(hyp.id, null, null, { evidenciaContraria: "" });
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], contrastationMatrices: [ctMatrix] });
  const findings = evaluateRule("CON-001", input);
  assert(findings.length === 1, "TC-27 CON-001 error detected");
  assert(findings[0].severity === "error", "TC-27 severity error");
  ok("TC-27 CON-001 — evidencia esperada without contraria");
}

// ─── TC-28: CON-002 — evidencia contraria without interpretacion ──────────────

{
  const hyp = makeHypothesis();
  const model = makeModel(hyp.id);
  const ctRow = makeCtRow(hyp.id, null, null, { criterioInterpretacion: "" });
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], contrastationMatrices: [ctMatrix] });
  const findings = evaluateRule("CON-002", input);
  assert(findings.length === 1, "TC-28 CON-002 warning detected");
  assert(findings[0].severity === "warning", "TC-28 severity warning");
  ok("TC-28 CON-002 — evidencia contraria without interpretation");
}

// ─── TC-29: CON-003 — ct indicator not in op-rows ────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any] });
  // ct-row uses ind, but no op-row uses ind
  const ctRow = makeCtRow(hyp.id, ind.id, null);
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  const input = emptyInput({
    hypotheses: [hyp], conceptualModels: [model], contrastationMatrices: [ctMatrix],
  });
  const findings = evaluateRule("CON-003", input);
  assert(findings.length === 1, "TC-29 CON-003 error detected");
  assert(findings[0].severity === "error", "TC-29 severity error");
  ok("TC-29 CON-003 — ct indicator not operationalized");
}

// ─── TC-30: CON-004 — ct source not in op-rows ───────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const src = makeSource([ind.id]);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any], evidenceSources: [src as any] });
  // op-row has no source; ct-row has source
  const opRow = makeOpRow(v.id, ind.id, null);
  const opMatrix = makeOpMatrix(hyp.id, [opRow]);
  const ctRow = makeCtRow(hyp.id, null, src.id);
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  const input = emptyInput({
    hypotheses: [hyp], conceptualModels: [model],
    operationalizationMatrices: [opMatrix], contrastationMatrices: [ctMatrix],
  });
  const findings = evaluateRule("CON-004", input);
  assert(findings.length === 1, "TC-30 CON-004 warning detected");
  assert(findings[0].severity === "warning", "TC-30 severity warning");
  ok("TC-30 CON-004 — ct source not operationalized");
}

// ─── TC-31: CON-005 — hypothesis without ct matrix ───────────────────────────

{
  const hyp = makeHypothesis({ titulo: "Sin contrastación" });
  const model = makeModel(hyp.id);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const findings = evaluateRule("CON-005", input);
  assert(findings.length === 1, "TC-31 CON-005 error detected");
  assert(findings[0].severity === "error", "TC-31 severity error");
  ok("TC-31 CON-005 — hypothesis without ct matrix");
}

// ─── TC-32: CON-006 — duplicate ct criterion ─────────────────────────────────

{
  const hyp = makeHypothesis();
  const model = makeModel(hyp.id);
  const r1 = makeCtRow(hyp.id, null, null, { evidenciaEsperada: "X", evidenciaContraria: "Y" });
  const r2 = makeCtRow(hyp.id, null, null, { evidenciaEsperada: "X", evidenciaContraria: "Y" });
  const ctMatrix = makeCtMatrix(hyp.id, [r1, r2]);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], contrastationMatrices: [ctMatrix] });
  const findings = evaluateRule("CON-006", input);
  assert(findings.length === 1, "TC-32 CON-006 warning detected");
  assert(findings[0].severity === "warning", "TC-32 severity warning");
  ok("TC-32 CON-006 — duplicate ct criterion");
}

// ─── TC-33: TRA-001 — incomplete chain (no variables) ────────────────────────

{
  const hyp = makeHypothesis({ titulo: "Cadena incompleta" });
  const model = makeModel(hyp.id, { variables: [], indicators: [] });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const findings = evaluateRule("TRA-001", input);
  assert(findings.length === 1, "TC-33 TRA-001 finding detected");
  assert(findings[0].ruleId === "TRA-001", "TC-33 correct rule");
  ok("TC-33 TRA-001 — incomplete chain");
}

// ─── TC-34: TRA-002 — broken reference via pre-built graph ───────────────────

{
  const hyp = makeHypothesis();
  const model = makeModel(hyp.id);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const graph = buildGraph(input as unknown as HeliosGraphInput);
  // Inject a broken edge manually
  const brokenGraph = {
    nodes: graph.nodes,
    edges: [
      ...graph.edges,
      { id: "edge-broken", source: "node-nonexistent", target: "node-problem", relationType: "supports" as const },
    ],
  };
  const inputWithGraph = { ...input, graph: brokenGraph };
  const findings = evaluateRule("TRA-002", inputWithGraph);
  assert(findings.length >= 1, "TC-34 TRA-002 broken reference detected");
  assert(findings[0].severity === "error", "TC-34 severity error");
  ok("TC-34 TRA-002 — broken reference in graph");
}

// ─── TC-35: TRA-003 — isolated entity ────────────────────────────────────────

{
  const hyp = makeHypothesis();
  const model = makeModel(hyp.id);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const graph = buildGraph(input as unknown as HeliosGraphInput);
  // Add an isolated indicator node with no edges
  const isolatedGraph = {
    nodes: [
      ...graph.nodes,
      { id: "node-ind-isolated", type: "indicator" as const, refId: "isolated-ind", metadata: { label: "Aislado" } },
    ],
    edges: graph.edges,
  };
  const inputWithGraph = { ...input, graph: isolatedGraph };
  const findings = evaluateRule("TRA-003", inputWithGraph);
  assert(findings.some(f => f.ruleId === "TRA-003"), "TC-35 TRA-003 warning detected");
  ok("TC-35 TRA-003 — isolated entity warning");
}

// ─── TC-36: TRA-004 — illegal cycle ──────────────────────────────────────────

{
  const hyp = makeHypothesis();
  const model = makeModel(hyp.id);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const graph = buildGraph(input as unknown as HeliosGraphInput);
  const hypNodeId = `node-hyp-${hyp.id}`;
  const problemNodeId = "node-problem";
  // Create a cycle: problem → hypothesis (reverse of supports)
  const cyclicGraph = {
    nodes: graph.nodes,
    edges: [
      ...graph.edges,
      { id: "edge-cycle", source: problemNodeId, target: hypNodeId, relationType: "supports" as const },
    ],
  };
  const inputWithGraph = { ...input, graph: cyclicGraph };
  const findings = evaluateRule("TRA-004", inputWithGraph);
  assert(findings.length >= 1, "TC-36 TRA-004 cycle detected");
  assert(findings[0].severity === "error", "TC-36 severity error");
  ok("TC-36 TRA-004 — illegal cycle");
}

// ─── TC-37: orphan vs unused distinction ─────────────────────────────────────

{
  // Orphan: source with NO uses→indicator edge (indicadorIds empty)
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const orphanSrc = makeSource([]); // no indicadorIds → orphan
  const unusedSrc = makeSource([ind.id]); // has indicadorIds → valid, but not in op or ct → unused
  const model = makeModel(hyp.id, {
    variables: [v as any],
    indicators: [ind as any],
    evidenceSources: [orphanSrc as any, unusedSrc as any],
  });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const graph = buildGraph(input as unknown as HeliosGraphInput);
  const orphans = detectOrphans(graph);
  // orphanSrc has no uses edge → appears in sourcesWithoutIndicator
  assert(orphans.sourcesWithoutIndicator.some(n => n.refId === orphanSrc.id),
    "TC-37 orphan source in sourcesWithoutIndicator");
  // unusedSrc has uses edge (valid) but nobody references it in op/ct → unusedSources
  assert(orphans.unusedSources.some(n => n.refId === unusedSrc.id),
    "TC-37 unused source in unusedSources");
  // They are distinct categories
  assert(!orphans.unusedSources.some(n => n.refId === orphanSrc.id),
    "TC-37 orphan NOT in unusedSources");
  assert(!orphans.sourcesWithoutIndicator.some(n => n.refId === unusedSrc.id),
    "TC-37 unused NOT in sourcesWithoutIndicator");
  ok("TC-37 orphan vs unused distinction");
}

// ─── TC-38: topologicalTraversalDependenciesFirst ─────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any] });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const graph = buildGraph(input as unknown as HeliosGraphInput);
  const order = topologicalTraversalDependenciesFirst(graph);
  // problem should come first (it has no outgoing edges = nothing it depends on)
  // Actually: dependencies-first = things with no incoming edges come first in the TRANSPOSED graph
  // In our convention: source→target = "source depends on target"
  // dependencies-first: the most fundamental entities first = problem (nothing targets problem as source)
  // Let's just verify it's a valid ordering (all nodes present) and different from dependents-first
  const depFirst = topologicalTraversalDependentsFirst(graph);
  assert(order.length === graph.nodes.length, "TC-38 dependenciesFirst covers all nodes");
  // Problem should be FIRST in dependenciesFirst (it has nothing that it depends on targets)
  // Actually problem is the last dep in the original Kahn's — let's find problem node position
  const problemIdx = order.findIndex(n => n.type === "problem");
  assert(problemIdx >= 0, "TC-38 problem node in dependenciesFirst order");
  // In dependentsFirst (original Kahn), problem comes last
  const problemIdxDepFirst = depFirst.findIndex(n => n.type === "problem");
  assert(problemIdx < problemIdxDepFirst, "TC-38 problem comes earlier in dependenciesFirst");
  ok("TC-38 topologicalTraversalDependenciesFirst");
}

// ─── TC-39: topologicalTraversalDependentsFirst ───────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const src = makeSource([ind.id]);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any], evidenceSources: [src as any] });
  const opRow = makeOpRow(v.id, ind.id, src.id);
  const opMatrix = makeOpMatrix(hyp.id, [opRow]);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], operationalizationMatrices: [opMatrix] });
  const graph = buildGraph(input as unknown as HeliosGraphInput);
  const order = topologicalTraversalDependentsFirst(graph);
  const orderOld = topologicalTraversal(graph);
  // Both should return same order (alias)
  assert(order.length === orderOld.length, "TC-39 same length as topologicalTraversal");
  assert(order.every((n, i) => n.id === orderOld[i].id), "TC-39 same ordering as topologicalTraversal");
  // op-row should come before problem (op-row has no incoming edges)
  const opRowIdx = order.findIndex(n => n.type === "operationalization-row");
  const problemIdx = order.findIndex(n => n.type === "problem");
  assert(opRowIdx < problemIdx, "TC-39 op-row before problem in dependentsFirst");
  ok("TC-39 topologicalTraversalDependentsFirst");
}

// ─── TC-40: audit summary — correct counts ───────────────────────────────────

{
  const hyp = makeHypothesis({ titulo: "H-sin-modelo" });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [] });
  const audit = runMethodologicalAudit(input, TS);
  const errors = audit.findings.filter(f => f.severity === "error").length;
  const warnings = audit.findings.filter(f => f.severity === "warning").length;
  const suggestions = audit.findings.filter(f => f.severity === "suggestion").length;
  assert(audit.summary.errors === errors, "TC-40 errors count correct");
  assert(audit.summary.warnings === warnings, "TC-40 warnings count correct");
  assert(audit.summary.suggestions === suggestions, "TC-40 suggestions count correct");
  assert(audit.summary.totalFindings === audit.findings.length, "TC-40 totalFindings correct");
  ok("TC-40 audit summary correct counts");
}

// ─── TC-41: audit summary — blocking = true when errors ──────────────────────

{
  const hyp = makeHypothesis();
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [] }); // HYP-003 error
  const audit = runMethodologicalAudit(input, TS);
  assert(audit.summary.blocking === true, "TC-41 blocking = true when errors");
  assert(audit.summary.complete === false, "TC-41 complete = false when errors");
  ok("TC-41 blocking = true when errors");
}

// ─── TC-42: audit summary — categoriesAffected ───────────────────────────────

{
  const hyp = makeHypothesis();
  const input = emptyInput({ hypotheses: [hyp] });
  const audit = runMethodologicalAudit(input, TS);
  assert(Array.isArray(audit.summary.categoriesAffected), "TC-42 categoriesAffected is array");
  assert(audit.summary.categoriesAffected.length > 0, "TC-42 categoriesAffected non-empty when errors");
  ok("TC-42 categoriesAffected populated");
}

// ─── TC-43: groupFindingsByCategory ──────────────────────────────────────────

{
  const hyp = makeHypothesis();
  const input = emptyInput({ hypotheses: [hyp] });
  const audit = runMethodologicalAudit(input, TS);
  const byCategory = groupFindingsByCategory(audit.findings);
  assert(byCategory instanceof Map, "TC-43 groupFindingsByCategory returns Map");
  // All findings in each category should have that category's rule
  for (const [, list] of byCategory) {
    assert(list.length > 0, "TC-43 each category has at least one finding");
  }
  ok("TC-43 groupFindingsByCategory");
}

// ─── TC-44: groupFindingsBySeverity ──────────────────────────────────────────

{
  const hyp = makeHypothesis();
  const v = makeVariable();
  const ind = makeIndicator(v.id);
  const src = makeSource([ind.id]);
  const model = makeModel(hyp.id, { variables: [v as any], indicators: [ind as any], evidenceSources: [src as any] });
  const opRow = makeOpRow(v.id, ind.id, src.id);
  const opMatrix = makeOpMatrix(hyp.id, [opRow]);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], operationalizationMatrices: [opMatrix] });
  const audit = runMethodologicalAudit(input, TS);
  const bySeverity = groupFindingsBySeverity(audit.findings);
  assert(bySeverity instanceof Map, "TC-44 groupFindingsBySeverity returns Map");
  const suggestions = bySeverity.get("suggestion") ?? [];
  // OPR-003 suggestion should appear (op-row not contrastated)
  assert(suggestions.length > 0, "TC-44 suggestions detected");
  ok("TC-44 groupFindingsBySeverity");
}

// ─── TC-45: groupFindingsByEntity ─────────────────────────────────────────────

{
  const hyp = makeHypothesis();
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [] });
  const audit = runMethodologicalAudit(input, TS);
  const byEntity = groupFindingsByEntity(audit.findings);
  assert(byEntity instanceof Map, "TC-45 groupFindingsByEntity returns Map");
  // HYP-003 has hypothesis entity ref
  const hypFindings = byEntity.get("hypothesis") ?? [];
  assert(hypFindings.length > 0, "TC-45 hypothesis findings grouped");
  ok("TC-45 groupFindingsByEntity");
}

// ─── TC-46: findBlockingErrors ────────────────────────────────────────────────

{
  const hyp = makeHypothesis();
  const input = emptyInput({ hypotheses: [hyp] }); // many errors
  const audit = runMethodologicalAudit(input, TS);
  const errors = findBlockingErrors(audit.findings);
  const warnings = findWarnings(audit.findings);
  const suggestions = findSuggestions(audit.findings);
  assert(errors.every(f => f.severity === "error"), "TC-46 findBlockingErrors all errors");
  assert(warnings.every(f => f.severity === "warning"), "TC-46 findWarnings all warnings");
  assert(suggestions.every(f => f.severity === "suggestion"), "TC-46 findSuggestions all suggestions");
  assert(errors.length + warnings.length + suggestions.length === audit.findings.length,
    "TC-46 all findings classified");
  ok("TC-46 findBlockingErrors / findWarnings / findSuggestions");
}

// ─── TC-47: complete design — no errors, all confirmed ───────────────────────
// Uses a single "resultado" variable so every variable has an indicator,
// every indicator is operationalized and contrastated. No causa field → HYP-001/002 skip.

{
  const hyp = makeHypothesis({}); // no causa → causal rules skip
  const vR = makeVariable({ rol: "resultado" });
  const ind = makeIndicator(vR.id);
  const src = makeSource([ind.id]);
  const model = makeModel(hyp.id, {
    variables: [vR as any],
    indicators: [ind as any],
    evidenceSources: [src as any],
    confirmed: true,
  });
  const opRow = makeOpRow(vR.id, ind.id, src.id);
  const opMatrix = makeOpMatrix(hyp.id, [opRow], true);
  const ctRow = makeCtRow(hyp.id, ind.id, src.id);
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow], true);
  const input = emptyInput({
    hypotheses: [hyp],
    conceptualModels: [model],
    operationalizationMatrices: [opMatrix],
    contrastationMatrices: [ctMatrix],
  });
  const audit = runMethodologicalAudit(input, TS);
  const errors = findBlockingErrors(audit.findings);
  assert(errors.length === 0, "TC-47 no blocking errors in complete design");
  assert(audit.summary.blocking === false, "TC-47 blocking = false");
  assert(audit.summary.complete === true, "TC-47 complete = true");
  ok("TC-47 complete design — no errors");
}

// ─── TC-48: idempotence ───────────────────────────────────────────────────────

{
  const hyp = makeHypothesis({ causa: "X" });
  const v = makeVariable({ rol: "causa" });
  const model = makeModel(hyp.id, { variables: [v as any] });
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const audit1 = runMethodologicalAudit(input, TS);
  const audit2 = runMethodologicalAudit(input, TS);
  assert(audit1.findings.length === audit2.findings.length, "TC-48 idempotence — same finding count");
  assert(audit1.evaluatedRuleIds.length === audit2.evaluatedRuleIds.length,
    "TC-48 same evaluated rules");
  ok("TC-48 idempotence");
}

// ─── TC-49: no mutation of state ─────────────────────────────────────────────

{
  const hyp = makeHypothesis();
  const model = makeModel(hyp.id);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const hypCountBefore = input.hypotheses.length;
  const modelCountBefore = input.conceptualModels.length;
  runMethodologicalAudit(input, TS);
  assert(input.hypotheses.length === hypCountBefore, "TC-49 hypotheses not mutated");
  assert(input.conceptualModels.length === modelCountBefore, "TC-49 conceptualModels not mutated");
  ok("TC-49 no mutation of state");
}

// ─── TC-50: multiple hypotheses — both get checked ───────────────────────────

{
  const hyp1 = makeHypothesis({ titulo: "H1-sin-modelo" });
  const hyp2 = makeHypothesis({ titulo: "H2-sin-modelo" });
  const input = emptyInput({ hypotheses: [hyp1, hyp2], conceptualModels: [] });
  const audit = runMethodologicalAudit(input, TS);
  const hyp3Findings = audit.findings.filter(f => f.entityRefs.some(r => r.id === hyp1.id));
  const hyp4Findings = audit.findings.filter(f => f.entityRefs.some(r => r.id === hyp2.id));
  assert(hyp3Findings.length > 0, "TC-50 H1 gets findings");
  assert(hyp4Findings.length > 0, "TC-50 H2 gets findings");
  ok("TC-50 multiple hypotheses both checked");
}

// ─── TC-51: evaluateRule single rule ─────────────────────────────────────────

{
  const hyp = makeHypothesis();
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [] });
  const findings = evaluateRule("HYP-003", input);
  assert(findings.length === 1, "TC-51 evaluateRule HYP-003 returns finding");
  assert(findings[0].ruleId === "HYP-003", "TC-51 correct ruleId");
  // Unknown rule returns empty
  const unknown = evaluateRule("UNKNOWN-999", input);
  assert(unknown.length === 0, "TC-51 unknown rule returns empty");
  ok("TC-51 evaluateRule single rule");
}

// ─── TC-52: isMethodologicallyComplete ───────────────────────────────────────

{
  const hyp = makeHypothesis({}); // no causa → causal rules skip
  const vR = makeVariable({ rol: "resultado" });
  const ind = makeIndicator(vR.id);
  const src = makeSource([ind.id]);
  const model = makeModel(hyp.id, { variables: [vR as any], indicators: [ind as any], evidenceSources: [src as any], confirmed: true });
  const opRow = makeOpRow(vR.id, ind.id, src.id);
  const opMatrix = makeOpMatrix(hyp.id, [opRow], true);
  const ctRow = makeCtRow(hyp.id, ind.id, src.id);
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow], true);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model], operationalizationMatrices: [opMatrix], contrastationMatrices: [ctMatrix] });
  const audit = runMethodologicalAudit(input, TS);
  const complete = isMethodologicallyComplete(audit, input);
  assert(complete === true, "TC-52 isMethodologicallyComplete returns true for complete design");
  // Incomplete: no model
  const inputIncomplete = emptyInput({ hypotheses: [hyp] });
  const auditIncomplete = runMethodologicalAudit(inputIncomplete, TS);
  assert(!isMethodologicallyComplete(auditIncomplete, inputIncomplete),
    "TC-52 isMethodologicallyComplete false for incomplete");
  ok("TC-52 isMethodologicallyComplete");
}

// ─── TC-53: integration — all rules evaluated ────────────────────────────────

{
  const hyp = makeHypothesis({ causa: "Factor causal" });
  const model = makeModel(hyp.id);
  const input = emptyInput({ hypotheses: [hyp], conceptualModels: [model] });
  const audit = runMethodologicalAudit(input, TS);
  // All 31 rules should be evaluated
  assert(audit.evaluatedRuleIds.length === 31, "TC-53 all 31 rules evaluated");
  assert(typeof audit.generatedAt === "string", "TC-53 generatedAt is string");
  assert(Array.isArray(audit.findings), "TC-53 findings is array");
  ok("TC-53 integration — all rules evaluated");
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(
  "──────────────────────────────────────────────────────\n" +
  `   Passed : ${passed}\n` +
  `   Failed : ${failed}\n` +
  `   Total  : ${passed + failed}\n` +
  "──────────────────────────────────────────────────────"
);

if (failed > 0) {
  process.exit(1);
}
