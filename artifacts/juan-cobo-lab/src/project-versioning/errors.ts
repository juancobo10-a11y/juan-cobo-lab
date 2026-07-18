/**
 * S-024.1 — Typed error classes for the project-versioning module.
 *
 * All errors extend a common base so callers can catch with a single
 * `instanceof HeliosVersioningError` guard when needed.
 *
 * No stack traces are surfaced to the UI — the UI shows the `.message`
 * only, optionally a `.code`, and never the raw `.stack`.
 */

// ─── Base ─────────────────────────────────────────────────────────────────────

export class HeliosVersioningError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "HeliosVersioningError";
    this.code = code;
    // Ensures instanceof works correctly after transpilation
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Integrity errors ─────────────────────────────────────────────────────────

/**
 * Thrown when a snapshot's SHA-256 hash does not match the stored hash.
 * This indicates either accidental corruption or deliberate tampering.
 * It does NOT indicate authorship issues.
 */
export class SnapshotIntegrityError extends HeliosVersioningError {
  constructor(
    public readonly snapshotId: string,
    public readonly expectedHash?: string,
    public readonly actualHash?: string
  ) {
    super(
      `Snapshot integrity check failed for "${snapshotId}". ` +
        `The SHA-256 hash does not match the stored value, indicating ` +
        `the content may have been modified after the snapshot was created.`,
      "SNAPSHOT_INTEGRITY_FAILURE"
    );
    this.name = "SnapshotIntegrityError";
  }
}

/**
 * Thrown when a package's SHA-256 hash does not match.
 * Does not indicate authenticity — only that the content changed.
 */
export class PackageIntegrityError extends HeliosVersioningError {
  constructor(
    public readonly packageId?: string,
    public readonly expectedHash?: string,
    public readonly actualHash?: string
  ) {
    super(
      `Package integrity check failed. ` +
        `The SHA-256 hash does not match, indicating content modification ` +
        `after export. The hash does not verify authorship or origin.`,
      "PACKAGE_INTEGRITY_FAILURE"
    );
    this.name = "PackageIntegrityError";
  }
}

// ─── Schema errors ────────────────────────────────────────────────────────────

/**
 * Thrown when a package or snapshot declares a schemaVersion that exceeds
 * the current supported version. Import is blocked to prevent data loss.
 */
export class UnsupportedSchemaVersionError extends HeliosVersioningError {
  constructor(
    public readonly requestedVersion: string,
    public readonly currentVersion: string
  ) {
    super(
      `Cannot process schema version "${requestedVersion}". ` +
        `Current supported version is "${currentVersion}". ` +
        `This file was created with a newer version of HELIOS.`,
      "UNSUPPORTED_SCHEMA_VERSION"
    );
    this.name = "UnsupportedSchemaVersionError";
  }
}

// ─── Migration errors ─────────────────────────────────────────────────────────

/**
 * Thrown when no migration path exists between two schema versions.
 */
export class MigrationPathNotFoundError extends HeliosVersioningError {
  constructor(
    public readonly fromVersion: string,
    public readonly toVersion: string
  ) {
    super(
      `No migration path found from schema version "${fromVersion}" to "${toVersion}". ` +
        `The snapshot cannot be imported without manual intervention.`,
      "MIGRATION_PATH_NOT_FOUND"
    );
    this.name = "MigrationPathNotFoundError";
  }
}

// ─── Import errors ────────────────────────────────────────────────────────────

/**
 * Thrown when an import fails due to unresolvable conflicts.
 */
export class ImportConflictError extends HeliosVersioningError {
  constructor(
    public readonly conflicts: string[],
    public readonly strategy: string
  ) {
    super(
      `Import failed due to ${conflicts.length} conflict(s) with strategy "${strategy}": ` +
        conflicts.slice(0, 3).join("; ") +
        (conflicts.length > 3 ? " …" : ""),
      "IMPORT_CONFLICT"
    );
    this.name = "ImportConflictError";
  }
}

// ─── Canonicalization errors ──────────────────────────────────────────────────

/**
 * Thrown when canonicalization fails (e.g., circular reference detected).
 */
export class CanonicalizationError extends HeliosVersioningError {
  constructor(detail: string) {
    super(
      `Cannot produce canonical representation: ${detail}`,
      "CANONICALIZATION_ERROR"
    );
    this.name = "CanonicalizationError";
  }
}
