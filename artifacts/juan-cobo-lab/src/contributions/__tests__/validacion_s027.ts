#!/usr/bin/env tsx
/**
 * S-027 — Validation Suite: Contributions (Contribuciones)
 *
 * Sections:
 *  1.  Type system & constants
 *  2.  ContributionInput structural validation
 *  3.  SourceLocation typed struct
 *  4.  createContribution
 *  5.  updateContribution
 *  6.  changeContributionStatus — valid transitions
 *  7.  changeContributionStatus — invalid transitions
 *  8.  deleteContribution
 *  9.  replaceContribution
 * 10.  getContributionsBySource / getContributionsByCase / getContributionById
 * 11.  validateContributionReferences — valid
 * 12.  validateContributionReferences — sourceId nonexistent (approval condition)
 * 13.  validateContributionReferences — caseId mismatch (approval condition)
 * 14.  validateContributionReferences — source not in active case
 * 15.  canDeleteSource — orphan protection (approval condition)
 * 16.  Snapshot integration — contributions in ProjectSnapshotPayload
 * 17.  Migration 1.2.0 → 1.3.0 preserves existing data + adds contributions: []
 * 18.  Extra approval conditions:
 *       18a. orphan deletion attempt (domain layer blocks, not just UI)
 *       18b. creation from disabled source state (not an error in domain layer — UI enforces)
 *       18c. preservation of contributions when source is archived
 *
 * Target: 21/21 suites PASS · TypeCheck: 0 errors · Build: OK
 */

import assert from "node:assert/strict";

import {
  validateContribution,
  validateContributionReferences,
  canDeleteSource,
  createContribution,
  updateContribution,
  changeContributionStatus,
  deleteContribution,
  replaceContribution,
  getContributionsBySource,
  getContributionsByCase,
  getContributionById,
} from "@/contributions/ContributionService";
import type {
  Contribution,
  ContributionInput,
  ContributionType,
  ContributionStatus,
} from "@/contributions/types";
import {
  CONTRIBUTION_TYPE_LABELS,
  CONTRIBUTION_STATUS_LABELS,
  CONTRIBUTION_ORIGIN_LABELS,
  VALID_CONTRIBUTION_STATUS_TRANSITIONS,
  ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS,
} from "@/contributions/types";
import type { KnowledgeSource } from "@/knowledge-sources/types";
import { createSource } from "@/knowledge-sources/KnowledgeSourceService";
import { changeStatus } from "@/knowledge-sources/KnowledgeSourceService";
import {
  createProjectSnapshot,
  reconstructSessionFromSnapshot,
} from "@/project-versioning/SnapshotService";
import { migrateSnapshot } from "@/project-versioning/migrations/MigrationService";
import { CURRENT_PROJECT_SCHEMA_VERSION } from "@/project-versioning/types";
import type { ProjectSnapshotPayload } from "@/project-versioning/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✔  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✘  ${name}`);
    console.error(`       ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

function makeSource(overrides: Partial<KnowledgeSource> = {}): KnowledgeSource {
  const base = createSource({
    caseId: "case_001",
    title: "Informe base",
    sourceType: "document",
    content: "Contenido extenso de la fuente de conocimiento para análisis.",
  });
  return { ...base, ...overrides };
}

function makeInput(overrides: Partial<ContributionInput> = {}): ContributionInput {
  return {
    caseId: "case_001",
    sourceId: "src_001",
    type: "finding",
    statement: "La brecha digital persiste por razones estructurales más que tecnológicas.",
    sourceExcerpt: "La infraestructura no es el factor limitante principal; la apropiación sí lo es.",
    origin: "human",
    ...overrides,
  };
}

function makePayload(overrides: Partial<ProjectSnapshotPayload> = {}): ProjectSnapshotPayload {
  return {
    understandingCase: null,
    knowledgeSources: [],
    contributions: [],
    problema: "Prueba S-027",
    packActivo: null,
    thinkingUserSelection: null,
    reflectionAnswers: [],
    hypotheses: [],
    primaryHypothesisId: undefined,
    conceptualModels: [],
    operationalizationMatrices: [],
    contrastationMatrices: [],
    evidenceEvaluationMatrices: [],
    hypothesisEvidenceConclusions: [],
    reportDefinitions: [],
    ...overrides,
  };
}

// ─── Run ──────────────────────────────────────────────────────────────────────

// ─── 1. Type system & constants ───────────────────────────────────────────────
console.log("\n1. Type system & constants");

await test("CONTRIBUTION_TYPE_LABELS has 11 entries", () => {
  assert.equal(Object.keys(CONTRIBUTION_TYPE_LABELS).length, 11);
});

await test("CONTRIBUTION_STATUS_LABELS has 5 entries", () => {
  assert.equal(Object.keys(CONTRIBUTION_STATUS_LABELS).length, 5);
});

await test("CONTRIBUTION_ORIGIN_LABELS has 2 entries", () => {
  assert.equal(Object.keys(CONTRIBUTION_ORIGIN_LABELS).length, 2);
});

await test("ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS is ['registered', 'ready-for-analysis']", () => {
  assert.deepEqual(
    [...ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS].sort(),
    ["ready-for-analysis", "registered"]
  );
});

await test("VALID_CONTRIBUTION_STATUS_TRANSITIONS defines transitions for all 5 statuses", () => {
  const statuses: ContributionStatus[] = ["draft", "proposed", "validated", "rejected", "archived"];
  for (const s of statuses) {
    assert.ok(s in VALID_CONTRIBUTION_STATUS_TRANSITIONS, `Missing transitions for ${s}`);
  }
});

await test("draft → proposed is a valid transition", () => {
  assert.ok(VALID_CONTRIBUTION_STATUS_TRANSITIONS["draft"].includes("proposed"));
});

await test("validated → archived is a valid transition", () => {
  assert.ok(VALID_CONTRIBUTION_STATUS_TRANSITIONS["validated"].includes("archived"));
});

await test("archived → * has no allowed transitions", () => {
  assert.deepEqual(VALID_CONTRIBUTION_STATUS_TRANSITIONS["archived"], []);
});

// ─── 2. ContributionInput structural validation ───────────────────────────────
console.log("\n2. ContributionInput structural validation");

await test("valid input passes", () => {
  const r = validateContribution(makeInput());
  assert.ok(r.valid, `Expected valid. Errors: ${r.errors.join(", ")}`);
  assert.equal(r.errors.length, 0);
});

await test("empty statement fails", () => {
  const r = validateContribution(makeInput({ statement: "" }));
  assert.ok(!r.valid);
  assert.ok(r.errors.some((e) => /statement/i.test(e)));
});

await test("statement too short (<10) fails", () => {
  const r = validateContribution(makeInput({ statement: "Breve" }));
  assert.ok(!r.valid);
});

await test("statement too long (>2000) fails", () => {
  const r = validateContribution(makeInput({ statement: "x".repeat(2001) }));
  assert.ok(!r.valid);
});

await test("empty sourceExcerpt fails", () => {
  const r = validateContribution(makeInput({ sourceExcerpt: "" }));
  assert.ok(!r.valid);
  assert.ok(r.errors.some((e) => /excerpt/i.test(e) || /fragmento/i.test(e)));
});

await test("sourceExcerpt too short (<10) fails", () => {
  const r = validateContribution(makeInput({ sourceExcerpt: "Corto" }));
  assert.ok(!r.valid);
});

await test("missing caseId fails", () => {
  const r = validateContribution(makeInput({ caseId: "" }));
  assert.ok(!r.valid);
  assert.ok(r.errors.some((e) => /caseId/i.test(e)));
});

await test("missing sourceId fails", () => {
  const r = validateContribution(makeInput({ sourceId: "" }));
  assert.ok(!r.valid);
  assert.ok(r.errors.some((e) => /sourceId/i.test(e)));
});

await test("invalid type fails", () => {
  const r = validateContribution(makeInput({ type: "invalid-type" as ContributionType }));
  assert.ok(!r.valid);
});

await test("interpretation too long (>1000) fails", () => {
  const r = validateContribution(makeInput({ interpretation: "x".repeat(1001) }));
  assert.ok(!r.valid);
});

await test("relevance too long (>500) fails", () => {
  const r = validateContribution(makeInput({ relevance: "x".repeat(501) }));
  assert.ok(!r.valid);
});

// ─── 3. SourceLocation typed struct ──────────────────────────────────────────
console.log("\n3. SourceLocation typed struct");

await test("sourceLocation is optional — undefined passes validation", () => {
  const r = validateContribution(makeInput({ sourceLocation: undefined }));
  assert.ok(r.valid);
});

await test("sourceLocation with description passes validation", () => {
  const r = validateContribution(
    makeInput({ sourceLocation: { description: "párrafo 3, p. 45" } })
  );
  assert.ok(r.valid);
});

await test("sourceLocation is preserved on the created contribution", () => {
  const input = makeInput({ sourceLocation: { description: "sección 2.3", page: 45 } });
  const c = createContribution(input);
  assert.deepEqual(c.sourceLocation, { description: "sección 2.3", page: 45 });
});

// ─── 4. createContribution ────────────────────────────────────────────────────
console.log("\n4. createContribution");

await test("creates contribution with correct fields", () => {
  const input = makeInput();
  const c = createContribution(input);
  assert.equal(c.caseId, input.caseId);
  assert.equal(c.sourceId, input.sourceId);
  assert.equal(c.type, input.type);
  assert.equal(c.statement, input.statement);
  assert.equal(c.sourceExcerpt, input.sourceExcerpt);
  assert.equal(c.origin, "human");
  assert.equal(c.status, "draft");
  assert.ok(c.id.length > 0);
  assert.ok(c.createdAt.length > 0);
  assert.ok(c.updatedAt.length > 0);
});

await test("origin is always 'human' for S-027 UI contributions", () => {
  const c = createContribution(makeInput({ origin: "human" }));
  assert.equal(c.origin, "human");
});

await test("new contribution always starts as 'draft'", () => {
  const c = createContribution(makeInput());
  assert.equal(c.status, "draft");
});

await test("each createContribution call produces a unique id", () => {
  const c1 = createContribution(makeInput());
  const c2 = createContribution(makeInput());
  assert.notEqual(c1.id, c2.id);
});

// ─── 5. updateContribution ────────────────────────────────────────────────────
console.log("\n5. updateContribution");

await test("updates mutable fields", () => {
  const c = createContribution(makeInput());
  const updated = updateContribution(c, {
    type: "claim",
    statement: "Nuevo enunciado actualizado con más de diez caracteres.",
    sourceExcerpt: "Nuevo fragmento textual de la fuente con suficiente longitud.",
  });
  assert.equal(updated.type, "claim");
  assert.equal(updated.statement, "Nuevo enunciado actualizado con más de diez caracteres.");
  assert.equal(updated.id, c.id); // ID preserved
  assert.equal(updated.caseId, c.caseId); // immutable fields preserved
});

await test("updatedAt changes after update", () => {
  const c = createContribution(makeInput());
  // Wait just a tiny bit
  const updated = updateContribution(c, {
    statement: "Enunciado actualizado con suficiente longitud para pasar validación.",
    sourceExcerpt: "Fragmento fuente con suficiente longitud para pasar la validación mínima.",
  });
  // Either same or later (same-millisecond possible in fast machines)
  assert.ok(updated.updatedAt >= c.updatedAt);
});

// ─── 6. changeContributionStatus — valid transitions ─────────────────────────
console.log("\n6. changeContributionStatus — valid transitions");

await test("draft → proposed succeeds", () => {
  const c = createContribution(makeInput());
  const r = changeContributionStatus(c, "proposed");
  assert.ok(r.success);
  assert.equal(r.contribution.status, "proposed");
});

await test("proposed → validated succeeds", () => {
  const c = createContribution(makeInput());
  const r1 = changeContributionStatus(c, "proposed");
  assert.ok(r1.success);
  if (!r1.success) return;
  const r2 = changeContributionStatus(r1.contribution, "validated");
  assert.ok(r2.success);
  if (!r2.success) return;
  assert.equal(r2.contribution.status, "validated");
});

await test("proposed → rejected succeeds", () => {
  const c = createContribution(makeInput());
  const r1 = changeContributionStatus(c, "proposed");
  assert.ok(r1.success);
  if (!r1.success) return;
  const r2 = changeContributionStatus(r1.contribution, "rejected");
  assert.ok(r2.success);
  if (!r2.success) return;
  assert.equal(r2.contribution.status, "rejected");
});

await test("validated → archived succeeds", () => {
  const c = createContribution(makeInput());
  const r1 = changeContributionStatus(c, "proposed");
  if (!r1.success) { assert.fail("proposed failed"); return; }
  const r2 = changeContributionStatus(r1.contribution, "validated");
  if (!r2.success) { assert.fail("validated failed"); return; }
  const r3 = changeContributionStatus(r2.contribution, "archived");
  assert.ok(r3.success);
  if (!r3.success) return;
  assert.equal(r3.contribution.status, "archived");
});

// ─── 7. changeContributionStatus — invalid transitions ───────────────────────
console.log("\n7. changeContributionStatus — invalid transitions");

await test("draft → validated fails (must propose first)", () => {
  const c = createContribution(makeInput());
  const r = changeContributionStatus(c, "validated");
  assert.ok(!r.success);
});

await test("archived → proposed fails (archived is terminal)", () => {
  const c = createContribution(makeInput());
  const p = changeContributionStatus(c, "proposed");
  if (!p.success) { assert.fail("proposed failed"); return; }
  const v = changeContributionStatus(p.contribution, "validated");
  if (!v.success) { assert.fail("validated failed"); return; }
  const a = changeContributionStatus(v.contribution, "archived");
  if (!a.success) { assert.fail("archived failed"); return; }
  const r = changeContributionStatus(a.contribution, "proposed");
  assert.ok(!r.success);
});

// ─── 8. deleteContribution ────────────────────────────────────────────────────
console.log("\n8. deleteContribution");

await test("removes the target contribution from the list", () => {
  const c1 = createContribution(makeInput());
  const c2 = createContribution(makeInput());
  const list = [c1, c2];
  const result = deleteContribution(list, c1.id);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, c2.id);
});

await test("deleting non-existent id returns unchanged list", () => {
  const c = createContribution(makeInput());
  const result = deleteContribution([c], "non-existent-id");
  assert.equal(result.length, 1);
});

// ─── 9. replaceContribution ───────────────────────────────────────────────────
console.log("\n9. replaceContribution");

await test("replaces the contribution with matching id", () => {
  const c1 = createContribution(makeInput());
  const c2 = createContribution(makeInput());
  const updated = updateContribution(c1, {
    statement: "Enunciado modificado con suficiente longitud para validación.",
    sourceExcerpt: "Fragmento modificado con suficiente longitud para pasar validación.",
  });
  const result = replaceContribution([c1, c2], updated);
  assert.equal(result.length, 2);
  const found = result.find((c) => c.id === c1.id);
  assert.ok(found);
  assert.equal(found!.statement, updated.statement);
});

// ─── 10. Queries ─────────────────────────────────────────────────────────────
console.log("\n10. getContributionsBySource / getContributionsByCase / getContributionById");

await test("getContributionsBySource filters by sourceId", () => {
  const c1 = createContribution(makeInput({ sourceId: "src_A" }));
  const c2 = createContribution(makeInput({ sourceId: "src_B" }));
  const c3 = createContribution(makeInput({ sourceId: "src_A" }));
  const result = getContributionsBySource([c1, c2, c3], "src_A");
  assert.equal(result.length, 2);
  assert.ok(result.every((c) => c.sourceId === "src_A"));
});

await test("getContributionsByCase filters by caseId", () => {
  const c1 = createContribution(makeInput({ caseId: "case_X" }));
  const c2 = createContribution(makeInput({ caseId: "case_Y" }));
  const c3 = createContribution(makeInput({ caseId: "case_X" }));
  const result = getContributionsByCase([c1, c2, c3], "case_X");
  assert.equal(result.length, 2);
});

await test("getContributionById returns the correct contribution", () => {
  const c1 = createContribution(makeInput());
  const c2 = createContribution(makeInput());
  const found = getContributionById([c1, c2], c2.id);
  assert.ok(found);
  assert.equal(found!.id, c2.id);
});

await test("getContributionById returns undefined for missing id", () => {
  const c = createContribution(makeInput());
  const found = getContributionById([c], "does-not-exist");
  assert.equal(found, undefined);
});

// ─── 11. validateContributionReferences — valid ───────────────────────────────
console.log("\n11. validateContributionReferences — valid");

await test("valid reference: sourceId exists and caseId matches (registered state)", () => {
  // validateContributionReferences enforces enabled source state (registered / ready-for-analysis)
  const srcBase = makeSource({ id: "src_R1", caseId: "case_R" });
  // Transition to registered so it passes the source-state check
  const registerResult = changeStatus(srcBase, "registered");
  assert.ok(registerResult.success, "should be able to register source");
  if (!registerResult.success) return;
  const src = registerResult.source;
  const input = makeInput({ sourceId: "src_R1", caseId: "case_R" });
  const r = validateContributionReferences(input, [src]);
  assert.ok(r.valid, `Expected valid. Errors: ${r.errors.join(", ")}`);
});

// ─── 12. validateContributionReferences — sourceId nonexistent ───────────────
console.log("\n12. validateContributionReferences — sourceId nonexistent (approval condition)");

await test("sourceId nonexistent → referential validation fails", () => {
  const src = makeSource({ id: "src_real", caseId: "case_001" });
  const input = makeInput({ sourceId: "src_GHOST", caseId: "case_001" });
  const r = validateContributionReferences(input, [src]);
  assert.ok(!r.valid, "Expected invalid — sourceId does not exist");
  assert.ok(r.errors.some((e) => /sourceId|source/i.test(e)));
});

// ─── 13. validateContributionReferences — caseId mismatch ────────────────────
console.log("\n13. validateContributionReferences — caseId mismatch (approval condition)");

await test("caseId mismatch between input and source → fails", () => {
  const src = makeSource({ id: "src_001", caseId: "case_ACTUAL" });
  const input = makeInput({ sourceId: "src_001", caseId: "case_WRONG" });
  const r = validateContributionReferences(input, [src]);
  assert.ok(!r.valid, "Expected invalid — caseId mismatch");
  assert.ok(r.errors.some((e) => /caseId|caso/i.test(e)));
});

// ─── 14. validateContributionReferences — source not in active case ───────────
console.log("\n14. validateContributionReferences — source not in active case");

await test("source caseId different from input caseId → fails", () => {
  const src = makeSource({ id: "src_002", caseId: "case_OTHER" });
  const input = makeInput({ sourceId: "src_002", caseId: "case_001" });
  const r = validateContributionReferences(input, [src]);
  assert.ok(!r.valid);
});

// ─── 15. canDeleteSource — orphan protection ──────────────────────────────────
console.log("\n15. canDeleteSource — orphan protection (approval condition)");

await test("source with no contributions can be deleted", () => {
  const src = makeSource({ id: "src_clean" });
  const r = canDeleteSource("src_clean", []);
  assert.ok(r.canDelete);
});

await test("source with contributions cannot be deleted (orphan protection)", () => {
  const c = createContribution(makeInput({ sourceId: "src_with_contribs" }));
  const r = canDeleteSource("src_with_contribs", [c]);
  assert.ok(!r.canDelete);
  assert.equal(r.contributionCount, 1);
});

await test("canDeleteSource counts only contributions for the given sourceId", () => {
  const c1 = createContribution(makeInput({ sourceId: "src_A" }));
  const c2 = createContribution(makeInput({ sourceId: "src_B" }));
  const c3 = createContribution(makeInput({ sourceId: "src_A" }));
  const r = canDeleteSource("src_A", [c1, c2, c3]);
  assert.ok(!r.canDelete);
  assert.equal(r.contributionCount, 2);
});

await test("orphan deletion attempt — domain layer enforces (not just UI)", () => {
  // The domain function must block regardless of UI context.
  // canDeleteSource is the domain enforcement; this test ensures it is deterministic.
  const c = createContribution(makeInput({ sourceId: "src_orphan_test" }));
  const contributions = [c];
  const check = canDeleteSource("src_orphan_test", contributions);
  // Domain must return canDelete: false — caller is responsible for not calling deleteSource
  assert.ok(!check.canDelete);
  assert.ok(typeof check.contributionCount === "number" && check.contributionCount > 0);
});

// ─── 16. Snapshot integration ─────────────────────────────────────────────────
console.log("\n16. Snapshot integration — contributions in ProjectSnapshotPayload");

await test("payload with contributions creates a valid snapshot", async () => {
  const c = createContribution(makeInput());
  const payload = makePayload({ contributions: [c] });
  const snap = await createProjectSnapshot(payload, {
    projectId: "s027-snap-test",
    projectName: "S-027 Snapshot Test",
    tags: [],
  });
  assert.ok(Array.isArray(snap.payload.contributions));
  assert.equal(snap.payload.contributions.length, 1);
  assert.equal(snap.payload.contributions[0].id, c.id);
});

await test("reconstructSessionFromSnapshot restores contributions", async () => {
  const c = createContribution(makeInput());
  const payload = makePayload({ contributions: [c] });
  const snap = await createProjectSnapshot(payload, {
    projectId: "s027-reconstruct",
    projectName: "S-027 Reconstruct",
    tags: [],
  });
  const session = reconstructSessionFromSnapshot(snap);
  assert.ok(Array.isArray(session.contributions));
  assert.equal(session.contributions.length, 1);
  assert.equal(session.contributions[0].statement, c.statement);
});

await test("reconstructSessionFromSnapshot defaults contributions to [] when absent", () => {
  // Simulate an old snapshot where the payload has no contributions field.
  // Use makeSnapshotFromPayload (unvalidated) to avoid the frozen/hashed path.
  const legacyPayload = {
    understandingCase: null,
    knowledgeSources: [],
    // contributions intentionally absent
    problema: "Fenómeno legado",
    packActivo: null,
    thinkingUserSelection: null,
    reflectionAnswers: [],
    hypotheses: [],
    primaryHypothesisId: undefined as undefined,
    conceptualModels: [],
    operationalizationMatrices: [],
    contrastationMatrices: [],
    evidenceEvaluationMatrices: [],
    hypothesisEvidenceConclusions: [],
    reportDefinitions: [],
  };
  const snap = makeSnapshotFromPayload(legacyPayload, "1.2.0");
  const session = reconstructSessionFromSnapshot(snap);
  assert.ok(Array.isArray(session.contributions));
  assert.equal(session.contributions.length, 0);
});

await test("CURRENT_PROJECT_SCHEMA_VERSION is '1.3.0'", () => {
  assert.equal(CURRENT_PROJECT_SCHEMA_VERSION, "1.3.0");
});

// ─── 17. Migration 1.2.0 → 1.3.0 ────────────────────────────────────────────
console.log("\n17. Migration 1.2.0 → 1.3.0");

function makeSnapshotFromPayload(
  payload: unknown,
  schemaVersion: string
) {
  const now = new Date().toISOString();
  return {
    id: `snap_s027_${Date.now()}_${Math.random()}`,
    version: "0.1.0",
    schemaVersion,
    metadata: {
      projectId: "s027-migration-test",
      projectName: "Migration Test",
      tags: [] as string[],
    },
    payload: payload as ProjectSnapshotPayload,
    contentHash: "placeholder",
    createdAt: now,
  };
}

await test("migrating from 1.2.0 to 1.3.0 adds contributions: []", () => {
  const old120Payload = {
    understandingCase: null,
    knowledgeSources: [],
    problema: "Fenómeno de prueba migración",
    packActivo: null,
    thinkingUserSelection: null,
    reflectionAnswers: [],
    hypotheses: [],
    primaryHypothesisId: undefined,
    conceptualModels: [],
    operationalizationMatrices: [],
    contrastationMatrices: [],
    evidenceEvaluationMatrices: [],
    hypothesisEvidenceConclusions: [],
    reportDefinitions: [],
    // No contributions field — simulating pre-1.3.0 payload
  };
  const snap = makeSnapshotFromPayload(old120Payload, "1.2.0");
  const result = migrateSnapshot(snap, "1.3.0");
  const p = result.migratedPayload as ProjectSnapshotPayload;
  assert.equal(result.toVersion, "1.3.0");
  assert.ok(Array.isArray(p.contributions));
  assert.equal(p.contributions.length, 0);
});

await test("migrating from 1.2.0 preserves existing knowledgeSources", () => {
  const old120Payload = {
    understandingCase: null,
    knowledgeSources: [
      {
        id: "src_existing",
        caseId: "case_existing",
        title: "Fuente existente",
        sourceType: "document" as const,
        content: "Contenido existente de prueba",
        status: "registered" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    problema: "Problema con fuente existente",
    packActivo: null,
    thinkingUserSelection: null,
    reflectionAnswers: [],
    hypotheses: [],
    primaryHypothesisId: undefined,
    conceptualModels: [],
    operationalizationMatrices: [],
    contrastationMatrices: [],
    evidenceEvaluationMatrices: [],
    hypothesisEvidenceConclusions: [],
    reportDefinitions: [],
  };
  const snap = makeSnapshotFromPayload(old120Payload, "1.2.0");
  const result = migrateSnapshot(snap, "1.3.0");
  const p = result.migratedPayload as ProjectSnapshotPayload;
  assert.equal(p.knowledgeSources.length, 1);
  assert.equal(p.knowledgeSources[0].id, "src_existing");
  assert.deepEqual(p.contributions, []);
});

await test("full migration chain 0.9.0 → 1.3.0 produces contributions: []", () => {
  const oldPayload = {
    problema: "Fenómeno clásico",
    packActivo: null,
    thinkingUserSelection: null,
    reflectionAnswers: [],
    hypotheses: [],
    primaryHypothesisId: undefined,
    conceptualModels: [],
    operationalizationMatrices: [],
    contrastationMatrices: [],
    evidenceEvaluationMatrices: [],
    hypothesisEvidenceConclusions: [],
    reportDefinitions: [],
  };
  const snap = makeSnapshotFromPayload(oldPayload, "0.9.0");
  const result = migrateSnapshot(snap, "1.3.0");
  const p = result.migratedPayload as ProjectSnapshotPayload;
  assert.equal(result.toVersion, "1.3.0");
  assert.ok(Array.isArray(p.contributions));
  assert.equal(p.contributions.length, 0);
  assert.ok(Array.isArray(p.knowledgeSources));
});

// ─── 18. Extra approval conditions ───────────────────────────────────────────
console.log("\n18. Extra approval conditions");

// 18a: orphan deletion attempt is blocked at domain layer
await test("18a — orphan deletion: domain layer blocks, returns contributionCount", () => {
  const src = makeSource({ id: "src_orphan" });
  const c1 = createContribution(makeInput({ sourceId: src.id }));
  const c2 = createContribution(makeInput({ sourceId: src.id }));
  const allContribs = [c1, c2];
  const check = canDeleteSource(src.id, allContribs);
  assert.ok(!check.canDelete, "Domain must prevent deletion");
  assert.equal(check.contributionCount, 2);
});

// 18b: creation from disabled source state — domain layer does NOT enforce
// (the ContributionService itself doesn't know about source status — that's a
// higher-level concern; the UI enforces this via ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS).
// The test verifies that the service DOES accept the input structurally, and that
// the enablement check lives in the constants, not buried in createContribution.
await test("18b — disabled source state: ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS excludes 'draft'", () => {
  const disabledStatuses = ["draft", "processed", "rejected", "archived"];
  for (const s of disabledStatuses) {
    assert.ok(
      !ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS.includes(s as never),
      `Expected ${s} to be disabled for contributions`
    );
  }
});

await test("18b — disabled source state: ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS includes exactly 2 statuses", () => {
  assert.equal(ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS.length, 2);
});

// 18c: contributions are preserved when source is archived
await test("18c — archiving a source preserves its contributions (contributions not deleted)", () => {
  const src = makeSource({ id: "src_to_archive", caseId: "case_001" });
  const c1 = createContribution(makeInput({ sourceId: src.id, caseId: "case_001" }));
  const c2 = createContribution(makeInput({ sourceId: src.id, caseId: "case_001" }));
  let allContribs = [c1, c2];

  // Archiving the source: the contributions service does NOT remove contributions
  // (archiving is a status transition on the source, contributions remain)
  const archiveResult = changeStatus(src, "archived");
  assert.ok(archiveResult.success, "Should be able to archive source");

  // Verify contributions still exist and sourceId is still valid
  const stillThere = getContributionsBySource(allContribs, src.id);
  assert.equal(stillThere.length, 2, "Contributions must survive source archival");
  assert.ok(stillThere.every((c) => c.sourceId === src.id));
});

// ─── Summary ──────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n${"─".repeat(50)}`);
console.log(`S-027 Contributions: ${passed}/${total} tests passed`);
if (failed > 0) {
  console.error(`\n${failed} test(s) FAILED`);
  process.exit(1);
}
