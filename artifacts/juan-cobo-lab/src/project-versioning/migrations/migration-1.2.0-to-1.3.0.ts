/**
 * S-027 — Schema Migration: 1.2.0 → 1.3.0
 *
 * Adds contributions: Contribution[] to ProjectSnapshotPayload.
 * All existing projects receive contributions: [] (no synthesis required;
 * contributions genuinely did not exist before S-027).
 *
 * Migration is additive and non-destructive. All 1.2.0 fields are
 * preserved verbatim. No content transformation occurs.
 *
 * ADR-0016: contributions: Contribution[] is non-optional in 1.3.0 payloads.
 * The BFS engine in MigrationService handles the full chain:
 *   0.9.0 → 1.0.0 → 1.1.0 → 1.2.0 → 1.3.0
 */

import type { SchemaMigration } from "../types";

export const migration_1_2_0_to_1_3_0: SchemaMigration = {
  fromVersion: "1.2.0",
  toVersion: "1.3.0",
  description:
    "S-027: Adds contributions: Contribution[] field. All existing projects start with contributions: [].",
  migrate(payload: unknown): unknown {
    const p = payload as Record<string, unknown>;
    return {
      ...p,
      // Preserve existing contributions if somehow already present (defensive)
      contributions: Array.isArray(p.contributions) ? p.contributions : [],
    };
  },
};
