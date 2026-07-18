/**
 * S-024 — Project Snapshot, Versioning & Reproducibility Engine
 *
 * Types for the project-versioning module.
 *
 * ADR-0013: Snapshots are immutable, deterministic, verifiable representations
 * of the methodological state. They are NOT backups, NOT encrypted, and NOT
 * equivalent to version control. The hash guarantees integrity, not
 * confidentiality.
 */

import type { KnowledgePack } from "@/router/types";
import type { ThinkingUserSelection } from "@/thinking/types";
import type { ReflectionAnswer } from "@/hypothesis/types";
import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type { OperationalizationMatrix } from "@/operationalization/types";
import type { ContrastationMatrix } from "@/contrastation/types";
import type { EvidenceEvaluationMatrix, HypothesisEvidenceConclusion } from "@/evidence-evaluation/types";
import type { ReportDefinition } from "@/report-builder/types";

// ─── Schema version ───────────────────────────────────────────────────────────

/**
 * CURRENT_PROJECT_SCHEMA_VERSION identifies the technical structure of the snapshot payload.
 * ≠ versionLabel (which is the user-declared methodological version label).
 *
 * Bump when payload fields are added, removed, or semantically changed.
 */
export const CURRENT_PROJECT_SCHEMA_VERSION = "1.0.0";

// ─── Payload ──────────────────────────────────────────────────────────────────

/**
 * The methodological state that must be persisted for full reproducibility.
 *
 * Excluded (because they are derived, transitional, or UI-only):
 * - pantalla, hipotesisActiva, hypothesesReviewed (UI state)
 * - routerResult, thinkingResult, candidateExplanations (derivable from payload)
 * - perequeMode (derived from thinkingUserSelection + packActivo)
 * - Knowledge Graph (derivable from payload)
 * - Audits, generated reports, validation results (derivable)
 *
 * Included in packActivo: full pack reference for reproducibility across versions.
 * Lists whose order has methodological meaning are preserved as-is.
 */
export interface ProjectSnapshotPayload {
  problema: string;
  packActivo: KnowledgePack | null;
  thinkingUserSelection: ThinkingUserSelection | null;
  reflectionAnswers: ReflectionAnswer[];
  hypotheses: PolicyHypothesis[];
  primaryHypothesisId: string | undefined;
  conceptualModels: ConceptualModel[];
  operationalizationMatrices: OperationalizationMatrix[];
  contrastationMatrices: ContrastationMatrix[];
  evidenceEvaluationMatrices: EvidenceEvaluationMatrix[];
  hypothesisEvidenceConclusions: HypothesisEvidenceConclusion[];
  reportDefinitions: ReportDefinition[];
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export interface ProjectSnapshotMetadata {
  projectId: string;
  projectName: string;
  versionLabel?: string;
  description?: string;
  author?: string;
  tags: string[];
  /** ID of a previous snapshot this one was derived from */
  sourceSnapshotId?: string;
  /** Human-readable summary of what changed since the source snapshot */
  changeSummary?: string;
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

/**
 * An immutable, verifiable representation of the methodological state
 * at a specific point in time.
 *
 * contentHash is computed over: schemaVersion + normalized payload + stable metadata.
 * It excludes: createdAt, contentHash itself, transitory text, accidental key order.
 */
export interface ProjectSnapshot {
  id: string;
  /** User-visible version string (e.g. "0.1.0" for auto-incremented) */
  version: string;
  /** Technical schema version — identifies payload structure */
  schemaVersion: string;
  metadata: ProjectSnapshotMetadata;
  payload: ProjectSnapshotPayload;
  /** Deterministic content fingerprint (MurmurHash3-128, hex) */
  contentHash: string;
  createdAt: string; // ISO-8601
}

// ─── Version ──────────────────────────────────────────────────────────────────

export type ProjectVersionTag =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "archived";

export interface ProjectVersion {
  id: string;
  snapshotId: string;
  label: string;
  tag?: ProjectVersionTag;
  notes?: string;
  createdAt: string; // ISO-8601
  parentVersionId?: string;
}

// ─── Diff ─────────────────────────────────────────────────────────────────────

export type ProjectChangeType =
  | "added"
  | "removed"
  | "modified"
  | "reordered"
  | "unchanged";

export interface ProjectEntityChange {
  entityType: string;
  entityId: string;
  changeType: ProjectChangeType;
  before?: unknown;
  after?: unknown;
  changedFields?: string[];
  traceability?: {
    hypothesisId?: string;
    parentEntityId?: string;
  };
}

export interface ProjectDiffSummary {
  added: number;
  removed: number;
  modified: number;
  reordered: number;
  unchanged: number;
  affectedEntityTypes: string[];
  /**
   * True when at least one breaking change is detected.
   * Breaking: hypothesis removed, referenced variable removed,
   * used indicator removed, evidence used in conclusion removed, broken ref.
   */
  hasBreakingChanges: boolean;
}

export interface ProjectDiff {
  baseSnapshotId: string;
  targetSnapshotId: string;
  changes: ProjectEntityChange[];
  summary: ProjectDiffSummary;
  /** ISO-8601 — excluded from hashes because diff is a derived artefact */
  generatedAt: string;
}

// ─── Methodological changelog entry ──────────────────────────────────────────

export interface MethodologicalChangelogSection {
  entityType: string;
  label: string;
  added: number;
  removed: number;
  modified: number;
  reordered: number;
}

export interface MethodologicalChangelog {
  sections: MethodologicalChangelogSection[];
  generatedAt: string;
}

// ─── Reproducibility ──────────────────────────────────────────────────────────

export interface ReproducibilityResult {
  reproducible: boolean;
  firstHash: string;
  secondHash: string;
  differences: string[];
}

// ─── Project package ──────────────────────────────────────────────────────────

export interface ProjectPackageManifest {
  format: "HELIOS_PROJECT_PACKAGE";
  packageVersion: string;
  schemaVersion: string;
  projectId: string;
  projectName: string;
  exportedAt: string;
  snapshotCount: number;
  versionCount: number;
  /**
   * Hash over: format + packageVersion + schemaVersion + projectId +
   *            sorted snapshot contentHashes.
   * Excludes exportedAt (allows date-stripped reproducibility) and packageHash itself.
   */
  packageHash: string;
}

export interface ProjectPackage {
  manifest: ProjectPackageManifest;
  snapshots: ProjectSnapshot[];
  versions: ProjectVersion[];
}

// ─── Import ───────────────────────────────────────────────────────────────────

export type ImportStrategy = "create-copy" | "replace-current" | "cancel";

export interface ProjectImportResult {
  success: boolean;
  strategy: ImportStrategy;
  importedProjectId: string;
  snapshotsImported: number;
  versionsImported: number;
  migrationsApplied: string[];
  conflictsDetected: string[];
  errors: string[];
  warnings: string[];
}

export interface ProjectIntegrityResult {
  valid: boolean;
  hashMatch: boolean;
  schemaVersionMatch: boolean;
  snapshotCount: number;
  errors: string[];
  warnings: string[];
}

// ─── Snapshot validation ──────────────────────────────────────────────────────

export interface SnapshotValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Schema migration ─────────────────────────────────────────────────────────

export interface SchemaMigration {
  fromVersion: string;
  toVersion: string;
  description: string;
  migrate: (payload: unknown) => unknown;
}

export interface SchemaMigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  migratedPayload: unknown;
  errors: string[];
}

// ─── Session reconstruction ───────────────────────────────────────────────────

/** The session fields that can be fully reconstructed from a snapshot */
export interface ReconstructedSession {
  problema: string;
  packActivo: KnowledgePack | null;
  thinkingUserSelection: ThinkingUserSelection | null;
  reflectionAnswers: ReflectionAnswer[];
  hypotheses: PolicyHypothesis[];
  primaryHypothesisId: string | undefined;
  conceptualModels: ConceptualModel[];
  operationalizationMatrices: OperationalizationMatrix[];
  contrastationMatrices: ContrastationMatrix[];
  evidenceEvaluationMatrices: EvidenceEvaluationMatrix[];
  hypothesisEvidenceConclusions: HypothesisEvidenceConclusion[];
  reportDefinitions: ReportDefinition[];
}
