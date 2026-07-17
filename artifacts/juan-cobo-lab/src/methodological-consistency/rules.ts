/**
 * S-021 — Catálogo declarativo de reglas metodológicas
 *
 * Cada regla tiene:
 *  - Descriptor (MethodologicalRule)
 *  - Función evaluadora pura: (input, graph) → MethodologicalFinding[]
 *
 * Principios:
 *  - No duplicar validaciones locales de S-017, S-018, S-019.
 *  - No inferir similitud semántica.
 *  - Solo evidencia estructural disponible en la sesión.
 *  - Cada evaluador es puro y no muta el input.
 */

import type {
  MethodologicalRule,
  MethodologicalFinding,
  MethodologicalAuditInput,
  MethodologicalEntityReference,
} from "./types";
import type { KnowledgeGraph } from "@/knowledge-graph/types";
import { validateGraph, detectOrphans } from "@/knowledge-graph/KnowledgeGraphService";

// ─── Internal types ────────────────────────────────────────────────────────────

/** Full registered rule: descriptor + evaluator. */
export interface RegisteredRule {
  rule: MethodologicalRule;
  evaluate: (
    input: MethodologicalAuditInput,
    graph: KnowledgeGraph
  ) => MethodologicalFinding[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findingId(ruleId: string, suffix: string): string {
  return `f-${ruleId}-${suffix}`;
}

/** True when the hypothesis appears to have a causal structure (causa field is non-empty). */
function isCausal(hyp: MethodologicalAuditInput["hypotheses"][number]): boolean {
  return !!(hyp.causa?.trim());
}

// ─── A. Hypothesis structure ──────────────────────────────────────────────────

const HYP001: RegisteredRule = {
  rule: {
    id: "HYP-001",
    name: "Hipótesis causal sin variable causal",
    description:
      "Una hipótesis con estructura causal debe tener al menos una variable con rol 'causa' en su modelo conceptual.",
    category: "hypothesis-structure",
    severity: "error",
    appliesTo: ["hypothesis", "conceptual-variable"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    for (const hyp of input.hypotheses) {
      if (!isCausal(hyp)) continue;
      const model = input.conceptualModels.find((m) => m.hypothesisId === hyp.id);
      if (!model) continue; // HYP-003 handles missing model
      const hasCausalVar = model.variables.some((v) => v.rol === "causa");
      if (hasCausalVar) continue;
      const roles = [...new Set(model.variables.map((v) => v.rol))];
      findings.push({
        id: findingId("HYP-001", hyp.id),
        ruleId: "HYP-001",
        severity: "error",
        title: "Hipótesis causal sin variable causal",
        explanation: `La hipótesis "${hyp.titulo}" tiene estructura causal (campo "causa" definido) pero ninguna variable en su modelo conceptual tiene rol "causa". Sin una variable causal explícita, el mecanismo de cambio no puede operacionalizarse ni contrastarse.`,
        evidence: [
          `Variables en el modelo: ${model.variables.length}`,
          `Roles encontrados: ${roles.length > 0 ? roles.join(", ") : "ninguno"}`,
        ],
        entityRefs: [
          { type: "hypothesis", id: hyp.id, label: hyp.titulo },
          { type: "conceptual-model", id: model.id },
        ],
        suggestedAction:
          "Agregar una variable con rol 'causa' al modelo conceptual, o revisar si la hipótesis tiene realmente estructura causal.",
      });
    }
    return findings;
  },
};

const HYP002: RegisteredRule = {
  rule: {
    id: "HYP-002",
    name: "Hipótesis causal sin variable de resultado",
    description:
      "Una hipótesis con estructura causal debe tener al menos una variable con rol 'resultado' en su modelo conceptual.",
    category: "hypothesis-structure",
    severity: "error",
    appliesTo: ["hypothesis", "conceptual-variable"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    for (const hyp of input.hypotheses) {
      if (!isCausal(hyp)) continue;
      const model = input.conceptualModels.find((m) => m.hypothesisId === hyp.id);
      if (!model) continue;
      const hasResultadoVar = model.variables.some((v) => v.rol === "resultado");
      if (hasResultadoVar) continue;
      const roles = [...new Set(model.variables.map((v) => v.rol))];
      findings.push({
        id: findingId("HYP-002", hyp.id),
        ruleId: "HYP-002",
        severity: "error",
        title: "Hipótesis causal sin variable de resultado",
        explanation: `La hipótesis "${hyp.titulo}" tiene estructura causal pero ninguna variable tiene rol "resultado". Sin una variable de resultado definida, no es posible especificar qué cambio esperado debe observarse en la evidencia empírica.`,
        evidence: [
          `Variables en el modelo: ${model.variables.length}`,
          `Roles encontrados: ${roles.length > 0 ? roles.join(", ") : "ninguno"}`,
        ],
        entityRefs: [
          { type: "hypothesis", id: hyp.id, label: hyp.titulo },
          { type: "conceptual-model", id: model.id },
        ],
        suggestedAction:
          "Agregar o reclasificar una variable de resultado en el modelo conceptual.",
      });
    }
    return findings;
  },
};

const HYP003: RegisteredRule = {
  rule: {
    id: "HYP-003",
    name: "Hipótesis sin modelo conceptual",
    description:
      "Toda hipótesis en la sesión debe tener un modelo conceptual asociado.",
    category: "hypothesis-structure",
    severity: "error",
    appliesTo: ["hypothesis", "conceptual-model"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    for (const hyp of input.hypotheses) {
      const model = input.conceptualModels.find((m) => m.hypothesisId === hyp.id);
      if (!model) {
        findings.push({
          id: findingId("HYP-003", hyp.id),
          ruleId: "HYP-003",
          severity: "error",
          title: "Hipótesis sin modelo conceptual",
          explanation: `La hipótesis "${hyp.titulo}" no tiene un modelo conceptual asociado. Sin modelo conceptual no es posible definir variables, indicadores ni operacionalización.`,
          evidence: [`ID de hipótesis: ${hyp.id}`],
          entityRefs: [{ type: "hypothesis", id: hyp.id, label: hyp.titulo }],
          suggestedAction:
            "Completar el modelo conceptual de esta hipótesis antes de avanzar en la cadena metodológica.",
        });
      }
    }
    return findings;
  },
};

const HYP004: RegisteredRule = {
  rule: {
    id: "HYP-004",
    name: "Hipótesis sin operacionalización",
    description:
      "Una hipótesis sin variables, indicadores o matriz de operacionalización no puede evaluarse empíricamente.",
    category: "completeness",
    severity: "warning",
    appliesTo: ["hypothesis", "conceptual-model", "operationalization-matrix"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    for (const hyp of input.hypotheses) {
      const model = input.conceptualModels.find((m) => m.hypothesisId === hyp.id);
      const opMatrix = input.operationalizationMatrices.find(
        (m) => m.hypothesisId === hyp.id
      );
      const noVariables = !model || model.variables.length === 0;
      const noIndicators = !model || model.indicators.length === 0;
      const noOpMatrix = !opMatrix || opMatrix.rows.length === 0;
      if (noVariables || noIndicators || noOpMatrix) {
        const missing: string[] = [];
        if (noVariables) missing.push("variables");
        if (noIndicators) missing.push("indicadores");
        if (noOpMatrix) missing.push("operacionalización");
        findings.push({
          id: findingId("HYP-004", hyp.id),
          ruleId: "HYP-004",
          severity: "warning",
          title: "Hipótesis sin operacionalización completa",
          explanation: `La hipótesis "${hyp.titulo}" carece de: ${missing.join(", ")}. Una hipótesis sin estas etapas no puede evaluarse empíricamente.`,
          evidence: [
            `Variables definidas: ${model?.variables.length ?? 0}`,
            `Indicadores definidos: ${model?.indicators.length ?? 0}`,
            `Filas de operacionalización: ${opMatrix?.rows.length ?? 0}`,
          ],
          entityRefs: [
            { type: "hypothesis", id: hyp.id, label: hyp.titulo },
            ...(model ? [{ type: "conceptual-model" as const, id: model.id }] : []),
          ],
          suggestedAction:
            "Completar las etapas faltantes: modelo conceptual → indicadores → operacionalización.",
        });
      }
    }
    return findings;
  },
};

// ─── B. Variable coverage ─────────────────────────────────────────────────────

const VAR001: RegisteredRule = {
  rule: {
    id: "VAR-001",
    name: "Variable sin indicador",
    description:
      "Toda variable de un modelo conceptual debe tener al menos un indicador asociado.",
    category: "variable-coverage",
    severity: "error",
    appliesTo: ["conceptual-variable", "indicator"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    for (const model of input.conceptualModels) {
      const hyp = input.hypotheses.find((h) => h.id === model.hypothesisId);
      for (const variable of model.variables) {
        const hasIndicator = model.indicators.some(
          (ind) => ind.variableId === variable.id
        );
        if (!hasIndicator) {
          findings.push({
            id: findingId("VAR-001", variable.id),
            ruleId: "VAR-001",
            severity: "error",
            title: "Variable sin indicador",
            explanation: `La variable "${variable.nombre}" (rol: ${variable.rol}) del modelo de la hipótesis "${hyp?.titulo ?? model.hypothesisId}" no tiene ningún indicador asociado. Sin indicadores, la variable no puede operacionalizarse ni contrastarse.`,
            evidence: [
              `Variable: ${variable.nombre}`,
              `Rol: ${variable.rol}`,
              `Indicadores en el modelo: ${model.indicators.length}`,
            ],
            entityRefs: [
              { type: "conceptual-variable", id: variable.id, label: variable.nombre },
              { type: "conceptual-model", id: model.id },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction:
              "Agregar al menos un indicador para esta variable en el modelo conceptual.",
          });
        }
      }
    }
    return findings;
  },
};

const VAR002: RegisteredRule = {
  rule: {
    id: "VAR-002",
    name: "Variable de resultado no contrastada",
    description:
      "Toda variable con rol 'resultado' debe tener al menos un indicador utilizado en algún criterio de contrastación.",
    category: "variable-coverage",
    severity: "warning",
    appliesTo: ["conceptual-variable", "indicator", "contrastation-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    // Collect all indicator IDs used in any ct-row
    const usedInCt = new Set<string>();
    for (const ctm of input.contrastationMatrices) {
      for (const row of ctm.rows) {
        if (row.indicadorId) usedInCt.add(row.indicadorId);
      }
    }
    for (const model of input.conceptualModels) {
      const hyp = input.hypotheses.find((h) => h.id === model.hypothesisId);
      for (const variable of model.variables) {
        if (variable.rol !== "resultado") continue;
        const varIndicators = model.indicators.filter(
          (ind) => ind.variableId === variable.id
        );
        const anyContrastated = varIndicators.some((ind) => usedInCt.has(ind.id));
        if (!anyContrastated) {
          findings.push({
            id: findingId("VAR-002", variable.id),
            ruleId: "VAR-002",
            severity: "warning",
            title: "Variable de resultado no contrastada",
            explanation: `La variable de resultado "${variable.nombre}" no tiene ningún indicador utilizado en criterios de contrastación. Sin contraste, no es posible evaluar empíricamente si el resultado esperado se produce.`,
            evidence: [
              `Indicadores de esta variable: ${varIndicators.length}`,
              `Indicadores usados en contrastación: 0`,
            ],
            entityRefs: [
              { type: "conceptual-variable", id: variable.id, label: variable.nombre },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction:
              "Incluir al menos un indicador de esta variable en la matriz de contrastación.",
          });
        }
      }
    }
    return findings;
  },
};

const VAR003: RegisteredRule = {
  rule: {
    id: "VAR-003",
    name: "Variable sin definición operacional",
    description:
      "Variable que tiene indicadores pero ninguna fila de operacionalización. Solo se reporta cuando afecta la consistencia transversal.",
    category: "variable-coverage",
    severity: "warning",
    appliesTo: ["conceptual-variable", "operationalization-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    // Collect variable IDs that appear in any op-row
    const operationalizedVarIds = new Set<string>();
    for (const opMatrix of input.operationalizationMatrices) {
      for (const row of opMatrix.rows) {
        operationalizedVarIds.add(row.variableId);
      }
    }
    for (const model of input.conceptualModels) {
      const hyp = input.hypotheses.find((h) => h.id === model.hypothesisId);
      for (const variable of model.variables) {
        const hasIndicators = model.indicators.some(
          (ind) => ind.variableId === variable.id
        );
        if (!hasIndicators) continue; // VAR-001 handles this
        if (!operationalizedVarIds.has(variable.id)) {
          findings.push({
            id: findingId("VAR-003", variable.id),
            ruleId: "VAR-003",
            severity: "warning",
            title: "Variable sin definición operacional",
            explanation: `La variable "${variable.nombre}" tiene indicadores definidos pero ninguna fila en la matriz de operacionalización. Los indicadores no están siendo operacionalizados.`,
            evidence: [
              `Indicadores de esta variable: ${model.indicators.filter(i => i.variableId === variable.id).length}`,
              `Filas de operacionalización para esta variable: 0`,
            ],
            entityRefs: [
              { type: "conceptual-variable", id: variable.id, label: variable.nombre },
              { type: "conceptual-model", id: model.id },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction:
              "Agregar filas de operacionalización para esta variable en la matriz correspondiente.",
          });
        }
      }
    }
    return findings;
  },
};

const VAR004: RegisteredRule = {
  rule: {
    id: "VAR-004",
    name: "Variable aislada",
    description:
      "Variable conectada a una hipótesis pero sin operacionalización ni contrastación de ninguno de sus indicadores.",
    category: "variable-coverage",
    severity: "warning",
    appliesTo: ["conceptual-variable", "operationalization-row", "contrastation-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    const opVarIds = new Set<string>();
    for (const opMatrix of input.operationalizationMatrices) {
      for (const row of opMatrix.rows) opVarIds.add(row.variableId);
    }
    const ctIndicatorIds = new Set<string>();
    for (const ctMatrix of input.contrastationMatrices) {
      for (const row of ctMatrix.rows) {
        if (row.indicadorId) ctIndicatorIds.add(row.indicadorId);
      }
    }
    for (const model of input.conceptualModels) {
      const hyp = input.hypotheses.find((h) => h.id === model.hypothesisId);
      for (const variable of model.variables) {
        const isOperationalized = opVarIds.has(variable.id);
        const varIndicators = model.indicators.filter(
          (ind) => ind.variableId === variable.id
        );
        const isContrastated = varIndicators.some((ind) =>
          ctIndicatorIds.has(ind.id)
        );
        if (!isOperationalized && !isContrastated && varIndicators.length > 0) {
          findings.push({
            id: findingId("VAR-004", variable.id),
            ruleId: "VAR-004",
            severity: "warning",
            title: "Variable aislada",
            explanation: `La variable "${variable.nombre}" está en el modelo conceptual y tiene indicadores, pero no aparece ni en la operacionalización ni en la contrastación. Está metodológicamente aislada.`,
            evidence: [
              `Indicadores: ${varIndicators.length}`,
              `En operacionalización: No`,
              `En contrastación: No`,
            ],
            entityRefs: [
              { type: "conceptual-variable", id: variable.id, label: variable.nombre },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction:
              "Operacionalizar o contrastar esta variable, o justificar por qué se mantiene solo a nivel conceptual.",
          });
        }
      }
    }
    return findings;
  },
};

// ─── C. Indicator alignment ───────────────────────────────────────────────────

const IND001: RegisteredRule = {
  rule: {
    id: "IND-001",
    name: "Indicador sin variable",
    description:
      "Todo indicador debe estar vinculado a una variable conceptual válida.",
    category: "indicator-alignment",
    severity: "error",
    appliesTo: ["indicator", "conceptual-variable"],
  },
  evaluate(input, graph) {
    const orphans = detectOrphans(graph);
    const findings: MethodologicalFinding[] = [];
    for (const orphanNode of orphans.indicatorsWithoutVariable) {
      // Find the original indicator for label
      let label = orphanNode.metadata.label as string;
      findings.push({
        id: findingId("IND-001", orphanNode.refId),
        ruleId: "IND-001",
        severity: "error",
        title: "Indicador sin variable",
        explanation: `El indicador "${label}" no tiene ninguna relación válida con una variable conceptual. Sin variable, el indicador no puede situarse en la cadena metodológica.`,
        evidence: [
          `Nodo del grafo: ${orphanNode.id}`,
          "Sin aristas derives-from o measures hacia ninguna variable",
        ],
        entityRefs: [{ type: "indicator", id: orphanNode.refId, label }],
        suggestedAction:
          "Verificar que el indicador esté correctamente asignado a una variable en el modelo conceptual.",
      });
    }
    return findings;
  },
};

const IND002: RegisteredRule = {
  rule: {
    id: "IND-002",
    name: "Indicador no operacionalizado",
    description:
      "Todo indicador debe aparecer en al menos una fila de la matriz de operacionalización.",
    category: "indicator-alignment",
    severity: "warning",
    appliesTo: ["indicator", "operationalization-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    const opIndicatorIds = new Set<string>();
    for (const opMatrix of input.operationalizationMatrices) {
      for (const row of opMatrix.rows) {
        if (row.indicatorId) opIndicatorIds.add(row.indicatorId);
      }
    }
    for (const model of input.conceptualModels) {
      const hyp = input.hypotheses.find((h) => h.id === model.hypothesisId);
      for (const ind of model.indicators) {
        if (!opIndicatorIds.has(ind.id)) {
          findings.push({
            id: findingId("IND-002", ind.id),
            ruleId: "IND-002",
            severity: "warning",
            title: "Indicador no operacionalizado",
            explanation: `El indicador "${ind.nombre}" existe en el modelo conceptual pero no está incluido en ninguna fila de operacionalización. El indicador está definido pero no implementado.`,
            evidence: [
              `Indicador: ${ind.nombre}`,
              "No encontrado en ninguna matriz de operacionalización",
            ],
            entityRefs: [
              { type: "indicator", id: ind.id, label: ind.nombre },
              { type: "conceptual-model", id: model.id },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction:
              "Agregar una fila de operacionalización para este indicador.",
          });
        }
      }
    }
    return findings;
  },
};

const IND003: RegisteredRule = {
  rule: {
    id: "IND-003",
    name: "Indicador no contrastado",
    description:
      "Indicador que fue operacionalizado pero no se usa en ningún criterio de contrastación.",
    category: "indicator-alignment",
    severity: "suggestion",
    appliesTo: ["indicator", "contrastation-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    const opIndicatorIds = new Set<string>();
    for (const opMatrix of input.operationalizationMatrices) {
      for (const row of opMatrix.rows) {
        if (row.indicatorId) opIndicatorIds.add(row.indicatorId);
      }
    }
    const ctIndicatorIds = new Set<string>();
    for (const ctMatrix of input.contrastationMatrices) {
      for (const row of ctMatrix.rows) {
        if (row.indicadorId) ctIndicatorIds.add(row.indicadorId);
      }
    }
    for (const model of input.conceptualModels) {
      const hyp = input.hypotheses.find((h) => h.id === model.hypothesisId);
      for (const ind of model.indicators) {
        if (!opIndicatorIds.has(ind.id)) continue; // not operationalized → IND-002 handles
        if (!ctIndicatorIds.has(ind.id)) {
          findings.push({
            id: findingId("IND-003", ind.id),
            ruleId: "IND-003",
            severity: "suggestion",
            title: "Indicador operacionalizado pero no contrastado",
            explanation: `El indicador "${ind.nombre}" está operacionalizado pero no aparece en ningún criterio de contrastación. La operacionalización no se está aprovechando en la evaluación empírica.`,
            evidence: [
              `Indicador: ${ind.nombre}`,
              "Aparece en operacionalización: Sí",
              "Aparece en contrastación: No",
            ],
            entityRefs: [
              { type: "indicator", id: ind.id, label: ind.nombre },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction:
              "Considerar incluir este indicador en un criterio de contrastación para aprovecharlo en la evaluación.",
          });
        }
      }
    }
    return findings;
  },
};

const IND004: RegisteredRule = {
  rule: {
    id: "IND-004",
    name: "Indicador cruzado entre hipótesis",
    description:
      "Una fila de contrastación no debe usar un indicador que pertenece exclusivamente a otra hipótesis.",
    category: "indicator-alignment",
    severity: "error",
    appliesTo: ["indicator", "contrastation-row", "hypothesis"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    // Build a map: indicatorId → hypothesisId (via conceptualModel)
    const indicatorToHypothesisId = new Map<string, string>();
    for (const model of input.conceptualModels) {
      for (const ind of model.indicators) {
        indicatorToHypothesisId.set(ind.id, model.hypothesisId);
      }
    }
    for (const ctMatrix of input.contrastationMatrices) {
      const ctHypId = ctMatrix.hypothesisId;
      const ctHyp = input.hypotheses.find((h) => h.id === ctHypId);
      for (const row of ctMatrix.rows) {
        if (!row.indicadorId) continue;
        const ownerHypId = indicatorToHypothesisId.get(row.indicadorId);
        if (ownerHypId && ownerHypId !== ctHypId) {
          const ownerHyp = input.hypotheses.find((h) => h.id === ownerHypId);
          // Find indicator label
          const indModel = input.conceptualModels.find(
            (m) => m.hypothesisId === ownerHypId
          );
          const ind = indModel?.indicators.find((i) => i.id === row.indicadorId);
          findings.push({
            id: findingId("IND-004", row.id),
            ruleId: "IND-004",
            severity: "error",
            title: "Indicador cruzado entre hipótesis",
            explanation: `El criterio de contrastación de la hipótesis "${ctHyp?.titulo ?? ctHypId}" usa el indicador "${ind?.nombre ?? row.indicadorId}", que pertenece a la hipótesis "${ownerHyp?.titulo ?? ownerHypId}". Los indicadores no comparten hipótesis en este diseño.`,
            evidence: [
              `Hipótesis del criterio: ${ctHyp?.titulo ?? ctHypId}`,
              `Hipótesis dueña del indicador: ${ownerHyp?.titulo ?? ownerHypId}`,
            ],
            entityRefs: [
              { type: "contrastation-row", id: row.id },
              { type: "indicator", id: row.indicadorId, label: ind?.nombre },
              { type: "hypothesis", id: ctHypId, label: ctHyp?.titulo },
              { type: "hypothesis", id: ownerHypId, label: ownerHyp?.titulo },
            ],
            suggestedAction:
              "Usar únicamente indicadores del modelo conceptual de esta hipótesis en sus criterios de contrastación.",
          });
        }
      }
    }
    return findings;
  },
};

const IND005: RegisteredRule = {
  rule: {
    id: "IND-005",
    name: "Indicador redundante",
    description:
      "Detecta indicadores funcionalmente repetidos basándose únicamente en evidencia estructural exacta: mismo indicador, misma variable, misma dimensión y misma fuente en la operacionalización.",
    category: "redundancy",
    severity: "warning",
    appliesTo: ["indicator", "operationalization-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    for (const opMatrix of input.operationalizationMatrices) {
      // Key: variableId + dimension.nombre + indicatorId + sourceId
      const seen = new Map<string, string>(); // key → first rowId
      for (const row of opMatrix.rows) {
        const key = `${row.variableId}||${row.dimension.nombre}||${row.indicatorId ?? ""}||${row.sourceId ?? ""}`;
        const existing = seen.get(key);
        if (existing) {
          findings.push({
            id: findingId("IND-005", row.id),
            ruleId: "IND-005",
            severity: "warning",
            title: "Indicador redundante en operacionalización",
            explanation: `La fila de operacionalización duplica exactamente otra fila (misma variable, dimensión, indicador y fuente). Esta redundancia no agrega información metodológica nueva.`,
            evidence: [
              `Primera fila: ${existing}`,
              `Fila duplicada: ${row.id}`,
              `Clave duplicada: variable=${row.variableId}, dimensión="${row.dimension.nombre}", indicador=${row.indicatorId ?? "ninguno"}, fuente=${row.sourceId ?? "ninguna"}`,
            ],
            entityRefs: [
              { type: "operationalization-row", id: row.id },
              { type: "operationalization-row", id: existing },
              { type: "operationalization-matrix", id: opMatrix.id },
            ],
            suggestedAction:
              "Eliminar la fila duplicada o diferenciarla en dimensión, indicador o fuente.",
          });
        } else {
          seen.set(key, row.id);
        }
      }
    }
    return findings;
  },
};

// ─── D. Evidence coverage ─────────────────────────────────────────────────────

const SRC001: RegisteredRule = {
  rule: {
    id: "SRC-001",
    name: "Indicador contrastado sin fuente operacionalizada",
    description:
      "Un indicador usado en contrastación debe tener al menos una fila de operacionalización con fuente asignada.",
    category: "evidence-coverage",
    severity: "error",
    appliesTo: ["indicator", "contrastation-row", "operationalization-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    // Map: indicatorId → set of sourceIds in op-rows
    const indOpSources = new Map<string, Set<string>>();
    for (const opMatrix of input.operationalizationMatrices) {
      for (const row of opMatrix.rows) {
        if (!row.indicatorId) continue;
        const sources = indOpSources.get(row.indicatorId) ?? new Set();
        if (row.sourceId) sources.add(row.sourceId);
        indOpSources.set(row.indicatorId, sources);
      }
    }
    for (const ctMatrix of input.contrastationMatrices) {
      const ctHyp = input.hypotheses.find((h) => h.id === ctMatrix.hypothesisId);
      for (const row of ctMatrix.rows) {
        if (!row.indicadorId) continue; // CON-001 handles missing indicator
        const sources = indOpSources.get(row.indicadorId);
        if (!sources || sources.size === 0) {
          // Find indicator label
          let indLabel = row.indicadorId;
          for (const model of input.conceptualModels) {
            const found = model.indicators.find((i) => i.id === row.indicadorId);
            if (found) { indLabel = found.nombre; break; }
          }
          findings.push({
            id: findingId("SRC-001", row.id),
            ruleId: "SRC-001",
            severity: "error",
            title: "Indicador contrastado sin fuente operacionalizada",
            explanation: `El indicador "${indLabel}" se usa en un criterio de contrastación de la hipótesis "${ctHyp?.titulo ?? ctMatrix.hypothesisId}" pero no tiene ninguna fuente asignada en la operacionalización. La cadena Contrastación→Indicador→Fuente está incompleta.`,
            evidence: [
              `Indicador: ${indLabel}`,
              "Fuentes en operacionalización para este indicador: 0",
            ],
            entityRefs: [
              { type: "contrastation-row", id: row.id },
              { type: "indicator", id: row.indicadorId, label: indLabel },
              ...(ctHyp ? [{ type: "hypothesis" as const, id: ctHyp.id, label: ctHyp.titulo }] : []),
            ],
            suggestedAction:
              "Asignar una fuente a las filas de operacionalización de este indicador.",
          });
        }
      }
    }
    return findings;
  },
};

const SRC002: RegisteredRule = {
  rule: {
    id: "SRC-002",
    name: "Fuente no utilizada (unused)",
    description:
      "Fuente válida que existe en el modelo conceptual pero no es utilizada por ninguna fila de operacionalización ni de contrastación. Distinto de orphan (relación obligatoria ausente).",
    category: "evidence-coverage",
    severity: "suggestion",
    appliesTo: ["evidence-source"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    // Collect sources used in op-rows or ct-rows
    const usedSourceIds = new Set<string>();
    for (const opMatrix of input.operationalizationMatrices) {
      for (const row of opMatrix.rows) {
        if (row.sourceId) usedSourceIds.add(row.sourceId);
      }
    }
    for (const ctMatrix of input.contrastationMatrices) {
      for (const row of ctMatrix.rows) {
        if (row.fuenteId) usedSourceIds.add(row.fuenteId);
      }
    }
    for (const model of input.conceptualModels) {
      const hyp = input.hypotheses.find((h) => h.id === model.hypothesisId);
      for (const src of model.evidenceSources) {
        if (!usedSourceIds.has(src.id)) {
          findings.push({
            id: findingId("SRC-002", src.id),
            ruleId: "SRC-002",
            severity: "suggestion",
            title: "Fuente no utilizada",
            explanation: `La fuente "${src.nombre}" está definida en el modelo conceptual pero no aparece en ninguna fila de operacionalización ni en ningún criterio de contrastación. Es una fuente válida pero sin utilización (unused).`,
            evidence: [
              `Fuente: ${src.nombre}`,
              "Aparece en operacionalización: No",
              "Aparece en contrastación: No",
            ],
            entityRefs: [
              { type: "evidence-source", id: src.id, label: src.nombre },
              { type: "conceptual-model", id: model.id },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction:
              "Usar esta fuente en alguna fila de operacionalización o contrastación, o eliminarla del modelo si no es necesaria.",
          });
        }
      }
    }
    return findings;
  },
};

const SRC003: RegisteredRule = {
  rule: {
    id: "SRC-003",
    name: "Fuente utilizada fuera del indicador correspondiente",
    description:
      "Una fila de contrastación usa una fuente que no tiene relación con el indicador en ninguna fila de operacionalización.",
    category: "evidence-coverage",
    severity: "warning",
    appliesTo: ["evidence-source", "contrastation-row", "operationalization-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    // Map: (indicatorId, sourceId) → exists in op-row
    const opPairs = new Set<string>();
    for (const opMatrix of input.operationalizationMatrices) {
      for (const row of opMatrix.rows) {
        if (row.indicatorId && row.sourceId) {
          opPairs.add(`${row.indicatorId}::${row.sourceId}`);
        }
      }
    }
    for (const ctMatrix of input.contrastationMatrices) {
      const ctHyp = input.hypotheses.find((h) => h.id === ctMatrix.hypothesisId);
      for (const row of ctMatrix.rows) {
        if (!row.indicadorId || !row.fuenteId) continue;
        const pair = `${row.indicadorId}::${row.fuenteId}`;
        if (!opPairs.has(pair)) {
          let indLabel = row.indicadorId;
          let srcLabel = row.fuenteId;
          for (const model of input.conceptualModels) {
            const foundInd = model.indicators.find((i) => i.id === row.indicadorId);
            if (foundInd) indLabel = foundInd.nombre;
            const foundSrc = model.evidenceSources.find((s) => s.id === row.fuenteId);
            if (foundSrc) srcLabel = foundSrc.nombre;
          }
          findings.push({
            id: findingId("SRC-003", row.id),
            ruleId: "SRC-003",
            severity: "warning",
            title: "Fuente utilizada fuera del indicador correspondiente",
            explanation: `El criterio de contrastación usa la fuente "${srcLabel}" para el indicador "${indLabel}", pero no existe ninguna fila de operacionalización que vincule ambos. La fuente no está operacionalmente asociada a este indicador.`,
            evidence: [
              `Indicador: ${indLabel}`,
              `Fuente: ${srcLabel}`,
              "Par (indicador, fuente) no encontrado en operacionalización",
            ],
            entityRefs: [
              { type: "contrastation-row", id: row.id },
              { type: "indicator", id: row.indicadorId, label: indLabel },
              { type: "evidence-source", id: row.fuenteId, label: srcLabel },
              ...(ctHyp ? [{ type: "hypothesis" as const, id: ctHyp.id, label: ctHyp.titulo }] : []),
            ],
            suggestedAction:
              "Agregar una fila de operacionalización que vincule este indicador con esta fuente, o cambiar la fuente del criterio.",
          });
        }
      }
    }
    return findings;
  },
};

// ─── E. Operationalization coherence ─────────────────────────────────────────

const OPR001: RegisteredRule = {
  rule: {
    id: "OPR-001",
    name: "Dimensión sin indicador",
    description:
      "Toda fila de operacionalización debe tener un indicador asignado.",
    category: "operationalization-coherence",
    severity: "error",
    appliesTo: ["operationalization-row", "indicator"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    for (const opMatrix of input.operationalizationMatrices) {
      const hyp = input.hypotheses.find((h) => h.id === opMatrix.hypothesisId);
      for (const row of opMatrix.rows) {
        if (!row.indicatorId) {
          findings.push({
            id: findingId("OPR-001", row.id),
            ruleId: "OPR-001",
            severity: "error",
            title: "Dimensión sin indicador",
            explanation: `La fila de operacionalización "${row.dimension.nombre || row.id}" de la hipótesis "${hyp?.titulo ?? opMatrix.hypothesisId}" no tiene un indicador asignado. Sin indicador, la dimensión no puede medirse.`,
            evidence: [
              `Dimensión: ${row.dimension.nombre || "(sin nombre)"}`,
              "Indicador: no asignado",
            ],
            entityRefs: [
              { type: "operationalization-row", id: row.id, label: row.dimension.nombre },
              { type: "operationalization-matrix", id: opMatrix.id },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction: "Asignar un indicador a esta fila de operacionalización.",
          });
        }
      }
    }
    return findings;
  },
};

const OPR002: RegisteredRule = {
  rule: {
    id: "OPR-002",
    name: "Dimensión sin fuente",
    description:
      "Toda fila de operacionalización debe tener una fuente de evidencia asignada.",
    category: "operationalization-coherence",
    severity: "error",
    appliesTo: ["operationalization-row", "evidence-source"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    for (const opMatrix of input.operationalizationMatrices) {
      const hyp = input.hypotheses.find((h) => h.id === opMatrix.hypothesisId);
      for (const row of opMatrix.rows) {
        if (!row.sourceId) {
          findings.push({
            id: findingId("OPR-002", row.id),
            ruleId: "OPR-002",
            severity: "error",
            title: "Dimensión sin fuente",
            explanation: `La fila de operacionalización "${row.dimension.nombre || row.id}" de la hipótesis "${hyp?.titulo ?? opMatrix.hypothesisId}" no tiene una fuente de evidencia asignada. Sin fuente, el indicador no puede recopilarse.`,
            evidence: [
              `Dimensión: ${row.dimension.nombre || "(sin nombre)"}`,
              "Fuente: no asignada",
            ],
            entityRefs: [
              { type: "operationalization-row", id: row.id, label: row.dimension.nombre },
              { type: "operationalization-matrix", id: opMatrix.id },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction: "Asignar una fuente de evidencia a esta fila.",
          });
        }
      }
    }
    return findings;
  },
};

const OPR003: RegisteredRule = {
  rule: {
    id: "OPR-003",
    name: "Dimensión operacionalizada pero no contrastada",
    description:
      "Una fila de operacionalización con indicador no se usa en ningún criterio de contrastación.",
    category: "operationalization-coherence",
    severity: "warning",
    appliesTo: ["operationalization-row", "contrastation-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    const ctIndicatorIds = new Set<string>();
    for (const ctMatrix of input.contrastationMatrices) {
      for (const row of ctMatrix.rows) {
        if (row.indicadorId) ctIndicatorIds.add(row.indicadorId);
      }
    }
    for (const opMatrix of input.operationalizationMatrices) {
      const hyp = input.hypotheses.find((h) => h.id === opMatrix.hypothesisId);
      for (const row of opMatrix.rows) {
        if (!row.indicatorId) continue;
        if (!ctIndicatorIds.has(row.indicatorId)) {
          let indLabel = row.indicatorId;
          for (const model of input.conceptualModels) {
            const found = model.indicators.find((i) => i.id === row.indicatorId);
            if (found) { indLabel = found.nombre; break; }
          }
          findings.push({
            id: findingId("OPR-003", row.id),
            ruleId: "OPR-003",
            severity: "warning",
            title: "Dimensión operacionalizada pero no contrastada",
            explanation: `La fila de operacionalización usa el indicador "${indLabel}" pero este indicador no aparece en ningún criterio de contrastación. La operacionalización no se está aprovechando.`,
            evidence: [
              `Indicador: ${indLabel}`,
              "En contrastación: No",
            ],
            entityRefs: [
              { type: "operationalization-row", id: row.id },
              { type: "indicator", id: row.indicatorId, label: indLabel },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction:
              "Incluir este indicador en un criterio de contrastación.",
          });
        }
      }
    }
    return findings;
  },
};

const OPR004: RegisteredRule = {
  rule: {
    id: "OPR-004",
    name: "Filas de operacionalización duplicadas",
    description:
      "Detecta duplicación estructural exacta: misma variable + dimensión + indicador + fuente.",
    category: "redundancy",
    severity: "warning",
    appliesTo: ["operationalization-row"],
  },
  evaluate(input, _graph) {
    // Covered by IND-005 (same logic). This rule focuses on the cross-matrix level.
    const findings: MethodologicalFinding[] = [];
    // Aggregate across all matrices
    const seen = new Map<string, { rowId: string; matrixId: string }>();
    for (const opMatrix of input.operationalizationMatrices) {
      for (const row of opMatrix.rows) {
        const key = `${row.variableId}||${row.dimension.nombre}||${row.indicatorId ?? ""}||${row.sourceId ?? ""}`;
        const existing = seen.get(key);
        if (existing) {
          if (!findings.some(f => f.entityRefs.some(r => r.id === row.id))) {
            findings.push({
              id: findingId("OPR-004", row.id),
              ruleId: "OPR-004",
              severity: "warning",
              title: "Filas de operacionalización duplicadas",
              explanation: `Dos filas de operacionalización comparten exactamente la misma variable, dimensión, indicador y fuente. Esto no aporta información metodológica nueva.`,
              evidence: [
                `Variable: ${row.variableId}`,
                `Dimensión: ${row.dimension.nombre}`,
                `Indicador: ${row.indicatorId ?? "ninguno"}`,
                `Fuente: ${row.sourceId ?? "ninguna"}`,
              ],
              entityRefs: [
                { type: "operationalization-row", id: row.id },
                { type: "operationalization-row", id: existing.rowId },
                { type: "operationalization-matrix", id: opMatrix.id },
              ],
              suggestedAction:
                "Eliminar la fila duplicada o diferenciarla en alguna dimensión.",
            });
          }
        } else {
          seen.set(key, { rowId: row.id, matrixId: opMatrix.id });
        }
      }
    }
    return findings;
  },
};

const OPR005: RegisteredRule = {
  rule: {
    id: "OPR-005",
    name: "Escala o unidad ausente",
    description:
      "Una fila de operacionalización sin escala de medición definida puede dificultar la recopilación y comparación de datos.",
    category: "operationalization-coherence",
    severity: "suggestion",
    appliesTo: ["operationalization-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    for (const opMatrix of input.operationalizationMatrices) {
      const hyp = input.hypotheses.find((h) => h.id === opMatrix.hypothesisId);
      for (const row of opMatrix.rows) {
        if (!row.escala) {
          findings.push({
            id: findingId("OPR-005", row.id),
            ruleId: "OPR-005",
            severity: "suggestion",
            title: "Escala de medición ausente",
            explanation: `La fila de operacionalización "${row.dimension.nombre || row.id}" no tiene escala de medición definida. Definirla facilita la recopilación y comparación de datos.`,
            evidence: [
              `Dimensión: ${row.dimension.nombre || "(sin nombre)"}`,
              "Escala: no definida",
            ],
            entityRefs: [
              { type: "operationalization-row", id: row.id },
              { type: "operationalization-matrix", id: opMatrix.id },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction:
              "Definir la escala de medición (nominal, ordinal, intervalo, razón).",
          });
        }
      }
    }
    return findings;
  },
};

// ─── F. Contrastation coherence ───────────────────────────────────────────────

const CON001: RegisteredRule = {
  rule: {
    id: "CON-001",
    name: "Evidencia esperada sin evidencia contraria",
    description:
      "Todo criterio de contrastación con evidencia esperada definida debe también tener evidencia contraria.",
    category: "contrastation-coherence",
    severity: "error",
    appliesTo: ["contrastation-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    for (const ctMatrix of input.contrastationMatrices) {
      const hyp = input.hypotheses.find((h) => h.id === ctMatrix.hypothesisId);
      for (const row of ctMatrix.rows) {
        if (row.evidenciaEsperada?.trim() && !row.evidenciaContraria?.trim()) {
          findings.push({
            id: findingId("CON-001", row.id),
            ruleId: "CON-001",
            severity: "error",
            title: "Evidencia esperada sin evidencia contraria",
            explanation: `El criterio de contrastación de la hipótesis "${hyp?.titulo ?? ctMatrix.hypothesisId}" tiene evidencia esperada definida pero no especifica evidencia contraria. Sin evidencia contraria, el criterio no puede falsarse.`,
            evidence: [
              `Evidencia esperada: "${row.evidenciaEsperada?.slice(0, 60) ?? ""}…"`,
              "Evidencia contraria: no definida",
            ],
            entityRefs: [
              { type: "contrastation-row", id: row.id },
              { type: "contrastation-matrix", id: ctMatrix.id },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction:
              "Definir qué evidencia invalidaría esta hipótesis en este criterio.",
          });
        }
      }
    }
    return findings;
  },
};

const CON002: RegisteredRule = {
  rule: {
    id: "CON-002",
    name: "Evidencia contraria sin criterio de interpretación",
    description:
      "Un criterio con evidencia contraria definida debe especificar cómo interpretarla.",
    category: "contrastation-coherence",
    severity: "warning",
    appliesTo: ["contrastation-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    for (const ctMatrix of input.contrastationMatrices) {
      const hyp = input.hypotheses.find((h) => h.id === ctMatrix.hypothesisId);
      for (const row of ctMatrix.rows) {
        if (row.evidenciaContraria?.trim() && !row.criterioInterpretacion?.trim()) {
          findings.push({
            id: findingId("CON-002", row.id),
            ruleId: "CON-002",
            severity: "warning",
            title: "Evidencia contraria sin criterio de interpretación",
            explanation: `El criterio de contrastación tiene evidencia contraria definida pero no especifica cómo debe interpretarse si esa evidencia se observa. El analista puede quedar sin orientación metodológica.`,
            evidence: [
              `Evidencia contraria: "${row.evidenciaContraria?.slice(0, 60) ?? ""}…"`,
              "Criterio de interpretación: no definido",
            ],
            entityRefs: [
              { type: "contrastation-row", id: row.id },
              { type: "contrastation-matrix", id: ctMatrix.id },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction:
              "Agregar un criterio de interpretación que indique qué conclusión se extrae si se observa la evidencia contraria.",
          });
        }
      }
    }
    return findings;
  },
};

const CON003: RegisteredRule = {
  rule: {
    id: "CON-003",
    name: "Contrastación con indicador no operacionalizado",
    description:
      "Un criterio de contrastación usa un indicador que no aparece en ninguna fila de operacionalización.",
    category: "contrastation-coherence",
    severity: "error",
    appliesTo: ["contrastation-row", "operationalization-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    const opIndicatorIds = new Set<string>();
    for (const opMatrix of input.operationalizationMatrices) {
      for (const row of opMatrix.rows) {
        if (row.indicatorId) opIndicatorIds.add(row.indicatorId);
      }
    }
    for (const ctMatrix of input.contrastationMatrices) {
      const hyp = input.hypotheses.find((h) => h.id === ctMatrix.hypothesisId);
      for (const row of ctMatrix.rows) {
        if (!row.indicadorId) continue;
        if (!opIndicatorIds.has(row.indicadorId)) {
          let indLabel = row.indicadorId;
          for (const model of input.conceptualModels) {
            const found = model.indicators.find((i) => i.id === row.indicadorId);
            if (found) { indLabel = found.nombre; break; }
          }
          findings.push({
            id: findingId("CON-003", row.id),
            ruleId: "CON-003",
            severity: "error",
            title: "Contrastación con indicador no operacionalizado",
            explanation: `El criterio de contrastación usa el indicador "${indLabel}" que no aparece en ninguna fila de operacionalización. La contrastación no puede ejecutarse sin operacionalización previa del indicador.`,
            evidence: [
              `Indicador: ${indLabel}`,
              "En operacionalización: No",
            ],
            entityRefs: [
              { type: "contrastation-row", id: row.id },
              { type: "indicator", id: row.indicadorId, label: indLabel },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction:
              "Operacionalizar este indicador antes de usarlo en la contrastación.",
          });
        }
      }
    }
    return findings;
  },
};

const CON004: RegisteredRule = {
  rule: {
    id: "CON-004",
    name: "Contrastación con fuente no operacionalizada",
    description:
      "Un criterio de contrastación usa una fuente que no aparece en ninguna fila de operacionalización.",
    category: "contrastation-coherence",
    severity: "warning",
    appliesTo: ["contrastation-row", "operationalization-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    const opSourceIds = new Set<string>();
    for (const opMatrix of input.operationalizationMatrices) {
      for (const row of opMatrix.rows) {
        if (row.sourceId) opSourceIds.add(row.sourceId);
      }
    }
    for (const ctMatrix of input.contrastationMatrices) {
      const hyp = input.hypotheses.find((h) => h.id === ctMatrix.hypothesisId);
      for (const row of ctMatrix.rows) {
        if (!row.fuenteId) continue;
        if (!opSourceIds.has(row.fuenteId)) {
          let srcLabel = row.fuenteId;
          for (const model of input.conceptualModels) {
            const found = model.evidenceSources.find((s) => s.id === row.fuenteId);
            if (found) { srcLabel = found.nombre; break; }
          }
          findings.push({
            id: findingId("CON-004", row.id),
            ruleId: "CON-004",
            severity: "warning",
            title: "Contrastación con fuente no operacionalizada",
            explanation: `El criterio de contrastación usa la fuente "${srcLabel}" que no aparece en ninguna fila de operacionalización. La fuente no tiene protocolo de recopilación definido.`,
            evidence: [
              `Fuente: ${srcLabel}`,
              "En operacionalización: No",
            ],
            entityRefs: [
              { type: "contrastation-row", id: row.id },
              { type: "evidence-source", id: row.fuenteId, label: srcLabel },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction:
              "Incluir esta fuente en una fila de operacionalización para documentar cómo se recopilará.",
          });
        }
      }
    }
    return findings;
  },
};

const CON005: RegisteredRule = {
  rule: {
    id: "CON-005",
    name: "Hipótesis sin criterios de contrastación",
    description:
      "Toda hipótesis en la sesión debe tener una matriz de contrastación asociada con al menos un criterio.",
    category: "contrastation-coherence",
    severity: "error",
    appliesTo: ["hypothesis", "contrastation-matrix"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    for (const hyp of input.hypotheses) {
      const ctMatrix = input.contrastationMatrices.find(
        (m) => m.hypothesisId === hyp.id
      );
      if (!ctMatrix || ctMatrix.rows.length === 0) {
        findings.push({
          id: findingId("CON-005", hyp.id),
          ruleId: "CON-005",
          severity: "error",
          title: "Hipótesis sin criterios de contrastación",
          explanation: `La hipótesis "${hyp.titulo}" no tiene ningún criterio de contrastación definido. Sin contrastación, la hipótesis no puede evaluarse empíricamente.`,
          evidence: [
            `Hipótesis: ${hyp.titulo}`,
            `Matriz de contrastación: ${ctMatrix ? "existe pero vacía" : "no existe"}`,
          ],
          entityRefs: [
            { type: "hypothesis", id: hyp.id, label: hyp.titulo },
            ...(ctMatrix ? [{ type: "contrastation-matrix" as const, id: ctMatrix.id }] : []),
          ],
          suggestedAction:
            "Completar la matriz de contrastación con al menos un criterio.",
        });
      }
    }
    return findings;
  },
};

const CON006: RegisteredRule = {
  rule: {
    id: "CON-006",
    name: "Criterio de contrastación duplicado",
    description:
      "Detecta duplicación exacta: mismo indicador + misma fuente + misma evidencia esperada + misma evidencia contraria.",
    category: "redundancy",
    severity: "warning",
    appliesTo: ["contrastation-row"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    for (const ctMatrix of input.contrastationMatrices) {
      const hyp = input.hypotheses.find((h) => h.id === ctMatrix.hypothesisId);
      const seen = new Map<string, string>(); // key → first rowId
      for (const row of ctMatrix.rows) {
        const key = `${row.indicadorId ?? ""}||${row.fuenteId ?? ""}||${row.evidenciaEsperada ?? ""}||${row.evidenciaContraria ?? ""}`;
        const existing = seen.get(key);
        if (existing) {
          findings.push({
            id: findingId("CON-006", row.id),
            ruleId: "CON-006",
            severity: "warning",
            title: "Criterio de contrastación duplicado",
            explanation: `Dos criterios de contrastación en la hipótesis "${hyp?.titulo ?? ctMatrix.hypothesisId}" son idénticos (mismo indicador, fuente, evidencia esperada y contraria). Esto no aporta información adicional.`,
            evidence: [
              `Primera fila: ${existing}`,
              `Fila duplicada: ${row.id}`,
            ],
            entityRefs: [
              { type: "contrastation-row", id: row.id },
              { type: "contrastation-row", id: existing },
              { type: "contrastation-matrix", id: ctMatrix.id },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction: "Eliminar el criterio duplicado.",
          });
        } else {
          seen.set(key, row.id);
        }
      }
    }
    return findings;
  },
};

// ─── G. Traceability ──────────────────────────────────────────────────────────

const TRA001: RegisteredRule = {
  rule: {
    id: "TRA-001",
    name: "Cadena metodológica incompleta",
    description:
      "Detecta rupturas en la cadena Hipótesis→Variable→Indicador→Fuente→Operacionalización→Contrastación.",
    category: "traceability",
    severity: "error",
    appliesTo: ["hypothesis", "conceptual-variable", "indicator", "evidence-source",
      "operationalization-matrix", "contrastation-matrix"],
  },
  evaluate(input, _graph) {
    const findings: MethodologicalFinding[] = [];
    for (const hyp of input.hypotheses) {
      const model = input.conceptualModels.find((m) => m.hypothesisId === hyp.id);
      const opMatrix = input.operationalizationMatrices.find(
        (m) => m.hypothesisId === hyp.id
      );
      const ctMatrix = input.contrastationMatrices.find(
        (m) => m.hypothesisId === hyp.id
      );
      const breaks: string[] = [];
      if (!model || model.variables.length === 0) breaks.push("→ Variables");
      if (!model || model.indicators.length === 0) breaks.push("→ Indicadores");
      if (!model || model.evidenceSources.length === 0) breaks.push("→ Fuentes");
      if (!opMatrix || opMatrix.rows.length === 0) breaks.push("→ Operacionalización");
      if (!ctMatrix || ctMatrix.rows.length === 0) breaks.push("→ Contrastación");
      if (breaks.length > 0) {
        const sev = breaks.some((b) =>
          b.includes("Variables") ||
          b.includes("Operacionalización") ||
          b.includes("Contrastación")
        )
          ? "error" as const
          : "warning" as const;
        findings.push({
          id: findingId("TRA-001", hyp.id),
          ruleId: "TRA-001",
          severity: sev,
          title: "Cadena metodológica incompleta",
          explanation: `La cadena metodológica de la hipótesis "${hyp.titulo}" está incompleta. Etapas faltantes: ${breaks.join(", ")}.`,
          evidence: [
            `Variables: ${model?.variables.length ?? 0}`,
            `Indicadores: ${model?.indicators.length ?? 0}`,
            `Fuentes: ${model?.evidenceSources.length ?? 0}`,
            `Filas de op.: ${opMatrix?.rows.length ?? 0}`,
            `Criterios de ct.: ${ctMatrix?.rows.length ?? 0}`,
          ],
          entityRefs: [
            { type: "hypothesis", id: hyp.id, label: hyp.titulo },
            ...(model ? [{ type: "conceptual-model" as const, id: model.id }] : []),
          ],
          suggestedAction: `Completar las etapas faltantes: ${breaks.join(", ")}.`,
        });
      }
    }
    return findings;
  },
};

const TRA002: RegisteredRule = {
  rule: {
    id: "TRA-002",
    name: "Referencia rota en el Knowledge Graph",
    description:
      "Una arista del Knowledge Graph referencia un nodo que no existe. Consume directamente validateGraph().",
    category: "traceability",
    severity: "error",
    appliesTo: ["hypothesis", "conceptual-variable", "indicator", "evidence-source",
      "operationalization-row", "contrastation-row"],
  },
  evaluate(_input, graph) {
    const validation = validateGraph(graph);
    const findings: MethodologicalFinding[] = [];
    const brokenRefs = validation.errors.filter(
      (e) => e.code === "broken-reference"
    ) as Array<{ code: "broken-reference"; edgeId: string; missingNodeId: string }>;
    for (const err of brokenRefs) {
      findings.push({
        id: findingId("TRA-002", err.edgeId),
        ruleId: "TRA-002",
        severity: "error",
        title: "Referencia rota en el Knowledge Graph",
        explanation: `La arista "${err.edgeId}" referencia el nodo "${err.missingNodeId}" que no existe en el grafo. Esto indica una inconsistencia entre las estructuras de sesión.`,
        evidence: [
          `Arista: ${err.edgeId}`,
          `Nodo faltante: ${err.missingNodeId}`,
        ],
        entityRefs: [],
        suggestedAction:
          "Verificar que todas las referencias entre entidades (variableId, indicatorId, sourceId) sean válidas.",
      });
    }
    return findings;
  },
};

const TRA003: RegisteredRule = {
  rule: {
    id: "TRA-003",
    name: "Entidad aislada",
    description:
      "Entidad sin ninguna conexión en el Knowledge Graph. Diferenciado por si la relación es obligatoria (warning) o reutilizable (suggestion).",
    category: "traceability",
    severity: "warning",
    appliesTo: ["conceptual-variable", "indicator", "evidence-source",
      "operationalization-row", "contrastation-row"],
  },
  evaluate(_input, graph) {
    const validation = validateGraph(graph);
    const findings: MethodologicalFinding[] = [];
    // isolated-entity warnings from validateGraph
    const isolated = validation.warnings.filter(
      (w) => w.code === "isolated-entity"
    ) as Array<{ code: "isolated-entity"; nodeId: string; nodeType: string }>;
    // Required-relation types → warning
    const requiredRelationTypes = new Set([
      "indicator", "conceptual-variable", "operationalization-row", "contrastation-row",
    ]);
    // Reusable types → suggestion
    for (const warn of isolated) {
      const sev = requiredRelationTypes.has(warn.nodeType) ? "warning" as const : "suggestion" as const;
      const node = graph.nodes.find((n) => n.id === warn.nodeId);
      findings.push({
        id: findingId("TRA-003", warn.nodeId),
        ruleId: "TRA-003",
        severity: sev,
        title: "Entidad aislada",
        explanation: `El nodo "${node?.metadata.label ?? warn.nodeId}" (tipo: ${warn.nodeType}) no tiene ninguna conexión en el Knowledge Graph. ${
          sev === "warning"
            ? "Esta entidad requiere relaciones para ser útil metodológicamente."
            : "Esta entidad es válida pero no está siendo utilizada."
        }`,
        evidence: [
          `Nodo: ${warn.nodeId}`,
          `Tipo: ${warn.nodeType}`,
          "Relaciones: ninguna",
        ],
        entityRefs: [],
        suggestedAction:
          sev === "warning"
            ? "Conectar esta entidad a la cadena metodológica."
            : "Verificar si esta entidad es necesaria.",
      });
    }
    return findings;
  },
};

const TRA004: RegisteredRule = {
  rule: {
    id: "TRA-004",
    name: "Dependencia circular ilegal",
    description:
      "El Knowledge Graph no debe contener ciclos. Consume directamente validateGraph().",
    category: "traceability",
    severity: "error",
    appliesTo: ["hypothesis", "conceptual-variable", "indicator", "evidence-source",
      "operationalization-row", "contrastation-row"],
  },
  evaluate(_input, graph) {
    const validation = validateGraph(graph);
    const findings: MethodologicalFinding[] = [];
    const cycles = validation.errors.filter(
      (e) => e.code === "illegal-cycle"
    ) as Array<{ code: "illegal-cycle"; cycle: string[] }>;
    for (const err of cycles) {
      findings.push({
        id: findingId("TRA-004", err.cycle[0] ?? "cycle"),
        ruleId: "TRA-004",
        severity: "error",
        title: "Dependencia circular ilegal",
        explanation: `Se detectó un ciclo en el Knowledge Graph: ${err.cycle.join(" → ")}. Los datos de sesión HELIOS no deben contener dependencias circulares.`,
        evidence: [`Ciclo: ${err.cycle.join(" → ")}`],
        entityRefs: [],
        suggestedAction:
          "Revisar las referencias entre entidades para eliminar el ciclo.",
      });
    }
    return findings;
  },
};

// ─── G. Evidence evaluation rules (S-022) ─────────────────────────────────────
// These rules require input.evidenceEvaluationMatrices (optional).
// When absent, the rules return no findings (backward compatible).

const EVD001: RegisteredRule = {
  rule: {
    id: "EVD-001",
    name: "Criterio sin evidencia observada",
    description:
      "Toda fila de contrastación confirmada debe tener al menos una evidencia observada.",
    category: "evidence-coverage",
    severity: "warning",
    appliesTo: ["contrastation-row"],
  },
  evaluate(input, _graph) {
    const matrices = input.evidenceEvaluationMatrices ?? [];
    if (matrices.length === 0) return [];
    const findings: MethodologicalFinding[] = [];
    for (const ctMatrix of input.contrastationMatrices) {
      const hyp = input.hypotheses.find((h) => h.id === ctMatrix.hypothesisId);
      const eem = matrices.find((m) => m.hypothesisId === ctMatrix.hypothesisId);
      for (const row of ctMatrix.rows) {
        const hasEvidence = eem?.observedEvidence.some(
          (ev) => ev.contrastationRowId === row.id
        );
        if (!hasEvidence) {
          findings.push({
            id: findingId("EVD-001", row.id),
            ruleId: "EVD-001",
            severity: "warning",
            title: "Criterio sin evidencia observada",
            explanation: `El criterio de contrastación ${row.id} de la hipótesis "${hyp?.titulo ?? ctMatrix.hypothesisId}" no tiene evidencias observadas registradas.`,
            evidence: [`Criterio: ${row.id}`, "Evidencias observadas: ninguna"],
            entityRefs: [
              { type: "contrastation-row", id: row.id },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction: "Registrar al menos una evidencia observada para este criterio.",
          });
        }
      }
    }
    return findings;
  },
};

const EVD002: RegisteredRule = {
  rule: {
    id: "EVD-002",
    name: "Evidencia con indicador diferente al criterio",
    description:
      "El indicador registrado en la evidencia debe coincidir con el indicador del criterio de contrastación.",
    category: "evidence-coverage",
    severity: "error",
    appliesTo: ["contrastation-row", "indicator"],
  },
  evaluate(input, _graph) {
    const matrices = input.evidenceEvaluationMatrices ?? [];
    if (matrices.length === 0) return [];
    const findings: MethodologicalFinding[] = [];
    // Build map of row → indicadorId
    const rowIndicatorMap = new Map<string, string>();
    for (const ctMatrix of input.contrastationMatrices) {
      for (const row of ctMatrix.rows) {
        if (row.indicadorId) rowIndicatorMap.set(row.id, row.indicadorId);
      }
    }
    for (const eem of matrices) {
      const hyp = input.hypotheses.find((h) => h.id === eem.hypothesisId);
      for (const ev of eem.observedEvidence) {
        const expectedIndicatorId = rowIndicatorMap.get(ev.contrastationRowId);
        if (expectedIndicatorId && ev.indicatorId && ev.indicatorId !== expectedIndicatorId) {
          findings.push({
            id: findingId("EVD-002", ev.id),
            ruleId: "EVD-002",
            severity: "error",
            title: "Evidencia con indicador diferente al criterio",
            explanation: `La evidencia "${ev.title || ev.id}" referencia el indicador ${ev.indicatorId}, pero el criterio de contrastación ${ev.contrastationRowId} espera el indicador ${expectedIndicatorId}.`,
            evidence: [
              `Evidencia: ${ev.title || ev.id}`,
              `Indicador en evidencia: ${ev.indicatorId}`,
              `Indicador esperado por criterio: ${expectedIndicatorId}`,
            ],
            entityRefs: [
              { type: "contrastation-row", id: ev.contrastationRowId },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction: "Verificar que la evidencia corresponde al indicador correcto del criterio.",
          });
        }
      }
    }
    return findings;
  },
};

const EVD003: RegisteredRule = {
  rule: {
    id: "EVD-003",
    name: "Evidencia con fuente diferente al criterio",
    description:
      "La fuente de la evidencia difiere de la fuente esperada en el criterio. No se prohíbe — una fuente complementaria puede ser válida — pero debe verificarse.",
    category: "evidence-coverage",
    severity: "warning",
    appliesTo: ["contrastation-row", "evidence-source"],
  },
  evaluate(input, _graph) {
    const matrices = input.evidenceEvaluationMatrices ?? [];
    if (matrices.length === 0) return [];
    const findings: MethodologicalFinding[] = [];
    const rowSourceMap = new Map<string, string>();
    for (const ctMatrix of input.contrastationMatrices) {
      for (const row of ctMatrix.rows) {
        if (row.fuenteId) rowSourceMap.set(row.id, row.fuenteId);
      }
    }
    for (const eem of matrices) {
      const hyp = input.hypotheses.find((h) => h.id === eem.hypothesisId);
      for (const ev of eem.observedEvidence) {
        const expectedSourceId = rowSourceMap.get(ev.contrastationRowId);
        if (expectedSourceId && ev.sourceId && ev.sourceId !== expectedSourceId) {
          findings.push({
            id: findingId("EVD-003", ev.id),
            ruleId: "EVD-003",
            severity: "warning",
            title: "Evidencia con fuente diferente al criterio",
            explanation: `La evidencia "${ev.title || ev.id}" usa la fuente ${ev.sourceId}, pero el criterio espera la fuente ${expectedSourceId}. Una fuente alternativa puede ser válida, pero debe documentarse.`,
            evidence: [
              `Fuente en evidencia: ${ev.sourceId}`,
              `Fuente esperada por criterio: ${expectedSourceId}`,
            ],
            entityRefs: [
              { type: "contrastation-row", id: ev.contrastationRowId },
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction: "Verificar si la fuente alternativa es metodológicamente justificable y documentarlo en la evaluación.",
          });
        }
      }
    }
    return findings;
  },
};

const EVD004: RegisteredRule = {
  rule: {
    id: "EVD-004",
    name: "Evidencia sin evaluación",
    description: "Toda evidencia observada debe tener al menos una evaluación asociada.",
    category: "evidence-coverage",
    severity: "warning",
    appliesTo: ["contrastation-row"],
  },
  evaluate(input, _graph) {
    const matrices = input.evidenceEvaluationMatrices ?? [];
    if (matrices.length === 0) return [];
    const findings: MethodologicalFinding[] = [];
    for (const eem of matrices) {
      const hyp = input.hypotheses.find((h) => h.id === eem.hypothesisId);
      const assessedIds = new Set(eem.assessments.map((a) => a.observedEvidenceId));
      for (const ev of eem.observedEvidence) {
        if (!assessedIds.has(ev.id)) {
          findings.push({
            id: findingId("EVD-004", ev.id),
            ruleId: "EVD-004",
            severity: "warning",
            title: "Evidencia sin evaluación",
            explanation: `La evidencia "${ev.title || ev.id}" de la hipótesis "${hyp?.titulo ?? eem.hypothesisId}" no tiene evaluación asociada.`,
            evidence: [`Evidencia: ${ev.title || ev.id}`, "Evaluación: ninguna"],
            entityRefs: [
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction: "Agregar una evaluación (dirección, confianza, justificación) para esta evidencia.",
          });
        }
      }
    }
    return findings;
  },
};

const EVD005: RegisteredRule = {
  rule: {
    id: "EVD-005",
    name: "Evaluación sin justificación",
    description: "Toda evaluación de evidencia debe tener una justificación explícita.",
    category: "evidence-coverage",
    severity: "error",
    appliesTo: ["contrastation-row"],
  },
  evaluate(input, _graph) {
    const matrices = input.evidenceEvaluationMatrices ?? [];
    if (matrices.length === 0) return [];
    const findings: MethodologicalFinding[] = [];
    for (const eem of matrices) {
      const hyp = input.hypotheses.find((h) => h.id === eem.hypothesisId);
      for (const a of eem.assessments) {
        if (!a.justification.trim()) {
          const ev = eem.observedEvidence.find((e) => e.id === a.observedEvidenceId);
          findings.push({
            id: findingId("EVD-005", a.id),
            ruleId: "EVD-005",
            severity: "error",
            title: "Evaluación sin justificación",
            explanation: `La evaluación de la evidencia "${ev?.title || a.observedEvidenceId}" de la hipótesis "${hyp?.titulo ?? eem.hypothesisId}" no tiene justificación.`,
            evidence: [`Evaluación ID: ${a.id}`, "Justificación: ausente"],
            entityRefs: [
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction: "Documentar la justificación del juicio metodológico en la evaluación.",
          });
        }
      }
    }
    return findings;
  },
};

const EVD006: RegisteredRule = {
  rule: {
    id: "EVD-006",
    name: "Evidencia incompatible con la hipótesis",
    description:
      "Incompatibilidad estructural: la evidencia referencia una hipótesis, criterio o indicador de otra cadena metodológica.",
    category: "evidence-coverage",
    severity: "error",
    appliesTo: ["hypothesis", "contrastation-row"],
  },
  evaluate(input, _graph) {
    const matrices = input.evidenceEvaluationMatrices ?? [];
    if (matrices.length === 0) return [];
    const findings: MethodologicalFinding[] = [];
    // Build set of ctRow IDs per hypothesis
    const hypCtRowIds = new Map<string, Set<string>>();
    for (const ctMatrix of input.contrastationMatrices) {
      hypCtRowIds.set(ctMatrix.hypothesisId, new Set(ctMatrix.rows.map((r) => r.id)));
    }
    for (const eem of matrices) {
      const hyp = input.hypotheses.find((h) => h.id === eem.hypothesisId);
      const validCtRowIds = hypCtRowIds.get(eem.hypothesisId) ?? new Set();
      for (const ev of eem.observedEvidence) {
        // Check if the ct-row belongs to a different hypothesis
        if (ev.contrastationRowId && !validCtRowIds.has(ev.contrastationRowId)) {
          findings.push({
            id: findingId("EVD-006", ev.id),
            ruleId: "EVD-006",
            severity: "error",
            title: "Evidencia incompatible con la hipótesis",
            explanation: `La evidencia "${ev.title || ev.id}" referencia el criterio ${ev.contrastationRowId} que no pertenece a la hipótesis "${hyp?.titulo ?? eem.hypothesisId}".`,
            evidence: [
              `Evidencia: ${ev.title || ev.id}`,
              `Criterio referenciado: ${ev.contrastationRowId}`,
              `Hipótesis de la matriz: ${eem.hypothesisId}`,
            ],
            entityRefs: [
              ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
            ],
            suggestedAction: "Verificar que la evidencia pertenece a la cadena metodológica de la hipótesis correcta.",
          });
        }
      }
    }
    return findings;
  },
};

const EVD007: RegisteredRule = {
  rule: {
    id: "EVD-007",
    name: "Conclusión sin cobertura suficiente",
    description:
      "La conclusión metodológica de una hipótesis requiere cobertura mínima: criterios con evidencia, evidencia evaluada, sin evaluaciones pendientes ni errores bloqueantes.",
    category: "completeness",
    severity: "error",
    appliesTo: ["hypothesis"],
  },
  evaluate(input, _graph) {
    const matrices = input.evidenceEvaluationMatrices ?? [];
    if (matrices.length === 0) return [];
    const conclusions = input.hypothesisEvidenceConclusions ?? [];
    if (conclusions.length === 0) return [];
    const findings: MethodologicalFinding[] = [];
    for (const conclusion of conclusions) {
      const eem = matrices.find((m) => m.hypothesisId === conclusion.hypothesisId);
      const hyp = input.hypotheses.find((h) => h.id === conclusion.hypothesisId);
      if (!eem) {
        findings.push({
          id: findingId("EVD-007", conclusion.id),
          ruleId: "EVD-007",
          severity: "error",
          title: "Conclusión sin matriz de evaluación",
          explanation: `La conclusión de la hipótesis "${hyp?.titulo ?? conclusion.hypothesisId}" no tiene una matriz de evaluación de evidencia asociada.`,
          evidence: ["Matriz de evaluación: no encontrada"],
          entityRefs: [
            ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
          ],
          suggestedAction: "Crear una matriz de evaluación de evidencia antes de formular la conclusión.",
        });
        continue;
      }
      const ctMatrix = input.contrastationMatrices.find(
        (m) => m.hypothesisId === conclusion.hypothesisId
      );
      if (!ctMatrix) continue;
      // Criterios sin evidencia
      const criteriaWithoutEvidence = ctMatrix.rows.filter(
        (row) => !eem.observedEvidence.some((ev) => ev.contrastationRowId === row.id)
      );
      if (criteriaWithoutEvidence.length > 0) {
        findings.push({
          id: findingId("EVD-007", `${conclusion.id}-cov`),
          ruleId: "EVD-007",
          severity: "error",
          title: "Conclusión con criterios sin evidencia",
          explanation: `La conclusión de "${hyp?.titulo ?? conclusion.hypothesisId}" tiene ${criteriaWithoutEvidence.length} criterio(s) de contrastación sin evidencias observadas.`,
          evidence: [`Criterios sin evidencia: ${criteriaWithoutEvidence.length}`],
          entityRefs: [
            ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
          ],
          suggestedAction: "Registrar evidencias para todos los criterios antes de formular la conclusión.",
        });
      }
      // Evidencia sin evaluación
      const assessedIds = new Set(eem.assessments.map((a) => a.observedEvidenceId));
      const unassessedEvidence = eem.observedEvidence.filter(
        (ev) => !assessedIds.has(ev.id)
      );
      if (unassessedEvidence.length > 0) {
        findings.push({
          id: findingId("EVD-007", `${conclusion.id}-eval`),
          ruleId: "EVD-007",
          severity: "error",
          title: "Conclusión con evidencia sin evaluar",
          explanation: `La conclusión de "${hyp?.titulo ?? conclusion.hypothesisId}" tiene ${unassessedEvidence.length} evidencia(s) sin evaluación.`,
          evidence: [`Evidencias sin evaluar: ${unassessedEvidence.length}`],
          entityRefs: [
            ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
          ],
          suggestedAction: "Evaluar toda la evidencia observada antes de formular la conclusión.",
        });
      }
      // Evaluaciones pendientes
      const pendingAssessments = eem.assessments.filter(
        (a) => a.status === "pending" || a.status === "needs-review"
      );
      if (pendingAssessments.length > 0) {
        findings.push({
          id: findingId("EVD-007", `${conclusion.id}-pend`),
          ruleId: "EVD-007",
          severity: "error",
          title: "Conclusión con evaluaciones pendientes",
          explanation: `La conclusión de "${hyp?.titulo ?? conclusion.hypothesisId}" tiene ${pendingAssessments.length} evaluación(es) en estado pendiente o que requieren revisión.`,
          evidence: [`Evaluaciones pendientes: ${pendingAssessments.length}`],
          entityRefs: [
            ...(hyp ? [{ type: "hypothesis" as const, id: hyp.id, label: hyp.titulo }] : []),
          ],
          suggestedAction: "Completar o revisar las evaluaciones pendientes.",
        });
      }
    }
    return findings;
  },
};

// ─── Exported registry ────────────────────────────────────────────────────────

/** All registered rules in evaluation order. */
export const ALL_RULES: RegisteredRule[] = [
  HYP001, HYP002, HYP003, HYP004,
  VAR001, VAR002, VAR003, VAR004,
  IND001, IND002, IND003, IND004, IND005,
  SRC001, SRC002, SRC003,
  OPR001, OPR002, OPR003, OPR004, OPR005,
  CON001, CON002, CON003, CON004, CON005, CON006,
  TRA001, TRA002, TRA003, TRA004,
  // S-022 — Evidence evaluation rules
  EVD001, EVD002, EVD003, EVD004, EVD005, EVD006, EVD007,
];

/** Get a rule descriptor by ID. */
export function getRuleById(id: string): MethodologicalRule | undefined {
  return ALL_RULES.find((r) => r.rule.id === id)?.rule;
}
