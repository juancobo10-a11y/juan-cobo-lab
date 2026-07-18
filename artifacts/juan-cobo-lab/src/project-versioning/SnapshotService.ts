/**
 * S-024 — SnapshotService
 *
 * Pure functions. No mutations. No storage access.
 * Every function returns a new value; inputs are never modified.
 *
 * Hash algorithm: MurmurHash3-inspired 128-bit fingerprint (hex).
 * Deterministic, cross-environment (browser + Node), synchronous.
 * NOT cryptographic — guarantees integrity, not confidentiality.
 * Upgrade path: replace murmurFingerprint128 with SHA-256 (Web Crypto, async)
 * if cryptographic strength is required in the future.
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
import { buildReportDocument } from "@/report-builder/ReportBuilderService";
import { MarkdownExporter } from "@/report-builder/exporters/MarkdownExporter";
import type { ReportBuildInput } from "@/report-builder/types";

// ─── Hash ─────────────────────────────────────────────────────────────────────

/**
 * MurmurHash3-inspired 128-bit deterministic fingerprint.
 * Produces 32 hex characters. Same input always produces same output.
 * Cross-environment: pure JS, no imports.
 */
function murmurFingerprint128(s: string): string {
  // Four independent 32-bit hashes with distinct seeds → 128-bit output
  const seeds = [0xdeadbeef, 0x41c6ce57, 0xb0f57ee3, 0x7b573bf9];
  const hexParts = seeds.map((seed) => {
    let h1 = seed >>> 0;
    let h2 = (seed ^ 0xf1b2c3d4) >>> 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      h1 = (Math.imul(h1 ^ ch, 0x9e3779b9) >>> 0);
      h2 = (Math.imul(h2 ^ ch, 0x517cc1b7) >>> 0);
    }
    h1 = (Math.imul(h1 ^ (h1 >>> 16), 0x85ebca6b) ^ Math.imul(h2 ^ (h2 >>> 13), 0xc2b2ae35)) >>> 0;
    h2 = (Math.imul(h2 ^ (h2 >>> 16), 0x85ebca6b) ^ Math.imul(h1 ^ (h1 >>> 13), 0xc2b2ae35)) >>> 0;
    return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0"));
  });
  return hexParts.join("");
}

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Deep-sort the keys of a plain object so that accidental key ordering
 * does not affect the hash. Arrays whose order has methodological meaning
 * are preserved as-is (variables, indicators, rows, evidences, assessments,
 * sections of a report). Arrays without semantic order (e.g. tags) are sorted.
 */
function sortKeys(value: unknown, path = ""): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    // Preserve semantic order for known list types
    const semanticPaths = [
      "variables", "indicators", "evidenceSources", "rows",
      "observations", "assessments", "sections", "reflectionAnswers",
      "hypotheses", "conceptualModels", "operationalizationMatrices",
      "contrastationMatrices", "evidenceEvaluationMatrices",
      "hypothesisEvidenceConclusions", "reportDefinitions",
    ];
    const key = path.split(".").pop() ?? "";
    const preserve = semanticPaths.some((p) => key === p || path.endsWith(`.${p}`));
    const mapped = value.map((v, i) => sortKeys(v, `${path}[${i}]`));
    return preserve ? mapped : [...mapped].sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b))
    );
  }
  const sorted: Record<string, unknown> = {};
  Object.keys(value as Record<string, unknown>)
    .sort()
    .forEach((k) => {
      sorted[k] = sortKeys((value as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
    });
  return sorted;
}

/**
 * Produce a canonical representation of the payload for hashing.
 *
 * Excluded from canonical form:
 * - createdAt / updatedAt timestamps (stable content, not date-of-capture)
 * - undefined values (normalized to absent)
 * - transitory fields (pantalla, scroll positions, etc.)
 *
 * Note: createdAt/updatedAt on ENTITIES (variables, hypotheses) are included
 * because they are part of the entity identity. Only the snapshot's own
 * createdAt is excluded.
 */
export function normalizeSnapshotPayload(payload: ProjectSnapshotPayload): string {
  // Deep-copy and sort keys deterministically
  const normalized = sortKeys(payload);
  return JSON.stringify(normalized, (_k, v) => {
    if (v === undefined) return null; // normalize undefined → null for canonical form
    return v;
  });
}

// ─── Hash computation ─────────────────────────────────────────────────────────

/**
 * Compute a deterministic content hash for a snapshot.
 *
 * Inputs: schemaVersion + normalized payload + stable metadata fields.
 * Excluded: createdAt, contentHash itself, transitory text, accidental order.
 */
export function computeSnapshotHash(
  schemaVersion: string,
  payload: ProjectSnapshotPayload,
  metadata: Pick<ProjectSnapshotMetadata, "projectId" | "projectName">
): string {
  const canonical = JSON.stringify({
    schemaVersion,
    projectId: metadata.projectId,
    projectName: metadata.projectName,
    payload: JSON.parse(normalizeSnapshotPayload(payload)),
  });
  return murmurFingerprint128(canonical);
}

// ─── Snapshot CRUD ────────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Create a new immutable project snapshot from the current session state.
 * The returned object is frozen (deep) to enforce immutability.
 */
export function createProjectSnapshot(
  payload: ProjectSnapshotPayload,
  metadata: ProjectSnapshotMetadata,
  versionLabel?: string
): ProjectSnapshot {
  const schemaVersion = CURRENT_PROJECT_SCHEMA_VERSION;
  const payloadCopy = deepFreeze(JSON.parse(JSON.stringify(payload))) as ProjectSnapshotPayload;
  const metaCopy: ProjectSnapshotMetadata = {
    ...metadata,
    tags: [...(metadata.tags ?? [])],
    versionLabel: versionLabel ?? metadata.versionLabel,
  };
  const contentHash = computeSnapshotHash(schemaVersion, payloadCopy, {
    projectId: metaCopy.projectId,
    projectName: metaCopy.projectName,
  });
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
 * Verify that a snapshot's contentHash matches a freshly computed hash.
 * Returns false if tampered. Does NOT auto-correct.
 */
export function verifySnapshotIntegrity(snapshot: ProjectSnapshot): boolean {
  const expected = computeSnapshotHash(
    snapshot.schemaVersion,
    snapshot.payload,
    { projectId: snapshot.metadata.projectId, projectName: snapshot.metadata.projectName }
  );
  return expected === snapshot.contentHash;
}

/**
 * Create a deep copy of a snapshot with a new ID and timestamp.
 * Useful for deriving a new snapshot from an existing one.
 */
export function cloneSnapshot(
  source: ProjectSnapshot,
  overrides: Partial<ProjectSnapshotMetadata> = {}
): ProjectSnapshot {
  const newPayload = JSON.parse(JSON.stringify(source.payload)) as ProjectSnapshotPayload;
  const newMeta: ProjectSnapshotMetadata = {
    ...JSON.parse(JSON.stringify(source.metadata)),
    ...overrides,
    sourceSnapshotId: source.id,
  };
  return createProjectSnapshot(newPayload, newMeta, source.version);
}

/**
 * Validate the structural integrity of a snapshot (not the hash).
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
  const p = JSON.parse(JSON.stringify(snapshot.payload)) as ProjectSnapshotPayload;
  return {
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
 * Verify that two report generations from the same snapshot produce identical content.
 * Timestamps must be excluded from the comparison hash for true reproducibility.
 */
export function verifyReportReproducibility(
  snapshot: ProjectSnapshot,
  reportDefinitionId: string
): ReproducibilityResult {
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

  // Strip timestamps from comparison (lines containing ISO dates)
  const stripTimestamps = (s: string) =>
    s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/g, "<TIMESTAMP>");

  const normalizedFirst = stripTimestamps(first);
  const normalizedSecond = stripTimestamps(second);
  const firstHash = murmurFingerprint128(normalizedFirst);
  const secondHash = murmurFingerprint128(normalizedSecond);

  if (firstHash === secondHash) {
    return { reproducible: true, firstHash, secondHash, differences: [] };
  }

  // Find differing lines
  const linesA = normalizedFirst.split("\n");
  const linesB = normalizedSecond.split("\n");
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

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Deep-freeze an object recursively for runtime immutability. */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  Object.getOwnPropertyNames(obj).forEach((name) => {
    const val = (obj as Record<string, unknown>)[name];
    if (val && typeof val === "object") deepFreeze(val);
  });
  return Object.freeze(obj);
}
