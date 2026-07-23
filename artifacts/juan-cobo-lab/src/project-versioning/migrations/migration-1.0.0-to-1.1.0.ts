/**
 * S-025 — Schema Migration: 1.0.0 → 1.1.0
 *
 * Introduces the `understandingCase` field (Understanding Case Foundation).
 *
 * Changes from 1.0.0 to 1.1.0:
 * - Added `understandingCase` to ProjectSnapshotPayload.
 *
 * Migration strategy (ADR-0014 / Adjustment 2):
 *   Every project migrated from 1.0.0 represents an implicit Understanding Case.
 *   Rather than leaving `understandingCase: null` (which would create projects
 *   conceptually without a case), this migration synthesizes a compatible case
 *   from the existing `problema` field.
 *
 *   The synthesized case carries a `migrationOrigin` marker so it can be
 *   distinguished from user-created cases and refined later.
 *
 * No prior data is lost: all 1.0.0 fields are preserved verbatim.
 */

import type { SchemaMigration } from "../types";
import { synthesizeCaseFromPayload } from "@/understanding-case/UnderstandingCaseService";

export const migration_1_0_0_to_1_1_0: SchemaMigration = {
  fromVersion: "1.0.0",
  toVersion: "1.1.0",
  description:
    "Adds understandingCase field. Synthesizes a case from the existing problema " +
    "field with a migrationOrigin marker. No existing data is modified.",
  migrate: (payload: unknown): unknown => {
    if (!payload || typeof payload !== "object") {
      throw new Error("Migration 1.0.0→1.1.0: payload must be an object");
    }

    const p = payload as Record<string, unknown>;
    const problema = typeof p.problema === "string" ? p.problema : "";

    return {
      // ── Preserve all 1.0.0 fields verbatim ───────────────────────────────
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
      // ── New field: synthesized from problema ──────────────────────────────
      understandingCase: synthesizeCaseFromPayload(problema, "1.0.0"),
    };
  },
};
