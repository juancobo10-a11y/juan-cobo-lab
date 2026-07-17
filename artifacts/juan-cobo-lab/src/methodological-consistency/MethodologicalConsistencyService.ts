/**
 * S-021 — MethodologicalConsistencyService
 *
 * Pure functions for running a methodological audit over the HELIOS session.
 * No side effects. No mutation. No LLM. No external dependencies.
 *
 * Separation of responsibilities:
 *  S-017/S-018/S-019 → local entity validation (per instance)
 *  KnowledgeGraphService → structural integrity (graph DAG)
 *  MethodologicalConsistencyService → cross-entity coherence (this file)
 *
 * The service does NOT duplicate local validations. It evaluates consistency
 * that can only be detected with a full session view.
 */

import type {
  MethodologicalAudit,
  MethodologicalAuditInput,
  MethodologicalAuditSummary,
  MethodologicalFinding,
  MethodologicalRuleCategory,
  MethodologicalSeverity,
  MethodologicalEntityType,
  MethodologicalEntityReference,
} from "./types";
import { ALL_RULES } from "./rules";
import { buildGraph } from "@/knowledge-graph/KnowledgeGraphService";
import type { KnowledgeGraph } from "@/knowledge-graph/types";

// ─── runMethodologicalAudit ────────────────────────────────────────────────────

/**
 * Run all registered methodological rules against the session.
 *
 * Accepts an optional pre-built KnowledgeGraph. If absent, builds it from input.
 * Returns a MethodologicalAudit — derived, never persisted.
 * Does NOT mutate the input.
 */
export function runMethodologicalAudit(
  input: MethodologicalAuditInput,
  now?: string
): MethodologicalAudit {
  // Resolve or build the graph
  const graph: KnowledgeGraph = input.graph ?? buildGraph({
    problema: input.problema,
    hypotheses: input.hypotheses,
    conceptualModels: input.conceptualModels,
    operationalizationMatrices: input.operationalizationMatrices,
    contrastationMatrices: input.contrastationMatrices,
  });

  // Evaluate all rules
  const findings: MethodologicalFinding[] = [];
  const evaluatedRuleIds: string[] = [];

  for (const registered of ALL_RULES) {
    evaluatedRuleIds.push(registered.rule.id);
    const ruleFindings = registered.evaluate(input, graph);
    findings.push(...ruleFindings);
  }

  const summary = summarizeFindings(findings, input);

  return {
    generatedAt: now ?? new Date().toISOString(),
    findings,
    summary,
    evaluatedRuleIds,
  };
}

// ─── evaluateRule ─────────────────────────────────────────────────────────────

/**
 * Evaluate a single rule by ID against the session.
 * Returns an empty array if the rule ID is unknown.
 */
export function evaluateRule(
  ruleId: string,
  input: MethodologicalAuditInput
): MethodologicalFinding[] {
  const registered = ALL_RULES.find((r) => r.rule.id === ruleId);
  if (!registered) return [];
  const graph: KnowledgeGraph = input.graph ?? buildGraph({
    problema: input.problema,
    hypotheses: input.hypotheses,
    conceptualModels: input.conceptualModels,
    operationalizationMatrices: input.operationalizationMatrices,
    contrastationMatrices: input.contrastationMatrices,
  });
  return registered.evaluate(input, graph);
}

// ─── summarizeFindings ────────────────────────────────────────────────────────

/**
 * Produce a MethodologicalAuditSummary from a findings array.
 *
 * complete = no errors AND all required stages confirmed for every hypothesis:
 *  - conceptualModel.confirmed
 *  - operationalizationMatrix.confirmed
 *  - contrastationMatrix.confirmed
 */
export function summarizeFindings(
  findings: MethodologicalFinding[],
  input: Pick<MethodologicalAuditInput, "hypotheses" | "conceptualModels" |
    "operationalizationMatrices" | "contrastationMatrices">
): MethodologicalAuditSummary {
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const suggestions = findings.filter((f) => f.severity === "suggestion").length;

  const catSet = new Set<MethodologicalRuleCategory>();
  for (const f of findings) {
    const rule = ALL_RULES.find((r) => r.rule.id === f.ruleId);
    if (rule) catSet.add(rule.rule.category);
  }

  const blocking = errors > 0;

  // complete: no errors AND all hypotheses have confirmed model + op + ct
  let complete = !blocking;
  if (complete && input.hypotheses.length === 0) {
    complete = false;
  }
  for (const hyp of input.hypotheses) {
    const model = input.conceptualModels.find((m) => m.hypothesisId === hyp.id);
    const opMatrix = input.operationalizationMatrices.find((m) => m.hypothesisId === hyp.id);
    const ctMatrix = input.contrastationMatrices.find((m) => m.hypothesisId === hyp.id);
    if (!model?.confirmed || !opMatrix?.confirmed || !ctMatrix?.confirmed) {
      complete = false;
      break;
    }
  }

  return {
    totalFindings: findings.length,
    errors,
    warnings,
    suggestions,
    categoriesAffected: [...catSet],
    blocking,
    complete,
  };
}

// ─── groupFindingsByCategory ──────────────────────────────────────────────────

export function groupFindingsByCategory(
  findings: MethodologicalFinding[]
): Map<MethodologicalRuleCategory, MethodologicalFinding[]> {
  const groups = new Map<MethodologicalRuleCategory, MethodologicalFinding[]>();
  for (const f of findings) {
    const rule = ALL_RULES.find((r) => r.rule.id === f.ruleId);
    if (!rule) continue;
    const cat = rule.rule.category;
    const list = groups.get(cat) ?? [];
    list.push(f);
    groups.set(cat, list);
  }
  return groups;
}

// ─── groupFindingsBySeverity ──────────────────────────────────────────────────

export function groupFindingsBySeverity(
  findings: MethodologicalFinding[]
): Map<MethodologicalSeverity, MethodologicalFinding[]> {
  const groups = new Map<MethodologicalSeverity, MethodologicalFinding[]>();
  for (const f of findings) {
    const list = groups.get(f.severity) ?? [];
    list.push(f);
    groups.set(f.severity, list);
  }
  return groups;
}

// ─── groupFindingsByEntity ────────────────────────────────────────────────────

export function groupFindingsByEntity(
  findings: MethodologicalFinding[]
): Map<MethodologicalEntityType, MethodologicalFinding[]> {
  const groups = new Map<MethodologicalEntityType, MethodologicalFinding[]>();
  for (const f of findings) {
    const seen = new Set<MethodologicalEntityType>();
    for (const ref of f.entityRefs) {
      if (seen.has(ref.type)) continue;
      seen.add(ref.type);
      const list = groups.get(ref.type) ?? [];
      list.push(f);
      groups.set(ref.type, list);
    }
  }
  return groups;
}

// ─── findBlockingErrors ───────────────────────────────────────────────────────

export function findBlockingErrors(
  findings: MethodologicalFinding[]
): MethodologicalFinding[] {
  return findings.filter((f) => f.severity === "error");
}

// ─── findWarnings ─────────────────────────────────────────────────────────────

export function findWarnings(
  findings: MethodologicalFinding[]
): MethodologicalFinding[] {
  return findings.filter((f) => f.severity === "warning");
}

// ─── findSuggestions ──────────────────────────────────────────────────────────

export function findSuggestions(
  findings: MethodologicalFinding[]
): MethodologicalFinding[] {
  return findings.filter((f) => f.severity === "suggestion");
}

// ─── isMethodologicallyComplete ───────────────────────────────────────────────

/**
 * True when:
 *  - No blocking errors in any run
 *  - All hypotheses have confirmed conceptualModel + operationalizationMatrix + contrastationMatrix
 */
export function isMethodologicallyComplete(
  audit: MethodologicalAudit,
  input: Pick<MethodologicalAuditInput, "hypotheses" | "conceptualModels" |
    "operationalizationMatrices" | "contrastationMatrices">
): boolean {
  return summarizeFindings(audit.findings, input).complete;
}

// ─── Re-export types for convenience ─────────────────────────────────────────

export type {
  MethodologicalAudit,
  MethodologicalAuditInput,
  MethodologicalAuditSummary,
  MethodologicalFinding,
  MethodologicalRuleCategory,
  MethodologicalSeverity,
  MethodologicalEntityType,
  MethodologicalEntityReference,
};
