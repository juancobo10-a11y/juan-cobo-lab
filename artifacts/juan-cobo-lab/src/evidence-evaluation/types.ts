/**
 * S-022 — Motor de Evaluación de Evidencia
 *
 * Tres capas conceptuales (ADR-0011):
 *   ContrastationRow  → define qué evidencia debería buscarse
 *   ObservedEvidence  → registra qué se encontró
 *   EvidenceAssessment → evalúa qué significa lo encontrado
 *
 * HELIOS no deriva conclusiones automáticamente.
 * Toda valoración es explícita, trazable y atribuible al usuario.
 *
 * Notas metodológicas:
 *  - "supports" ≠ prueba definitiva
 *  - "weakens" ≠ refutación definitiva
 *  - "confidence" ≠ probabilidad estadística
 *  - HELIOS no determina causalidad
 *  - La conclusión la formula el usuario
 */

// ─── Catálogos ────────────────────────────────────────────────────────────────

export type EvidenceEvaluationStatus = "pending" | "evaluated" | "needs-review";

export type EvidenceDirection =
  | "supports"
  | "weakens"
  | "mixed"
  | "inconclusive"
  | "not-applicable";

export type EvidenceConfidenceLevel = "low" | "medium" | "high";

// ─── Evidencia observada ──────────────────────────────────────────────────────

/**
 * Registra datos, resultados o hallazgos concretos encontrados durante la investigación.
 * No duplica nombres de indicadores, fuentes, hipótesis ni evidencia esperada.
 * Todas las referencias son por ID.
 */
export interface ObservedEvidence {
  id: string;
  /** Referencia a la fila de contrastación que generó la búsqueda */
  contrastationRowId: string;
  /** Referencia al indicador del modelo conceptual */
  indicatorId: string;
  /** Referencia a la fuente del modelo conceptual */
  sourceId: string;

  /** Título breve del hallazgo (obligatorio) */
  title: string;
  /** Descripción del hallazgo (obligatorio) */
  description: string;

  /** Valor observado — texto libre (cuantitativo o cualitativo) */
  observedValue?: string;
  /** Unidad de medida del valor observado */
  observedUnit?: string;

  /** Fecha puntual de la observación (ISO 8601) */
  observationDate?: string;
  /** Inicio del período de observación (ISO 8601) */
  periodStart?: string;
  /** Fin del período de observación (ISO 8601) */
  periodEnd?: string;

  /** Ubicación geográfica o nivel territorial */
  location?: string;
  /** Población o universo al que aplica */
  population?: string;

  /** Referencia bibliográfica o URL de la fuente */
  sourceReference?: string;
  /** Página(s) del documento */
  sourcePage?: string;
  /** Sección o capítulo del documento */
  sourceSection?: string;

  /** Notas adicionales del investigador */
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

// ─── Evaluación de evidencia ──────────────────────────────────────────────────

/**
 * Registra el juicio metodológico del usuario sobre una evidencia observada.
 * La evaluación es distinta de la evidencia en sí — ADR-0011.
 * HELIOS no asigna automáticamente dirección ni confianza.
 */
export interface EvidenceAssessment {
  id: string;
  /** Referencia a la ObservedEvidence que se evalúa */
  observedEvidenceId: string;
  /** Referencia a la fila de contrastación (trazabilidad directa) */
  contrastationRowId: string;
  /** Hipótesis a la que pertenece la evaluación */
  hypothesisId: string;

  status: EvidenceEvaluationStatus;
  direction: EvidenceDirection;
  confidence: EvidenceConfidenceLevel;

  /** Justificación del juicio — obligatorio */
  justification: string;
  /** Limitaciones que afectan la interpretación — obligatorio */
  limitations: string;
  /** Interpretaciones alternativas posibles */
  alternativeInterpretations?: string;
  /** Evidencia adicional que se requeriría para mayor certeza */
  additionalEvidenceNeeded?: string;

  /** Fecha/hora en que se realizó la evaluación (ISO 8601) */
  assessedAt: string;
  /** Si la evaluación fue revisada manualmente */
  reviewed: boolean;
}

// ─── Matriz de evaluación de evidencia ───────────────────────────────────────

/**
 * Contenedor de todas las evidencias y evaluaciones de una hipótesis.
 * 1 hipótesis ↔ 1 matriz de evaluación ↔ 1 matriz de contrastación.
 * 1 criterio de contrastación → 0..n evidencias observadas.
 * 1 evidencia observada → 1 evaluación activa.
 */
export interface EvidenceEvaluationMatrix {
  id: string;
  hypothesisId: string;
  contrastationMatrixId: string;

  observedEvidence: ObservedEvidence[];
  assessments: EvidenceAssessment[];

  status: "draft" | "confirmed";
  confirmedAt?: string;

  createdAt: string;
  updatedAt: string;
}

// ─── Conclusión metodológica de la hipótesis ─────────────────────────────────

/**
 * Entidad separada que registra la conclusión metodológica formulada por el usuario.
 * HELIOS no produce esta conclusión automáticamente.
 * El sistema puede mostrar un resumen descriptivo, pero no sugerir una conclusión causal definitiva.
 */
export interface HypothesisEvidenceConclusion {
  id: string;
  hypothesisId: string;
  evidenceEvaluationMatrixId: string;

  conclusionStatus:
    | "not-evaluated"
    | "provisionally-supported"
    | "provisionally-weakened"
    | "mixed-evidence"
    | "inconclusive";

  /** Texto de la conclusión — formulado por el usuario */
  conclusionText: string;
  confidence: EvidenceConfidenceLevel;

  /** IDs de ObservedEvidence que sustentan la conclusión */
  mainSupportingEvidenceIds: string[];
  /** IDs de ObservedEvidence que debilitan la hipótesis */
  mainWeakeningEvidenceIds: string[];

  /** Limitaciones metodológicas de la conclusión */
  limitations: string;
  /** Evidencia adicional que se necesitaría */
  additionalEvidenceNeeded?: string;

  reviewed: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Resultado de validación ──────────────────────────────────────────────────

export interface EvidenceEvaluationValidation {
  errors: string[];
  warnings: string[];
  suggestions: string[];
  /** Sin errores bloqueantes */
  valid: boolean;
  /** Puede ser confirmada (sin errores) */
  canConfirm: boolean;
}

export interface ConclusionValidation {
  errors: string[];
  warnings: string[];
  valid: boolean;
  canConfirm: boolean;
}

// ─── Resumen de evaluación ────────────────────────────────────────────────────

/**
 * Estadísticas descriptivas de la evaluación de evidencia.
 * No representa probabilidad ni puntuación de validez.
 */
export interface EvidenceEvaluationSummary {
  totalCriteria: number;
  criteriaWithEvidence: number;
  criteriaWithoutEvidence: number;

  totalObservedEvidence: number;
  assessedEvidence: number;
  unassessedEvidence: number;

  supports: number;
  weakens: number;
  mixed: number;
  inconclusive: number;
  notApplicable: number;

  lowConfidence: number;
  mediumConfidence: number;
  highConfidence: number;

  blockingErrors: number;
  warnings: number;

  complete: boolean;
}

// ─── Labels de display ────────────────────────────────────────────────────────

export const EVIDENCE_DIRECTION_LABELS: Record<EvidenceDirection, string> = {
  supports:        "Apoya la hipótesis",
  weakens:         "Debilita la hipótesis",
  mixed:           "Evidencia mixta",
  inconclusive:    "Inconclusa",
  "not-applicable": "No aplica al criterio",
};

export const EVIDENCE_DIRECTION_SHORT: Record<EvidenceDirection, string> = {
  supports:        "Apoya",
  weakens:         "Debilita",
  mixed:           "Mixta",
  inconclusive:    "Inconclusa",
  "not-applicable": "No aplica",
};

export const EVIDENCE_CONFIDENCE_LABELS: Record<EvidenceConfidenceLevel, string> = {
  low:    "Confianza baja",
  medium: "Confianza media",
  high:   "Confianza alta",
};

export const EVIDENCE_STATUS_LABELS: Record<EvidenceEvaluationStatus, string> = {
  pending:        "Pendiente",
  evaluated:      "Evaluada",
  "needs-review": "Requiere revisión",
};

export const CONCLUSION_STATUS_LABELS: Record<HypothesisEvidenceConclusion["conclusionStatus"], string> = {
  "not-evaluated":          "Sin evaluar",
  "provisionally-supported": "Provisionalmente apoyada",
  "provisionally-weakened":  "Provisionalmente debilitada",
  "mixed-evidence":          "Evidencia mixta",
  inconclusive:              "Inconclusa",
};

export const EVIDENCE_DIRECTION_COLOR: Record<EvidenceDirection, string> = {
  supports:        "text-emerald-700 bg-emerald-50 border-emerald-200",
  weakens:         "text-red-700 bg-red-50 border-red-200",
  mixed:           "text-amber-700 bg-amber-50 border-amber-200",
  inconclusive:    "text-slate-600 bg-slate-50 border-slate-200",
  "not-applicable": "text-muted-foreground bg-muted/30 border-border",
};
