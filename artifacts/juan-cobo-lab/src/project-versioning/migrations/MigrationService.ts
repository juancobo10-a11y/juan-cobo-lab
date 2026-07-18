/**
 * S-024 — MigrationService
 *
 * Registry and execution of schema migrations for project snapshots.
 * Migrations are pure functions: (payload: unknown) => unknown.
 * No side effects. No storage access.
 *
 * Architecture: although only one schema version (1.0.0) exists today,
 * the migration infrastructure is fully operational.
 * Add new migrations by calling registerMigration() at startup.
 */

import type { SchemaMigration, SchemaMigrationResult } from "../types";
import { validateSnapshot } from "../SnapshotService";
import type { ProjectSnapshot } from "../types";

// ─── Registry ─────────────────────────────────────────────────────────────────

const migrations: SchemaMigration[] = [];

export function registerMigration(migration: SchemaMigration): void {
  const existing = migrations.find(
    (m) => m.fromVersion === migration.fromVersion && m.toVersion === migration.toVersion
  );
  if (!existing) migrations.push(migration);
}

// ─── Path finding ─────────────────────────────────────────────────────────────

/**
 * Find the sequence of migrations needed to go from fromVersion to toVersion.
 * Uses BFS for correctness (shortest path).
 * Returns null if no path exists.
 */
export function findMigrationPath(
  fromVersion: string,
  toVersion: string
): SchemaMigration[] | null {
  if (fromVersion === toVersion) return [];

  // BFS
  const queue: Array<{ version: string; path: SchemaMigration[] }> = [
    { version: fromVersion, path: [] },
  ];
  const visited = new Set<string>([fromVersion]);

  while (queue.length > 0) {
    const { version, path } = queue.shift()!;
    const next = migrations.filter((m) => m.fromVersion === version);

    for (const migration of next) {
      const newPath = [...path, migration];
      if (migration.toVersion === toVersion) return newPath;
      if (!visited.has(migration.toVersion)) {
        visited.add(migration.toVersion);
        queue.push({ version: migration.toVersion, path: newPath });
      }
    }
  }

  return null; // No path found
}

/** Whether a migration path exists between two versions. */
export function canMigrate(fromVersion: string, toVersion: string): boolean {
  if (fromVersion === toVersion) return true;
  return findMigrationPath(fromVersion, toVersion) !== null;
}

// ─── Execution ────────────────────────────────────────────────────────────────

/**
 * Migrate a snapshot payload from its current schemaVersion to toVersion.
 * Returns a SchemaMigrationResult. Never mutates the input.
 */
export function migrateSnapshot(
  snapshot: ProjectSnapshot,
  toVersion: string
): SchemaMigrationResult {
  const fromVersion = snapshot.schemaVersion;

  if (fromVersion === toVersion) {
    return {
      success: true,
      fromVersion,
      toVersion,
      migratedPayload: JSON.parse(JSON.stringify(snapshot.payload)),
      errors: [],
    };
  }

  const path = findMigrationPath(fromVersion, toVersion);
  if (!path) {
    return {
      success: false,
      fromVersion,
      toVersion,
      migratedPayload: null,
      errors: [`No migration path from ${fromVersion} to ${toVersion}`],
    };
  }

  try {
    let payload: unknown = JSON.parse(JSON.stringify(snapshot.payload));
    for (const migration of path) {
      payload = migration.migrate(payload);
    }
    return {
      success: true,
      fromVersion,
      toVersion,
      migratedPayload: payload,
      errors: [],
    };
  } catch (err) {
    return {
      success: false,
      fromVersion,
      toVersion,
      migratedPayload: null,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

/**
 * Validate a migrated snapshot by checking its structural integrity.
 * Does NOT verify the contentHash (which would be from the pre-migration snapshot).
 */
export function validateMigratedSnapshot(migratedPayload: unknown): { valid: boolean; errors: string[] } {
  // Create a minimal snapshot-like object for validation
  const mockSnapshot = {
    id: "migration-validation",
    version: "migrated",
    schemaVersion: "1.0.0",
    metadata: { projectId: "test", projectName: "test", tags: [] },
    payload: migratedPayload,
    contentHash: "placeholder",
    createdAt: new Date().toISOString(),
  };
  const result = validateSnapshot(mockSnapshot);
  return { valid: result.valid, errors: result.errors };
}
