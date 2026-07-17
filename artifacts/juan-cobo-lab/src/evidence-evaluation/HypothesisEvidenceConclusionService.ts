/**
 * S-022 — HypothesisEvidenceConclusionService
 *
 * Servicio puro para gestión de conclusiones metodológicas de hipótesis.
 * La conclusión la formula el usuario — HELIOS no la produce automáticamente.
 *
 * Principios (ADR-0011):
 *  - "supports" ≠ prueba definitiva
 *  - "weakens" ≠ refutación definitiva
 *  - "confidence" ≠ probabilidad estadística
 *  - HELIOS no determina causalidad
 */

import type {
  HypothesisEvidenceConclusion,
  EvidenceEvaluationMatrix,
  ObservedEvidence,
  ConclusionValidation,
  EvidenceConfidenceLevel,
} from "./types";
import { findAssessmentByEvidence } from "./EvidenceEvaluationService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Conclusión lifecycle ─────────────────────────────────────────────────────

export function createConclusion(
  data: Omit<HypothesisEvidenceConclusion, "id" | "createdAt" | "updatedAt">,
  now?: string
): HypothesisEvidenceConclusion {
  const ts = now ?? nowISO();
  return {
    ...data,
    id: uid("hec"),
    createdAt: ts,
    updatedAt: ts,
  };
}

export function updateConclusion(
  conclusion: HypothesisEvidenceConclusion,
  updates: Partial<Omit<HypothesisEvidenceConclusion, "id" | "hypothesisId" | "createdAt">>,
  now?: string
): HypothesisEvidenceConclusion {
  const ts = now ?? nowISO();
  return { ...conclusion, ...updates, updatedAt: ts };
}

export function confirmConclusion(
  conclusion: HypothesisEvidenceConclusion,
  now?: string
): HypothesisEvidenceConclusion {
  const ts = now ?? nowISO();
  return { ...conclusion, reviewed: true, updatedAt: ts };
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateConclusion(
  conclusion: HypothesisEvidenceConclusion,
  matrix: EvidenceEvaluationMatrix
): ConclusionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const evidenceIds = new Set(matrix.observedEvidence.map((ev) => ev.id));

  // ── Blocking errors ──────────────────────────────────────────────────────────

  // Conclusión sin texto
  if (!conclusion.conclusionText.trim()) {
    errors.push("La conclusión no tiene texto. El investigador debe formular la conclusión.");
  }

  // Conclusión sin confianza
  if (!conclusion.confidence) {
    errors.push("La conclusión no tiene nivel de confianza declarado.");
  }

  // Conclusión sin matriz
  if (!conclusion.evidenceEvaluationMatrixId) {
    errors.push("La conclusión no está asociada a una matriz de evaluación.");
  }

  // Conclusión apoyada sin evidencia de apoyo
  if (
    conclusion.conclusionStatus === "provisionally-supported" &&
    conclusion.mainSupportingEvidenceIds.length === 0
  ) {
    errors.push(
      "La conclusión está marcada como provisionalmente apoyada pero no tiene evidencias de apoyo seleccionadas."
    );
  }

  // Conclusión debilitada sin evidencia de debilitamiento
  if (
    conclusion.conclusionStatus === "provisionally-weakened" &&
    conclusion.mainWeakeningEvidenceIds.length === 0
  ) {
    errors.push(
      "La conclusión está marcada como provisionalmente debilitada pero no tiene evidencias de debilitamiento seleccionadas."
    );
  }

  // Referencia a evidencia inexistente
  for (const id of conclusion.mainSupportingEvidenceIds) {
    if (!evidenceIds.has(id)) {
      errors.push(
        `La conclusión referencia evidencia de apoyo que no existe en la matriz: ${id}`
      );
    }
  }
  for (const id of conclusion.mainWeakeningEvidenceIds) {
    if (!evidenceIds.has(id)) {
      errors.push(
        `La conclusión referencia evidencia de debilitamiento que no existe en la matriz: ${id}`
      );
    }
  }

  // Evidencia perteneciente a otra hipótesis
  for (const ev of matrix.observedEvidence) {
    if (
      (conclusion.mainSupportingEvidenceIds.includes(ev.id) ||
        conclusion.mainWeakeningEvidenceIds.includes(ev.id)) &&
      matrix.hypothesisId !== conclusion.hypothesisId
    ) {
      errors.push(
        `La evidencia "${ev.title || ev.id}" pertenece a otra hipótesis.`
      );
    }
  }

  // ── Warnings ─────────────────────────────────────────────────────────────────

  // Evidencia mixta pero conclusión unilateral
  const assessments = matrix.assessments;
  const mixedCount = assessments.filter((a) => a.direction === "mixed").length;
  const supportsCount = assessments.filter((a) => a.direction === "supports").length;
  const weakensCount = assessments.filter((a) => a.direction === "weakens").length;

  if (
    mixedCount > 0 &&
    (conclusion.conclusionStatus === "provisionally-supported" ||
      conclusion.conclusionStatus === "provisionally-weakened")
  ) {
    warnings.push(
      "Hay evidencia mixta registrada pero la conclusión es unilateral — revisar."
    );
  }

  // Confianza alta con mayoría de evidencia baja confianza
  const lowConfidenceCount = assessments.filter((a) => a.confidence === "low").length;
  if (
    conclusion.confidence === "high" &&
    assessments.length > 0 &&
    lowConfidenceCount > assessments.length / 2
  ) {
    warnings.push(
      "La conclusión tiene confianza alta pero la mayoría de las evaluaciones son de baja confianza."
    );
  }

  // Conclusión sin limitaciones
  if (!conclusion.limitations.trim()) {
    warnings.push("La conclusión no documenta limitaciones metodológicas.");
  }

  // Conclusión no revisada
  if (!conclusion.reviewed) {
    warnings.push("La conclusión no ha sido revisada.");
  }

  void supportsCount;
  void weakensCount;

  return {
    errors,
    warnings,
    valid: errors.length === 0,
    canConfirm: errors.length === 0,
  };
}

// ─── Evidence queries ─────────────────────────────────────────────────────────

export function findReferencedEvidence(
  conclusion: HypothesisEvidenceConclusion,
  matrix: EvidenceEvaluationMatrix
): ObservedEvidence[] {
  const allReferenced = new Set([
    ...conclusion.mainSupportingEvidenceIds,
    ...conclusion.mainWeakeningEvidenceIds,
  ]);
  return matrix.observedEvidence.filter((ev) => allReferenced.has(ev.id));
}

export function validateEvidenceReferences(
  conclusion: HypothesisEvidenceConclusion,
  matrix: EvidenceEvaluationMatrix
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const evidenceIds = new Set(matrix.observedEvidence.map((ev) => ev.id));

  for (const id of conclusion.mainSupportingEvidenceIds) {
    if (!evidenceIds.has(id)) {
      errors.push(`Evidencia de apoyo ${id} no existe en la matriz.`);
    }
  }
  for (const id of conclusion.mainWeakeningEvidenceIds) {
    if (!evidenceIds.has(id)) {
      errors.push(`Evidencia de debilitamiento ${id} no existe en la matriz.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Session helpers ──────────────────────────────────────────────────────────

export function upsertHypothesisEvidenceConclusion(
  conclusions: HypothesisEvidenceConclusion[],
  conclusion: HypothesisEvidenceConclusion
): HypothesisEvidenceConclusion[] {
  const exists = conclusions.some((c) => c.id === conclusion.id);
  if (exists) {
    return conclusions.map((c) => (c.id === conclusion.id ? conclusion : c));
  }
  return [...conclusions, conclusion];
}

export function findHypothesisEvidenceConclusion(
  conclusions: HypothesisEvidenceConclusion[],
  hypothesisId: string
): HypothesisEvidenceConclusion | null {
  return conclusions.find((c) => c.hypothesisId === hypothesisId) ?? null;
}

export function removeHypothesisEvidenceConclusion(
  conclusions: HypothesisEvidenceConclusion[],
  hypothesisId: string
): HypothesisEvidenceConclusion[] {
  return conclusions.filter((c) => c.hypothesisId !== hypothesisId);
}

// ─── Re-export for convenience ────────────────────────────────────────────────

export { findAssessmentByEvidence };
