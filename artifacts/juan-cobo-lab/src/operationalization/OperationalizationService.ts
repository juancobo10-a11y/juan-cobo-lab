/**
 * OperationalizationService — S-018
 *
 * Pure functions for creating, editing, validating, and managing
 * OperationalizationMatrix instances.
 *
 * No sector-specific knowledge. No side effects. No external dependencies.
 *
 * Constraints:
 *  - Rows must reference a valid variableId from the associated ConceptualModel.
 *  - indicatorId, if set, must reference a ConceptualIndicator in the model.
 *  - sourceId, if set, must reference an EvidenceSource in the model.
 *  - Deduplication by normalised dimension.nombre within the same variable scope.
 */

import type {
  OperationalizationMatrix,
  OperationalizationRow,
  Dimension,
  DimensionUpdate,
  EscalaMedicion,
  OperationalizationIssue,
  OperationalizationValidation,
  RowUpdate,
} from "./types";
import type { ConceptualModel } from "@/conceptual/types";

// ─── ID + timestamp helpers ───────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function now(): string {
  return new Date().toISOString();
}

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// ─── Factory: OperationalizationMatrix ───────────────────────────────────────

/** Create an empty matrix for a given hypothesis. */
export function createEmptyMatrix(hypothesisId: string): OperationalizationMatrix {
  const ts = now();
  return {
    id: generateId("opm"),
    hypothesisId,
    rows: [],
    confirmed: false,
    createdAt: ts,
    updatedAt: ts,
  };
}

// ─── Factory: Row ────────────────────────────────────────────────────────────

/**
 * Add a new row to the matrix.
 *
 * Each row pairs a variable with a dimension and optionally pre-selects
 * an indicator and source from the associated ConceptualModel.
 *
 * Guards:
 *  - variableId must exist in the conceptualModel.
 *  - indicatorId (if provided) must exist in the conceptualModel.
 *  - sourceId (if provided) must exist in the conceptualModel.
 */
export function createRow(
  matrix: OperationalizationMatrix,
  conceptualModel: ConceptualModel,
  fields: {
    variableId: string;
    dimensionNombre: string;
    dimensionDefinicion?: string;
    indicatorId?: string | null;
    escala?: EscalaMedicion | "";
    sourceId?: string | null;
    observaciones?: string;
  }
): OperationalizationMatrix {
  // Guard: variable must exist
  if (!conceptualModel.variables.some((v) => v.id === fields.variableId)) {
    throw new Error(
      `createRow: variable '${fields.variableId}' not found in conceptual model.`
    );
  }
  // Guard: indicatorId must exist (if provided and non-null)
  if (
    fields.indicatorId != null &&
    !conceptualModel.indicators.some((i) => i.id === fields.indicatorId)
  ) {
    throw new Error(
      `createRow: indicator '${fields.indicatorId}' not found in conceptual model.`
    );
  }
  // Guard: sourceId must exist (if provided and non-null)
  if (
    fields.sourceId != null &&
    !conceptualModel.evidenceSources.some((s) => s.id === fields.sourceId)
  ) {
    throw new Error(
      `createRow: source '${fields.sourceId}' not found in conceptual model.`
    );
  }

  const ts = now();
  const dimension: Dimension = {
    id: generateId("dim"),
    nombre: fields.dimensionNombre.trim(),
    definicionOperacional: fields.dimensionDefinicion?.trim() ?? "",
    orden: matrix.rows.filter((r) => r.variableId === fields.variableId).length,
    createdAt: ts,
    updatedAt: ts,
  };

  const row: OperationalizationRow = {
    id: generateId("row"),
    variableId: fields.variableId,
    dimension,
    indicatorId: fields.indicatorId ?? null,
    escala: fields.escala ?? "",
    sourceId: fields.sourceId ?? null,
    observaciones: fields.observaciones?.trim() ?? "",
    orden: matrix.rows.length,
    createdAt: ts,
    updatedAt: ts,
  };

  return {
    ...matrix,
    rows: [...matrix.rows, row],
    updatedAt: ts,
  };
}

// ─── Update: Row ─────────────────────────────────────────────────────────────

/**
 * Update scalar fields of a row (indicatorId, escala, sourceId, observaciones).
 * Does not update the dimension — use updateDimension for that.
 *
 * Guards:
 *  - indicatorId (if being changed to non-null) must exist in conceptualModel.
 *  - sourceId (if being changed to non-null) must exist in conceptualModel.
 */
export function updateRow(
  matrix: OperationalizationMatrix,
  conceptualModel: ConceptualModel,
  rowId: string,
  fields: RowUpdate
): OperationalizationMatrix {
  if (
    fields.indicatorId != null &&
    !conceptualModel.indicators.some((i) => i.id === fields.indicatorId)
  ) {
    throw new Error(
      `updateRow: indicator '${fields.indicatorId}' not found in conceptual model.`
    );
  }
  if (
    fields.sourceId != null &&
    !conceptualModel.evidenceSources.some((s) => s.id === fields.sourceId)
  ) {
    throw new Error(
      `updateRow: source '${fields.sourceId}' not found in conceptual model.`
    );
  }
  const ts = now();
  const rows = matrix.rows.map((r) =>
    r.id === rowId ? { ...r, ...fields, updatedAt: ts } : r
  );
  return { ...matrix, rows, updatedAt: ts };
}

// ─── Update: Dimension ───────────────────────────────────────────────────────

/** Update the dimension embedded in a specific row. */
export function updateDimension(
  matrix: OperationalizationMatrix,
  rowId: string,
  fields: DimensionUpdate
): OperationalizationMatrix {
  const ts = now();
  const rows = matrix.rows.map((r) => {
    if (r.id !== rowId) return r;
    const updatedDimension: Dimension = {
      ...r.dimension,
      ...(fields.nombre !== undefined
        ? { nombre: fields.nombre.trim() }
        : {}),
      ...(fields.definicionOperacional !== undefined
        ? { definicionOperacional: fields.definicionOperacional.trim() }
        : {}),
      updatedAt: ts,
    };
    return { ...r, dimension: updatedDimension, updatedAt: ts };
  });
  return { ...matrix, rows, updatedAt: ts };
}

// ─── Remove: Row ─────────────────────────────────────────────────────────────

/** Remove a row. Reorders remaining rows. */
export function removeRow(
  matrix: OperationalizationMatrix,
  rowId: string
): OperationalizationMatrix {
  const ts = now();
  const rows = matrix.rows
    .filter((r) => r.id !== rowId)
    .map((r, i) => ({ ...r, orden: i }));
  return { ...matrix, rows, updatedAt: ts };
}

// ─── Reorder ─────────────────────────────────────────────────────────────────

/** Reorder all rows using an ordered array of row IDs. */
export function reorderRows(
  matrix: OperationalizationMatrix,
  orderedIds: string[]
): OperationalizationMatrix {
  const ts = now();
  const byId = new Map(matrix.rows.map((r) => [r.id, r]));
  const rows = orderedIds
    .filter((id) => byId.has(id))
    .map((id, i) => ({ ...byId.get(id)!, orden: i }));
  return { ...matrix, rows, updatedAt: ts };
}

// ─── Reutilizar indicador ─────────────────────────────────────────────────────

/**
 * Assign an existing ConceptualIndicator to a row.
 * This is the canonical way to "reutilizar indicador" — no duplication.
 *
 * Returns the updated matrix.
 * Guard: indicatorId must exist in conceptualModel.
 */
export function reutilizarIndicador(
  matrix: OperationalizationMatrix,
  conceptualModel: ConceptualModel,
  rowId: string,
  indicatorId: string
): OperationalizationMatrix {
  if (!conceptualModel.indicators.some((i) => i.id === indicatorId)) {
    throw new Error(
      `reutilizarIndicador: indicator '${indicatorId}' not found in conceptual model.`
    );
  }
  return updateRow(matrix, conceptualModel, rowId, { indicatorId });
}

// ─── Reutilizar fuente ────────────────────────────────────────────────────────

/**
 * Assign an existing EvidenceSource to a row.
 * This is the canonical way to "reutilizar fuente" — no duplication.
 *
 * Guard: sourceId must exist in conceptualModel.
 */
export function reutilizarFuente(
  matrix: OperationalizationMatrix,
  conceptualModel: ConceptualModel,
  rowId: string,
  sourceId: string
): OperationalizationMatrix {
  if (!conceptualModel.evidenceSources.some((s) => s.id === sourceId)) {
    throw new Error(
      `reutilizarFuente: source '${sourceId}' not found in conceptual model.`
    );
  }
  return updateRow(matrix, conceptualModel, rowId, { sourceId });
}

// ─── Deduplication ───────────────────────────────────────────────────────────

/**
 * Returns true if another row for the same variable already has a dimension
 * with the same normalised nombre.
 */
export function isDimensionNameDuplicate(
  matrix: OperationalizationMatrix,
  variableId: string,
  dimensionNombre: string,
  excludeRowId?: string
): boolean {
  const norm = normalise(dimensionNombre);
  return matrix.rows.some(
    (r) =>
      r.variableId === variableId &&
      normalise(r.dimension.nombre) === norm &&
      r.id !== excludeRowId
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * validateOperationalization — checks structural integrity of the matrix
 * against the associated ConceptualModel.
 *
 * Blocking issues prevent confirmation.
 * Warnings are informational only — editing is never blocked.
 *
 * @param matrix          The matrix to validate.
 * @param conceptualModel The associated ConceptualModel (for indicator/source data).
 * @param variableIds     IDs of variables that should appear in the matrix.
 */
export function validateOperationalization(
  matrix: OperationalizationMatrix,
  conceptualModel: ConceptualModel,
  variableIds?: string[]
): OperationalizationValidation {
  const blockingIssues: OperationalizationIssue[] = [];
  const warnings: OperationalizationIssue[] = [];

  const indicatorMap = new Map(
    conceptualModel.indicators.map((i) => [i.id, i])
  );

  // ── Blocking: matrix has no rows at all ──────────────────────────────────
  if (matrix.rows.length === 0) {
    blockingIssues.push({
      code: "sin-filas",
      hypothesisId: matrix.hypothesisId,
    });
    // Remaining checks meaningless without rows
    return {
      isValid: false,
      blockingIssues,
      warnings,
    };
  }

  // ── Blocking: variables from ConceptualModel not represented in the matrix
  const coveredVariableIds = new Set(matrix.rows.map((r) => r.variableId));
  const targetVariables = variableIds ?? conceptualModel.variables.map((v) => v.id);
  for (const varId of targetVariables) {
    if (!coveredVariableIds.has(varId)) {
      const variable = conceptualModel.variables.find((v) => v.id === varId);
      if (variable) {
        blockingIssues.push({
          code: "variable-sin-dimension",
          variableId: varId,
          nombreVariable: variable.nombre,
        });
      }
    }
  }

  // ── Per-row checks ────────────────────────────────────────────────────────
  for (const row of matrix.rows) {
    const dimLabel = row.dimension.nombre || `fila ${row.orden + 1}`;

    // Blocking: dimension has no operational definition
    if (!row.dimension.definicionOperacional.trim()) {
      blockingIssues.push({
        code: "dimension-sin-definicion",
        rowId: row.id,
        dimensionNombre: dimLabel,
      });
    }

    // Blocking: no indicator assigned
    if (row.indicatorId === null) {
      blockingIssues.push({
        code: "indicador-ausente",
        rowId: row.id,
        dimensionNombre: dimLabel,
      });
    }

    // Blocking: no source assigned
    if (row.sourceId === null) {
      blockingIssues.push({
        code: "fuente-ausente",
        rowId: row.id,
        dimensionNombre: dimLabel,
      });
    }

    // Warning: unit empty (from referenced indicator)
    if (row.indicatorId !== null) {
      const ind = indicatorMap.get(row.indicatorId);
      if (!ind || !ind.unidad.trim()) {
        warnings.push({
          code: "unidad-vacia",
          rowId: row.id,
          dimensionNombre: dimLabel,
        });
      }
    }

    // Warning: no scale chosen
    if (!row.escala) {
      warnings.push({
        code: "escala-vacia",
        rowId: row.id,
        dimensionNombre: dimLabel,
      });
    }

    // Warning: observations empty
    if (!row.observaciones.trim()) {
      warnings.push({
        code: "observaciones-vacias",
        rowId: row.id,
        dimensionNombre: dimLabel,
      });
    }
  }

  return {
    isValid: blockingIssues.length === 0,
    blockingIssues,
    warnings,
  };
}

// ─── Session-level helpers ────────────────────────────────────────────────────

/** Returns the matrix for a given hypothesis, or null if none exists. */
export function findMatrixByHypothesisId(
  matrices: OperationalizationMatrix[],
  hypothesisId: string
): OperationalizationMatrix | null {
  return matrices.find((m) => m.hypothesisId === hypothesisId) ?? null;
}

/**
 * Upserts a matrix in the session collection.
 * If a matrix for the hypothesis already exists, replaces it; otherwise appends.
 */
export function upsertMatrix(
  matrices: OperationalizationMatrix[],
  updated: OperationalizationMatrix
): OperationalizationMatrix[] {
  const idx = matrices.findIndex((m) => m.hypothesisId === updated.hypothesisId);
  if (idx >= 0) {
    return matrices.map((m, i) => (i === idx ? updated : m));
  }
  return [...matrices, updated];
}

/** Confirm a matrix (sets confirmed = true, bumps updatedAt). */
export function confirmMatrix(
  matrix: OperationalizationMatrix
): OperationalizationMatrix {
  return { ...matrix, confirmed: true, updatedAt: now() };
}
