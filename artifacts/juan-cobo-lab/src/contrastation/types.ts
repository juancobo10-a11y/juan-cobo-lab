/**
 * S-019 — Matriz de Contrastación de Hipótesis
 *
 * ADR-0008: Toda hipótesis debe tener criterios explícitos de contrastación.
 * Una hipótesis no está lista para ser utilizada mientras no existan criterios
 * claros para decidir qué tipo de evidencia la apoyaría o la refutaría.
 *
 * HELIOS no decide si una hipótesis es verdadera.
 * Ayuda al usuario a definir cómo podría contrastarse.
 *
 * Design decisions:
 *  - ContrastationMatrix is 1:1 with OperationalizationMatrix (same hypothesisId key).
 *  - Rows reference ConceptualIndicator and EvidenceSource by FK — no data duplication.
 *  - evidenciaEsperada and evidenciaContraria are always free text — no automation.
 *  - prioridad must be chosen explicitly — never assigned automatically.
 *
 * Persistence: session-only (in-memory).
 */

// ─── Priority ─────────────────────────────────────────────────────────────────

export type Prioridad = "alta" | "media" | "baja";

export const PRIORIDAD_LABELS: Record<Prioridad, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export const PRIORIDAD_LIST: Prioridad[] = ["alta", "media", "baja"];

// ─── Row ──────────────────────────────────────────────────────────────────────

/**
 * One row in the contrastation matrix.
 *
 * A row represents one criterion of contrastation:
 *   - Which indicator to observe  (FK → ConceptualIndicator.id)
 *   - With which source            (FK → EvidenceSource.id)
 *   - What we expect to observe    (evidenciaEsperada)
 *   - What would cast doubt        (evidenciaContraria)
 *   - How to interpret the result  (criterioInterpretacion)
 *   - Known limitations            (limitaciones)
 *   - Priority assigned by analyst  (prioridad)
 *   - Additional notes             (observaciones)
 *
 * hypothesisId is included for traceability (the matrix also holds it).
 */
export interface ContrastationRow {
  id: string;
  /** References PolicyHypothesis.id — for traceability */
  hypothesisId: string;
  /**
   * References ConceptualIndicator.id.
   * null = not yet assigned (blocking validation issue).
   */
  indicadorId: string | null;
  /**
   * References EvidenceSource.id.
   * null = not yet assigned (blocking validation issue).
   */
  fuenteId: string | null;
  /**
   * Free text: ¿Qué observaríamos si la hipótesis fuera consistente?
   * Empty string = not yet written (blocking validation issue).
   */
  evidenciaEsperada: string;
  /**
   * Free text: ¿Qué resultado pondría seriamente en duda la hipótesis?
   * Empty string = not yet written (blocking validation issue).
   */
  evidenciaContraria: string;
  /**
   * Free text: Interpretation rule for the indicator result.
   * Example: "Si el indicador permanece estable pese a la intervención,
   *           la hipótesis pierde plausibilidad."
   * Not generated automatically. Empty = warning only.
   */
  criterioInterpretacion: string;
  /**
   * Known limitations of this contrastation criterion.
   * Empty = warning only.
   */
  limitaciones: string;
  /**
   * Analyst-assigned priority. Must be chosen explicitly.
   * "" = not yet chosen (warning only).
   */
  prioridad: Prioridad | "";
  /** Additional methodological notes */
  observaciones: string;
  /** Order within the matrix (0-based) */
  orden: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Matrix ───────────────────────────────────────────────────────────────────

/**
 * The contrastation matrix for one hypothesis.
 * 1:1 with OperationalizationMatrix — keyed by hypothesisId.
 */
export interface ContrastationMatrix {
  id: string;
  /** ID of the PolicyHypothesis this matrix operationalizes */
  hypothesisId: string;
  rows: ContrastationRow[];
  /** True once the analyst explicitly confirms the matrix is complete */
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export type ContrastationIssue =
  // Blocking
  | { code: "sin-filas";                     hypothesisId: string }
  | { code: "fila-sin-indicador";            rowId: string; orden: number }
  | { code: "fila-sin-fuente";              rowId: string; orden: number }
  | { code: "fila-sin-evidencia-esperada";  rowId: string; orden: number }
  | { code: "fila-sin-evidencia-contraria"; rowId: string; orden: number }
  // Warnings
  | { code: "sin-criterio-interpretacion";  rowId: string; orden: number }
  | { code: "sin-limitaciones";             rowId: string; orden: number }
  | { code: "prioridad-vacia";              rowId: string; orden: number };

export interface ContrastationValidation {
  isValid: boolean;
  /** Issues that BLOCK confirmation */
  blockingIssues: ContrastationIssue[];
  /** Issues that inform but do NOT block confirmation */
  warnings: ContrastationIssue[];
}

// ─── Update payload ───────────────────────────────────────────────────────────

export type ContrastationRowUpdate = Partial<
  Pick<
    ContrastationRow,
    | "indicadorId"
    | "fuenteId"
    | "evidenciaEsperada"
    | "evidenciaContraria"
    | "criterioInterpretacion"
    | "limitaciones"
    | "prioridad"
    | "observaciones"
  >
>;
