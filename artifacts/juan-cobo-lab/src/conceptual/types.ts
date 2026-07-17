/**
 * S-017 — Modelo Conceptual de Variables, Indicadores y Evidencia
 *
 * ADR-0006: Toda hipótesis debe poder operacionalizarse.
 * Una hipótesis adquiere valor analítico cuando puede traducirse en variables
 * observables, indicadores verificables y fuentes de evidencia identificables.
 *
 * HELIOS no produce indicadores automáticamente — ayuda a estructurarlos.
 *
 * Persistence: session-only (in-memory). Not persisted to any external store.
 */

// ─── Variable ─────────────────────────────────────────────────────────────────

/**
 * Roles que puede cumplir una variable dentro del modelo causal.
 * Mirrors HypothesisVariableRole for the richer conceptual entity.
 */
export type ConceptualVariableRole =
  | "causa"
  | "resultado"
  | "mediadora"
  | "moderadora"
  | "control";

/**
 * Una variable analítica dentro del modelo conceptual.
 *
 * A variable answers three questions:
 *   ¿Qué representa? → nombre + descripcion
 *   ¿Cómo se observaría? → definicionOperacional
 *   ¿Qué papel cumple? → rol
 *
 * Completitud no es requerida para guardar — ausencias generan advertencias.
 */
export interface ConceptualVariable {
  id: string;
  /** Short label used in the hierarchical view (required) */
  nombre: string;
  /** Conceptual description — what the variable represents analytically */
  descripcion: string;
  /** Operational definition — how it could be observed or measured */
  definicionOperacional: string;
  /** Causal role within the hypothesis model */
  rol: ConceptualVariableRole;
  /** Order within the model (0-based) */
  orden: number;
  createdAt: string;  // ISO-8601
  updatedAt: string;  // ISO-8601
}

// ─── Indicator ────────────────────────────────────────────────────────────────

/**
 * Periodicidades permitidas para un indicador.
 */
export type IndicatorPeriodicidad =
  | "diaria"
  | "semanal"
  | "mensual"
  | "trimestral"
  | "semestral"
  | "anual"
  | "bienal"
  | "irregular"
  | "otra";

/**
 * Un indicador verificable asociado a una variable.
 *
 * An indicator answers:
 *   ¿Qué mediría? → nombre + descripcion
 *   ¿Cómo? → formulaOCriterio
 *   ¿Con qué unidad? → unidad
 *   ¿Cada cuánto? → periodicidad
 *   ¿En qué nivel territorial? → nivelTerritorial
 *   ¿Está disponible? → disponibilidad
 *
 * Constraint: indicadores sin variable no están permitidos.
 */
export interface ConceptualIndicator {
  id: string;
  nombre: string;
  descripcion: string;
  /** ID of the ConceptualVariable this indicator operationalizes */
  variableId: string;
  /** Unit of measurement (e.g. "Horas", "Porcentaje", "Número absoluto") */
  unidad: string;
  /** Formula, algorithm, or narrative criterion for computing the indicator */
  formulaOCriterio: string;
  periodicidad: IndicatorPeriodicidad | string;
  /** Geographic/administrative level (e.g. "Municipal", "Departamental", "Nacional") */
  nivelTerritorial: string;
  /**
   * Availability assessment:
   * - "disponible"    → data can be obtained now
   * - "parcial"       → some data is available but with gaps
   * - "no-disponible" → data does not currently exist
   * - "desconocida"   → availability not yet assessed
   */
  disponibilidad: "disponible" | "parcial" | "no-disponible" | "desconocida";
  /** Order within the variable's indicator list (0-based) */
  orden: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Evidence Source ──────────────────────────────────────────────────────────

/**
 * Types of evidence source recognized by HELIOS.
 */
export type EvidenceSourceType =
  | "administrativo"
  | "encuesta"
  | "observacional"
  | "documental"
  | "experimental"
  | "mixto";

/**
 * Una fuente de evidencia asociada a uno o más indicadores.
 *
 * Sources are user-defined — HELIOS does not preload institutions.
 *
 * Constraint: fuentes sin indicador no están permitidas.
 */
export interface EvidenceSource {
  id: string;
  nombre: string;
  tipo: EvidenceSourceType;
  /** Organization or unit responsible for producing this data */
  responsable: string;
  /** Data update frequency (e.g. "Mensual", "Anual") */
  frecuencia: string;
  /**
   * Access level:
   * - "publico"   → freely available online
   * - "restringido" → requires institutional access or request
   * - "privado"   → not publicly available; must be negotiated
   */
  acceso: "publico" | "restringido" | "privado";
  /** Known limitations of this source (coverage gaps, response bias, etc.) */
  limitaciones: string;
  /** IDs of ConceptualIndicators this source can feed */
  indicadorIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Conceptual Model ─────────────────────────────────────────────────────────

/**
 * The full conceptual model associated with a single PolicyHypothesis.
 *
 * Hierarchy enforced by the service:
 *   hypothesis → variables → indicators → sources
 *
 * Each hypothesis may have exactly one ConceptualModel.
 * A model may have many variables, each with many indicators,
 * and indicators may share evidence sources.
 */
export interface ConceptualModel {
  id: string;
  /** ID of the PolicyHypothesis this model operationalizes */
  hypothesisId: string;
  variables: ConceptualVariable[];
  indicators: ConceptualIndicator[];
  evidenceSources: EvidenceSource[];
  /** True once the analyst explicitly confirms the model is ready */
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export type ConceptualModelIssue =
  | { code: "variable-sin-rol";           variableId: string; nombre: string }
  | { code: "variable-sin-indicadores";   variableId: string; nombre: string }
  | { code: "indicador-sin-variable";     indicatorId: string; nombre: string }
  | { code: "indicador-sin-fuente";       indicatorId: string; nombre: string }
  | { code: "fuente-sin-indicador";       sourceId: string; nombre: string }
  | { code: "hipotesis-sin-variables";    hypothesisId: string }
  | { code: "duplicado-variable";         nombre: string }
  | { code: "duplicado-indicador";        nombre: string; variableId: string }
  | { code: "duplicado-fuente";           nombre: string };

export interface ConceptualModelValidation {
  isValid: boolean;
  /** Structural issues that BLOCK confirmation */
  blockingIssues: ConceptualModelIssue[];
  /** Warnings that inform but do NOT block confirmation */
  warnings: ConceptualModelIssue[];
}

// ─── Update payload ───────────────────────────────────────────────────────────

export type ConceptualVariableUpdate = Partial<
  Pick<
    ConceptualVariable,
    "nombre" | "descripcion" | "definicionOperacional" | "rol"
  >
>;

export type ConceptualIndicatorUpdate = Partial<
  Pick<
    ConceptualIndicator,
    | "nombre"
    | "descripcion"
    | "variableId"
    | "unidad"
    | "formulaOCriterio"
    | "periodicidad"
    | "nivelTerritorial"
    | "disponibilidad"
  >
>;

export type EvidenceSourceUpdate = Partial<
  Pick<
    EvidenceSource,
    | "nombre"
    | "tipo"
    | "responsable"
    | "frecuencia"
    | "acceso"
    | "limitaciones"
    | "indicadorIds"
  >
>;
