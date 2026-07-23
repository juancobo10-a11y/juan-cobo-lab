/**
 * S-026 — Schema Migration: 1.1.0 → 1.2.0
 *
 * Introduces the `knowledgeSources` field (Knowledge Sources / Fuentes de Conocimiento).
 *
 * Changes from 1.1.0 to 1.2.0:
 * - Added `knowledgeSources: KnowledgeSource[]` to ProjectSnapshotPayload.
 *
 * Migration strategy (ADR-0015):
 *   All existing projects implicitly had zero Knowledge Sources.
 *   No synthesis is needed (unlike the S-025 UnderstandingCase migration).
 *   Migrated snapshots receive knowledgeSources: [], which is the exact
 *   semantic representation of a project that has not yet incorporated
 *   any sources.
 *
 * No prior data is lost: all 1.1.0 fields are preserved verbatim.
 */

import type { SchemaMigration } from "../types";

export const migration_1_1_0_to_1_2_0: SchemaMigration = {
  fromVersion: "1.1.0",
  toVersion: "1.2.0",
  description:
    "Adds knowledgeSources field (Fuentes de Conocimiento). " +
    "Migrated snapshots receive knowledgeSources: []. No existing data is modified.",
  migrate: (payload: unknown): unknown => {
    if (!payload || typeof payload !== "object") {
      throw new Error("Migration 1.1.0→1.2.0: payload must be an object");
    }

    const p = payload as Record<string, unknown>;

    return {
      // ── Preserve all 1.1.0 fields verbatim ───────────────────────────────
      understandingCase:             p.understandingCase ?? null,
      problema:                      p.problema ?? "",
      packActivo:                    p.packActivo ?? null,
      thinkingUserSelection:         p.thinkingUserSelection ?? null,
      reflectionAnswers:             Array.isArray(p.reflectionAnswers) ? p.reflectionAnswers : [],
      hypotheses:                    Array.isArray(p.hypotheses) ? p.hypotheses : [],
      primaryHypothesisId:           p.primaryHypothesisId,
      conceptualModels:              Array.isArray(p.conceptualModels) ? p.conceptualModels : [],
      operationalizationMatrices:    Array.isArray(p.operationalizationMatrices) ? p.operationalizationMatrices : [],
      contrastationMatrices:         Array.isArray(p.contrastationMatrices) ? p.contrastationMatrices : [],
      evidenceEvaluationMatrices:    Array.isArray(p.evidenceEvaluationMatrices) ? p.evidenceEvaluationMatrices : [],
      hypothesisEvidenceConclusions: Array.isArray(p.hypothesisEvidenceConclusions) ? p.hypothesisEvidenceConclusions : [],
      reportDefinitions:             Array.isArray(p.reportDefinitions) ? p.reportDefinitions : [],
      // ── New field: empty array for all migrated projects ──────────────────
      knowledgeSources: Array.isArray(p.knowledgeSources) ? p.knowledgeSources : [],
    };
  },
};
