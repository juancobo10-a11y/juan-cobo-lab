/**
 * S-021 — Motor de Consistencia Metodológica
 *
 * ADR-0010: La consistencia metodológica se evalúa mediante reglas explícitas
 * y trazables. Toda observación debe derivarse de una regla identificable,
 * documentada y verificable.
 *
 * Design decisions:
 *  - Audit is derived, never persisted.
 *  - Findings reference original entities by ID (no duplication).
 *  - No LLM, no heuristics, no semantic analysis.
 *  - The service evaluates structural + methodological consistency only.
 */

import type { KnowledgeGraph } from "@/knowledge-graph/types";
import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type { OperationalizationMatrix } from "@/operationalization/types";
import type { ContrastationMatrix } from "@/contrastation/types";

// ─── Rule categories ─────────────────────────────────────────────────────────

export type MethodologicalRuleCategory =
  | "hypothesis-structure"
  | "variable-coverage"
  | "indicator-alignment"
  | "evidence-coverage"
  | "operationalization-coherence"
  | "contrastation-coherence"
  | "traceability"
  | "redundancy"
  | "completeness";

export const RULE_CATEGORY_LABELS: Record<MethodologicalRuleCategory, string> = {
  "hypothesis-structure":         "Estructura de hipótesis",
  "variable-coverage":            "Cobertura de variables",
  "indicator-alignment":          "Coherencia de indicadores",
  "evidence-coverage":            "Cobertura de fuentes",
  "operationalization-coherence": "Coherencia de operacionalización",
  "contrastation-coherence":      "Coherencia de contrastación",
  "traceability":                 "Trazabilidad y completitud",
  "redundancy":                   "Redundancia",
  "completeness":                 "Completitud",
};

// ─── Severity ─────────────────────────────────────────────────────────────────

/**
 * error      — Inconsistencia que impide considerar completa la cadena metodológica.
 * warning    — Debilidad que no invalida el diseño pero requiere revisión.
 * suggestion — Oportunidad de mejora metodológica.
 */
export type MethodologicalSeverity = "error" | "warning" | "suggestion";

export const SEVERITY_LABELS: Record<MethodologicalSeverity, string> = {
  error:      "Error",
  warning:    "Advertencia",
  suggestion: "Sugerencia",
};

// ─── Entity types ─────────────────────────────────────────────────────────────

export type MethodologicalEntityType =
  | "problem"
  | "hypothesis"
  | "conceptual-model"
  | "conceptual-variable"
  | "indicator"
  | "evidence-source"
  | "operationalization-matrix"
  | "operationalization-row"
  | "contrastation-matrix"
  | "contrastation-row";

export const ENTITY_TYPE_LABELS: Record<MethodologicalEntityType, string> = {
  "problem":                 "Problema",
  "hypothesis":              "Hipótesis",
  "conceptual-model":        "Modelo conceptual",
  "conceptual-variable":     "Variable conceptual",
  "indicator":               "Indicador",
  "evidence-source":         "Fuente de evidencia",
  "operationalization-matrix": "Matriz de operacionalización",
  "operationalization-row":  "Fila de operacionalización",
  "contrastation-matrix":    "Matriz de contrastación",
  "contrastation-row":       "Criterio de contrastación",
};

// ─── Rule ─────────────────────────────────────────────────────────────────────

export interface MethodologicalRule {
  /** Stable code. e.g. "HYP-001" */
  id: string;
  name: string;
  description: string;
  category: MethodologicalRuleCategory;
  severity: MethodologicalSeverity;
  appliesTo: MethodologicalEntityType[];
}

// ─── Entity reference ─────────────────────────────────────────────────────────

export interface MethodologicalEntityReference {
  type: MethodologicalEntityType;
  /** ID of the original HELIOS entity */
  id: string;
  label?: string;
}

// ─── Finding ──────────────────────────────────────────────────────────────────

export interface MethodologicalFinding {
  /** Deterministic: "f-{ruleId}-{primaryEntityId}" */
  id: string;
  ruleId: string;
  severity: MethodologicalSeverity;
  title: string;
  /** Human-readable explanation of what was found and why it matters. */
  explanation: string;
  /** Structural evidence supporting this finding (strings, not entities). */
  evidence: string[];
  /** Entities directly involved in this finding. */
  entityRefs: MethodologicalEntityReference[];
  /** What the analyst can review or change to address this finding. */
  suggestedAction?: string;
}

// ─── Audit summary ────────────────────────────────────────────────────────────

export interface MethodologicalAuditSummary {
  totalFindings: number;
  errors: number;
  warnings: number;
  suggestions: number;
  categoriesAffected: MethodologicalRuleCategory[];
  /** blocking = at least one error exists */
  blocking: boolean;
  /** complete = no errors AND all required stages are confirmed */
  complete: boolean;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface MethodologicalAudit {
  /** ISO 8601 timestamp */
  generatedAt: string;
  findings: MethodologicalFinding[];
  summary: MethodologicalAuditSummary;
  /** All rule IDs that were evaluated (including those that produced no findings). */
  evaluatedRuleIds: string[];
}

// ─── Audit input ──────────────────────────────────────────────────────────────

/**
 * Full session state passed to runMethodologicalAudit().
 * Mirrors HeliosGraphInput with an optional pre-built graph.
 */
export interface MethodologicalAuditInput {
  problema: string;
  hypotheses: PolicyHypothesis[];
  conceptualModels: ConceptualModel[];
  operationalizationMatrices: OperationalizationMatrix[];
  contrastationMatrices: ContrastationMatrix[];
  /** Pre-built graph. If absent the service builds it from session data. */
  graph?: KnowledgeGraph;
}
