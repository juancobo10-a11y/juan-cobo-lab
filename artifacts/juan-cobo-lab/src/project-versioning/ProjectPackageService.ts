/**
 * S-024 / S-024.1 — ProjectPackageService
 *
 * Pure async functions for creating, serializing, deserializing, validating,
 * importing, and exporting HELIOS project packages (.helios.json).
 *
 * Security note (ADR-0013A):
 *   The SHA-256 packageHash verifies content integrity — it confirms that the
 *   package has not been modified since export. It does NOT verify authorship,
 *   identity, or origin. The package is not digitally signed.
 *   Do not describe the hash as "authentic", "certified", or "inviolable".
 *
 * exportedAt is EXCLUDED from the packageHash to allow date-stripped
 * reproducibility (same content exported twice → same hash).
 *
 * Transactional import: no step before commitImportTransaction() modifies
 * the active project state. All processing is done on copies.
 */

import type {
  ProjectPackage,
  ProjectPackageManifest,
  ProjectSnapshot,
  ProjectVersion,
  ProjectImportResult,
  ProjectIntegrityResult,
  ImportStrategy,
  ImportConflict,
  ImportTransaction,
  SchemaMigrationResult,
} from "./types";
import { CURRENT_PROJECT_SCHEMA_VERSION } from "./types";
import {
  validateSnapshot,
  addProjectSnapshot,
  deepClone,
} from "./SnapshotService";
import { canMigrate, migrateSnapshot } from "./migrations/MigrationService";
import { sha256Hex } from "./crypto/CryptoHashAdapter";
import { canonicalStringify } from "./crypto/canonicalize";

export { CURRENT_PROJECT_SCHEMA_VERSION };
export const CURRENT_PACKAGE_VERSION = "1.0.0";

// ─── Hash ─────────────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 of package content.
 * Inputs: manifest fields (excluding exportedAt + packageHash) + sorted snapshot hashes.
 * Excludes exportedAt so the same content exported on different dates yields the same hash.
 */
async function computePackageHash(
  snapshots: ProjectSnapshot[],
  manifest: Omit<ProjectPackageManifest, "packageHash" | "exportedAt">
): Promise<string> {
  const canonical = canonicalStringify({
    format: manifest.format,
    packageVersion: manifest.packageVersion,
    schemaVersion: manifest.schemaVersion,
    projectId: manifest.projectId,
    projectName: manifest.projectName,
    snapshotCount: manifest.snapshotCount,
    versionCount: manifest.versionCount,
    snapshotHashes: [...snapshots]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((s) => s.contentHash),
  });
  return sha256Hex(canonical);
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createProjectPackage(
  projectId: string,
  projectName: string,
  snapshots: ProjectSnapshot[],
  versions: ProjectVersion[]
): Promise<ProjectPackage> {
  const manifestBase = {
    format: "HELIOS_PROJECT_PACKAGE" as const,
    packageVersion: CURRENT_PACKAGE_VERSION,
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    projectId,
    projectName,
    snapshotCount: snapshots.length,
    versionCount: versions.length,
  };

  const manifest: ProjectPackageManifest = {
    ...manifestBase,
    exportedAt: new Date().toISOString(),
    packageHash: await computePackageHash(snapshots, manifestBase),
  };

  return { manifest, snapshots: [...snapshots], versions: [...versions] };
}

// ─── Serialize / Deserialize ──────────────────────────────────────────────────

export function serializeProjectPackage(pkg: ProjectPackage): string {
  return JSON.stringify(pkg, null, 2);
}

export function deserializeProjectPackage(raw: string): ProjectPackage | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    // Require at minimum a manifest field to distinguish a package from any object
    if (!("manifest" in parsed)) return null;
    return parsed as ProjectPackage;
  } catch {
    return null;
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate package structure AND hash integrity.
 *
 * Extended checks (S-024.1):
 *   - Each snapshot's own hash is verified.
 *   - Version → snapshot references are checked.
 *   - parentVersionId references are checked.
 *   - Duplicate IDs are detected.
 *   - No version cycles are allowed.
 */
export async function validateProjectPackage(pkg: unknown): Promise<ProjectIntegrityResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pkg || typeof pkg !== "object") {
    return {
      valid: false,
      hashMatch: false,
      schemaVersionMatch: false,
      snapshotCount: 0,
      errors: ["Not an object"],
      warnings,
    };
  }

  const p = pkg as Partial<ProjectPackage>;

  // Manifest checks
  if (!p.manifest) {
    errors.push("Missing manifest");
  } else {
    if (p.manifest.format !== "HELIOS_PROJECT_PACKAGE") errors.push("Invalid format field");
    if (!p.manifest.projectId) errors.push("manifest.projectId required");
    if (!p.manifest.projectName) errors.push("manifest.projectName required");
    if (!p.manifest.schemaVersion) errors.push("manifest.schemaVersion required");
    if (!p.manifest.packageHash) errors.push("manifest.packageHash required");
    if (typeof p.manifest.snapshotCount !== "number")
      errors.push("manifest.snapshotCount must be a number");
  }

  if (!Array.isArray(p.snapshots)) {
    errors.push("snapshots must be an array");
  } else {
    // Structural validation per snapshot
    p.snapshots.forEach((s, i) => {
      const r = validateSnapshot(s);
      if (!r.valid) errors.push(`snapshots[${i}]: ${r.errors.join(", ")}`);
    });

    // Duplicate snapshot IDs
    const snapIds = new Set<string>();
    p.snapshots.forEach((s) => {
      if (snapIds.has(s.id)) errors.push(`Duplicate snapshot id: ${s.id}`);
      snapIds.add(s.id);
    });
  }

  if (!Array.isArray(p.versions)) {
    errors.push("versions must be an array");
  } else {
    const snapIdSet = new Set((p.snapshots ?? []).map((s) => s.id));
    const versionIdSet = new Set<string>();

    // Duplicate version IDs
    p.versions.forEach((v) => {
      if (versionIdSet.has(v.id)) errors.push(`Duplicate version id: ${v.id}`);
      versionIdSet.add(v.id);
    });

    // Version → snapshot reference integrity
    p.versions.forEach((v) => {
      if (!snapIdSet.has(v.snapshotId)) {
        errors.push(`Version ${v.id} references non-existent snapshot ${v.snapshotId}`);
      }
    });

    // parentVersionId reference integrity
    p.versions.forEach((v) => {
      if (v.parentVersionId && !versionIdSet.has(v.parentVersionId)) {
        errors.push(
          `Version ${v.id} has invalid parentVersionId ${v.parentVersionId}`
        );
      }
    });

    // Cycle detection in version graph (DFS)
    const hasCycle = (() => {
      const parentMap = new Map<string, string | undefined>(
        (p.versions ?? []).map((v) => [v.id, v.parentVersionId])
      );
      for (const startId of versionIdSet) {
        const visited = new Set<string>();
        let cur: string | undefined = startId;
        while (cur) {
          if (visited.has(cur)) { return true; }
          visited.add(cur);
          cur = parentMap.get(cur);
        }
      }
      return false;
    })();
    if (hasCycle) errors.push("Cycle detected in version parentVersionId graph");
  }

  const snapshotCount = Array.isArray(p.snapshots) ? p.snapshots.length : 0;
  const schemaVersionMatch = p.manifest?.schemaVersion === CURRENT_PROJECT_SCHEMA_VERSION;

  if (!schemaVersionMatch && p.manifest?.schemaVersion) {
    warnings.push(
      `Package schemaVersion ${p.manifest.schemaVersion} differs from current ${CURRENT_PROJECT_SCHEMA_VERSION}`
    );
  }

  // Hash verification (if structure is valid so far)
  let hashMatch = false;
  if (errors.length === 0 && p.manifest && p.snapshots) {
    const expectedHash = await computePackageHash(p.snapshots, {
      format: "HELIOS_PROJECT_PACKAGE",
      packageVersion: p.manifest.packageVersion,
      schemaVersion: p.manifest.schemaVersion,
      projectId: p.manifest.projectId,
      projectName: p.manifest.projectName,
      snapshotCount: p.manifest.snapshotCount,
      versionCount: p.manifest.versionCount,
    });
    hashMatch = expectedHash === p.manifest.packageHash;
    if (!hashMatch) {
      errors.push(
        "Package SHA-256 hash does not match — content may have changed since export. " +
          "This does not indicate authorship issues."
      );
    }
  }

  return {
    valid: errors.length === 0,
    hashMatch,
    schemaVersionMatch,
    snapshotCount,
    errors,
    warnings,
  };
}

export async function verifyProjectPackageIntegrity(pkg: ProjectPackage): Promise<boolean> {
  const result = await validateProjectPackage(pkg);
  return result.valid && result.hashMatch;
}

// ─── Import transaction ───────────────────────────────────────────────────────

/**
 * Create an ImportTransaction from a raw package.
 * This is the "parsed" phase — no validation, no mutations.
 */
export function createImportTransaction(pkg: ProjectPackage): ImportTransaction {
  return {
    id: crypto.randomUUID(),
    status: "parsed",
    originalPackage: pkg,
    migrationResults: [],
    conflicts: [],
  };
}

/**
 * Advance the transaction through validation, verification, migration,
 * and conflict detection. Returns a transaction in "ready" or "failed" status.
 *
 * No active project state is modified at any point.
 */
export async function prepareImportTransaction(
  transaction: ImportTransaction,
  currentSnapshots: ProjectSnapshot[],
  currentVersions: ProjectVersion[],
  strategy: ImportStrategy,
  targetVersion?: string
): Promise<ImportTransaction> {
  const tx: ImportTransaction = {
    ...deepClone(transaction),
    strategy,
    errors: [],
    warnings: [],
  };
  const pkg = tx.originalPackage;

  // Step 1: Schema version (future block)
  const pkgSchema = pkg.manifest.schemaVersion;
  const target = targetVersion ?? CURRENT_PROJECT_SCHEMA_VERSION;

  if (pkgSchema > target) {
    return {
      ...tx,
      status: "failed",
      errors: [
        `Cannot import package with future schemaVersion ${pkgSchema} (current: ${target}). ` +
          `This file was created with a newer version of HELIOS.`,
      ],
    };
  }

  tx.status = "validated";

  // Step 2: Structural + hash validation
  const validation = await validateProjectPackage(pkg);
  if (!validation.valid) {
    return {
      ...tx,
      status: "failed",
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  tx.status = "verified";

  // Step 3: Migrate snapshots if needed
  const migrationResults: SchemaMigrationResult[] = [];
  const migratedSnapshots: ProjectSnapshot[] = [];

  for (const snap of pkg.snapshots) {
    if (snap.schemaVersion !== target) {
      if (canMigrate(snap.schemaVersion, target)) {
        const result = migrateSnapshot(snap, target);
        migrationResults.push(result);
        if (result.success) {
          migratedSnapshots.push({
            ...snap,
            payload: result.migratedPayload as typeof snap.payload,
            schemaVersion: target,
          });
        } else {
          return {
            ...tx,
            status: "failed",
            migrationResults,
            errors: [`Migration failed for snapshot ${snap.id}: ${result.errors.join(", ")}`],
          };
        }
      } else {
        return {
          ...tx,
          status: "failed",
          migrationResults,
          errors: [
            `No migration path for snapshot ${snap.id} (${snap.schemaVersion} → ${target})`,
          ],
        };
      }
    } else {
      migratedSnapshots.push(snap);
    }
  }

  tx.status = "migrated";
  tx.migrationResults = migrationResults;

  // Step 4: Conflict detection + prepare final package
  const existingSnapshotIds = new Set(currentSnapshots.map((s) => s.id));
  const existingVersionIds = new Set(currentVersions.map((v) => v.id));
  const conflicts: ImportConflict[] = [];
  const snapshotIdMap = new Map<string, string>();

  const finalSnapshots: ProjectSnapshot[] = [...migratedSnapshots];
  const finalVersions: ProjectVersion[] = [...pkg.versions];

  if (strategy === "create-copy") {
    // Assign new IDs and remap
    finalSnapshots.forEach((snap, i) => {
      const newId = crypto.randomUUID();
      snapshotIdMap.set(snap.id, newId);
      if (existingSnapshotIds.has(snap.id)) {
        conflicts.push({
          entityType: "snapshot",
          existingId: snap.id,
          importedId: snap.id,
          resolution: "remap",
          newId,
        });
      }
      finalSnapshots[i] = { ...snap, id: newId };
    });

    finalVersions.forEach((ver, i) => {
      const newVerId = crypto.randomUUID();
      const mappedSnapId = snapshotIdMap.get(ver.snapshotId) ?? ver.snapshotId;
      if (existingVersionIds.has(ver.id)) {
        conflicts.push({
          entityType: "version",
          existingId: ver.id,
          importedId: ver.id,
          resolution: "remap",
          newId: newVerId,
        });
      }
      finalVersions[i] = { ...ver, id: newVerId, snapshotId: mappedSnapId };
    });
  } else if (strategy === "replace-current") {
    pkg.snapshots.forEach((snap) => {
      if (existingSnapshotIds.has(snap.id)) {
        conflicts.push({
          entityType: "snapshot",
          existingId: snap.id,
          importedId: snap.id,
          resolution: "overwrite",
        });
      }
    });
    pkg.versions.forEach((ver) => {
      if (existingVersionIds.has(ver.id)) {
        conflicts.push({
          entityType: "version",
          existingId: ver.id,
          importedId: ver.id,
          resolution: "overwrite",
        });
      }
    });
  }

  tx.conflicts = conflicts;
  tx.preparedPackage = {
    ...pkg,
    snapshots: finalSnapshots,
    versions: finalVersions,
  };
  tx.status = "ready";
  return tx;
}

/**
 * Atomically commit a "ready" import transaction.
 * Produces a new (snapshots, versions) state without mutating any argument.
 * Fails completely if the transaction is not in "ready" status.
 */
export function commitImportTransaction(
  transaction: ImportTransaction,
  currentSnapshots: ProjectSnapshot[],
  currentVersions: ProjectVersion[]
): {
  success: boolean;
  resultingSnapshots: ProjectSnapshot[];
  resultingVersions: ProjectVersion[];
  errors: string[];
} {
  if (transaction.status !== "ready") {
    return {
      success: false,
      resultingSnapshots: currentSnapshots,
      resultingVersions: currentVersions,
      errors: [`Cannot commit transaction in status "${transaction.status}"`],
    };
  }
  if (!transaction.preparedPackage) {
    return {
      success: false,
      resultingSnapshots: currentSnapshots,
      resultingVersions: currentVersions,
      errors: ["Transaction has no prepared package"],
    };
  }

  const strategy = transaction.strategy;

  let resultingSnapshots = [...currentSnapshots];
  let resultingVersions = [...currentVersions];

  if (strategy === "replace-current") {
    // Atomic: replace all
    const incomingSnapIds = new Set(transaction.preparedPackage.snapshots.map((s) => s.id));
    const incomingVerIds = new Set(transaction.preparedPackage.versions.map((v) => v.id));
    resultingSnapshots = resultingSnapshots.filter((s) => !incomingSnapIds.has(s.id));
    resultingVersions = resultingVersions.filter((v) => !incomingVerIds.has(v.id));
    resultingSnapshots = [...resultingSnapshots, ...transaction.preparedPackage.snapshots];
    resultingVersions = [...resultingVersions, ...transaction.preparedPackage.versions];
  } else if (strategy === "create-copy") {
    for (const snap of transaction.preparedPackage.snapshots) {
      resultingSnapshots = addProjectSnapshot(resultingSnapshots, snap);
    }
    for (const ver of transaction.preparedPackage.versions) {
      if (!resultingVersions.some((v) => v.id === ver.id)) {
        resultingVersions = [...resultingVersions, ver];
      }
    }
  }

  return {
    success: true,
    resultingSnapshots,
    resultingVersions,
    errors: [],
  };
}

// ─── Legacy importProjectPackage (for backward compatibility with S-024 tests) ──

/**
 * Import a project package in one call.
 * Internally uses the transactional pipeline.
 * @deprecated Prefer prepareImportTransaction + commitImportTransaction for UI flows.
 */
export async function importProjectPackage(
  pkg: ProjectPackage,
  currentSnapshots: ProjectSnapshot[],
  currentVersions: ProjectVersion[],
  strategy: ImportStrategy,
  targetVersion?: string
): Promise<
  ProjectImportResult & {
    resultingSnapshots: ProjectSnapshot[];
    resultingVersions: ProjectVersion[];
  }
> {
  if (strategy === "cancel") {
    return {
      success: false,
      strategy,
      importedProjectId: pkg.manifest.projectId,
      snapshotsImported: 0,
      versionsImported: 0,
      migrationsApplied: [],
      conflictsDetected: [],
      errors: ["Import cancelled by user"],
      warnings: [],
      resultingSnapshots: currentSnapshots,
      resultingVersions: currentVersions,
    };
  }

  const tx = createImportTransaction(pkg);
  const prepared = await prepareImportTransaction(
    tx,
    currentSnapshots,
    currentVersions,
    strategy,
    targetVersion
  );

  if (prepared.status !== "ready") {
    return {
      success: false,
      strategy,
      importedProjectId: pkg.manifest.projectId,
      snapshotsImported: 0,
      versionsImported: 0,
      migrationsApplied: prepared.migrationResults
        .filter((r) => r.success)
        .map((r) => `${r.fromVersion}→${r.toVersion}`),
      conflictsDetected: prepared.conflicts.map(
        (c) => `${c.entityType} ${c.existingId} → ${c.resolution}`
      ),
      errors: prepared.errors ?? [],
      warnings: prepared.warnings ?? [],
      resultingSnapshots: currentSnapshots,
      resultingVersions: currentVersions,
    };
  }

  const committed = commitImportTransaction(prepared, currentSnapshots, currentVersions);

  return {
    success: committed.success,
    strategy,
    importedProjectId: pkg.manifest.projectId,
    snapshotsImported: prepared.preparedPackage?.snapshots.length ?? 0,
    versionsImported: prepared.preparedPackage?.versions.length ?? 0,
    migrationsApplied: prepared.migrationResults
      .filter((r) => r.success)
      .map((r) => `${r.fromVersion}→${r.toVersion}`),
    conflictsDetected: prepared.conflicts.map(
      (c) => `${c.entityType} ${c.existingId} → ${c.resolution}`
    ),
    errors: committed.errors,
    warnings: prepared.warnings ?? [],
    resultingSnapshots: committed.resultingSnapshots,
    resultingVersions: committed.resultingVersions,
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function exportProjectPackage(pkg: ProjectPackage): string {
  return serializeProjectPackage(pkg);
}

/** Sanitize a filename for cross-platform compatibility */
export function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[^\w\s\-\.]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^[\-\.]+/, "")
      .slice(0, 100)
      .toLowerCase() || "helios-project"
  );
}

export function buildExportFilename(projectName: string, versionLabel?: string): string {
  const base = sanitizeFilename(projectName);
  const version = versionLabel ? `-${sanitizeFilename(versionLabel)}` : "";
  return `${base}${version}.helios.json`;
}

import type { ProjectSnapshotPayload } from "./types";

// ─── Version management ───────────────────────────────────────────────────────

export function addProjectVersion(
  versions: ProjectVersion[],
  version: ProjectVersion
): ProjectVersion[] {
  if (versions.some((v) => v.id === version.id)) return versions;
  return [...versions, version];
}

export function findProjectVersion(
  versions: ProjectVersion[],
  id: string
): ProjectVersion | undefined {
  return versions.find((v) => v.id === id);
}

export function removeProjectVersion(
  versions: ProjectVersion[],
  snapshots: ProjectSnapshot[],
  versionId: string
): ProjectVersion[] | null {
  const ver = versions.find((v) => v.id === versionId);
  if (!ver) return versions;
  const dependents = versions.filter(
    (v) => v.id !== versionId && v.parentVersionId === versionId
  );
  if (dependents.length > 0) return null; // blocked
  return versions.filter((v) => v.id !== versionId);
}

export function createProjectVersion(
  snapshotId: string,
  label: string,
  options: {
    notes?: string;
    tag?: import("./types").ProjectVersionTag;
    parentVersionId?: string;
  } = {}
): ProjectVersion {
  return {
    id: crypto.randomUUID(),
    snapshotId,
    label,
    ...options,
    createdAt: new Date().toISOString(),
  };
}
