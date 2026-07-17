/**
 * S-022 — EvidenceEvaluationService
 *
 * Servicio puro para gestión de evidencia observada y su evaluación.
 * Todas las funciones son puras: no mutan argumentos, no acceden a UI ni almacenamiento.
 *
 * Principios (ADR-0011):
 *  - La evidencia observada y su evaluación permanecen separadas.
 *  - HELIOS no asigna automáticamente resultados, dirección ni confianza.
 *  - Toda valoración es atribuible al usuario, explícita y revisable.
 */

import type {
  ObservedEvidence,
  EvidenceAssessment,
  EvidenceEvaluationMatrix,
  EvidenceEvaluationValidation,
  EvidenceEvaluationSummary,
  EvidenceDirection,
  EvidenceConfidenceLevel,
} from "./types";
import type { ContrastationMatrix } from "@/contrastation/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Matrix lifecycle ─────────────────────────────────────────────────────────

export function createEvidenceEvaluationMatrix(
  hypothesisId: string,
  contrastationMatrixId: string,
  now?: string
): EvidenceEvaluationMatrix {
  const ts = now ?? nowISO();
  return {
    id: uid("eem"),
    hypothesisId,
    contrastationMatrixId,
    observedEvidence: [],
    assessments: [],
    status: "draft",
    createdAt: ts,
    updatedAt: ts,
  };
}

// ─── ObservedEvidence CRUD ────────────────────────────────────────────────────

export function createObservedEvidence(
  matrix: EvidenceEvaluationMatrix,
  data: Omit<ObservedEvidence, "id" | "createdAt" | "updatedAt">,
  now?: string
): EvidenceEvaluationMatrix {
  const ts = now ?? nowISO();
  const evidence: ObservedEvidence = {
    ...data,
    id: uid("oe"),
    createdAt: ts,
    updatedAt: ts,
  };
  return {
    ...matrix,
    observedEvidence: [...matrix.observedEvidence, evidence],
    updatedAt: ts,
  };
}

export function updateObservedEvidence(
  matrix: EvidenceEvaluationMatrix,
  id: string,
  updates: Partial<Omit<ObservedEvidence, "id" | "contrastationRowId" | "createdAt">>,
  now?: string
): EvidenceEvaluationMatrix {
  const ts = now ?? nowISO();
  return {
    ...matrix,
    observedEvidence: matrix.observedEvidence.map((ev) =>
      ev.id === id ? { ...ev, ...updates, updatedAt: ts } : ev
    ),
    updatedAt: ts,
  };
}

export function removeObservedEvidence(
  matrix: EvidenceEvaluationMatrix,
  id: string,
  now?: string
): EvidenceEvaluationMatrix {
  const ts = now ?? nowISO();
  return {
    ...matrix,
    observedEvidence: matrix.observedEvidence.filter((ev) => ev.id !== id),
    // Also remove assessments for this evidence
    assessments: matrix.assessments.filter((a) => a.observedEvidenceId !== id),
    updatedAt: ts,
  };
}

export function reorderObservedEvidence(
  matrix: EvidenceEvaluationMatrix,
  fromIndex: number,
  toIndex: number,
  now?: string
): EvidenceEvaluationMatrix {
  const ts = now ?? nowISO();
  const arr = [...matrix.observedEvidence];
  const [moved] = arr.splice(fromIndex, 1);
  if (!moved) return matrix;
  arr.splice(toIndex, 0, moved);
  return { ...matrix, observedEvidence: arr, updatedAt: ts };
}

// ─── EvidenceAssessment CRUD ──────────────────────────────────────────────────

export function createEvidenceAssessment(
  matrix: EvidenceEvaluationMatrix,
  data: Omit<EvidenceAssessment, "id" | "assessedAt">,
  now?: string
): EvidenceEvaluationMatrix {
  const ts = now ?? nowISO();
  const assessment: EvidenceAssessment = {
    ...data,
    id: uid("ea"),
    assessedAt: ts,
  };
  // Remove any existing assessment for the same evidence (1 active per evidence)
  const withoutOld = matrix.assessments.filter(
    (a) => a.observedEvidenceId !== data.observedEvidenceId
  );
  return {
    ...matrix,
    assessments: [...withoutOld, assessment],
    updatedAt: ts,
  };
}

export function updateEvidenceAssessment(
  matrix: EvidenceEvaluationMatrix,
  id: string,
  updates: Partial<Omit<EvidenceAssessment, "id" | "observedEvidenceId" | "assessedAt">>,
  now?: string
): EvidenceEvaluationMatrix {
  const ts = now ?? nowISO();
  return {
    ...matrix,
    assessments: matrix.assessments.map((a) =>
      a.id === id ? { ...a, ...updates, assessedAt: ts } : a
    ),
    updatedAt: ts,
  };
}

export function removeEvidenceAssessment(
  matrix: EvidenceEvaluationMatrix,
  id: string,
  now?: string
): EvidenceEvaluationMatrix {
  const ts = now ?? nowISO();
  return {
    ...matrix,
    assessments: matrix.assessments.filter((a) => a.id !== id),
    updatedAt: ts,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function findEvidenceByContrastationRow(
  matrix: EvidenceEvaluationMatrix,
  ctRowId: string
): ObservedEvidence[] {
  return matrix.observedEvidence.filter((ev) => ev.contrastationRowId === ctRowId);
}

export function findAssessmentByEvidence(
  matrix: EvidenceEvaluationMatrix,
  evidenceId: string
): EvidenceAssessment | null {
  return matrix.assessments.find((a) => a.observedEvidenceId === evidenceId) ?? null;
}

export function findUnassessedEvidence(
  matrix: EvidenceEvaluationMatrix
): ObservedEvidence[] {
  const assessedEvidenceIds = new Set(matrix.assessments.map((a) => a.observedEvidenceId));
  return matrix.observedEvidence.filter((ev) => !assessedEvidenceIds.has(ev.id));
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates a matrix for completeness and consistency.
 * Blocking errors prevent confirmation; warnings allow saving.
 */
export function validateEvidenceEvaluation(
  matrix: EvidenceEvaluationMatrix,
  contrastationMatrix: ContrastationMatrix
): EvidenceEvaluationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // ── Blocking errors ──────────────────────────────────────────────────────────

  // Matriz sin evidencias
  if (matrix.observedEvidence.length === 0) {
    errors.push("La matriz no tiene evidencias observadas registradas.");
  }

  const evidenceIds = new Set(matrix.observedEvidence.map((ev) => ev.id));

  for (const ev of matrix.observedEvidence) {
    // Evidencia sin criterio de contrastación
    if (!ev.contrastationRowId) {
      errors.push(`Evidencia "${ev.title || ev.id}" no tiene criterio de contrastación.`);
    }
    // Evidencia sin indicador
    if (!ev.indicatorId) {
      errors.push(`Evidencia "${ev.title || ev.id}" no tiene indicador asignado.`);
    }
    // Evidencia sin fuente
    if (!ev.sourceId) {
      errors.push(`Evidencia "${ev.title || ev.id}" no tiene fuente asignada.`);
    }
    // Evidencia sin título
    if (!ev.title.trim()) {
      errors.push(`Una evidencia no tiene título. ID: ${ev.id}`);
    }
    // Evidencia sin descripción
    if (!ev.description.trim()) {
      errors.push(`Evidencia "${ev.title || ev.id}" no tiene descripción.`);
    }
    // Referencia rota: criterio no existe
    if (
      ev.contrastationRowId &&
      !contrastationMatrix.rows.some((r) => r.id === ev.contrastationRowId)
    ) {
      errors.push(
        `Evidencia "${ev.title || ev.id}" referencia un criterio de contrastación que no existe (${ev.contrastationRowId}).`
      );
    }
  }

  for (const assessment of matrix.assessments) {
    // Assessment asociado a evidencia inexistente
    if (!evidenceIds.has(assessment.observedEvidenceId)) {
      errors.push(
        `Evaluación ${assessment.id} referencia una evidencia que no existe (${assessment.observedEvidenceId}).`
      );
    }
    // Assessment asociado a otra hipótesis
    if (assessment.hypothesisId !== matrix.hypothesisId) {
      errors.push(
        `Evaluación ${assessment.id} pertenece a una hipótesis diferente a la de la matriz.`
      );
    }
    // Assessment sin dirección
    if (!assessment.direction) {
      errors.push(`Una evaluación no tiene dirección asignada. ID: ${assessment.id}`);
    }
    // Assessment sin confianza
    if (!assessment.confidence) {
      errors.push(`Evaluación ${assessment.id} no tiene nivel de confianza.`);
    }
    // Assessment sin justificación
    if (!assessment.justification.trim()) {
      errors.push(`Evaluación ${assessment.id} no tiene justificación.`);
    }
  }

  // Evidencia evaluada (status="evaluated") sin assessment
  for (const ev of matrix.observedEvidence) {
    const hasAssessment = matrix.assessments.some((a) => a.observedEvidenceId === ev.id);
    // If marked as evaluated but no assessment, that's a blocking error
    if (!hasAssessment && findAssessmentByEvidence(matrix, ev.id) === null) {
      // This is reported as a warning below (not blocking)
    }
  }

  // ── Warnings ─────────────────────────────────────────────────────────────────

  for (const ev of matrix.observedEvidence) {
    const noDate = !ev.observationDate && !ev.periodStart && !ev.periodEnd;
    if (noDate) {
      warnings.push(`Evidencia "${ev.title || ev.id}" no tiene fecha ni período.`);
    }
    if (!ev.sourceReference) {
      warnings.push(`Evidencia "${ev.title || ev.id}" no tiene referencia específica.`);
    }
    const assessment = findAssessmentByEvidence(matrix, ev.id);
    if (!assessment) {
      warnings.push(`Evidencia "${ev.title || ev.id}" no tiene evaluación.`);
    } else {
      if (!assessment.limitations.trim()) {
        warnings.push(`Evaluación de "${ev.title || ev.id}" no tiene limitaciones documentadas.`);
      }
      if (!assessment.alternativeInterpretations) {
        warnings.push(`Evaluación de "${ev.title || ev.id}" no documenta interpretaciones alternativas.`);
      }
      if (!assessment.additionalEvidenceNeeded) {
        warnings.push(`Evaluación de "${ev.title || ev.id}" no documenta evidencia adicional necesaria.`);
      }
      if (
        (assessment.direction === "supports" || assessment.direction === "weakens") &&
        assessment.confidence === "low"
      ) {
        warnings.push(
          `Evaluación de "${ev.title || ev.id}": dirección ${assessment.direction} con confianza baja — revisar.`
        );
      }
    }
  }

  // Criterios sin evidencia
  for (const row of contrastationMatrix.rows) {
    const hasEvidence = matrix.observedEvidence.some(
      (ev) => ev.contrastationRowId === row.id
    );
    if (!hasEvidence) {
      warnings.push(`Criterio de contrastación ${row.id} no tiene evidencias observadas.`);
    }
  }

  // Referencias duplicadas
  const refs = matrix.observedEvidence
    .map((ev) => ev.sourceReference)
    .filter(Boolean) as string[];
  const refCounts = new Map<string, number>();
  for (const ref of refs) refCounts.set(ref, (refCounts.get(ref) ?? 0) + 1);
  for (const [ref, count] of refCounts) {
    if (count > 1) {
      warnings.push(`La referencia "${ref}" aparece en ${count} evidencias — verificar duplicación.`);
    }
  }

  // ── Sugerencias ───────────────────────────────────────────────────────────────

  for (const ev of matrix.observedEvidence) {
    // Evidencia cuantitativa (tiene valor) sin unidad
    if (ev.observedValue && !ev.observedUnit) {
      suggestions.push(`Evidencia "${ev.title || ev.id}" tiene valor observado pero no tiene unidad.`);
    }
    // Evidencia cualitativa sin contexto poblacional
    if (!ev.observedValue && !ev.population && !ev.location) {
      suggestions.push(
        `Evidencia "${ev.title || ev.id}" es cualitativa pero no tiene contexto poblacional ni territorial.`
      );
    }
    const assessment = findAssessmentByEvidence(matrix, ev.id);
    if (assessment) {
      if (assessment.direction === "inconclusive" && !assessment.additionalEvidenceNeeded) {
        suggestions.push(
          `Evaluación de "${ev.title || ev.id}" es inconclusa — documentar qué información falta.`
        );
      }
      if (!assessment.reviewed) {
        suggestions.push(`Evaluación de "${ev.title || ev.id}" no ha sido revisada.`);
      }
    }
  }

  return {
    errors,
    warnings,
    suggestions,
    valid: errors.length === 0,
    canConfirm: errors.length === 0,
  };
}

export function confirmEvidenceEvaluationMatrix(
  matrix: EvidenceEvaluationMatrix,
  now?: string
): EvidenceEvaluationMatrix {
  const ts = now ?? nowISO();
  return {
    ...matrix,
    status: "confirmed",
    confirmedAt: ts,
    updatedAt: ts,
  };
}

// ─── Summary and grouping ─────────────────────────────────────────────────────

export function summarizeEvidenceEvaluation(
  matrix: EvidenceEvaluationMatrix,
  contrastationMatrix: ContrastationMatrix
): EvidenceEvaluationSummary {
  const totalCriteria = contrastationMatrix.rows.length;
  const criteriaWithEvidence = contrastationMatrix.rows.filter((row) =>
    matrix.observedEvidence.some((ev) => ev.contrastationRowId === row.id)
  ).length;

  const totalObservedEvidence = matrix.observedEvidence.length;
  const assessedEvidenceIds = new Set(matrix.assessments.map((a) => a.observedEvidenceId));
  const assessedEvidence = matrix.observedEvidence.filter((ev) =>
    assessedEvidenceIds.has(ev.id)
  ).length;

  const directionCounts = { supports: 0, weakens: 0, mixed: 0, inconclusive: 0, "not-applicable": 0 };
  const confidenceCounts = { low: 0, medium: 0, high: 0 };

  for (const a of matrix.assessments) {
    if (a.direction in directionCounts) directionCounts[a.direction]++;
    if (a.confidence in confidenceCounts) confidenceCounts[a.confidence]++;
  }

  const validation = validateEvidenceEvaluation(matrix, contrastationMatrix);

  return {
    totalCriteria,
    criteriaWithEvidence,
    criteriaWithoutEvidence: totalCriteria - criteriaWithEvidence,
    totalObservedEvidence,
    assessedEvidence,
    unassessedEvidence: totalObservedEvidence - assessedEvidence,
    supports:    directionCounts.supports,
    weakens:     directionCounts.weakens,
    mixed:       directionCounts.mixed,
    inconclusive: directionCounts.inconclusive,
    notApplicable: directionCounts["not-applicable"],
    lowConfidence:    confidenceCounts.low,
    mediumConfidence: confidenceCounts.medium,
    highConfidence:   confidenceCounts.high,
    blockingErrors: validation.errors.length,
    warnings:       validation.warnings.length,
    complete: validation.errors.length === 0 && assessedEvidence === totalObservedEvidence && totalObservedEvidence > 0,
  };
}

export function groupEvidenceByDirection(
  matrix: EvidenceEvaluationMatrix
): Map<EvidenceDirection, ObservedEvidence[]> {
  const result = new Map<EvidenceDirection, ObservedEvidence[]>([
    ["supports", []],
    ["weakens", []],
    ["mixed", []],
    ["inconclusive", []],
    ["not-applicable", []],
  ]);
  for (const ev of matrix.observedEvidence) {
    const assessment = findAssessmentByEvidence(matrix, ev.id);
    if (assessment) {
      result.get(assessment.direction)!.push(ev);
    }
  }
  return result;
}

export function groupEvidenceByConfidence(
  matrix: EvidenceEvaluationMatrix
): Map<EvidenceConfidenceLevel, EvidenceAssessment[]> {
  const result = new Map<EvidenceConfidenceLevel, EvidenceAssessment[]>([
    ["low", []],
    ["medium", []],
    ["high", []],
  ]);
  for (const a of matrix.assessments) {
    result.get(a.confidence)!.push(a);
  }
  return result;
}

export function isEvidenceEvaluationComplete(
  matrix: EvidenceEvaluationMatrix,
  contrastationMatrix: ContrastationMatrix
): boolean {
  if (matrix.observedEvidence.length === 0) return false;
  const summary = summarizeEvidenceEvaluation(matrix, contrastationMatrix);
  return summary.complete && summary.blockingErrors === 0;
}

// ─── Session helpers ──────────────────────────────────────────────────────────

export function upsertEvidenceEvaluationMatrix(
  matrices: EvidenceEvaluationMatrix[],
  matrix: EvidenceEvaluationMatrix
): EvidenceEvaluationMatrix[] {
  const exists = matrices.some((m) => m.id === matrix.id);
  if (exists) {
    return matrices.map((m) => (m.id === matrix.id ? matrix : m));
  }
  return [...matrices, matrix];
}

export function findEvidenceEvaluationMatrixByHypothesis(
  matrices: EvidenceEvaluationMatrix[],
  hypothesisId: string
): EvidenceEvaluationMatrix | null {
  return matrices.find((m) => m.hypothesisId === hypothesisId) ?? null;
}

export function removeEvidenceEvaluationMatrix(
  matrices: EvidenceEvaluationMatrix[],
  hypothesisId: string
): EvidenceEvaluationMatrix[] {
  return matrices.filter((m) => m.hypothesisId !== hypothesisId);
}
