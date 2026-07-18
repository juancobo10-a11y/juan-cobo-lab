/**
 * S-024 — ProjectPackageService
 *
 * Pure functions for creating, serializing, deserializing, validating,
 * importing, and exporting HELIOS project packages (.helios.json).
 *
 * Security note: packages are not encrypted. The packageHash guarantees
 * integrity (tampering detection), not confidentiality. Users must protect
 * exported files. The content is the complete methodological state.
 *
 * exportedAt is EXCLUDED from the packageHash calculation to allow
 * date-stripped reproducibility (same content exported twice → same hash).
 * This decision is documented here and in ADR-0013.
 */

import type {
  ProjectPackage,
  ProjectPackageManifest,
  ProjectSnapshot,
  ProjectVersion,
  ProjectImportResult,
  ProjectIntegrityResult,
  ImportStrategy,
} from "./types";
import { CURRENT_PROJECT_SCHEMA_VERSION } from "./types";
import {
  validateSnapshot,
  addProjectSnapshot,
} from "./SnapshotService";
import { canMigrate, migrateSnapshot } from "./migrations/MigrationService";

export const CURRENT_PACKAGE_VERSION = "1.0.0";

// ─── Hash ─────────────────────────────────────────────────────────────────────

/** Re-uses the same deterministic hash algorithm as SnapshotService */
function murmurFingerprint128(s: string): string {
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
    return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  });
  return hexParts.join("");
}

function computePackageHash(
  snapshots: ProjectSnapshot[],
  manifest: Omit<ProjectPackageManifest, "packageHash" | "exportedAt">
): string {
  const canonical = JSON.stringify({
    format: manifest.format,
    packageVersion: manifest.packageVersion,
    schemaVersion: manifest.schemaVersion,
    projectId: manifest.projectId,
    projectName: manifest.projectName,
    snapshotHashes: [...snapshots]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((s) => s.contentHash),
  });
  return murmurFingerprint128(canonical);
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function createProjectPackage(
  projectId: string,
  projectName: string,
  snapshots: ProjectSnapshot[],
  versions: ProjectVersion[]
): ProjectPackage {
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
    packageHash: computePackageHash(snapshots, manifestBase),
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

export function validateProjectPackage(pkg: unknown): ProjectIntegrityResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pkg || typeof pkg !== "object") {
    return { valid: false, hashMatch: false, schemaVersionMatch: false, snapshotCount: 0, errors: ["Not an object"], warnings };
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
    if (typeof p.manifest.snapshotCount !== "number") errors.push("manifest.snapshotCount must be a number");
  }

  if (!Array.isArray(p.snapshots)) {
    errors.push("snapshots must be an array");
  } else {
    p.snapshots.forEach((s, i) => {
      const r = validateSnapshot(s);
      if (!r.valid) errors.push(`snapshots[${i}]: ${r.errors.join(", ")}`);
    });
  }

  if (!Array.isArray(p.versions)) {
    errors.push("versions must be an array");
  }

  const snapshotCount = Array.isArray(p.snapshots) ? p.snapshots.length : 0;
  const schemaVersionMatch =
    p.manifest?.schemaVersion === CURRENT_PROJECT_SCHEMA_VERSION;

  if (!schemaVersionMatch && p.manifest?.schemaVersion) {
    warnings.push(
      `Package schemaVersion ${p.manifest.schemaVersion} differs from current ${CURRENT_PROJECT_SCHEMA_VERSION}`
    );
  }

  // Hash verification (if structure is valid)
  let hashMatch = false;
  if (errors.length === 0 && p.manifest && p.snapshots) {
    const expectedHash = computePackageHash(p.snapshots, {
      format: "HELIOS_PROJECT_PACKAGE",
      packageVersion: p.manifest.packageVersion,
      schemaVersion: p.manifest.schemaVersion,
      projectId: p.manifest.projectId,
      projectName: p.manifest.projectName,
      snapshotCount: p.manifest.snapshotCount,
      versionCount: p.manifest.versionCount,
    });
    hashMatch = expectedHash === p.manifest.packageHash;
    if (!hashMatch) errors.push("Package hash mismatch — package may be corrupted or tampered");
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

export function verifyProjectPackageIntegrity(pkg: ProjectPackage): boolean {
  const result = validateProjectPackage(pkg);
  return result.valid && result.hashMatch;
}

// ─── Import ───────────────────────────────────────────────────────────────────

/**
 * Import a project package according to the chosen strategy.
 *
 * "create-copy": generates new IDs for all entities to avoid conflicts.
 * "replace-current": replaces the session state (caller must confirm).
 * "cancel": returns immediately with no changes.
 *
 * Never replaces the active project silently.
 */
export function importProjectPackage(
  pkg: ProjectPackage,
  currentSnapshots: ProjectSnapshot[],
  currentVersions: ProjectVersion[],
  strategy: ImportStrategy,
  targetVersion?: string
): ProjectImportResult & {
  resultingSnapshots: ProjectSnapshot[];
  resultingVersions: ProjectVersion[];
} {
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

  const errors: string[] = [];
  const warnings: string[] = [];
  const migrationsApplied: string[] = [];
  const conflictsDetected: string[] = [];

  // Schema version check FIRST — before hash validation so "future version"
  // error is reported even when the hash reflects a modified manifest.
  const pkgSchema = pkg.manifest.schemaVersion;
  const target = targetVersion ?? CURRENT_PROJECT_SCHEMA_VERSION;

  if (pkgSchema > target) {
    return {
      success: false,
      strategy,
      importedProjectId: pkg.manifest.projectId,
      snapshotsImported: 0,
      versionsImported: 0,
      migrationsApplied,
      conflictsDetected,
      errors: [`Cannot import package with future schemaVersion ${pkgSchema} (current: ${target})`],
      warnings,
      resultingSnapshots: currentSnapshots,
      resultingVersions: currentVersions,
    };
  }

  // Validate hash and structure
  const validation = validateProjectPackage(pkg);
  if (!validation.valid) {
    return {
      success: false,
      strategy,
      importedProjectId: pkg.manifest.projectId,
      snapshotsImported: 0,
      versionsImported: 0,
      migrationsApplied,
      conflictsDetected,
      errors: validation.errors,
      warnings: validation.warnings,
      resultingSnapshots: currentSnapshots,
      resultingVersions: currentVersions,
    };
  }

  // Check for ID conflicts
  const existingSnapshotIds = new Set(currentSnapshots.map((s) => s.id));
  const existingVersionIds = new Set(currentVersions.map((v) => v.id));

  // Process snapshots
  let resultingSnapshots = [...currentSnapshots];
  let resultingVersions = [...currentVersions];
  let snapshotsImported = 0;
  let versionsImported = 0;

  const snapshotIdMap = new Map<string, string>(); // old → new (for create-copy)

  for (const snap of pkg.snapshots) {
    let processedSnap = snap;

    // Migrate if needed
    if (snap.schemaVersion !== target && canMigrate(snap.schemaVersion, target)) {
      const migResult = migrateSnapshot(snap, target);
      if (migResult.success) {
        migrationsApplied.push(`${snap.id}: ${snap.schemaVersion}→${target}`);
        processedSnap = {
          ...snap,
          payload: migResult.migratedPayload as ProjectSnapshotPayload,
          schemaVersion: target,
        };
      } else {
        errors.push(`Failed to migrate snapshot ${snap.id}: ${migResult.errors.join(", ")}`);
        continue;
      }
    } else if (snap.schemaVersion !== target && !canMigrate(snap.schemaVersion, target)) {
      errors.push(`No migration path for snapshot ${snap.id} (${snap.schemaVersion}→${target})`);
      continue;
    }

    if (strategy === "create-copy") {
      // Assign new ID to avoid conflicts
      const newId = crypto.randomUUID();
      snapshotIdMap.set(snap.id, newId);
      const copiedSnap: ProjectSnapshot = { ...processedSnap, id: newId };
      if (existingSnapshotIds.has(snap.id)) {
        conflictsDetected.push(`Snapshot ${snap.id} — assigned new ID ${newId}`);
      }
      resultingSnapshots = addProjectSnapshot(resultingSnapshots, copiedSnap);
      snapshotsImported++;
    } else {
      // replace-current: use original IDs
      if (existingSnapshotIds.has(snap.id)) {
        conflictsDetected.push(`Snapshot ${snap.id} overwritten`);
      }
      resultingSnapshots = resultingSnapshots.filter((s) => s.id !== processedSnap.id);
      resultingSnapshots = [...resultingSnapshots, processedSnap];
      snapshotsImported++;
    }
  }

  for (const ver of pkg.versions) {
    const mappedSnapshotId =
      strategy === "create-copy"
        ? snapshotIdMap.get(ver.snapshotId) ?? ver.snapshotId
        : ver.snapshotId;

    if (strategy === "create-copy") {
      const newVerId = crypto.randomUUID();
      const copiedVer: ProjectVersion = { ...ver, id: newVerId, snapshotId: mappedSnapshotId };
      if (existingVersionIds.has(ver.id)) {
        conflictsDetected.push(`Version ${ver.id} — assigned new ID ${newVerId}`);
      }
      resultingVersions = [...resultingVersions, copiedVer];
      versionsImported++;
    } else {
      resultingVersions = resultingVersions.filter((v) => v.id !== ver.id);
      resultingVersions = [...resultingVersions, { ...ver, snapshotId: mappedSnapshotId }];
      versionsImported++;
    }
  }

  return {
    success: errors.length === 0,
    strategy,
    importedProjectId: pkg.manifest.projectId,
    snapshotsImported,
    versionsImported,
    migrationsApplied,
    conflictsDetected,
    errors,
    warnings,
    resultingSnapshots,
    resultingVersions,
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function exportProjectPackage(pkg: ProjectPackage): string {
  return serializeProjectPackage(pkg);
}

/** Sanitize a filename for cross-platform compatibility */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\s\-\.]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^[\-\.]+/, "")
    .slice(0, 100)
    .toLowerCase() || "helios-project";
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
  // Check if any other version depends on this version's snapshot via parentVersionId
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
