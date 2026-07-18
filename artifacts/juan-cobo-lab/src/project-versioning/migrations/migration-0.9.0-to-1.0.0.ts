/**
 * S-024 — Schema Migration: 0.9.0 → 1.0.0
 *
 * This is the initial migration for HELIOS project snapshots.
 * Version 0.9.0 was the pre-release schema (no formal versioning).
 * Version 1.0.0 is the first stable schema with full type definitions.
 *
 * Changes from 0.9.0 to 1.0.0:
 * - Added `reportDefinitions` field (previously absent)
 * - Added `primaryHypothesisId` field (previously absent)
 * - Normalized `evidenceEvaluationMatrices` field name (previously may have
 *   been `evidenceMatrices` in pre-release builds)
 *
 * This migration ensures backward compatibility with any pre-release snapshots.
 */

import type { SchemaMigration } from "../types";

export const migration_0_9_0_to_1_0_0: SchemaMigration = {
  fromVersion: "0.9.0",
  toVersion: "1.0.0",
  description:
    "Adds reportDefinitions and primaryHypothesisId fields; normalizes evidenceEvaluationMatrices field name.",
  migrate: (payload: unknown): unknown => {
    if (!payload || typeof payload !== "object") {
      throw new Error("Migration 0.9.0→1.0.0: payload must be an object");
    }

    const p = payload as Record<string, unknown>;

    return {
      problema: p.problema ?? "",
      packActivo: p.packActivo ?? null,
      thinkingUserSelection: p.thinkingUserSelection ?? null,
      reflectionAnswers: Array.isArray(p.reflectionAnswers) ? p.reflectionAnswers : [],
      hypotheses: Array.isArray(p.hypotheses) ? p.hypotheses : [],
      // primaryHypothesisId: new field, default to first hypothesis
      primaryHypothesisId:
        p.primaryHypothesisId ??
        (Array.isArray(p.hypotheses) && p.hypotheses.length > 0
          ? (p.hypotheses[0] as Record<string, unknown>).id
          : undefined),
      conceptualModels: Array.isArray(p.conceptualModels) ? p.conceptualModels : [],
      operationalizationMatrices: Array.isArray(p.operationalizationMatrices)
        ? p.operationalizationMatrices
        : [],
      contrastationMatrices: Array.isArray(p.contrastationMatrices)
        ? p.contrastationMatrices
        : [],
      // Normalize field name: "evidenceMatrices" (pre-release) → "evidenceEvaluationMatrices"
      evidenceEvaluationMatrices:
        Array.isArray(p.evidenceEvaluationMatrices)
          ? p.evidenceEvaluationMatrices
          : Array.isArray((p as Record<string, unknown>).evidenceMatrices)
          ? (p as Record<string, unknown>).evidenceMatrices
          : [],
      hypothesisEvidenceConclusions: Array.isArray(p.hypothesisEvidenceConclusions)
        ? p.hypothesisEvidenceConclusions
        : [],
      // reportDefinitions: new field, default to empty
      reportDefinitions: Array.isArray(p.reportDefinitions) ? p.reportDefinitions : [],
    };
  },
};
