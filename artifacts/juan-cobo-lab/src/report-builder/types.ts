/**
 * S-023 — Report Builder types
 *
 * ADR-0012: El informe es una proyección del Knowledge Graph.
 * - Nunca se almacena contenido; siempre se genera dinámicamente.
 * - Cada bloque tiene trazabilidad hasta la entidad original.
 * - ReportDefinition sólo almacena configuración, no datos.
 */

import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type { OperationalizationMatrix } from "@/operationalization/types";
import type { ContrastationMatrix } from "@/contrastation/types";
import type { EvidenceEvaluationMatrix, HypothesisEvidenceConclusion } from "@/evidence-evaluation/types";
import type { MethodologicalAudit } from "@/methodological-consistency/types";

// ─── Section catalog ──────────────────────────────────────────────────────────

export type ReportSectionType =
  | "portada"
  | "resumen-ejecutivo"
  | "problema"
  | "thinking-pattern"
  | "hipotesis"
  | "modelo-conceptual"
  | "operacionalizacion"
  | "contrastacion"
  | "evidencia"
  | "evaluacion"
  | "conclusiones"
  | "auditoria-metodologica"
  | "anexos";

export const SECTION_TITLES: Record<ReportSectionType, string> = {
  "portada":                "Portada",
  "resumen-ejecutivo":      "Resumen ejecutivo",
  "problema":               "Problema de política pública",
  "thinking-pattern":       "Patrón de pensamiento",
  "hipotesis":              "Hipótesis",
  "modelo-conceptual":      "Modelo conceptual",
  "operacionalizacion":     "Matriz de operacionalización",
  "contrastacion":          "Matriz de contrastación",
  "evidencia":              "Evidencia observada",
  "evaluacion":             "Evaluación de evidencia",
  "conclusiones":           "Conclusión metodológica",
  "auditoria-metodologica": "Auditoría de consistencia metodológica",
  "anexos":                 "Anexos — Cadena de trazabilidad",
};

export const DEFAULT_SECTION_ORDER: ReportSectionType[] = [
  "portada",
  "resumen-ejecutivo",
  "problema",
  "thinking-pattern",
  "hipotesis",
  "modelo-conceptual",
  "operacionalizacion",
  "contrastacion",
  "evidencia",
  "evaluacion",
  "conclusiones",
  "auditoria-metodologica",
  "anexos",
];

// ─── Block types (intermediate representation) ────────────────────────────────

export type ReportBlockType =
  | "heading"
  | "paragraph"
  | "table"
  | "list"
  | "evidence-block"
  | "divider"
  | "metadata";

export interface ReportBlock {
  id: string;
  tipo: ReportBlockType;
  nivel?: 1 | 2 | 3 | 4;
  contenido: string;
  /** For "table" blocks */
  headers?: string[];
  tableRows?: string[][];
  /** For "list" blocks */
  items?: string[];
  /** Traceability */
  entityType?: string;
  entityId?: string;
}

// ─── Section config (stored in ReportDefinition — no content) ─────────────────

export interface ReportSectionConfig {
  tipo: ReportSectionType;
  visible: boolean;
  orden: number;
}

// ─── Report definition (session state) ────────────────────────────────────────

export interface ReportDefinition {
  id: string;
  nombre: string;
  descripcion: string;
  fecha: string; // ISO
  hypothesisId: string;
  secciones: ReportSectionConfig[];
  createdAt: string;
  updatedAt: string;
}

// ─── Generated intermediate representation (never stored) ─────────────────────

export interface GeneratedSection {
  sectionType: ReportSectionType;
  titulo: string;
  blocks: ReportBlock[];
  /** Traceability: which entities this section references */
  entityIds?: string[];
}

export interface TraceabilityEntry {
  blockId: string;
  entityType: string;
  entityId: string;
  sectionType: ReportSectionType;
}

export interface GeneratedReport {
  reportDefinitionId: string;
  generatedAt: string;
  nombre: string;
  problema: string;
  sections: GeneratedSection[];
  traceabilityMap: TraceabilityEntry[];
}

// ─── Validation ────────────────────────────────────────────────────────────────

export interface ReportValidationIssue {
  tipo: "error" | "warning";
  codigo: string;
  mensaje: string;
  sectionType?: ReportSectionType;
}

export interface ReportValidationResult {
  /** true = can generate report */
  canGenerate: boolean;
  issues: ReportValidationIssue[];
}

// ─── Summary ───────────────────────────────────────────────────────────────────

export interface ReportGenerationSummary {
  seccionesGeneradas: number;
  bloques: number;
  entidadesReferenciadas: number;
  errores: number;
  advertencias: number;
}

// ─── Full document ─────────────────────────────────────────────────────────────

export interface ReportDocument {
  definition: ReportDefinition;
  generated: GeneratedReport;
  validation: ReportValidationResult;
  summary: ReportGenerationSummary;
}

// ─── Build input (aggregates session state) ────────────────────────────────────

export interface ReportBuildInput {
  problema: string;
  perequePatternTitulo?: string | null;
  hypotheses: PolicyHypothesis[];
  conceptualModels: ConceptualModel[];
  operationalizationMatrices: OperationalizationMatrix[];
  contrastationMatrices: ContrastationMatrix[];
  evidenceEvaluationMatrices?: EvidenceEvaluationMatrix[];
  hypothesisEvidenceConclusions?: HypothesisEvidenceConclusion[];
  audit?: MethodologicalAudit;
}

// ─── Exporter interface ────────────────────────────────────────────────────────

export interface ReportExporter {
  readonly format: "markdown" | "html" | "json";
  export(report: GeneratedReport): string;
}
