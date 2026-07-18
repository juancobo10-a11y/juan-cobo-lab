/**
 * S-024.1 — Breaking Change Rules Catalog
 *
 * A breaking change is a diff entry that could invalidate downstream
 * methodological entities. This catalog defines the explicit rules.
 *
 * NOT breaking (regardless of changeType):
 *   - Spelling or grammar corrections to text fields
 *   - Description edits
 *   - Reordering without content changes
 *   - Tag updates
 *   - Note updates
 *
 * BREAKING (based on entityType + changeType):
 *   - Hypothesis removed
 *   - Variable removed (it may be referenced by indicators)
 *   - Indicator removed and used in operationalization
 *   - Evidence source removed and used
 *   - Criterion removed with evidence
 *   - Evidence removed and used in conclusion
 *   - Broken internal references
 *   - Schema incompatible (handled separately in import)
 *
 * Each rule includes:
 *   - id: unique stable identifier for the rule
 *   - entityType: the entity this rule applies to
 *   - applicableChangeTypes: which ProjectChangeType values trigger this rule
 *   - ruleLabel: human-readable name
 *   - explanation: why it is breaking
 *   - isBreaking: predicate function
 */

import type { ProjectEntityChange } from "./types";

// ─── Rule definition ──────────────────────────────────────────────────────────

export interface BreakingChangeRule {
  id: string;
  entityType: string;
  applicableChangeTypes: string[];
  ruleLabel: string;
  explanation: string;
  isBreaking: (change: ProjectEntityChange) => boolean;
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

export const BREAKING_CHANGE_RULES: BreakingChangeRule[] = [
  {
    id: "hypothesis-removed",
    entityType: "hypothesis",
    applicableChangeTypes: ["removed"],
    ruleLabel: "Hipótesis eliminada",
    explanation:
      "Una hipótesis eliminada invalida todos los modelos conceptuales, matrices " +
      "de operacionalización, contrastación, evaluación de evidencia y conclusiones " +
      "que la referencian. La cadena metodológica completa queda huérfana.",
    isBreaking: (c) => c.changeType === "removed" && c.entityType === "hypothesis",
  },
  {
    id: "variable-removed",
    entityType: "conceptualVariable",
    applicableChangeTypes: ["removed"],
    ruleLabel: "Variable conceptual eliminada",
    explanation:
      "Una variable eliminada puede estar referenciada por indicadores o filas " +
      "de operacionalización. Su ausencia rompe la trazabilidad conceptual.",
    isBreaking: (c) => c.changeType === "removed" && c.entityType === "conceptualVariable",
  },
  {
    id: "indicator-removed",
    entityType: "conceptualIndicator",
    applicableChangeTypes: ["removed"],
    ruleLabel: "Indicador eliminado",
    explanation:
      "Un indicador eliminado puede estar siendo medido en matrices de " +
      "operacionalización. Su ausencia produce referencias rotas.",
    isBreaking: (c) => c.changeType === "removed" && c.entityType === "conceptualIndicator",
  },
  {
    id: "evidence-source-removed",
    entityType: "evidenceSource",
    applicableChangeTypes: ["removed"],
    ruleLabel: "Fuente de evidencia eliminada",
    explanation:
      "Una fuente de evidencia eliminada puede estar siendo usada en la " +
      "evaluación de evidencia o en las conclusiones.",
    isBreaking: (c) => c.changeType === "removed" && c.entityType === "evidenceSource",
  },
  {
    id: "observed-evidence-removed",
    entityType: "observedEvidence",
    applicableChangeTypes: ["removed"],
    ruleLabel: "Evidencia observada eliminada",
    explanation:
      "Una evidencia observada eliminada puede estar siendo usada en " +
      "conclusiones de hipótesis. Su ausencia invalida la evaluación.",
    isBreaking: (c) => c.changeType === "removed" && c.entityType === "observedEvidence",
  },
  {
    id: "conceptual-model-removed",
    entityType: "conceptualModel",
    applicableChangeTypes: ["removed"],
    ruleLabel: "Modelo conceptual eliminado",
    explanation:
      "Un modelo conceptual eliminado lleva consigo sus variables, indicadores " +
      "y fuentes, rompiendo toda la cadena de operacionalización.",
    isBreaking: (c) => c.changeType === "removed" && c.entityType === "conceptualModel",
  },
  {
    id: "operationalization-matrix-removed",
    entityType: "operationalizationMatrix",
    applicableChangeTypes: ["removed"],
    ruleLabel: "Matriz de operacionalización eliminada",
    explanation:
      "Una matriz de operacionalización eliminada rompe el vínculo entre " +
      "conceptos e indicadores medibles.",
    isBreaking: (c) =>
      c.changeType === "removed" && c.entityType === "operationalizationMatrix",
  },
  {
    id: "contrastation-matrix-removed",
    entityType: "contrastationMatrix",
    applicableChangeTypes: ["removed"],
    ruleLabel: "Matriz de contrastación eliminada",
    explanation:
      "Una matriz de contrastación eliminada elimina los criterios de " +
      "evaluación de evidencia asociados.",
    isBreaking: (c) =>
      c.changeType === "removed" && c.entityType === "contrastationMatrix",
  },
  {
    id: "evidence-evaluation-matrix-removed",
    entityType: "evidenceEvaluationMatrix",
    applicableChangeTypes: ["removed"],
    ruleLabel: "Matriz de evaluación de evidencia eliminada",
    explanation:
      "Una matriz de evaluación de evidencia eliminada lleva consigo todas " +
      "las evidencias observadas y puede invalidar conclusiones.",
    isBreaking: (c) =>
      c.changeType === "removed" && c.entityType === "evidenceEvaluationMatrix",
  },
  {
    id: "conclusion-removed",
    entityType: "hypothesisEvidenceConclusion",
    applicableChangeTypes: ["removed"],
    ruleLabel: "Conclusión eliminada",
    explanation:
      "Una conclusión eliminada puede romper informes que la referencian " +
      "explícitamente como parte del resumen metodológico.",
    isBreaking: (c) =>
      c.changeType === "removed" && c.entityType === "hypothesisEvidenceConclusion",
  },
];

// ─── Evaluation ───────────────────────────────────────────────────────────────

/**
 * Returns the first matching breaking rule for a change, or null if not breaking.
 */
export function evaluateBreakingChange(
  change: ProjectEntityChange
): BreakingChangeRule | null {
  return BREAKING_CHANGE_RULES.find((rule) => rule.isBreaking(change)) ?? null;
}

/**
 * Returns true if the change triggers any breaking rule.
 */
export function isBreakingChange(change: ProjectEntityChange): boolean {
  return evaluateBreakingChange(change) !== null;
}

/**
 * Returns all breaking rules that match in a list of changes.
 */
export function findAllBreakingChanges(
  changes: ProjectEntityChange[]
): Array<{ change: ProjectEntityChange; rule: BreakingChangeRule }> {
  const result: Array<{ change: ProjectEntityChange; rule: BreakingChangeRule }> = [];
  for (const change of changes) {
    const rule = evaluateBreakingChange(change);
    if (rule) result.push({ change, rule });
  }
  return result;
}
