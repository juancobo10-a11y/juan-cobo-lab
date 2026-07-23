/**
 * S-024 / S-024.1 — SnapshotService
 *
 * Pure async functions. No mutations. No storage access.
 * Every function returns a new value; inputs are never modified.
 *
 * Hash algorithm: SHA-256 via CryptoHashAdapter (Web Crypto + Node fallback).
 * The hash verifies that content has not changed since the snapshot was created.
 * It does NOT verify authorship, identity, or origin (ADR-0013A).
 *
 * Canonicalization: deterministic via canonicalize.ts (NFC + sorted keys).
 */

import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  type ProjectSnapshot,
  type ProjectSnapshotMetadata,
  type ProjectSnapshotPayload,
  type ReconstructedSession,
  type ReproducibilityResult,
  type SnapshotValidationResult,
} from "./types";
export { CURRENT_PROJECT_SCHEMA_VERSION };
import { sha256Hex } from "./crypto/CryptoHashAdapter";
import { canonicalStringify } from "./crypto/canonicalize";
import { buildReportDocument } from "@/report-builder/ReportBuilderService";
import { MarkdownExporter } from "@/report-builder/exporters/MarkdownExporter";
import type { ReportBuildInput } from "@/report-builder/types";

// ─── Deep clone / freeze utilities ───────────────────────────────────────────

/**
 * Deep-freeze an object recursively for runtime immutability.
 * TypeScript's Readonly<T> only guarantees compile-time safety.
 * This ensures runtime mutations throw (in strict mode) or silently fail.
 */
export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  Object.getOwnPropertyNames(obj).forEach((name) => {
    const val = (obj as Record<string, unknown>)[name];
    if (val && typeof val === "object") deepFreeze(val);
  });
  return Object.freeze(obj);
}

/**
 * Deep-clone a JSON-serializable value.
 * Uses JSON round-trip to ensure no shared references.
 * All functions, Dates, undefined values, and circular refs will not survive.
 */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Produce a canonical representation of the payload for hashing.
 *
 * Excluded from canonical form:
 * - createdAt / updatedAt timestamps (stable content, not date-of-capture)
 * - undefined values (normalized to absent)
 * - transitory fields (pantalla, scroll positions, etc.)
 *
 * Unicode: all strings are NFC-normalized by canonicalStringify.
 */
export function normalizeSnapshotPayload(payload: ProjectSnapshotPayload): string {
  return canonicalStringify(payload);
}

// ─── Hash computation ─────────────────────────────────────────────────────────

/**
 * Compute a deterministic SHA-256 content hash for a snapshot.
 *
 * Inputs to hash:
 *   schemaVersion + projectId + projectName + versionLabel + description +
 *   author + tags + sourceSnapshotId + changeSummary + normalized payload.
 *
 * Excluded from hash:
 *   createdAt, contentHash itself, transitory/operational metadata.
 */
export async function computeSnapshotHash(
  schemaVersion: string,
  payload: ProjectSnapshotPayload,
  metadata: Pick<
    ProjectSnapshotMetadata,
    | "projectId"
    | "projectName"
    | "versionLabel"
    | "description"
    | "author"
    | "tags"
    | "sourceSnapshotId"
    | "changeSummary"
  >
): Promise<string> {
  const canonical = canonicalStringify({
    schemaVersion,
    projectId: metadata.projectId,
    projectName: metadata.projectName,
    versionLabel: metadata.versionLabel ?? null,
    description: metadata.description ?? null,
    author: metadata.author ?? null,
    tags: [...(metadata.tags ?? [])].sort(),
    sourceSnapshotId: metadata.sourceSnapshotId ?? null,
    changeSummary: metadata.changeSummary ?? null,
    payload: JSON.parse(normalizeSnapshotPayload(payload)),
  });
  return sha256Hex(canonical);
}

// ─── Snapshot CRUD ────────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Create a new immutable project snapshot from the current session state.
 * The returned object is frozen (deep) to enforce immutability.
 * Async because SHA-256 computation is async.
 */
export async function createProjectSnapshot(
  payload: ProjectSnapshotPayload,
  metadata: ProjectSnapshotMetadata,
  versionLabel?: string
): Promise<ProjectSnapshot> {
  const schemaVersion = CURRENT_PROJECT_SCHEMA_VERSION;
  const payloadCopy = deepFreeze(deepClone(payload));
  const metaCopy: ProjectSnapshotMetadata = {
    ...deepClone(metadata),
    tags: [...(metadata.tags ?? [])],
    versionLabel: versionLabel ?? metadata.versionLabel,
  };
  const contentHash = await computeSnapshotHash(schemaVersion, payloadCopy, metaCopy);
  const snapshot: ProjectSnapshot = {
    id: generateId(),
    version: versionLabel ?? metaCopy.versionLabel ?? "1.0",
    schemaVersion,
    metadata: metaCopy,
    payload: payloadCopy,
    contentHash,
    createdAt: new Date().toISOString(),
  };
  return deepFreeze(snapshot) as ProjectSnapshot;
}

/**
 * Verify that a snapshot's contentHash matches a freshly computed SHA-256.
 * Returns false if tampered or corrupted.
 * The hash does NOT verify authorship — only content integrity.
 */
export async function verifySnapshotIntegrity(snapshot: ProjectSnapshot): Promise<boolean> {
  const expected = await computeSnapshotHash(
    snapshot.schemaVersion,
    snapshot.payload,
    snapshot.metadata
  );
  return expected === snapshot.contentHash;
}

/**
 * Create a deep copy of a snapshot with a new ID and timestamp.
 * Useful for deriving a new snapshot from an existing one.
 */
export async function cloneSnapshot(
  source: ProjectSnapshot,
  overrides: Partial<ProjectSnapshotMetadata> = {}
): Promise<ProjectSnapshot> {
  const newPayload = deepClone(source.payload);
  const newMeta: ProjectSnapshotMetadata = {
    ...deepClone(source.metadata),
    ...overrides,
    sourceSnapshotId: source.id,
  };
  return createProjectSnapshot(newPayload, newMeta, source.version);
}

/**
 * Validate the structural integrity of a snapshot (not the hash).
 * Synchronous — for use in import pipelines before async hash checks.
 */
export function validateSnapshot(snapshot: unknown): SnapshotValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!snapshot || typeof snapshot !== "object") {
    return { valid: false, errors: ["Snapshot is not an object"], warnings };
  }
  const s = snapshot as Partial<ProjectSnapshot>;
  if (!s.id) errors.push("Missing id");
  if (!s.schemaVersion) errors.push("Missing schemaVersion");
  if (!s.contentHash) errors.push("Missing contentHash");
  if (!s.createdAt) errors.push("Missing createdAt");
  if (!s.metadata) {
    errors.push("Missing metadata");
  } else {
    if (!s.metadata.projectId) errors.push("metadata.projectId is required");
    if (!s.metadata.projectName) errors.push("metadata.projectName is required");
  }
  if (!s.payload) {
    errors.push("Missing payload");
  } else {
    if (s.payload.problema === undefined) errors.push("payload.problema is required");
    if (!Array.isArray(s.payload.hypotheses)) errors.push("payload.hypotheses must be an array");
  }
  if (s.schemaVersion && s.schemaVersion !== CURRENT_PROJECT_SCHEMA_VERSION) {
    warnings.push(
      `schemaVersion ${s.schemaVersion} differs from current ${CURRENT_PROJECT_SCHEMA_VERSION}`
    );
  }
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Two snapshots are equivalent if their content hashes match.
 * createdAt, id, and metadata fields not included in the hash do not affect equivalence.
 */
export function isSnapshotEquivalent(a: ProjectSnapshot, b: ProjectSnapshot): boolean {
  return a.contentHash === b.contentHash;
}

/**
 * Reconstruct a HELIOS session from a snapshot payload.
 * Returns a plain mutable object (not frozen) so the caller can set it as React state.
 */
export function reconstructSessionFromSnapshot(snapshot: ProjectSnapshot): ReconstructedSession {
  // Deep-copy the payload so the session is independent of the snapshot
  const p = deepClone(snapshot.payload);
  return {
    understandingCase: p.understandingCase ?? null,
    problema: p.problema ?? "",
    packActivo: p.packActivo ?? null,
    thinkingUserSelection: p.thinkingUserSelection ?? null,
    reflectionAnswers: p.reflectionAnswers ?? [],
    hypotheses: p.hypotheses ?? [],
    primaryHypothesisId: p.primaryHypothesisId,
    conceptualModels: p.conceptualModels ?? [],
    operationalizationMatrices: p.operationalizationMatrices ?? [],
    contrastationMatrices: p.contrastationMatrices ?? [],
    evidenceEvaluationMatrices: p.evidenceEvaluationMatrices ?? [],
    hypothesisEvidenceConclusions: p.hypothesisEvidenceConclusions ?? [],
    reportDefinitions: p.reportDefinitions ?? [],
  };
}

// ─── Report reproducibility ───────────────────────────────────────────────────

/**
 * Generate a report from a snapshot and a specific ReportDefinition.
 * Always produces the same structural content for the same snapshot + definition.
 * Timestamps in report blocks are excluded from the reproducibility hash.
 */
export function generateReportFromSnapshot(
  snapshot: ProjectSnapshot,
  reportDefinitionId: string
): string | null {
  const session = reconstructSessionFromSnapshot(snapshot);
  const reportDef = session.reportDefinitions.find((r) => r.id === reportDefinitionId);
  if (!reportDef) return null;

  // Find the active hypothesis
  const hyp = session.primaryHypothesisId
    ? session.hypotheses.find((h) => h.id === session.primaryHypothesisId)
    : session.hypotheses[0];
  if (!hyp) return null;

  const buildInput: ReportBuildInput = {
    hypotheses: [hyp],
    problema: session.problema,
    perequePatternTitulo: null,
    conceptualModels: session.conceptualModels.filter((m) => m.hypothesisId === hyp.id),
    operationalizationMatrices: session.operationalizationMatrices.filter((m) => m.hypothesisId === hyp.id),
    contrastationMatrices: session.contrastationMatrices.filter((m) => m.hypothesisId === hyp.id),
    evidenceEvaluationMatrices: session.evidenceEvaluationMatrices.filter((m) => m.hypothesisId === hyp.id),
    hypothesisEvidenceConclusions: session.hypothesisEvidenceConclusions.filter((c) => c.hypothesisId === hyp.id),
  };

  const doc = buildReportDocument(reportDef, buildInput);
  return new MarkdownExporter().export(doc.generated);
}

/**
 * Compute a SHA-256 hash of a generated report string (timestamps stripped).
 */
export async function computeGeneratedReportHash(reportContent: string): Promise<string> {
  const stripped = reportContent.replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g,
    "<TIMESTAMP>"
  );
  return sha256Hex(stripped);
}

/**
 * Verify that two report generations from the same snapshot produce identical content.
 * SHA-256 hashes are used for comparison; timestamps are excluded.
 */
export async function verifyReportReproducibility(
  snapshot: ProjectSnapshot,
  reportDefinitionId: string
): Promise<ReproducibilityResult> {
  const first = generateReportFromSnapshot(snapshot, reportDefinitionId);
  const second = generateReportFromSnapshot(snapshot, reportDefinitionId);

  if (first === null || second === null) {
    return {
      reproducible: false,
      firstHash: "",
      secondHash: "",
      differences: ["Could not generate report — reportDefinitionId not found or snapshot invalid"],
    };
  }

  const firstHash = await computeGeneratedReportHash(first);
  const secondHash = await computeGeneratedReportHash(second);

  if (firstHash === secondHash) {
    return { reproducible: true, firstHash, secondHash, differences: [] };
  }

  // Find differing lines for debugging
  const stripTimestamps = (s: string) =>
    s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, "<TIMESTAMP>");
  const linesA = stripTimestamps(first).split("\n");
  const linesB = stripTimestamps(second).split("\n");
  const differences: string[] = [];
  const len = Math.max(linesA.length, linesB.length);
  for (let i = 0; i < len; i++) {
    if (linesA[i] !== linesB[i]) {
      differences.push(`Line ${i + 1}: "${linesA[i] ?? ""}" vs "${linesB[i] ?? ""}"`);
      if (differences.length >= 10) { differences.push("..."); break; }
    }
  }

  return { reproducible: false, firstHash, secondHash, differences };
}

// ─── Session-level operations ─────────────────────────────────────────────────

/** Add a snapshot to the session list (snapshots are immutable; no update). */
export function addProjectSnapshot(
  snapshots: ProjectSnapshot[],
  snapshot: ProjectSnapshot
): ProjectSnapshot[] {
  if (snapshots.some((s) => s.id === snapshot.id)) return snapshots;
  return [...snapshots, snapshot];
}

/** Find a snapshot by ID. */
export function findProjectSnapshot(
  snapshots: ProjectSnapshot[],
  id: string
): ProjectSnapshot | undefined {
  return snapshots.find((s) => s.id === id);
}

/**
 * Remove a snapshot only if no versions reference it.
 * Returns null if removal is blocked (caller must show impact to user).
 */
export function removeProjectSnapshot(
  snapshots: ProjectSnapshot[],
  versions: import("./types").ProjectVersion[],
  snapshotId: string
): ProjectSnapshot[] | null {
  const referenced = versions.some((v) => v.snapshotId === snapshotId);
  if (referenced) return null; // blocked
  return snapshots.filter((s) => s.id !== snapshotId);
}
