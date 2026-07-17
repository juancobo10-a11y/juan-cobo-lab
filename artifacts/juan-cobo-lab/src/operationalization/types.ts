/**
 * S-018 — Matriz de Operacionalización
 *
 * ADR-0007: Todo constructo debe poder operacionalizarse explícitamente.
 * Los conceptos utilizados en una hipótesis deben transformarse en variables
 * observables mediante una matriz explícita. No deben existir indicadores sin
 * una operacionalización previa.
 *
 * Design decisions:
 *  - OperationalizationMatrix is 1:1 with ConceptualModel (same hypothesisId key).
 *  - Rows reference ConceptualVariable, ConceptualIndicator, EvidenceSource by ID.
 *    No duplication of data — FK references only.
 *  - A row = one combination of (variable, dimension, indicator, scale, source).
 *  - Multiple rows per variable allowed (one per dimension-indicator-source combo).
 *  - Dimension is embedded in the row — it belongs to exactly one row.
 *
 * Persistence: session-only (in-memory).
 */

// ─── Scales ───────────────────────────────────────────────────────────────────

/**
 * Generic measurement scales.
 * The analyst must choose explicitly — no automatic assignment.
 */
export type EscalaMedicion =
  | "nominal"
  | "ordinal"
  | "intervalo"
  | "razon"
  | "indice-compuesto";

export const ESCALAS_LABELS: Record<EscalaMedicion, string> = {
  nominal: "Nominal",
  ordinal: "Ordinal",
  intervalo: "Intervalo",
  razon: "Razón",
  "indice-compuesto": "Índice compuesto",
};

export const ESCALAS_LIST: EscalaMedicion[] = [
  "nominal",
  "ordinal",
  "intervalo",
  "razon",
  "indice-compuesto",
];

// ─── Dimension ────────────────────────────────────────────────────────────────

/**
 * A named sub-aspect of a conceptual variable.
 *
 * Example:
 *   Variable: Calidad educativa
 *     Dimension: Infraestructura
 *     Dimension: Docentes
 *     Dimension: Resultados
 *
 * Embedded in OperationalizationRow — belongs to exactly one row.
 * The operational definition answers: ¿Cómo sabré que esta dimensión está presente?
 */
export interface Dimension {
  id: string;
  /** Short label for this dimension (required) */
  nombre: string;
  /** Free-text answer to: ¿Cómo sabré que esta dimensión está presente? */
  definicionOperacional: string;
  /** Order within all rows for the same variable (0-based) */
  orden: number;
  createdAt: string;  // ISO-8601
  updatedAt: string;  // ISO-8601
}

// ─── Row ──────────────────────────────────────────────────────────────────────

/**
 * One row in the operationalization matrix.
 *
 * A row joins:
 *   ConceptualVariable  ──FK──>  variableId
 *   Dimension           (embedded)
 *   ConceptualIndicator ──FK──>  indicatorId  (nullable — may be absent)
 *   EvidenceSource      ──FK──>  sourceId     (nullable — may be absent)
 *   EscalaMedicion      (chosen by analyst)
 *   Observaciones       (free text)
 *
 * Multiple rows per variable are allowed — one per dimension.
 */
export interface OperationalizationRow {
  id: string;
  /** References ConceptualVariable.id in the associated ConceptualModel */
  variableId: string;
  /** Embedded dimension for this row */
  dimension: Dimension;
  /**
   * References ConceptualIndicator.id.
   * null = no indicator assigned yet (blocking validation issue).
   */
  indicatorId: string | null;
  /**
   * Measurement scale.
   * "" = not yet chosen (warning).
   */
  escala: EscalaMedicion | "";
  /**
   * References EvidenceSource.id.
   * null = no source assigned yet (blocking validation issue).
   */
  sourceId: string | null;
  /** Free-text observations, methodology notes, caveats */
  observaciones: string;
  /** Order within the matrix (0-based) */
  orden: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Matrix ───────────────────────────────────────────────────────────────────

/**
 * The operationalization matrix for one hypothesis.
 * 1:1 with ConceptualModel — keyed by hypothesisId.
 *
 * Rows are ordered. Order may be changed by the analyst.
 */
export interface OperationalizationMatrix {
  id: string;
  /** ID of the PolicyHypothesis this matrix operationalizes */
  hypothesisId: string;
  rows: OperationalizationRow[];
  /** True once the analyst explicitly confirms the matrix is complete */
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export type OperationalizationIssue =
  // Blocking
  | { code: "variable-sin-dimension";      variableId: string; nombreVariable: string }
  | { code: "dimension-sin-definicion";    rowId: string; dimensionNombre: string }
  | { code: "indicador-ausente";           rowId: string; dimensionNombre: string }
  | { code: "fuente-ausente";              rowId: string; dimensionNombre: string }
  // Warnings
  | { code: "unidad-vacia";               rowId: string; dimensionNombre: string }
  | { code: "escala-vacia";               rowId: string; dimensionNombre: string }
  | { code: "observaciones-vacias";       rowId: string; dimensionNombre: string }
  | { code: "sin-filas";                  hypothesisId: string };

export interface OperationalizationValidation {
  isValid: boolean;
  /** Issues that BLOCK confirmation */
  blockingIssues: OperationalizationIssue[];
  /** Issues that inform but do NOT block confirmation */
  warnings: OperationalizationIssue[];
}

// ─── Update payloads ──────────────────────────────────────────────────────────

export type RowUpdate = Partial<
  Pick<OperationalizationRow, "indicatorId" | "escala" | "sourceId" | "observaciones">
>;

export type DimensionUpdate = Partial<
  Pick<Dimension, "nombre" | "definicionOperacional">
>;
