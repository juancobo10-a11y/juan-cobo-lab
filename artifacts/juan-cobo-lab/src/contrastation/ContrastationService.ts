/**
 * ContrastationService — S-019
 *
 * Pure functions for creating, editing, validating, and managing
 * ContrastationMatrix instances.
 *
 * No sector-specific knowledge. No side effects. No external dependencies.
 *
 * Constraints:
 *  - indicadorId, if set, must reference a ConceptualIndicator in the model.
 *  - fuenteId, if set, must reference an EvidenceSource in the model.
 *  - Deduplication: same indicadorId+fuenteId combo within the same matrix = duplicate.
 */

import type {
  ContrastationMatrix,
  ContrastationRow,
  ContrastationIssue,
  ContrastationValidation,
  ContrastationRowUpdate,
  Prioridad,
} from "./types";
import type { ConceptualModel } from "@/conceptual/types";

// ─── ID + timestamp helpers ───────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function now(): string {
  return new Date().toISOString();
}

// ─── Factory: ContrastationMatrix ────────────────────────────────────────────

/** Create an empty contrastation matrix for a given hypothesis. */
export function createEmptyContrastationMatrix(
  hypothesisId: string
): ContrastationMatrix {
  const ts = now();
  return {
    id: generateId("ctm"),
    hypothesisId,
    rows: [],
    confirmed: false,
    createdAt: ts,
    updatedAt: ts,
  };
}

// ─── Factory: Row ─────────────────────────────────────────────────────────────

/**
 * Add a new row to the matrix.
 *
 * Guards:
 *  - indicadorId (if non-null) must exist in conceptualModel.
 *  - fuenteId (if non-null) must exist in conceptualModel.
 */
export function createContrastationRow(
  matrix: ContrastationMatrix,
  conceptualModel: ConceptualModel,
  fields: {
    indicadorId?: string | null;
    fuenteId?: string | null;
    evidenciaEsperada?: string;
    evidenciaContraria?: string;
    criterioInterpretacion?: string;
    limitaciones?: string;
    prioridad?: Prioridad | "";
    observaciones?: string;
  }
): ContrastationMatrix {
  if (
    fields.indicadorId != null &&
    !conceptualModel.indicators.some((i) => i.id === fields.indicadorId)
  ) {
    throw new Error(
      `createContrastationRow: indicator '${fields.indicadorId}' not found in conceptual model.`
    );
  }
  if (
    fields.fuenteId != null &&
    !conceptualModel.evidenceSources.some((s) => s.id === fields.fuenteId)
  ) {
    throw new Error(
      `createContrastationRow: source '${fields.fuenteId}' not found in conceptual model.`
    );
  }

  const ts = now();
  const row: ContrastationRow = {
    id: generateId("ctr"),
    hypothesisId: matrix.hypothesisId,
    indicadorId: fields.indicadorId ?? null,
    fuenteId: fields.fuenteId ?? null,
    evidenciaEsperada: fields.evidenciaEsperada?.trim() ?? "",
    evidenciaContraria: fields.evidenciaContraria?.trim() ?? "",
    criterioInterpretacion: fields.criterioInterpretacion?.trim() ?? "",
    limitaciones: fields.limitaciones?.trim() ?? "",
    prioridad: fields.prioridad ?? "",
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

// ─── Update: Row ──────────────────────────────────────────────────────────────

/**
 * Update fields of a row.
 *
 * Guards:
 *  - indicadorId (if being changed to non-null) must exist in conceptualModel.
 *  - fuenteId (if being changed to non-null) must exist in conceptualModel.
 */
export function updateContrastationRow(
  matrix: ContrastationMatrix,
  conceptualModel: ConceptualModel,
  rowId: string,
  fields: ContrastationRowUpdate
): ContrastationMatrix {
  if (
    fields.indicadorId != null &&
    !conceptualModel.indicators.some((i) => i.id === fields.indicadorId)
  ) {
    throw new Error(
      `updateContrastationRow: indicator '${fields.indicadorId}' not found in conceptual model.`
    );
  }
  if (
    fields.fuenteId != null &&
    !conceptualModel.evidenceSources.some((s) => s.id === fields.fuenteId)
  ) {
    throw new Error(
      `updateContrastationRow: source '${fields.fuenteId}' not found in conceptual model.`
    );
  }
  const ts = now();
  const rows = matrix.rows.map((r) =>
    r.id === rowId ? { ...r, ...fields, updatedAt: ts } : r
  );
  return { ...matrix, rows, updatedAt: ts };
}

// ─── Remove: Row ──────────────────────────────────────────────────────────────

/** Remove a row and reindex remaining rows. */
export function removeContrastationRow(
  matrix: ContrastationMatrix,
  rowId: string
): ContrastationMatrix {
  const ts = now();
  const rows = matrix.rows
    .filter((r) => r.id !== rowId)
    .map((r, i) => ({ ...r, orden: i }));
  return { ...matrix, rows, updatedAt: ts };
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

/** Reorder all rows using an ordered array of row IDs. */
export function reorderContrastationRows(
  matrix: ContrastationMatrix,
  orderedIds: string[]
): ContrastationMatrix {
  const ts = now();
  const byId = new Map(matrix.rows.map((r) => [r.id, r]));
  const rows = orderedIds
    .filter((id) => byId.has(id))
    .map((id, i) => ({ ...byId.get(id)!, orden: i }));
  return { ...matrix, rows, updatedAt: ts };
}

// ─── Reutilizar indicador ──────────────────────────────────────────────────────

/**
 * Assign an existing ConceptualIndicator to a row — no duplication.
 * Guard: indicadorId must exist in conceptualModel.
 */
export function reutilizarIndicadorEnContrastation(
  matrix: ContrastationMatrix,
  conceptualModel: ConceptualModel,
  rowId: string,
  indicadorId: string
): ContrastationMatrix {
  if (!conceptualModel.indicators.some((i) => i.id === indicadorId)) {
    throw new Error(
      `reutilizarIndicadorEnContrastation: indicator '${indicadorId}' not found in conceptual model.`
    );
  }
  return updateContrastationRow(matrix, conceptualModel, rowId, { indicadorId });
}

// ─── Reutilizar fuente ────────────────────────────────────────────────────────

/**
 * Assign an existing EvidenceSource to a row — no duplication.
 * Guard: fuenteId must exist in conceptualModel.
 */
export function reutilizarFuenteEnContrastation(
  matrix: ContrastationMatrix,
  conceptualModel: ConceptualModel,
  rowId: string,
  fuenteId: string
): ContrastationMatrix {
  if (!conceptualModel.evidenceSources.some((s) => s.id === fuenteId)) {
    throw new Error(
      `reutilizarFuenteEnContrastation: source '${fuenteId}' not found in conceptual model.`
    );
  }
  return updateContrastationRow(matrix, conceptualModel, rowId, { fuenteId });
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Returns true if another row in the matrix already has the same
 * indicadorId + fuenteId combination.
 *
 * Both must be non-null to constitute a duplicate — a row with null
 * indicadorId or fuenteId is never considered a duplicate.
 */
export function isContrastationRowDuplicate(
  matrix: ContrastationMatrix,
  indicadorId: string | null,
  fuenteId: string | null,
  excludeRowId?: string
): boolean {
  if (indicadorId === null || fuenteId === null) return false;
  return matrix.rows.some(
    (r) =>
      r.id !== excludeRowId &&
      r.indicadorId === indicadorId &&
      r.fuenteId === fuenteId
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * validateContrastation — checks structural integrity of the matrix.
 *
 * Blocking issues prevent confirmation.
 * Warnings are informational only — editing is never blocked.
 */
export function validateContrastation(
  matrix: ContrastationMatrix
): ContrastationValidation {
  const blockingIssues: ContrastationIssue[] = [];
  const warnings: ContrastationIssue[] = [];

  // ── Blocking: no rows ─────────────────────────────────────────────────────
  if (matrix.rows.length === 0) {
    blockingIssues.push({ code: "sin-filas", hypothesisId: matrix.hypothesisId });
    return { isValid: false, blockingIssues, warnings };
  }

  // ── Per-row checks ────────────────────────────────────────────────────────
  for (const row of matrix.rows) {
    const orden = row.orden;

    // Blocking: no indicator
    if (row.indicadorId === null) {
      blockingIssues.push({ code: "fila-sin-indicador", rowId: row.id, orden });
    }

    // Blocking: no source
    if (row.fuenteId === null) {
      blockingIssues.push({ code: "fila-sin-fuente", rowId: row.id, orden });
    }

    // Blocking: no expected evidence
    if (!row.evidenciaEsperada.trim()) {
      blockingIssues.push({ code: "fila-sin-evidencia-esperada", rowId: row.id, orden });
    }

    // Blocking: no contrary evidence
    if (!row.evidenciaContraria.trim()) {
      blockingIssues.push({ code: "fila-sin-evidencia-contraria", rowId: row.id, orden });
    }

    // Warning: no interpretation criterion
    if (!row.criterioInterpretacion.trim()) {
      warnings.push({ code: "sin-criterio-interpretacion", rowId: row.id, orden });
    }

    // Warning: no limitations
    if (!row.limitaciones.trim()) {
      warnings.push({ code: "sin-limitaciones", rowId: row.id, orden });
    }

    // Warning: no priority chosen
    if (!row.prioridad) {
      warnings.push({ code: "prioridad-vacia", rowId: row.id, orden });
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
export function findContrastationMatrixByHypothesisId(
  matrices: ContrastationMatrix[],
  hypothesisId: string
): ContrastationMatrix | null {
  return matrices.find((m) => m.hypothesisId === hypothesisId) ?? null;
}

/**
 * Upserts a matrix in the session collection.
 * If a matrix for the hypothesis already exists, replaces it; otherwise appends.
 */
export function upsertContrastationMatrix(
  matrices: ContrastationMatrix[],
  updated: ContrastationMatrix
): ContrastationMatrix[] {
  const idx = matrices.findIndex((m) => m.hypothesisId === updated.hypothesisId);
  if (idx >= 0) {
    return matrices.map((m, i) => (i === idx ? updated : m));
  }
  return [...matrices, updated];
}

/** Confirm a matrix (sets confirmed = true, bumps updatedAt). */
export function confirmContrastationMatrix(
  matrix: ContrastationMatrix
): ContrastationMatrix {
  return { ...matrix, confirmed: true, updatedAt: now() };
}
