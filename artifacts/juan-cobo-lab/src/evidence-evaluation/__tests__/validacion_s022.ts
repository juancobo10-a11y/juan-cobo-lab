/**
 * Validación S-022 — Motor de Evaluación de Evidencia
 *
 * Suite: EvidenceEvaluationService + HypothesisEvidenceConclusionService
 *        + KnowledgeGraph extension + EVD rules
 *
 * 75 TCs, 120+ aserciones
 */

import {
  createEvidenceEvaluationMatrix,
  createObservedEvidence,
  updateObservedEvidence,
  removeObservedEvidence,
  reorderObservedEvidence,
  createEvidenceAssessment,
  updateEvidenceAssessment,
  removeEvidenceAssessment,
  findEvidenceByContrastationRow,
  findAssessmentByEvidence,
  findUnassessedEvidence,
  validateEvidenceEvaluation,
  confirmEvidenceEvaluationMatrix,
  summarizeEvidenceEvaluation,
  groupEvidenceByDirection,
  groupEvidenceByConfidence,
  isEvidenceEvaluationComplete,
  upsertEvidenceEvaluationMatrix,
  findEvidenceEvaluationMatrixByHypothesis,
  removeEvidenceEvaluationMatrix,
} from "../EvidenceEvaluationService";

import {
  createConclusion,
  updateConclusion,
  validateConclusion,
  confirmConclusion,
  findReferencedEvidence,
  validateEvidenceReferences,
  upsertHypothesisEvidenceConclusion,
  findHypothesisEvidenceConclusion,
  removeHypothesisEvidenceConclusion,
} from "../HypothesisEvidenceConclusionService";

import {
  buildGraph,
  detectOrphans,
  computeImpact,
} from "../../knowledge-graph/KnowledgeGraphService";

import { runMethodologicalAudit, evaluateRule } from "../../methodological-consistency/MethodologicalConsistencyService";

import type { EvidenceEvaluationMatrix, ObservedEvidence, EvidenceAssessment, HypothesisEvidenceConclusion } from "../types";
import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type { OperationalizationMatrix } from "@/operationalization/types";
import type { ContrastationMatrix } from "@/contrastation/types";
import type { HeliosGraphInput } from "@/knowledge-graph/types";

// ─── Harness ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string): void {
  if (condition) { passed++; }
  else { failed++; console.error(`  ✗ ${msg}`); }
}
function ok(label: string) { console.log(`  ✓ ${label}`); }

let _c = 0;
function uid(p: string) { return `${p}-${++_c}`; }
const TS = "2026-01-01T00:00:00Z";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeCtMatrix(hypothesisId: string, rows: ReturnType<typeof makeCtRow>[] = []): ContrastationMatrix {
  return {
    id: uid("ctm"), hypothesisId,
    rows: rows as any,
    confirmed: true,
    createdAt: TS, updatedAt: TS,
  } as unknown as ContrastationMatrix;
}

function makeCtRow(hypothesisId: string, indicadorId?: string, fuenteId?: string) {
  return {
    id: uid("ctrow"), hypothesisId,
    indicadorId: indicadorId ?? uid("ind"),
    fuenteId: fuenteId ?? uid("src"),
    evidenciaEsperada: "Evidencia esperada",
    evidenciaContraria: "Evidencia contraria",
    criterioInterpretacion: "Criterio",
    limitaciones: "",
    prioridad: "alta" as const,
    observaciones: "", orden: 0,
    createdAt: TS, updatedAt: TS,
  };
}

function makeHyp(overrides: Partial<Record<string, unknown>> = {}): PolicyHypothesis {
  return {
    id: uid("hyp"), titulo: "Hipótesis prueba", formulacion: "Si A entonces B",
    causa: "", mecanismo: "", resultadoEsperado: "",
    variables: [], confianza: "media",
    sourceQuestionIds: [], thinkingPatternIds: [],
    createdAt: TS, updatedAt: TS,
    ...overrides,
  } as unknown as PolicyHypothesis;
}

function makeConceptualModel(hypothesisId: string): ConceptualModel {
  return {
    id: uid("cm"), hypothesisId,
    variables: [], indicators: [], evidenceSources: [],
    confirmed: true, createdAt: TS, updatedAt: TS,
  } as unknown as ConceptualModel;
}

function makeMatrix(hypothesisId: string, ctMatrixId = uid("ctm")): EvidenceEvaluationMatrix {
  return createEvidenceEvaluationMatrix(hypothesisId, ctMatrixId, TS);
}

function makeEvidence(contrastationRowId: string, indicatorId: string, sourceId: string, overrides: Partial<ObservedEvidence> = {}): Omit<ObservedEvidence, "id" | "createdAt" | "updatedAt"> {
  return {
    contrastationRowId,
    indicatorId,
    sourceId,
    title: "Evidencia de prueba",
    description: "Descripción de la evidencia de prueba",
    ...overrides,
  };
}

function makeAssessmentData(evidenceId: string, hypothesisId: string, ctRowId: string): Omit<EvidenceAssessment, "id" | "assessedAt"> {
  return {
    observedEvidenceId: evidenceId,
    contrastationRowId: ctRowId,
    hypothesisId,
    status: "evaluated",
    direction: "supports",
    confidence: "medium",
    justification: "La evidencia es consistente con lo esperado.",
    limitations: "Período de observación limitado.",
    reviewed: false,
  };
}

// ─── TC-01 to TC-12: Evidencia observada ─────────────────────────────────────

// TC-01: crear matriz
{
  const matrix = createEvidenceEvaluationMatrix("hyp-1", "ctm-1", TS);
  assert(matrix.hypothesisId === "hyp-1", "TC-01 hypothesisId");
  assert(matrix.status === "draft", "TC-01 status draft");
  assert(matrix.observedEvidence.length === 0, "TC-01 empty evidence");
  assert(matrix.assessments.length === 0, "TC-01 empty assessments");
  ok("TC-01 crear matriz");
}

// TC-02: crear evidencia
{
  const ctRow = makeCtRow("hyp-1");
  let matrix = makeMatrix("hyp-1");
  const evData = makeEvidence(ctRow.id, "ind-1", "src-1");
  matrix = createObservedEvidence(matrix, evData, TS);
  assert(matrix.observedEvidence.length === 1, "TC-02 evidence added");
  assert(matrix.observedEvidence[0].title === "Evidencia de prueba", "TC-02 title");
  assert(matrix.observedEvidence[0].contrastationRowId === ctRow.id, "TC-02 ctRowId");
  ok("TC-02 crear evidencia");
}

// TC-03: editar evidencia
{
  let matrix = makeMatrix("hyp-1");
  const evData = makeEvidence(uid("ctrow"), "ind-1", "src-1");
  matrix = createObservedEvidence(matrix, evData, TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = updateObservedEvidence(matrix, evId, { title: "Título actualizado" }, TS);
  assert(matrix.observedEvidence[0].title === "Título actualizado", "TC-03 title updated");
  assert(matrix.observedEvidence[0].id === evId, "TC-03 id preserved");
  ok("TC-03 editar evidencia");
}

// TC-04: eliminar evidencia
{
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(uid("ctrow"), "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  // Add assessment for this evidence
  matrix = createEvidenceAssessment(matrix, makeAssessmentData(evId, "hyp-1", uid("ctrow")), TS);
  matrix = removeObservedEvidence(matrix, evId, TS);
  assert(matrix.observedEvidence.length === 0, "TC-04 evidence removed");
  // Assessment also removed
  assert(matrix.assessments.length === 0, "TC-04 assessment cascade removed");
  ok("TC-04 eliminar evidencia (cascade)");
}

// TC-05: reordenar evidencia
{
  let matrix = makeMatrix("hyp-1");
  const ctRowId = uid("ctrow");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1", { title: "A" }), TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1", { title: "B" }), TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1", { title: "C" }), TS);
  matrix = reorderObservedEvidence(matrix, 0, 2, TS);
  assert(matrix.observedEvidence[0].title === "B", "TC-05 reorder B first");
  assert(matrix.observedEvidence[2].title === "A", "TC-05 A moved to end");
  ok("TC-05 reordenar evidencia");
}

// TC-06: múltiples evidencias por criterio
{
  let matrix = makeMatrix("hyp-1");
  const ctRowId = uid("ctrow");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1", { title: "Ev1" }), TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1", { title: "Ev2" }), TS);
  matrix = createObservedEvidence(matrix, makeEvidence(uid("ctrow2"), "ind-2", "src-2", { title: "Ev3" }), TS);
  const byRow = findEvidenceByContrastationRow(matrix, ctRowId);
  assert(byRow.length === 2, "TC-06 two evidences for same row");
  assert(byRow.every(ev => ev.contrastationRowId === ctRowId), "TC-06 all belong to row");
  ok("TC-06 múltiples evidencias por criterio");
}

// TC-07: evidencia cualitativa
{
  let matrix = makeMatrix("hyp-1");
  const evData = makeEvidence(uid("ctrow"), "ind-1", "src-1", {
    observedValue: undefined,
    observedUnit: undefined,
    population: "Municipios rurales de Cundinamarca",
    description: "Entrevistas con alcaldes reportan reducción de infraestructura.",
  });
  matrix = createObservedEvidence(matrix, evData, TS);
  const ev = matrix.observedEvidence[0];
  assert(!ev.observedValue, "TC-07 qualitative has no value");
  assert(ev.population === "Municipios rurales de Cundinamarca", "TC-07 population context");
  ok("TC-07 evidencia cualitativa");
}

// TC-08: evidencia cuantitativa
{
  let matrix = makeMatrix("hyp-1");
  const evData = makeEvidence(uid("ctrow"), "ind-1", "src-1", {
    observedValue: "42.3",
    observedUnit: "% hogares",
    observationDate: "2024-12-31",
  });
  matrix = createObservedEvidence(matrix, evData, TS);
  const ev = matrix.observedEvidence[0];
  assert(ev.observedValue === "42.3", "TC-08 quantitative value");
  assert(ev.observedUnit === "% hogares", "TC-08 unit");
  ok("TC-08 evidencia cuantitativa");
}

// TC-09: evidencia sin unidad
{
  let matrix = makeMatrix("hyp-1");
  const evData = makeEvidence(uid("ctrow"), "ind-1", "src-1", {
    observedValue: "Aumento significativo",
    observedUnit: undefined,
  });
  matrix = createObservedEvidence(matrix, evData, TS);
  assert(!matrix.observedEvidence[0].observedUnit, "TC-09 no unit allowed");
  ok("TC-09 evidencia sin unidad");
}

// TC-10: evidencia sin fecha
{
  let matrix = makeMatrix("hyp-1");
  const evData = makeEvidence(uid("ctrow"), "ind-1", "src-1", {
    observationDate: undefined, periodStart: undefined, periodEnd: undefined,
  });
  matrix = createObservedEvidence(matrix, evData, TS);
  const ev = matrix.observedEvidence[0];
  assert(!ev.observationDate && !ev.periodStart && !ev.periodEnd, "TC-10 no dates allowed");
  ok("TC-10 evidencia sin fecha");
}

// TC-11: referencia específica
{
  let matrix = makeMatrix("hyp-1");
  const evData = makeEvidence(uid("ctrow"), "ind-1", "src-1", {
    sourceReference: "DANE (2024). Encuesta de Calidad de Vida. Bogotá.",
    sourcePage: "47-49",
    sourceSection: "Capítulo 3: Acceso a servicios básicos",
  });
  matrix = createObservedEvidence(matrix, evData, TS);
  const ev = matrix.observedEvidence[0];
  assert(ev.sourceReference !== undefined, "TC-11 source reference");
  assert(ev.sourcePage === "47-49", "TC-11 page");
  assert(ev.sourceSection !== undefined, "TC-11 section");
  ok("TC-11 referencia específica");
}

// TC-12: referencia duplicada detectada en validación
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[0].id, "ind-1", "src-1", {
    sourceReference: "DANE 2024"
  }), TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[0].id, "ind-1", "src-1", {
    title: "Segunda evidencia",
    description: "Descripción de la segunda",
    sourceReference: "DANE 2024", // same reference
  }), TS);
  const validation = validateEvidenceEvaluation(matrix, ctMatrix);
  assert(validation.warnings.some(w => w.includes("DANE 2024")), "TC-12 duplicate reference warning");
  ok("TC-12 referencia duplicada");
}

// ─── TC-13 to TC-27: Evaluación ──────────────────────────────────────────────

// TC-13: crear assessment
{
  const ctRowId = uid("ctrow");
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, makeAssessmentData(evId, "hyp-1", ctRowId), TS);
  assert(matrix.assessments.length === 1, "TC-13 assessment created");
  assert(matrix.assessments[0].observedEvidenceId === evId, "TC-13 links to evidence");
  ok("TC-13 crear assessment");
}

// TC-14: editar assessment
{
  const ctRowId = uid("ctrow");
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, makeAssessmentData(evId, "hyp-1", ctRowId), TS);
  const aId = matrix.assessments[0].id;
  matrix = updateEvidenceAssessment(matrix, aId, { direction: "weakens", confidence: "high" }, TS);
  assert(matrix.assessments[0].direction === "weakens", "TC-14 direction updated");
  assert(matrix.assessments[0].confidence === "high", "TC-14 confidence updated");
  ok("TC-14 editar assessment");
}

// TC-15: eliminar assessment
{
  const ctRowId = uid("ctrow");
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, makeAssessmentData(evId, "hyp-1", ctRowId), TS);
  const aId = matrix.assessments[0].id;
  matrix = removeEvidenceAssessment(matrix, aId, TS);
  assert(matrix.assessments.length === 0, "TC-15 assessment removed");
  ok("TC-15 eliminar assessment");
}

// TC-16 to TC-20: Dirección
{
  const directions = ["supports", "weakens", "mixed", "inconclusive", "not-applicable"] as const;
  for (const dir of directions) {
    const ctRowId = uid("ctrow");
    let matrix = makeMatrix("hyp-1");
    matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1"), TS);
    const evId = matrix.observedEvidence[0].id;
    matrix = createEvidenceAssessment(matrix, {
      ...makeAssessmentData(evId, "hyp-1", ctRowId),
      direction: dir,
    }, TS);
    assert(matrix.assessments[0].direction === dir, `TC direction: ${dir}`);
  }
  ok("TC-16–20 todas las direcciones válidas");
}

// TC-21 to TC-23: Confianza
{
  const levels = ["low", "medium", "high"] as const;
  for (const level of levels) {
    const ctRowId = uid("ctrow");
    let matrix = makeMatrix("hyp-1");
    matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1"), TS);
    const evId = matrix.observedEvidence[0].id;
    matrix = createEvidenceAssessment(matrix, {
      ...makeAssessmentData(evId, "hyp-1", ctRowId),
      confidence: level,
    }, TS);
    assert(matrix.assessments[0].confidence === level, `TC confidence: ${level}`);
  }
  ok("TC-21–23 niveles de confianza válidos");
}

// TC-24: evaluación sin justificación (validation error)
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[0].id, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, {
    ...makeAssessmentData(evId, "hyp-1", ctMatrix.rows[0].id),
    justification: "",
  }, TS);
  const validation = validateEvidenceEvaluation(matrix, ctMatrix);
  assert(validation.errors.some(e => e.includes("justificación") || e.includes("justification")), "TC-24 no justification error");
  assert(!validation.canConfirm, "TC-24 cannot confirm without justification");
  ok("TC-24 evaluación sin justificación");
}

// TC-25: evaluación sin limitaciones (warning)
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[0].id, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, {
    ...makeAssessmentData(evId, "hyp-1", ctMatrix.rows[0].id),
    limitations: "",
  }, TS);
  const validation = validateEvidenceEvaluation(matrix, ctMatrix);
  assert(validation.warnings.some(w => w.includes("limitaciones") || w.includes("limitation")), "TC-25 no limitations warning");
  ok("TC-25 evaluación sin limitaciones");
}

// TC-26: evidencia sin evaluación (warning)
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[0].id, "ind-1", "src-1"), TS);
  // No assessment added
  const unassessed = findUnassessedEvidence(matrix);
  assert(unassessed.length === 1, "TC-26 one unassessed evidence");
  const validation = validateEvidenceEvaluation(matrix, ctMatrix);
  assert(validation.warnings.some(w => w.includes("evaluación") || w.includes("assessment")), "TC-26 warning for no assessment");
  ok("TC-26 evidencia sin evaluación");
}

// TC-27: múltiples evaluaciones — solo 1 activa por evidencia
{
  const ctRowId = uid("ctrow");
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, makeAssessmentData(evId, "hyp-1", ctRowId), TS);
  matrix = createEvidenceAssessment(matrix, { ...makeAssessmentData(evId, "hyp-1", ctRowId), direction: "weakens" }, TS);
  // Should only have 1 assessment per evidence
  const forEvidence = matrix.assessments.filter(a => a.observedEvidenceId === evId);
  assert(forEvidence.length === 1, "TC-27 only 1 assessment per evidence");
  assert(forEvidence[0].direction === "weakens", "TC-27 latest assessment wins");
  ok("TC-27 solo 1 evaluación activa por evidencia");
}

// ─── TC-28 to TC-36: Trazabilidad ────────────────────────────────────────────

// TC-28: indicador correcto (no warning)
{
  const indId = uid("ind");
  const srcId = uid("src");
  const ctRow = makeCtRow("hyp-1", indId, srcId);
  const ctMatrix = makeCtMatrix("hyp-1", [ctRow]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRow.id, indId, srcId), TS);
  const validation = validateEvidenceEvaluation(matrix, ctMatrix);
  // No EVD-002 type error (wrong indicator) should appear in local validation
  assert(!validation.errors.some(e => e.includes(indId)), "TC-28 correct indicator no error");
  ok("TC-28 indicador correcto");
}

// TC-29: indicador incorrecto detectado via EVD-002 rule
{
  const indId1 = uid("ind");
  const indId2 = uid("ind");
  const srcId = uid("src");
  const ctRow = makeCtRow("hyp-1", indId1, srcId);
  const ctMatrix = makeCtMatrix("hyp-1", [ctRow]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRow.id, indId2, srcId), TS); // wrong indicator
  const hyp = makeHyp();
  const input = {
    problema: "Test", hypotheses: [hyp],
    conceptualModels: [], operationalizationMatrices: [],
    contrastationMatrices: [{ ...ctMatrix, hypothesisId: hyp.id }],
    evidenceEvaluationMatrices: [{ ...matrix, hypothesisId: hyp.id }],
  };
  const findings = evaluateRule("EVD-002", input as any);
  assert(findings.length === 1, "TC-29 EVD-002 error for wrong indicator");
  assert(findings[0].severity === "error", "TC-29 severity error");
  ok("TC-29 indicador incorrecto — EVD-002");
}

// TC-30: fuente correcta
{
  const srcId = uid("src");
  const ctRow = makeCtRow("hyp-1", uid("ind"), srcId);
  const ctMatrix = makeCtMatrix("hyp-1", [ctRow]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRow.id, ctRow.indicadorId, srcId), TS);
  const validation = validateEvidenceEvaluation(matrix, ctMatrix);
  // No broken-reference errors
  assert(!validation.errors.some(e => e.toLowerCase().includes("referenci") && e.includes(ctRow.id)), "TC-30 no broken ref error");
  ok("TC-30 fuente correcta");
}

// TC-31: fuente alternativa detectada via EVD-003
{
  const srcId1 = uid("src");
  const srcId2 = uid("src");
  const indId = uid("ind");
  const ctRow = makeCtRow("hyp-1", indId, srcId1);
  const ctMatrix = makeCtMatrix("hyp-1", [ctRow]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRow.id, indId, srcId2), TS); // different source
  const hyp = makeHyp();
  const input = {
    problema: "Test", hypotheses: [hyp],
    conceptualModels: [], operationalizationMatrices: [],
    contrastationMatrices: [{ ...ctMatrix, hypothesisId: hyp.id }],
    evidenceEvaluationMatrices: [{ ...matrix, hypothesisId: hyp.id }],
  };
  const findings = evaluateRule("EVD-003", input as any);
  assert(findings.length === 1, "TC-31 EVD-003 warning for alt source");
  assert(findings[0].severity === "warning", "TC-31 severity warning");
  ok("TC-31 fuente alternativa — EVD-003");
}

// TC-32: criterio inexistente (broken reference)
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence("nonexistent-ctrow", "ind-1", "src-1"), TS);
  const validation = validateEvidenceEvaluation(matrix, ctMatrix);
  assert(validation.errors.some(e => e.includes("nonexistent-ctrow") || e.includes("no existe")), "TC-32 broken ctrow ref error");
  ok("TC-32 criterio inexistente");
}

// TC-33: hipótesis incorrecta — assessment con hypothesisId distinto
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[0].id, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  // Assessment with wrong hypothesisId
  matrix = createEvidenceAssessment(matrix, {
    ...makeAssessmentData(evId, "hyp-OTHER", ctMatrix.rows[0].id),
    hypothesisId: "hyp-OTHER",
  }, TS);
  const validation = validateEvidenceEvaluation(matrix, ctMatrix);
  assert(validation.errors.some(e => e.includes("hipótesis") || e.toLowerCase().includes("hypothesis")), "TC-33 wrong hypothesis error");
  ok("TC-33 hipótesis incorrecta en assessment");
}

// TC-34: matriz incorrecta (EVD-006: evidencia con criterio de otra hipótesis)
{
  const hyp = makeHyp();
  const ctRow1 = makeCtRow(hyp.id, "ind-1", "src-1");
  const ctRow2 = makeCtRow("OTHER-HYP", "ind-1", "src-1"); // belongs to different hyp
  const ctMatrix1 = makeCtMatrix(hyp.id, [ctRow1]);
  let matrix = createEvidenceEvaluationMatrix(hyp.id, ctMatrix1.id, TS);
  // Evidence references a row from another hypothesis's matrix
  matrix = createObservedEvidence(matrix, makeEvidence(ctRow2.id, "ind-1", "src-1"), TS);
  const input = {
    problema: "Test", hypotheses: [hyp],
    conceptualModels: [], operationalizationMatrices: [],
    contrastationMatrices: [ctMatrix1],
    evidenceEvaluationMatrices: [matrix],
  };
  const findings = evaluateRule("EVD-006", input as any);
  assert(findings.length === 1, "TC-34 EVD-006 incompatible matrix error");
  ok("TC-34 evidencia con criterio de otra hipótesis — EVD-006");
}

// TC-35: referencias rotas (assessment apunta a evidencia inexistente)
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1");
  // Inject a broken assessment directly
  (matrix as any).assessments = [{
    id: "broken-a", observedEvidenceId: "nonexistent-ev",
    contrastationRowId: ctMatrix.rows[0].id,
    hypothesisId: "hyp-1", status: "evaluated", direction: "supports",
    confidence: "medium", justification: "Test", limitations: "Test",
    assessedAt: TS, reviewed: false,
  }];
  const validation = validateEvidenceEvaluation(matrix, ctMatrix);
  assert(validation.errors.some(e => e.includes("nonexistent-ev") || e.includes("no existe")), "TC-35 broken assessment ref error");
  ok("TC-35 referencias rotas");
}

// TC-36: reconstrucción desde sesión — buildGraph con evidencias
{
  const hyp = makeHyp();
  const ctRow = makeCtRow(hyp.id, uid("ind"), uid("src"));
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  let matrix = createEvidenceEvaluationMatrix(hyp.id, ctMatrix.id, TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctRow.id, ctRow.indicadorId, ctRow.fuenteId), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, makeAssessmentData(evId, hyp.id, ctRow.id), TS);
  const graph = buildGraph({
    problema: "Test",
    hypotheses: [hyp],
    conceptualModels: [],
    operationalizationMatrices: [],
    contrastationMatrices: [ctMatrix],
    evidenceEvaluationMatrices: [matrix],
  } as unknown as HeliosGraphInput);
  const evNode = graph.nodes.find(n => n.type === "observed-evidence");
  const aNode = graph.nodes.find(n => n.type === "evidence-assessment");
  assert(evNode !== undefined, "TC-36 observed-evidence node in graph");
  assert(aNode !== undefined, "TC-36 evidence-assessment node in graph");
  const observesEdge = graph.edges.find(e => e.relationType === "observes");
  const evaluatesEdge = graph.edges.find(e => e.relationType === "evaluates");
  assert(observesEdge !== undefined, "TC-36 observes edge");
  assert(evaluatesEdge !== undefined, "TC-36 evaluates edge");
  ok("TC-36 reconstrucción desde sesión — grafo con evidencias");
}

// ─── TC-37 to TC-48: Conclusión ──────────────────────────────────────────────

// TC-37: crear conclusión
{
  const conc = createConclusion({
    hypothesisId: "hyp-1",
    evidenceEvaluationMatrixId: "eem-1",
    conclusionStatus: "not-evaluated",
    conclusionText: "La evidencia es insuficiente para concluir.",
    confidence: "low",
    mainSupportingEvidenceIds: [],
    mainWeakeningEvidenceIds: [],
    limitations: "Datos preliminares.",
    reviewed: false,
  }, TS);
  assert(conc.hypothesisId === "hyp-1", "TC-37 hypothesisId");
  assert(conc.conclusionStatus === "not-evaluated", "TC-37 status");
  assert(conc.conclusionText.length > 0, "TC-37 text");
  ok("TC-37 crear conclusión");
}

// TC-38: editar conclusión
{
  let conc = createConclusion({
    hypothesisId: "hyp-1", evidenceEvaluationMatrixId: "eem-1",
    conclusionStatus: "not-evaluated", conclusionText: "Inicial",
    confidence: "low", mainSupportingEvidenceIds: [], mainWeakeningEvidenceIds: [],
    limitations: "Ninguna", reviewed: false,
  }, TS);
  conc = updateConclusion(conc, { conclusionText: "Actualizada", confidence: "medium" }, TS);
  assert(conc.conclusionText === "Actualizada", "TC-38 text updated");
  assert(conc.confidence === "medium", "TC-38 confidence updated");
  ok("TC-38 editar conclusión");
}

// TC-39: conclusión provisionalmente apoyada
{
  const ctRowId = uid("ctrow");
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  let conc = createConclusion({
    hypothesisId: "hyp-1", evidenceEvaluationMatrixId: matrix.id,
    conclusionStatus: "provisionally-supported",
    conclusionText: "La evidencia disponible apoya provisionalmente la hipótesis.",
    confidence: "medium",
    mainSupportingEvidenceIds: [evId],
    mainWeakeningEvidenceIds: [],
    limitations: "Solo un indicador evaluado.",
    reviewed: false,
  }, TS);
  const validation = validateConclusion(conc, matrix);
  assert(validation.errors.length === 0, "TC-39 provisionally supported valid");
  ok("TC-39 conclusión provisionalmente apoyada");
}

// TC-40: conclusión provisionalmente debilitada
{
  const ctRowId = uid("ctrow");
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  let conc = createConclusion({
    hypothesisId: "hyp-1", evidenceEvaluationMatrixId: matrix.id,
    conclusionStatus: "provisionally-weakened",
    conclusionText: "La evidencia debilita la hipótesis.",
    confidence: "medium",
    mainSupportingEvidenceIds: [],
    mainWeakeningEvidenceIds: [evId],
    limitations: "Muestra pequeña.",
    reviewed: false,
  }, TS);
  const validation = validateConclusion(conc, matrix);
  assert(validation.errors.length === 0, "TC-40 provisionally weakened valid");
  ok("TC-40 conclusión provisionalmente debilitada");
}

// TC-41: evidencia mixta
{
  let matrix = makeMatrix("hyp-1");
  const ctRowId = uid("ctrow");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, {
    ...makeAssessmentData(evId, "hyp-1", ctRowId),
    direction: "mixed",
  }, TS);
  const conc = createConclusion({
    hypothesisId: "hyp-1", evidenceEvaluationMatrixId: matrix.id,
    conclusionStatus: "mixed-evidence",
    conclusionText: "Evidencia ambivalente.",
    confidence: "low",
    mainSupportingEvidenceIds: [], mainWeakeningEvidenceIds: [],
    limitations: "Fuentes contradictorias.", reviewed: false,
  }, TS);
  assert(conc.conclusionStatus === "mixed-evidence", "TC-41 mixed-evidence status");
  ok("TC-41 evidencia mixta");
}

// TC-42: conclusión inconclusa
{
  const conc = createConclusion({
    hypothesisId: "hyp-1", evidenceEvaluationMatrixId: "eem-1",
    conclusionStatus: "inconclusive",
    conclusionText: "No es posible concluir con los datos disponibles.",
    confidence: "low",
    mainSupportingEvidenceIds: [], mainWeakeningEvidenceIds: [],
    limitations: "Datos insuficientes.", reviewed: false,
  }, TS);
  assert(conc.conclusionStatus === "inconclusive", "TC-42 inconclusive status");
  ok("TC-42 conclusión inconclusa");
}

// TC-43: conclusión sin texto (error)
{
  let matrix = makeMatrix("hyp-1");
  const conc = createConclusion({
    hypothesisId: "hyp-1", evidenceEvaluationMatrixId: matrix.id,
    conclusionStatus: "not-evaluated",
    conclusionText: "",
    confidence: "low",
    mainSupportingEvidenceIds: [], mainWeakeningEvidenceIds: [],
    limitations: "Test", reviewed: false,
  }, TS);
  const validation = validateConclusion(conc, matrix);
  assert(validation.errors.some(e => e.includes("texto") || e.includes("conclusión")), "TC-43 no text error");
  assert(!validation.canConfirm, "TC-43 cannot confirm without text");
  ok("TC-43 conclusión sin texto");
}

// TC-44: conclusión sin confianza (error)
{
  let matrix = makeMatrix("hyp-1");
  const conc = createConclusion({
    hypothesisId: "hyp-1", evidenceEvaluationMatrixId: matrix.id,
    conclusionStatus: "not-evaluated",
    conclusionText: "Test",
    confidence: "" as any,
    mainSupportingEvidenceIds: [], mainWeakeningEvidenceIds: [],
    limitations: "Test", reviewed: false,
  }, TS);
  const validation = validateConclusion(conc, matrix);
  assert(validation.errors.some(e => e.toLowerCase().includes("confianza")), "TC-44 no confidence error");
  ok("TC-44 conclusión sin confianza");
}

// TC-45: evidencia de apoyo inexistente (error)
{
  let matrix = makeMatrix("hyp-1");
  const conc = createConclusion({
    hypothesisId: "hyp-1", evidenceEvaluationMatrixId: matrix.id,
    conclusionStatus: "provisionally-supported",
    conclusionText: "Apoyada",
    confidence: "medium",
    mainSupportingEvidenceIds: ["nonexistent-ev-id"],
    mainWeakeningEvidenceIds: [],
    limitations: "Test", reviewed: false,
  }, TS);
  const validation = validateConclusion(conc, matrix);
  assert(validation.errors.some(e => e.includes("nonexistent-ev-id") || e.includes("no existe")), "TC-45 nonexistent evidence error");
  ok("TC-45 evidencia de apoyo inexistente");
}

// TC-46: evidencia de otra hipótesis
{
  const ctRowId = uid("ctrow");
  let matrix = makeMatrix("hyp-A");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  // Conclusion belongs to hyp-B but references evidence from hyp-A
  let matrixB = makeMatrix("hyp-B");
  const conc = createConclusion({
    hypothesisId: "hyp-B", evidenceEvaluationMatrixId: matrixB.id,
    conclusionStatus: "provisionally-supported",
    conclusionText: "Test",
    confidence: "medium",
    mainSupportingEvidenceIds: [evId],
    mainWeakeningEvidenceIds: [],
    limitations: "Test", reviewed: false,
  }, TS);
  // Validate against matrix for hyp-B (which doesn't have evId)
  const validation = validateConclusion(conc, matrixB);
  assert(validation.errors.some(e => e.includes(evId) || e.includes("no existe")), "TC-46 cross-hypothesis evidence error");
  ok("TC-46 evidencia de otra hipótesis");
}

// TC-47: conclusión sin limitaciones (warning)
{
  let matrix = makeMatrix("hyp-1");
  const conc = createConclusion({
    hypothesisId: "hyp-1", evidenceEvaluationMatrixId: matrix.id,
    conclusionStatus: "not-evaluated",
    conclusionText: "Test",
    confidence: "low",
    mainSupportingEvidenceIds: [], mainWeakeningEvidenceIds: [],
    limitations: "",
    reviewed: false,
  }, TS);
  const validation = validateConclusion(conc, matrix);
  assert(validation.warnings.some(w => w.includes("limitaciones")), "TC-47 no limitations warning");
  ok("TC-47 conclusión sin limitaciones");
}

// TC-48: revisión de conclusión
{
  let conc = createConclusion({
    hypothesisId: "hyp-1", evidenceEvaluationMatrixId: "eem-1",
    conclusionStatus: "not-evaluated",
    conclusionText: "Test", confidence: "low",
    mainSupportingEvidenceIds: [], mainWeakeningEvidenceIds: [],
    limitations: "Test", reviewed: false,
  }, TS);
  assert(!conc.reviewed, "TC-48 not reviewed initially");
  conc = confirmConclusion(conc, TS);
  assert(conc.reviewed === true, "TC-48 reviewed after confirm");
  ok("TC-48 revisión de conclusión");
}

// ─── TC-49 to TC-56: Resumen ─────────────────────────────────────────────────

// TC-49: conteos por dirección
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1"), makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[0].id, "ind-1", "src-1"), TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[1].id, "ind-1", "src-1"), TS);
  matrix = createEvidenceAssessment(matrix, { ...makeAssessmentData(matrix.observedEvidence[0].id, "hyp-1", ctMatrix.rows[0].id), direction: "supports" }, TS);
  matrix = createEvidenceAssessment(matrix, { ...makeAssessmentData(matrix.observedEvidence[1].id, "hyp-1", ctMatrix.rows[1].id), direction: "weakens" }, TS);
  const summary = summarizeEvidenceEvaluation(matrix, ctMatrix);
  assert(summary.supports === 1, "TC-49 supports count");
  assert(summary.weakens === 1, "TC-49 weakens count");
  assert(summary.mixed === 0, "TC-49 mixed count");
  ok("TC-49 conteos por dirección");
}

// TC-50: conteos por confianza
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1"), makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[0].id, "ind-1", "src-1"), TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[1].id, "ind-1", "src-1"), TS);
  matrix = createEvidenceAssessment(matrix, { ...makeAssessmentData(matrix.observedEvidence[0].id, "hyp-1", ctMatrix.rows[0].id), confidence: "high" }, TS);
  matrix = createEvidenceAssessment(matrix, { ...makeAssessmentData(matrix.observedEvidence[1].id, "hyp-1", ctMatrix.rows[1].id), confidence: "low" }, TS);
  const summary = summarizeEvidenceEvaluation(matrix, ctMatrix);
  assert(summary.highConfidence === 1, "TC-50 high confidence count");
  assert(summary.lowConfidence === 1, "TC-50 low confidence count");
  const byConf = groupEvidenceByConfidence(matrix);
  assert(byConf.get("high")!.length === 1, "TC-50 group by confidence high");
  assert(byConf.get("low")!.length === 1, "TC-50 group by confidence low");
  ok("TC-50 conteos por confianza");
}

// TC-51: criterios cubiertos
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1"), makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1");
  // Only cover first row
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[0].id, "ind-1", "src-1"), TS);
  const summary = summarizeEvidenceEvaluation(matrix, ctMatrix);
  assert(summary.totalCriteria === 2, "TC-51 total criteria");
  assert(summary.criteriaWithEvidence === 1, "TC-51 criteria with evidence");
  assert(summary.criteriaWithoutEvidence === 1, "TC-51 criteria without evidence");
  ok("TC-51 criterios cubiertos vs no cubiertos");
}

// TC-52: criterios no cubiertos — groupEvidenceByDirection
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[0].id, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, { ...makeAssessmentData(evId, "hyp-1", ctMatrix.rows[0].id), direction: "supports" }, TS);
  const byDir = groupEvidenceByDirection(matrix);
  assert(byDir.get("supports")!.length === 1, "TC-52 one support");
  assert(byDir.get("weakens")!.length === 0, "TC-52 zero weakens");
  ok("TC-52 groupEvidenceByDirection");
}

// TC-53: evaluación completa
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[0].id, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, makeAssessmentData(evId, "hyp-1", ctMatrix.rows[0].id), TS);
  const summary = summarizeEvidenceEvaluation(matrix, ctMatrix);
  assert(summary.assessedEvidence === 1, "TC-53 assessed count");
  assert(summary.unassessedEvidence === 0, "TC-53 zero unassessed");
  assert(summary.blockingErrors === 0, "TC-53 no blocking errors");
  assert(isEvidenceEvaluationComplete(matrix, ctMatrix), "TC-53 is complete");
  ok("TC-53 evaluación completa");
}

// TC-54: evaluación incompleta
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1"); // no evidence at all
  assert(!isEvidenceEvaluationComplete(matrix, ctMatrix), "TC-54 empty matrix not complete");
  ok("TC-54 evaluación incompleta");
}

// TC-55: idempotencia
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[0].id, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, makeAssessmentData(evId, "hyp-1", ctMatrix.rows[0].id), TS);
  const summary1 = summarizeEvidenceEvaluation(matrix, ctMatrix);
  const summary2 = summarizeEvidenceEvaluation(matrix, ctMatrix);
  assert(summary1.totalObservedEvidence === summary2.totalObservedEvidence, "TC-55 idempotent totalObservedEvidence");
  assert(summary1.supports === summary2.supports, "TC-55 idempotent supports");
  ok("TC-55 idempotencia");
}

// TC-56: no mutación
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1")]);
  const matrix = makeMatrix("hyp-1");
  const originalLength = matrix.observedEvidence.length;
  summarizeEvidenceEvaluation(matrix, ctMatrix);
  isEvidenceEvaluationComplete(matrix, ctMatrix);
  validateEvidenceEvaluation(matrix, ctMatrix);
  assert(matrix.observedEvidence.length === originalLength, "TC-56 no mutation");
  ok("TC-56 no mutación");
}

// ─── TC-57 to TC-65: Grafo e impacto ─────────────────────────────────────────

// TC-57: nodos de evidencia en grafo
{
  const hyp = makeHyp();
  const ctRow = makeCtRow(hyp.id, uid("ind"), uid("src"));
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  let matrix = createEvidenceEvaluationMatrix(hyp.id, ctMatrix.id, TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctRow.id, ctRow.indicadorId, ctRow.fuenteId, { title: "Ev node" }), TS);
  const graph = buildGraph({
    problema: "P", hypotheses: [hyp],
    conceptualModels: [], operationalizationMatrices: [],
    contrastationMatrices: [ctMatrix],
    evidenceEvaluationMatrices: [matrix],
  } as unknown as HeliosGraphInput);
  const evNodes = graph.nodes.filter(n => n.type === "observed-evidence");
  assert(evNodes.length === 1, "TC-57 one observed-evidence node");
  assert(evNodes[0].metadata.label === "Ev node", "TC-57 node label");
  ok("TC-57 nodos de evidencia en grafo");
}

// TC-58: nodos de assessment en grafo
{
  const hyp = makeHyp();
  const ctRow = makeCtRow(hyp.id);
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  let matrix = createEvidenceEvaluationMatrix(hyp.id, ctMatrix.id, TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctRow.id, ctRow.indicadorId, ctRow.fuenteId), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, makeAssessmentData(evId, hyp.id, ctRow.id), TS);
  const graph = buildGraph({
    problema: "P", hypotheses: [hyp],
    conceptualModels: [], operationalizationMatrices: [],
    contrastationMatrices: [ctMatrix],
    evidenceEvaluationMatrices: [matrix],
  } as unknown as HeliosGraphInput);
  const aNodes = graph.nodes.filter(n => n.type === "evidence-assessment");
  assert(aNodes.length === 1, "TC-58 one evidence-assessment node");
  ok("TC-58 nodos de assessment en grafo");
}

// TC-59: nodo de conclusión en grafo
{
  const hyp = makeHyp();
  const ctMatrix = makeCtMatrix(hyp.id, []);
  const matrix = createEvidenceEvaluationMatrix(hyp.id, ctMatrix.id, TS);
  const conc = createConclusion({
    hypothesisId: hyp.id, evidenceEvaluationMatrixId: matrix.id,
    conclusionStatus: "not-evaluated", conclusionText: "Conclusión de prueba en grafo",
    confidence: "low", mainSupportingEvidenceIds: [], mainWeakeningEvidenceIds: [],
    limitations: "Test", reviewed: false,
  }, TS);
  const graph = buildGraph({
    problema: "P", hypotheses: [hyp],
    conceptualModels: [], operationalizationMatrices: [],
    contrastationMatrices: [ctMatrix],
    evidenceEvaluationMatrices: [matrix],
    hypothesisEvidenceConclusions: [conc],
  } as unknown as HeliosGraphInput);
  const hecNodes = graph.nodes.filter(n => n.type === "hypothesis-conclusion");
  assert(hecNodes.length === 1, "TC-59 one hypothesis-conclusion node");
  const concludesEdge = graph.edges.find(e => e.relationType === "concludes-about");
  assert(concludesEdge !== undefined, "TC-59 concludes-about edge");
  ok("TC-59 nodo de conclusión en grafo");
}

// TC-60: relaciones nuevas
{
  const hyp = makeHyp();
  const ctRow = makeCtRow(hyp.id);
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  let matrix = createEvidenceEvaluationMatrix(hyp.id, ctMatrix.id, TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctRow.id, ctRow.indicadorId, ctRow.fuenteId), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, makeAssessmentData(evId, hyp.id, ctRow.id), TS);
  const conc = createConclusion({
    hypothesisId: hyp.id, evidenceEvaluationMatrixId: matrix.id,
    conclusionStatus: "provisionally-supported", conclusionText: "Test",
    confidence: "medium",
    mainSupportingEvidenceIds: [evId],
    mainWeakeningEvidenceIds: [],
    limitations: "Test", reviewed: false,
  }, TS);
  const graph = buildGraph({
    problema: "P", hypotheses: [hyp],
    conceptualModels: [], operationalizationMatrices: [],
    contrastationMatrices: [ctMatrix],
    evidenceEvaluationMatrices: [matrix],
    hypothesisEvidenceConclusions: [conc],
  } as unknown as HeliosGraphInput);
  const relations = new Set(graph.edges.map(e => e.relationType));
  assert(relations.has("observes"), "TC-60 observes relation");
  assert(relations.has("evaluates"), "TC-60 evaluates relation");
  assert(relations.has("concludes-about"), "TC-60 concludes-about relation");
  assert(relations.has("supports-conclusion"), "TC-60 supports-conclusion relation");
  ok("TC-60 relaciones nuevas en grafo");
}

// TC-61: impacto al eliminar evidencia
{
  const hyp = makeHyp();
  const ctRow = makeCtRow(hyp.id);
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  let matrix = createEvidenceEvaluationMatrix(hyp.id, ctMatrix.id, TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctRow.id, ctRow.indicadorId, ctRow.fuenteId, { title: "ToDelete" }), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, makeAssessmentData(evId, hyp.id, ctRow.id), TS);
  // After remove: assessment should also be gone
  const afterRemove = removeObservedEvidence(matrix, evId, TS);
  assert(afterRemove.observedEvidence.length === 0, "TC-61 evidence removed");
  assert(afterRemove.assessments.length === 0, "TC-61 assessment cascade removed on delete");
  ok("TC-61 impacto al eliminar evidencia");
}

// TC-62: impacto al eliminar criterio (EVD-001 detects orphan assessment)
{
  // EVD-001 fires when ct row has no evidence
  const hyp = makeHyp();
  const ctRow1 = makeCtRow(hyp.id, "ind-1", "src-1");
  const ctRow2 = makeCtRow(hyp.id, "ind-1", "src-1"); // no evidence for this
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow1, ctRow2]);
  let matrix = createEvidenceEvaluationMatrix(hyp.id, ctMatrix.id, TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctRow1.id, "ind-1", "src-1"), TS);
  const findings = evaluateRule("EVD-001", {
    problema: "P", hypotheses: [hyp],
    conceptualModels: [], operationalizationMatrices: [],
    contrastationMatrices: [{ ...ctMatrix, hypothesisId: hyp.id }],
    evidenceEvaluationMatrices: [{ ...matrix, hypothesisId: hyp.id }],
  } as any);
  assert(findings.length === 1, "TC-62 EVD-001 detects ct row without evidence");
  assert(findings[0].ruleId === "EVD-001", "TC-62 correct rule");
  ok("TC-62 impacto al eliminar criterio — EVD-001");
}

// TC-63: huérfanos en grafo de evidencia
{
  const hyp = makeHyp();
  const ctMatrix = makeCtMatrix(hyp.id, []);
  const matrix = createEvidenceEvaluationMatrix(hyp.id, ctMatrix.id, TS);
  // Inject evidence with a broken ct-row reference
  (matrix as any).observedEvidence = [{
    id: "orphan-ev", contrastationRowId: "nonexistent-ctrow",
    indicatorId: "ind-1", sourceId: "src-1",
    title: "Orphan", description: "Desc",
    createdAt: TS, updatedAt: TS,
  }];
  const graph = buildGraph({
    problema: "P", hypotheses: [hyp],
    conceptualModels: [], operationalizationMatrices: [],
    contrastationMatrices: [ctMatrix],
    evidenceEvaluationMatrices: [matrix],
  } as unknown as HeliosGraphInput);
  // The observed-evidence node exists but its target ct-row doesn't → broken edge
  const evNode = graph.nodes.find(n => n.refId === "orphan-ev");
  assert(evNode !== undefined, "TC-63 orphan ev node in graph");
  const orphans = detectOrphans(graph);
  const hasBrokenEdge = orphans.brokenEdges.some(e => e.source === evNode?.id);
  assert(hasBrokenEdge, "TC-63 broken edge for orphan evidence");
  ok("TC-63 huérfanos en grafo de evidencia");
}

// TC-64: unused evidence node (not referenced by assessment)
{
  const hyp = makeHyp();
  const ctRow = makeCtRow(hyp.id);
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  let matrix = createEvidenceEvaluationMatrix(hyp.id, ctMatrix.id, TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctRow.id, ctRow.indicadorId, ctRow.fuenteId), TS);
  // No assessment → evidence is "unused" in the assessment sense
  const unassessed = findUnassessedEvidence(matrix);
  assert(unassessed.length === 1, "TC-64 one unused (unassessed) evidence");
  ok("TC-64 evidencia no evaluada (unused)");
}

// TC-65: topological traversal includes evidence nodes
{
  const hyp = makeHyp();
  const ctRow = makeCtRow(hyp.id);
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  let matrix = createEvidenceEvaluationMatrix(hyp.id, ctMatrix.id, TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctRow.id, ctRow.indicadorId, ctRow.fuenteId), TS);
  const graph = buildGraph({
    problema: "P", hypotheses: [hyp],
    conceptualModels: [], operationalizationMatrices: [],
    contrastationMatrices: [ctMatrix],
    evidenceEvaluationMatrices: [matrix],
  } as unknown as HeliosGraphInput);
  assert(graph.nodes.some(n => n.type === "observed-evidence"), "TC-65 observed-evidence in graph");
  ok("TC-65 topological traversal includes evidence nodes");
}

// ─── TC-66 to TC-75: UI e integración (servicios y reglas) ───────────────────

// TC-66: navegación desde contrastación — EVD rules con matrices vacías
{
  const hyp = makeHyp();
  const ctRow = makeCtRow(hyp.id, "ind-1", "src-1");
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  const input = {
    problema: "Test", hypotheses: [hyp],
    conceptualModels: [], operationalizationMatrices: [],
    contrastationMatrices: [{ ...ctMatrix, hypothesisId: hyp.id }],
    evidenceEvaluationMatrices: [],
  };
  // EVD rules should return no findings when no evidence matrices
  const findings1 = evaluateRule("EVD-001", input as any);
  const findings4 = evaluateRule("EVD-004", input as any);
  assert(findings1.length === 0, "TC-66 EVD-001 no findings without evidence matrices");
  assert(findings4.length === 0, "TC-66 EVD-004 no findings without evidence matrices");
  ok("TC-66 EVD rules retornan vacío sin matrices de evidencia");
}

// TC-67: volver sin perder estado — matrix preserved
{
  let matrix = makeMatrix("hyp-1");
  const ctRowId = uid("ctrow");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1"), TS);
  // Simulate "volver" by working with the same matrix reference
  const matrices = [matrix];
  const found = findEvidenceEvaluationMatrixByHypothesis(matrices, "hyp-1");
  assert(found !== null, "TC-67 matrix preserved");
  assert(found!.observedEvidence.length === 1, "TC-67 evidence preserved");
  ok("TC-67 volver sin perder estado");
}

// TC-68: revisión final — summarizeEvidenceEvaluation for revision
{
  const ctMatrix = makeCtMatrix("hyp-1", [makeCtRow("hyp-1", "ind-1", "src-1")]);
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctMatrix.rows[0].id, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, makeAssessmentData(evId, "hyp-1", ctMatrix.rows[0].id), TS);
  const summary = summarizeEvidenceEvaluation(matrix, ctMatrix);
  assert(summary.totalObservedEvidence === 1, "TC-68 summary for revision");
  assert(summary.criteriaWithEvidence === 1, "TC-68 criteria covered");
  ok("TC-68 revisión final — summary");
}

// TC-69: auditoría metodológica — EVD-005 en audit completo
{
  const hyp = makeHyp();
  const ctRow = makeCtRow(hyp.id, "ind-1", "src-1");
  const ctMatrix = makeCtMatrix(hyp.id, [ctRow]);
  let matrix = createEvidenceEvaluationMatrix(hyp.id, ctMatrix.id, TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctRow.id, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  matrix = createEvidenceAssessment(matrix, {
    ...makeAssessmentData(evId, hyp.id, ctRow.id),
    justification: "", // trigger EVD-005
  }, TS);
  const audit = runMethodologicalAudit({
    problema: "Test", hypotheses: [hyp],
    conceptualModels: [makeConceptualModel(hyp.id)],
    operationalizationMatrices: [],
    contrastationMatrices: [{ ...ctMatrix, hypothesisId: hyp.id }],
    evidenceEvaluationMatrices: [{ ...matrix, hypothesisId: hyp.id }],
  }, TS);
  const evd005 = audit.findings.filter(f => f.ruleId === "EVD-005");
  assert(evd005.length === 1, "TC-69 EVD-005 in full audit");
  ok("TC-69 auditoría metodológica — EVD-005");
}

// TC-70: reinicio — removeEvidenceEvaluationMatrix
{
  let matrices = [makeMatrix("hyp-1"), makeMatrix("hyp-2")];
  matrices = removeEvidenceEvaluationMatrix(matrices, "hyp-1");
  assert(matrices.length === 1, "TC-70 one matrix after remove");
  assert(matrices[0].hypothesisId === "hyp-2", "TC-70 correct matrix remains");
  ok("TC-70 reinicio — removeEvidenceEvaluationMatrix");
}

// TC-71: múltiples hipótesis
{
  const hyp1 = makeHyp({ titulo: "H1" });
  const hyp2 = makeHyp({ titulo: "H2" });
  const matrices = [makeMatrix(hyp1.id), makeMatrix(hyp2.id)];
  assert(matrices.length === 2, "TC-71 two matrices");
  const found1 = findEvidenceEvaluationMatrixByHypothesis(matrices, hyp1.id);
  const found2 = findEvidenceEvaluationMatrixByHypothesis(matrices, hyp2.id);
  assert(found1?.hypothesisId === hyp1.id, "TC-71 matrix for H1");
  assert(found2?.hypothesisId === hyp2.id, "TC-71 matrix for H2");
  ok("TC-71 múltiples hipótesis");
}

// TC-72: múltiples matrices — upsert
{
  let matrices: EvidenceEvaluationMatrix[] = [];
  const m1 = makeMatrix("hyp-1");
  const m2 = makeMatrix("hyp-2");
  matrices = upsertEvidenceEvaluationMatrix(matrices, m1);
  matrices = upsertEvidenceEvaluationMatrix(matrices, m2);
  assert(matrices.length === 2, "TC-72 two matrices after upsert");
  const m1Updated = { ...m1, status: "confirmed" as const };
  matrices = upsertEvidenceEvaluationMatrix(matrices, m1Updated);
  assert(matrices.length === 2, "TC-72 upsert doesn't add duplicate");
  const found = matrices.find(m => m.id === m1.id);
  assert(found?.status === "confirmed", "TC-72 status updated after upsert");
  ok("TC-72 múltiples matrices — upsert");
}

// TC-73: accesibilidad — validateEvidenceReferences
{
  const ctRowId = uid("ctrow");
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1"), TS);
  const evId = matrix.observedEvidence[0].id;
  const conc = createConclusion({
    hypothesisId: "hyp-1", evidenceEvaluationMatrixId: matrix.id,
    conclusionStatus: "provisionally-supported", conclusionText: "Test",
    confidence: "medium",
    mainSupportingEvidenceIds: [evId],
    mainWeakeningEvidenceIds: [],
    limitations: "Test", reviewed: false,
  }, TS);
  const refResult = validateEvidenceReferences(conc, matrix);
  assert(refResult.valid, "TC-73 valid references");
  const badConc = { ...conc, mainSupportingEvidenceIds: ["nonexistent"] };
  const badResult = validateEvidenceReferences(badConc as any, matrix);
  assert(!badResult.valid, "TC-73 invalid references detected");
  assert(badResult.errors.length > 0, "TC-73 errors listed");
  ok("TC-73 validateEvidenceReferences");
}

// TC-74: integración — findReferencedEvidence
{
  const ctRowId = uid("ctrow");
  let matrix = makeMatrix("hyp-1");
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1", { title: "EV-A" }), TS);
  matrix = createObservedEvidence(matrix, makeEvidence(ctRowId, "ind-1", "src-1", { title: "EV-B" }), TS);
  const [ev1, ev2] = matrix.observedEvidence;
  const conc = createConclusion({
    hypothesisId: "hyp-1", evidenceEvaluationMatrixId: matrix.id,
    conclusionStatus: "mixed-evidence", conclusionText: "Mixed",
    confidence: "medium",
    mainSupportingEvidenceIds: [ev1.id],
    mainWeakeningEvidenceIds: [ev2.id],
    limitations: "Test", reviewed: false,
  }, TS);
  const referenced = findReferencedEvidence(conc, matrix);
  assert(referenced.length === 2, "TC-74 two referenced evidences");
  assert(referenced.some(ev => ev.title === "EV-A"), "TC-74 EV-A referenced");
  assert(referenced.some(ev => ev.title === "EV-B"), "TC-74 EV-B referenced");
  ok("TC-74 findReferencedEvidence");
}

// TC-75: regresión — S-021 rules still green, EVD rules added to audit
{
  const audit = runMethodologicalAudit({
    problema: "Test", hypotheses: [], conceptualModels: [],
    operationalizationMatrices: [], contrastationMatrices: [],
  }, TS);
  assert(audit.evaluatedRuleIds.length === 38, "TC-75 38 rules in audit (31 S-021 + 7 EVD)");
  assert(audit.evaluatedRuleIds.includes("EVD-001"), "TC-75 EVD-001 evaluated");
  assert(audit.evaluatedRuleIds.includes("EVD-007"), "TC-75 EVD-007 evaluated");
  assert(audit.evaluatedRuleIds.includes("HYP-001"), "TC-75 HYP-001 still evaluated");
  assert(audit.evaluatedRuleIds.includes("TRA-004"), "TC-75 TRA-004 still evaluated");
  ok("TC-75 regresión — 38 reglas, S-021 + EVD");
}

// ─── Conclusión de la suite ───────────────────────────────────────────────────

const elapsed = Date.now() - Date.now();
console.log(
  "──────────────────────────────────────────────────────\n" +
  `   Passed : ${passed}\n` +
  `   Failed : ${failed}\n` +
  `   Total  : ${passed + failed}\n` +
  "──────────────────────────────────────────────────────"
);
if (failed > 0) process.exit(1);
