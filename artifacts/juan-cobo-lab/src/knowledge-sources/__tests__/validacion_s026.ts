#!/usr/bin/env tsx
/**
 * S-026 — Knowledge Sources (Fuentes de Conocimiento) — Validation Suite
 *
 * Sections:
 *  1. Creación válida de una fuente
 *  2. Validación — campos obligatorios
 *  3. Validación — longitudes y restricciones
 *  4. Edición (updateSource)
 *  5. Cambio de estado — transiciones válidas
 *  6. Cambio de estado — transiciones inválidas
 *  7. Eliminación por ID
 *  8. Asociación con el caso (caseId)
 *  9. Múltiples fuentes en el mismo caso
 * 10. Inclusión en snapshot (payload.knowledgeSources)
 * 11. Estabilidad del hash
 * 12. Hash cambia al modificar una fuente
 * 13. Exportación e importación round-trip
 * 14. Migración desde 1.1.0
 * 15. Diff: creación, modificación, eliminación, reordenamiento
 * 16. Coexistencia con UnderstandingCase
 */

import assert from "node:assert/strict";
import { createSource, updateSource, changeStatus, deleteSource, validateSource, replaceSource, getSourcesByCase } from "../KnowledgeSourceService";
import type { KnowledgeSource, KnowledgeSourceInput } from "../types";
import { VALID_STATUS_TRANSITIONS } from "../types";

// ─── Versioning imports ───────────────────────────────────────────────────────
import {
  createProjectSnapshot,
  verifySnapshotIntegrity,
  compareSnapshots,
  createProjectPackage,
  validateProjectPackage,
  importProjectPackage,
  migrateSnapshot,
  CURRENT_PROJECT_SCHEMA_VERSION,
} from "../../project-versioning";
import type { ProjectSnapshot, ProjectSnapshotPayload, ProjectSnapshotMetadata } from "../../project-versioning/types";
import { createCase } from "../../understanding-case/UnderstandingCaseService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(
    () => { passed++; console.log(`  ✓ ${name}`); },
    (err) => { failed++; console.error(`  ✗ ${name}\n    ${err instanceof Error ? err.message : err}`); }
  );
}

const BASE_META: ProjectSnapshotMetadata = {
  projectId: "s026-test",
  projectName: "S-026 Test Project",
  tags: [],
};

function makePayload(overrides: Partial<ProjectSnapshotPayload> = {}): ProjectSnapshotPayload {
  return {
    understandingCase: null,
    knowledgeSources: [],
    problema: "Prueba S-026",
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

/** Wrap a plain payload (without schemaVersion, etc.) into a full ProjectSnapshot for migration tests */
function makeSnapshotFromPayload(
  payload: unknown,
  schemaVersion: string
): ProjectSnapshot {
  const now = new Date().toISOString();
  return {
    id: `snap_s026_${Date.now()}`,
    version: "0.1.0",
    schemaVersion,
    metadata: BASE_META,
    payload: payload as ProjectSnapshotPayload,
    contentHash: "placeholder",
    createdAt: now,
  };
}

const SAMPLE_INPUT: KnowledgeSourceInput = {
  caseId: "case_001",
  title: "Informe de brecha digital 2024",
  sourceType: "pasted-text",
  content:
    "El informe revela que la brecha digital persiste en regiones rurales a pesar de la cobertura de infraestructura. Los factores de apropiación y habilidades son determinantes.",
  author: "MINTIC",
  language: "es",
};

// ─── Section 1: Creación válida ───────────────────────────────────────────────

console.log("\n1. Creación válida de una fuente");

await test("createSource genera ID con prefijo ks_", () => {
  const s = createSource(SAMPLE_INPUT);
  assert.ok(s.id.startsWith("ks_"), `ID debe empezar con ks_, fue: ${s.id}`);
});

await test("createSource preserva todos los campos del input", () => {
  const s = createSource(SAMPLE_INPUT);
  assert.equal(s.caseId, SAMPLE_INPUT.caseId);
  assert.equal(s.title, SAMPLE_INPUT.title);
  assert.equal(s.content, SAMPLE_INPUT.content);
  assert.equal(s.sourceType, SAMPLE_INPUT.sourceType);
  assert.equal(s.author, SAMPLE_INPUT.author);
  assert.equal(s.language, SAMPLE_INPUT.language);
});

await test("createSource asigna status 'draft' por defecto", () => {
  const s = createSource(SAMPLE_INPUT);
  assert.equal(s.status, "draft");
});

await test("createSource acepta status explícito 'registered'", () => {
  const s = createSource({ ...SAMPLE_INPUT, status: "registered" });
  assert.equal(s.status, "registered");
});

await test("createSource estampa incorporatedAt y updatedAt con _now determinista", () => {
  const now = "2026-07-23T12:00:00.000Z";
  const s = createSource(SAMPLE_INPUT, now);
  assert.equal(s.incorporatedAt, now);
  assert.equal(s.updatedAt, now);
});

await test("createSource hace trim de título y contenido", () => {
  const s = createSource({ ...SAMPLE_INPUT, title: "  Hola  ", content: "  contenido largo  " });
  assert.equal(s.title, "Hola");
  assert.equal(s.content, "contenido largo");
});

// ─── Section 2: Validación — campos obligatorios ──────────────────────────────

console.log("\n2. Validación — campos obligatorios");

await test("validateSource falla sin caseId", () => {
  const r = validateSource({ ...SAMPLE_INPUT, caseId: "" });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes("caseId")));
});

await test("validateSource falla sin título", () => {
  const r = validateSource({ ...SAMPLE_INPUT, title: "" });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.toLowerCase().includes("título")));
});

await test("validateSource falla sin contenido", () => {
  const r = validateSource({ ...SAMPLE_INPUT, content: "" });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.toLowerCase().includes("contenido")));
});

await test("validateSource falla con contenido demasiado corto (< 10 chars)", () => {
  const r = validateSource({ ...SAMPLE_INPUT, content: "corto" });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes("10")));
});

await test("validateSource pasa con input mínimo válido", () => {
  const r = validateSource({
    caseId: "c1",
    title: "T",
    sourceType: "pasted-text",
    content: "Contenido suficientemente largo",
  });
  assert.equal(r.valid, true);
  assert.equal(r.errors.length, 0);
});

// ─── Section 3: Restricciones adicionales ────────────────────────────────────

console.log("\n3. Validación — longitudes y restricciones");

await test("validateSource falla con título > 200 caracteres", () => {
  const r = validateSource({ ...SAMPLE_INPUT, title: "x".repeat(201) });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes("200")));
});

await test("createSource lanza si la validación falla", () => {
  assert.throws(
    () => createSource({ ...SAMPLE_INPUT, caseId: "" }),
    /KnowledgeSource inválido/
  );
});

await test("campos opcionales vacíos se normalizan a undefined", () => {
  const s = createSource({ ...SAMPLE_INPUT, author: "  ", institution: "" });
  assert.equal(s.author, undefined);
  assert.equal(s.institution, undefined);
});

// ─── Section 4: Edición ───────────────────────────────────────────────────────

console.log("\n4. Edición (updateSource)");

await test("updateSource actualiza título y content", () => {
  const s = createSource(SAMPLE_INPUT);
  const updated = updateSource(s, { title: "Nuevo título", content: "Contenido actualizado extensamente" });
  assert.equal(updated.title, "Nuevo título");
  assert.equal(updated.content, "Contenido actualizado extensamente");
});

await test("updateSource no modifica id ni caseId", () => {
  const s = createSource(SAMPLE_INPUT);
  const updated = updateSource(s, { title: "Otro" });
  assert.equal(updated.id, s.id);
  assert.equal(updated.caseId, s.caseId);
});

await test("updateSource no modifica incorporatedAt", () => {
  const now = "2026-07-23T12:00:00.000Z";
  const s = createSource(SAMPLE_INPUT, now);
  const later = "2026-07-23T14:00:00.000Z";
  const updated = updateSource(s, { title: "Otro" }, later);
  assert.equal(updated.incorporatedAt, now);
  assert.equal(updated.updatedAt, later);
});

await test("replaceSource sustituye la fuente por ID", () => {
  const s1 = createSource(SAMPLE_INPUT);
  const s2 = createSource({ ...SAMPLE_INPUT, title: "Segunda" });
  const list = [s1, s2];
  const updated = updateSource(s1, { title: "Modificada" });
  const result = replaceSource(list, updated);
  assert.equal(result.length, 2);
  assert.equal(result.find((s) => s.id === s1.id)?.title, "Modificada");
});

await test("replaceSource devuelve el array original si el ID no existe", () => {
  const s1 = createSource(SAMPLE_INPUT);
  const list = [s1];
  const phantom = { ...s1, id: "ks_nonexistent" };
  const result = replaceSource(list, phantom);
  assert.equal(result, list); // same reference
});

// ─── Section 5: Cambio de estado — transiciones válidas ──────────────────────

console.log("\n5. Cambio de estado — transiciones válidas");

await test("draft → registered es válida", () => {
  const s = createSource(SAMPLE_INPUT);
  assert.equal(s.status, "draft");
  const r = changeStatus(s, "registered");
  assert.ok(r.success);
  if (r.success) assert.equal(r.source.status, "registered");
});

await test("registered → ready-for-analysis es válida", () => {
  const s = createSource({ ...SAMPLE_INPUT, status: "registered" });
  const r = changeStatus(s, "ready-for-analysis");
  assert.ok(r.success);
  if (r.success) assert.equal(r.source.status, "ready-for-analysis");
});

await test("registered → draft (volver a borrador) es válida", () => {
  const s = createSource({ ...SAMPLE_INPUT, status: "registered" });
  const r = changeStatus(s, "draft");
  assert.ok(r.success);
});

await test("ready-for-analysis → registered (regresar) es válida", () => {
  const s = createSource({ ...SAMPLE_INPUT, status: "ready-for-analysis" });
  const r = changeStatus(s, "registered");
  assert.ok(r.success);
});

await test("changeStatus actualiza updatedAt", () => {
  const now = "2026-07-23T12:00:00.000Z";
  const s = createSource(SAMPLE_INPUT, now);
  const later = "2026-07-23T15:00:00.000Z";
  const r = changeStatus(s, "registered", later);
  assert.ok(r.success);
  if (r.success) assert.equal(r.source.updatedAt, later);
});

await test("VALID_STATUS_TRANSITIONS cubre todos los estados", () => {
  const allStatuses: string[] = [
    "draft", "registered", "ready-for-analysis", "processed", "rejected", "archived"
  ];
  allStatuses.forEach((s) => {
    assert.ok(s in VALID_STATUS_TRANSITIONS, `Falta ${s} en VALID_STATUS_TRANSITIONS`);
  });
});

// ─── Section 6: Transiciones inválidas ───────────────────────────────────────

console.log("\n6. Cambio de estado — transiciones inválidas");

await test("draft → ready-for-analysis es inválida (saltar registered)", () => {
  const s = createSource(SAMPLE_INPUT);
  const r = changeStatus(s, "ready-for-analysis");
  assert.equal(r.success, false);
  if (!r.success) assert.ok(r.error.includes("no permitida"));
});

await test("archived → draft es inválida", () => {
  const s = createSource({ ...SAMPLE_INPUT, status: "archived" });
  const r = changeStatus(s, "draft");
  assert.equal(r.success, false);
});

await test("processed → draft es inválida", () => {
  const s = createSource({ ...SAMPLE_INPUT, status: "processed" });
  const r = changeStatus(s, "draft");
  assert.equal(r.success, false);
});

// ─── Section 7: Eliminación ───────────────────────────────────────────────────

console.log("\n7. Eliminación por ID");

await test("deleteSource elimina la fuente correcta", () => {
  const s1 = createSource(SAMPLE_INPUT);
  const s2 = createSource({ ...SAMPLE_INPUT, title: "Segunda" });
  const list = [s1, s2];
  const result = deleteSource(list, s1.id);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, s2.id);
});

await test("deleteSource con ID inexistente devuelve el array completo", () => {
  const s1 = createSource(SAMPLE_INPUT);
  const list = [s1];
  const result = deleteSource(list, "ks_nonexistent");
  assert.equal(result.length, 1);
});

// ─── Section 8: Asociación con el caso ───────────────────────────────────────

console.log("\n8. Asociación con el caso (caseId)");

await test("getSourcesByCase filtra por caseId correctamente", () => {
  const s1 = createSource({ ...SAMPLE_INPUT, caseId: "case_A" });
  const s2 = createSource({ ...SAMPLE_INPUT, caseId: "case_B" });
  const s3 = createSource({ ...SAMPLE_INPUT, caseId: "case_A" });
  const list = [s1, s2, s3];
  const result = getSourcesByCase(list, "case_A");
  assert.equal(result.length, 2);
  result.forEach((s) => assert.equal(s.caseId, "case_A"));
});

await test("getSourcesByCase con caseId inexistente devuelve array vacío", () => {
  const s1 = createSource(SAMPLE_INPUT);
  const result = getSourcesByCase([s1], "case_nada");
  assert.equal(result.length, 0);
});

await test("caseId de la fuente coincide con UnderstandingCase.id", () => {
  const uc = createCase({ name: "Caso X", understandingQuestion: "¿Por qué?", purpose: "Comprender", domain: "Política" });
  const s = createSource({ ...SAMPLE_INPUT, caseId: uc.id });
  assert.equal(s.caseId, uc.id);
});

// ─── Section 9: Múltiples fuentes ────────────────────────────────────────────

console.log("\n9. Múltiples fuentes en el mismo caso");

await test("se pueden crear múltiples fuentes con el mismo caseId", () => {
  const sources = Array.from({ length: 5 }, (_, i) =>
    createSource({ ...SAMPLE_INPUT, title: `Fuente ${i + 1}` })
  );
  assert.equal(sources.length, 5);
  sources.forEach((s) => assert.equal(s.caseId, SAMPLE_INPUT.caseId));
});

await test("cada fuente tiene un ID único", () => {
  const sources = Array.from({ length: 10 }, () => createSource(SAMPLE_INPUT));
  const ids = new Set(sources.map((s) => s.id));
  assert.equal(ids.size, 10);
});

// ─── Section 10: Inclusión en snapshot ───────────────────────────────────────

console.log("\n10. Inclusión en snapshot (payload.knowledgeSources)");

await test("payload incluye knowledgeSources cuando se crea un snapshot", async () => {
  const s = createSource(SAMPLE_INPUT);
  const payload = makePayload({ knowledgeSources: [s] });
  const snap = await createProjectSnapshot(payload, BASE_META);
  assert.ok(Array.isArray(snap.payload.knowledgeSources));
  assert.equal(snap.payload.knowledgeSources.length, 1);
  assert.equal(snap.payload.knowledgeSources[0].id, s.id);
});

await test("snapshot con knowledgeSources vacío es válido", async () => {
  const payload = makePayload({ knowledgeSources: [] });
  const snap = await createProjectSnapshot(payload, BASE_META);
  assert.ok(Array.isArray(snap.payload.knowledgeSources));
  assert.equal(snap.payload.knowledgeSources.length, 0);
});

await test("snapshot con múltiples fuentes preserva el orden", async () => {
  const sources = ["A", "B", "C"].map((t) =>
    createSource({ ...SAMPLE_INPUT, title: t })
  );
  const payload = makePayload({ knowledgeSources: sources });
  const snap = await createProjectSnapshot(payload, BASE_META);
  const titles = snap.payload.knowledgeSources.map((s) => s.title);
  assert.deepEqual(titles, ["A", "B", "C"]);
});

// ─── Section 11: Estabilidad del hash ────────────────────────────────────────

console.log("\n11. Estabilidad del hash");

await test("mismo payload produce el mismo contentHash", async () => {
  const s = createSource(SAMPLE_INPUT, "2026-07-23T12:00:00.000Z");
  const payload = makePayload({ knowledgeSources: [s] });
  const snap1 = await createProjectSnapshot(payload, BASE_META);
  const snap2 = await createProjectSnapshot(payload, BASE_META);
  assert.equal(snap1.contentHash, snap2.contentHash);
});

await test("verifySnapshotIntegrity retorna true para snapshot válido", async () => {
  const payload = makePayload({ knowledgeSources: [createSource(SAMPLE_INPUT)] });
  const snap = await createProjectSnapshot(payload, BASE_META);
  const valid = await verifySnapshotIntegrity(snap);
  assert.equal(valid, true);
});

// ─── Section 12: Hash cambia al modificar una fuente ─────────────────────────

console.log("\n12. Hash cambia al modificar una fuente");

await test("cambiar el título de una fuente cambia el contentHash", async () => {
  const s = createSource(SAMPLE_INPUT, "2026-07-23T12:00:00.000Z");
  const payload1 = makePayload({ knowledgeSources: [s] });
  const snap1 = await createProjectSnapshot(payload1, BASE_META);

  const modified = updateSource(s, { title: "Título modificado" }, "2026-07-23T13:00:00.000Z");
  const payload2 = makePayload({ knowledgeSources: [modified] });
  const snap2 = await createProjectSnapshot(payload2, BASE_META);

  assert.notEqual(snap1.contentHash, snap2.contentHash);
});

await test("eliminar una fuente cambia el contentHash", async () => {
  const s1 = createSource(SAMPLE_INPUT, "2026-07-23T12:00:00.000Z");
  const s2 = createSource({ ...SAMPLE_INPUT, title: "Segunda" }, "2026-07-23T12:00:00.000Z");
  const payload1 = makePayload({ knowledgeSources: [s1, s2] });
  const snap1 = await createProjectSnapshot(payload1, BASE_META);

  const payload2 = makePayload({ knowledgeSources: [s1] });
  const snap2 = await createProjectSnapshot(payload2, BASE_META);

  assert.notEqual(snap1.contentHash, snap2.contentHash);
});

await test("cambiar el status cambia el contentHash", async () => {
  const s = createSource(SAMPLE_INPUT, "2026-07-23T12:00:00.000Z");
  const payload1 = makePayload({ knowledgeSources: [s] });
  const snap1 = await createProjectSnapshot(payload1, BASE_META);

  const r = changeStatus(s, "registered", "2026-07-23T12:01:00.000Z");
  assert.ok(r.success);
  if (!r.success) return;
  const payload2 = makePayload({ knowledgeSources: [r.source] });
  const snap2 = await createProjectSnapshot(payload2, BASE_META);

  assert.notEqual(snap1.contentHash, snap2.contentHash);
});

// ─── Section 13: Exportación e importación ───────────────────────────────────

console.log("\n13. Exportación e importación round-trip");

await test("exportar e importar un proyecto con fuentes preserva todas las fuentes", async () => {
  const sources = ["Alpha", "Beta"].map((t) =>
    createSource({ ...SAMPLE_INPUT, title: t }, "2026-07-23T12:00:00.000Z")
  );
  const payload = makePayload({ knowledgeSources: sources });
  const snap = await createProjectSnapshot(payload, BASE_META);

  const pkg = await createProjectPackage(BASE_META.projectId, BASE_META.projectName, [snap], []);
  const integrity = await validateProjectPackage(pkg);
  assert.ok(integrity.valid, `Package inválido: ${integrity.errors.join("; ")}`);

  const importResult = await importProjectPackage(pkg, [], [], "create-copy");
  assert.ok(importResult.success, `Importación fallida: ${importResult.errors.join("; ")}`);

  const importedSnaps = importResult.resultingSnapshots;
  assert.ok(importedSnaps.length > 0);
  const importedPayload = importedSnaps[importedSnaps.length - 1].payload;
  assert.equal(importedPayload.knowledgeSources.length, 2);
  const importedTitles = importedPayload.knowledgeSources.map((s) => s.title).sort();
  assert.deepEqual(importedTitles, ["Alpha", "Beta"]);
});

// ─── Section 14: Migración desde 1.1.0 ───────────────────────────────────────

console.log("\n14. Migración desde 1.1.0");

await test("migrar desde 1.1.0 añade knowledgeSources: []", () => {
  const payload_1_1_0 = {
    understandingCase: null,
    problema: "Problema antiguo",
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
    // knowledgeSources NOT present — simulates a 1.1.0 payload
  };

  const snap_1_1_0 = makeSnapshotFromPayload(payload_1_1_0, "1.1.0");
  const result = migrateSnapshot(snap_1_1_0, "1.2.0");

  assert.ok(result.success, `Migración falló: ${result.errors.join("; ")}`);
  assert.equal(result.toVersion, "1.2.0");
  const p = result.migratedPayload as ProjectSnapshotPayload;
  assert.ok(Array.isArray(p.knowledgeSources));
  assert.equal(p.knowledgeSources.length, 0);
});

await test("migrar desde 1.1.0 preserva understandingCase y problema", () => {
  const uc = createCase({ name: "Caso", understandingQuestion: "¿?", purpose: "p", domain: "d" });
  const payload_1_1_0 = {
    understandingCase: uc,
    problema: "Problema específico",
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
  const snap = makeSnapshotFromPayload(payload_1_1_0, "1.1.0");
  const result = migrateSnapshot(snap, "1.2.0");
  assert.ok(result.success, `Migración falló: ${result.errors.join("; ")}`);
  const p = result.migratedPayload as ProjectSnapshotPayload;
  assert.equal((p.understandingCase as { id: string } | null)?.id, uc.id);
  assert.equal(p.problema, "Problema específico");
});

await test("migrar ruta completa 0.9.0 → 1.2.0 produce knowledgeSources: []", () => {
  const payload_0_9_0 = {
    problema: "Problema original",
    packActivo: null,
    thinkingUserSelection: null,
    reflectionAnswers: [],
    hypotheses: [],
    conceptualModels: [],
    operationalizationMatrices: [],
    contrastationMatrices: [],
    evidenceEvaluationMatrices: [],
    hypothesisEvidenceConclusions: [],
  };
  const snap = makeSnapshotFromPayload(payload_0_9_0, "0.9.0");
  const result = migrateSnapshot(snap, "1.2.0");
  assert.ok(result.success, `Migración falló: ${result.errors.join("; ")}`);
  assert.equal(result.toVersion, "1.2.0");
  const p = result.migratedPayload as ProjectSnapshotPayload;
  assert.ok(Array.isArray(p.knowledgeSources));
  assert.equal(p.knowledgeSources.length, 0);
  assert.ok(p.understandingCase !== undefined, "understandingCase debe estar presente tras migración");
});

await test("CURRENT_PROJECT_SCHEMA_VERSION es 1.2.0", () => {
  assert.equal(CURRENT_PROJECT_SCHEMA_VERSION, "1.2.0");
});

// ─── Section 15: Diff ─────────────────────────────────────────────────────────

console.log("\n15. Diff: creación, modificación, eliminación, reordenamiento");

await test("diff detecta fuente añadida", async () => {
  const base = await createProjectSnapshot(makePayload({ knowledgeSources: [] }), BASE_META);
  const s = createSource(SAMPLE_INPUT, "2026-07-23T12:00:00.000Z");
  const target = await createProjectSnapshot(makePayload({ knowledgeSources: [s] }), BASE_META);
  const diff = compareSnapshots(base, target);
  const added = diff.changes.filter((c) => c.entityType === "knowledgeSource" && c.changeType === "added");
  assert.equal(added.length, 1);
  assert.equal(added[0].entityId, s.id);
});

await test("diff detecta fuente eliminada", async () => {
  const s = createSource(SAMPLE_INPUT, "2026-07-23T12:00:00.000Z");
  const base = await createProjectSnapshot(makePayload({ knowledgeSources: [s] }), BASE_META);
  const target = await createProjectSnapshot(makePayload({ knowledgeSources: [] }), BASE_META);
  const diff = compareSnapshots(base, target);
  const removed = diff.changes.filter((c) => c.entityType === "knowledgeSource" && c.changeType === "removed");
  assert.equal(removed.length, 1);
  assert.equal(removed[0].entityId, s.id);
});

await test("diff detecta fuente modificada", async () => {
  const s = createSource(SAMPLE_INPUT, "2026-07-23T12:00:00.000Z");
  const base = await createProjectSnapshot(makePayload({ knowledgeSources: [s] }), BASE_META);
  const modified = updateSource(s, { title: "Título nuevo" }, "2026-07-23T13:00:00.000Z");
  const target = await createProjectSnapshot(makePayload({ knowledgeSources: [modified] }), BASE_META);
  const diff = compareSnapshots(base, target);
  const mods = diff.changes.filter((c) => c.entityType === "knowledgeSource" && c.changeType === "modified");
  assert.equal(mods.length, 1);
  assert.ok(mods[0].changedFields?.includes("title"));
});

await test("diff detecta fuente reordenada", async () => {
  const s1 = createSource({ ...SAMPLE_INPUT, title: "A" }, "2026-07-23T12:00:00.000Z");
  const s2 = createSource({ ...SAMPLE_INPUT, title: "B" }, "2026-07-23T12:00:00.000Z");
  const base = await createProjectSnapshot(makePayload({ knowledgeSources: [s1, s2] }), BASE_META);
  const target = await createProjectSnapshot(makePayload({ knowledgeSources: [s2, s1] }), BASE_META);
  const diff = compareSnapshots(base, target);
  const reordered = diff.changes.filter(
    (c) => c.entityType === "knowledgeSource" && (c.changeType === "reordered" || c.reordered)
  );
  assert.ok(reordered.length > 0, "Debe detectarse al menos una fuente reordenada");
});

await test("diff.summary incluye knowledgeSource en affectedEntityTypes", async () => {
  const s = createSource(SAMPLE_INPUT, "2026-07-23T12:00:00.000Z");
  const base = await createProjectSnapshot(makePayload({ knowledgeSources: [] }), BASE_META);
  const target = await createProjectSnapshot(makePayload({ knowledgeSources: [s] }), BASE_META);
  const diff = compareSnapshots(base, target);
  assert.ok(diff.summary.affectedEntityTypes.includes("knowledgeSource"));
});

// ─── Section 16: Coexistencia con UnderstandingCase ───────────────────────────

console.log("\n16. Coexistencia con UnderstandingCase");

await test("payload puede tener understandingCase y knowledgeSources simultáneamente", async () => {
  const uc = createCase({ name: "Caso Y", understandingQuestion: "¿Cómo?", purpose: "Comprender", domain: "Política" });
  const s = createSource({ ...SAMPLE_INPUT, caseId: uc.id });
  const payload = makePayload({ understandingCase: uc, knowledgeSources: [s] });
  const snap = await createProjectSnapshot(payload, BASE_META);
  assert.equal(snap.payload.understandingCase?.id, uc.id);
  assert.equal(snap.payload.knowledgeSources.length, 1);
  assert.equal(snap.payload.knowledgeSources[0].caseId, uc.id);
});

await test("la fuente de conocimiento referencia al caso por ID correctamente", () => {
  const uc = createCase({ name: "Caso Z", understandingQuestion: "¿?", purpose: "p", domain: "d" });
  const s = createSource({ ...SAMPLE_INPUT, caseId: uc.id });
  assert.equal(s.caseId, uc.id);
  assert.notEqual(s.id, uc.id, "La fuente no debe compartir ID con el caso");
});

await test("múltiples fuentes de un caso coexisten con understandingCase", async () => {
  const uc = createCase({ name: "Caso Multi", understandingQuestion: "¿?", purpose: "p", domain: "d" });
  const sources = ["F1", "F2", "F3"].map((t) =>
    createSource({ ...SAMPLE_INPUT, caseId: uc.id, title: t })
  );
  const payload = makePayload({ understandingCase: uc, knowledgeSources: sources });
  const snap = await createProjectSnapshot(payload, BASE_META);
  assert.equal(snap.payload.knowledgeSources.length, 3);
  assert.equal(snap.payload.understandingCase?.name, "Caso Multi");
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(52)}`);
console.log(`S-026 · Fuentes de Conocimiento`);
console.log(`Passed: ${passed}   Failed: ${failed}`);
console.log(`${"─".repeat(52)}`);

if (failed > 0) process.exit(1);
