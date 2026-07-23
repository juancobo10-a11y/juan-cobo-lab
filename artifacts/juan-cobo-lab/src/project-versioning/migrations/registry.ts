/**
 * S-024.1 — Declarative Migration Registry
 *
 * All schema migrations are declared here statically.
 * No side effects. No UI-level registration required.
 *
 * To add a new migration:
 * 1. Create the migration file in this directory.
 * 2. Import it here.
 * 3. Add it to REGISTERED_MIGRATIONS in chronological order.
 *
 * MigrationService reads this registry at startup — no registerMigration()
 * calls in UI components or module-level code are needed.
 */

import type { SchemaMigration } from "../types";
import { migration_0_9_0_to_1_0_0 } from "./migration-0.9.0-to-1.0.0";
import { migration_1_0_0_to_1_1_0 } from "./migration-1.0.0-to-1.1.0";
import { migration_1_1_0_to_1_2_0 } from "./migration-1.1.0-to-1.2.0";
import { migration_1_2_0_to_1_3_0 } from "./migration-1.2.0-to-1.3.0";

export const REGISTERED_MIGRATIONS: SchemaMigration[] = [
  migration_0_9_0_to_1_0_0,
  migration_1_0_0_to_1_1_0,
  migration_1_1_0_to_1_2_0,
  migration_1_2_0_to_1_3_0,
];
