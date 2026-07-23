/**
 * S-024 / S-024.1 — Project Versioning public API barrel.
 */

// Types
export type {
  ProjectSnapshotPayload,
  ProjectSnapshotMetadata,
  ProjectSnapshot,
  ProjectVersion,
  ProjectVersionTag,
  ProjectChangeType,
  ProjectEntityChange,
  ProjectDiff,
  ProjectDiffSummary,
  MethodologicalChangelog,
  MethodologicalChangelogSection,
  ReproducibilityResult,
  ProjectPackage,
  ProjectPackageManifest,
  ImportStrategy,
  ProjectImportResult,
  ImportConflict,
  ImportTransaction,
  ProjectIntegrityResult,
  SnapshotValidationResult,
  SchemaMigration,
  SchemaMigrationResult,
  ReconstructedSession,
} from "./types";
export { CURRENT_PROJECT_SCHEMA_VERSION } from "./types";

// Snapshot service
export {
  computeSnapshotHash,
  normalizeSnapshotPayload,
  createProjectSnapshot,
  verifySnapshotIntegrity,
  cloneSnapshot,
  validateSnapshot,
  isSnapshotEquivalent,
  reconstructSessionFromSnapshot,
  generateReportFromSnapshot,
  computeGeneratedReportHash,
  verifyReportReproducibility,
  addProjectSnapshot,
  findProjectSnapshot,
  removeProjectSnapshot,
  deepFreeze,
  deepClone,
} from "./SnapshotService";

// Package service
export {
  CURRENT_PACKAGE_VERSION,
  createProjectPackage,
  serializeProjectPackage,
  deserializeProjectPackage,
  validateProjectPackage,
  verifyProjectPackageIntegrity,
  importProjectPackage,
  createImportTransaction,
  prepareImportTransaction,
  commitImportTransaction,
  exportProjectPackage,
  sanitizeFilename,
  buildExportFilename,
  addProjectVersion,
  findProjectVersion,
  removeProjectVersion,
  createProjectVersion,
} from "./ProjectPackageService";

// Version comparison
export {
  compareEntities,
  compareSnapshots,
  findAddedEntities,
  findRemovedEntities,
  findModifiedEntities,
  findUnchangedEntities,
  findReorderedEntities,
  summarizeDiff,
  groupChangesByEntityType,
  generateMethodologicalChangelog,
} from "./VersionComparisonService";

// Migration service
export {
  registerMigration,
  resetMigrationsToRegistry,
  findMigrationPath,
  canMigrate,
  migrateSnapshot,
  validateMigratedSnapshot,
} from "./migrations/MigrationService";

// Declarative registry
export { REGISTERED_MIGRATIONS } from "./migrations/registry";

// Crypto
export type { CryptoHashAdapter } from "./crypto/CryptoHashAdapter";
export {
  WebCryptoHashAdapter,
  NodeCryptoHashAdapter,
  DefaultCryptoHashAdapter,
  defaultHashAdapter,
  sha256Hex,
} from "./crypto/CryptoHashAdapter";
export { canonicalize, canonicalStringify } from "./crypto/canonicalize";

// Errors
export {
  HeliosVersioningError,
  SnapshotIntegrityError,
  PackageIntegrityError,
  UnsupportedSchemaVersionError,
  MigrationPathNotFoundError,
  ImportConflictError,
  CanonicalizationError,
} from "./errors";

// Understanding Case (S-025) — re-exported for consumers of the versioning barrel
export type {
  UnderstandingCase,
  UnderstandingCaseMigrationOrigin,
  UnderstandingCaseInput,
  UnderstandingCaseValidationResult,
  UnderstandingCaseStatus,
} from "@/understanding-case/types";
export {
  createCase,
  validateCase,
  updateCase,
  synthesizeCaseFromPayload,
  isSynthesizedCase,
  STATUS_LABELS,
} from "@/understanding-case/UnderstandingCaseService";

// Breaking change rules
export type { BreakingChangeRule } from "./breaking-change-rules";
export {
  BREAKING_CHANGE_RULES,
  evaluateBreakingChange,
  isBreakingChange,
  findAllBreakingChanges,
} from "./breaking-change-rules";
