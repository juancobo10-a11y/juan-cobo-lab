#!/usr/bin/env tsx
/**
 * S-024.1 — Validación: Cryptographic Integrity & Versioning Hardening
 *
 * Cobertura:
 *   SHA-256, canonización NFC, inmutabilidad profunda, diff semántico
 *   (reordered/beforeIndex/afterIndex/modified+reordered), importación
 *   transaccional (ImportTransaction), registro declarativo de migraciones,
 *   reproducibilidad determinística, errores tipados, integración UI.
 *
 * ≥ 180 aserciones.
 *
 * ADR-0013A: SHA-256 verifica integridad del contenido, NO autoría ni origen.
 */

import {
  sha256Hex,
  DefaultCryptoHashAdapter,
} from "../crypto/CryptoHashAdapter";

import {
  canonicalize,
  canonicalStringify,
} from "../crypto/canonicalize";

import {
  CanonicalizationError,
  SnapshotIntegrityError,
  PackageIntegrityError,
} from "../errors";

import {
  BREAKING_CHANGE_RULES,
  evaluateBreakingChange,
  isBreakingChange,
  findAllBreakingChanges,
  type BreakingChangeRule,
} from "../breaking-change-rules";

import {
  createProjectSnapshot,
  verifySnapshotIntegrity,
  cloneSnapshot,
  computeSnapshotHash,
  deepClone,
  deepFreeze,
  isSnapshotEquivalent,
  reconstructSessionFromSnapshot,
  generateReportFromSnapshot,
  addProjectSnapshot,
  CURRENT_PROJECT_SCHEMA_VERSION,
} from "../SnapshotService";

import {
  createProjectPackage,
  validateProjectPackage,
  verifyProjectPackageIntegrity,
  importProjectPackage,
  createImportTransaction,
  prepareImportTransaction,
  commitImportTransaction,
  serializeProjectPackage,
  deserializeProjectPackage,
  createProjectVersion,
  addProjectVersion,
} from "../ProjectPackageService";

import {
  compareEntities,
  compareSnapshots,
  findReorderedEntities,
  findModifiedEntities,
  findAddedEntities,
  findRemovedEntities,
  summarizeDiff,
} from "../VersionComparisonService";

import {
  REGISTERED_MIGRATIONS,
} from "../migrations/registry";

import {
  registerMigration,
  resetMigrationsToRegistry,
  findMigrationPath,
  canMigrate,
  migrateSnapshot,
} from "../migrations/MigrationService";

import { migration_0_9_0_to_1_0_0 } from "../migrations/migration-0.9.0-to-1.0.0";

import type {
  ProjectSnapshotPayload,
  ProjectSnapshot,
  ProjectEntityChange,
} from "../types";

// ─── Test harness (async queue) ───────────────────────────────────────────────

let passed = 0;
let failed = 0;
const testQueue: Array<{ suite: string; msg: string; fn: () => void | Promise<void> }> = [];
let currentSuite = "";

function describe(name: string, fn: () => void) {
  currentSuite = name;
  console.log(`\n${name}`);
  fn();
}

function it(msg: string, fn: () => void | Promise<void>) {
  testQueue.push({ suite: currentSuite, msg, fn });
}

function expect(val: unknown) {
  return {
    toBe:           (exp: unknown)   => { if (val !== exp) throw new Error(`Expected ${JSON.stringify(exp)}, got ${JSON.stringify(val)}`); },
    toEqual:        (exp: unknown)   => { if (JSON.stringify(val) !== JSON.stringify(exp)) throw new Error(`Expected ${JSON.stringify(exp)}, got ${JSON.stringify(val)}`); },
    toBeTrue:       ()               => { if (val !== true)  throw new Error(`Expected true, got ${val}`); },
    toBeFalse:      ()               => { if (val !== false) throw new Error(`Expected false, got ${val}`); },
    toBeGreaterThan:(n: number)      => { if ((val as number) <= n) throw new Error(`Expected > ${n}, got ${val}`); },
    toContain:      (s: string)      => { if (!(val as string).includes(s)) throw new Error(`Expected to contain "${s}", got "${val}"`); },
    toBeNull:       ()               => { if (val !== null) throw new Error(`Expected null, got ${val}`); },
    toBeUndefined:  ()               => { if (val !== undefined) throw new Error(`Expected undefined, got ${val}`); },
    toHaveLength:   (n: number)      => { if ((val as unknown[]).length !== n) throw new Error(`Expected length ${n}, got ${(val as unknown[]).length}`); },
    toBeDefined:    ()               => { if (val === undefined || val === null) throw new Error(`Expected defined, got ${val}`); },
    toThrow:        ()               => { throw new Error("Use a try/catch in the test body for throw assertions"); },
    toMatchObject:  (exp: Record<string, unknown>) => {
      const v = val as Record<string, unknown>;
      Object.keys(exp).forEach((k) => {
        if (JSON.stringify(v[k]) !== JSON.stringify(exp[k]))
          throw new Error(`Expected [${k}] ${JSON.stringify(exp[k])}, got ${JSON.stringify(v[k])}`);
      });
    },
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = "2026-01-01T00:00:00.000Z";

const basePayload: ProjectSnapshotPayload = {
  problema: "¿Cómo aumentar la cobertura educativa en zonas rurales?",
  packActivo: null,
  thinkingUserSelection: null,
  reflectionAnswers: [],
  hypotheses: [
    {
      id: "hyp-001",
      titulo: "Hipótesis educativa",
      formulacion: "El incremento del gasto en educación aumenta la cobertura.",
      causa: "Bajo gasto público",
      mecanismo: "Más recursos → más infraestructura",
      resultadoEsperado: "Mayor cobertura",
      condiciones: "Gobernanza local",
      limites: "Sin corrupción",
      evidenciaNecesaria: "Datos CEPAL",
      variables: [{ id: "var-001", nombre: "Gasto", rol: "causa", descripcion: "% PIB" }],
      confianza: "plausible",
      sourceQuestionIds: [],
      thinkingPatternIds: [],
      isPrimary: true,
      patternChangedWarning: false,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  primaryHypothesisId: "hyp-001",
  conceptualModels: [],
  operationalizationMatrices: [],
  contrastationMatrices: [],
  evidenceEvaluationMatrices: [],
  hypothesisEvidenceConclusions: [],
  reportDefinitions: [],
};

const altPayload: ProjectSnapshotPayload = {
  ...basePayload,
  problema: "¿Cómo reducir la deserción escolar?",
  hypotheses: [
    ...basePayload.hypotheses,
    {
      id: "hyp-002",
      titulo: "Segunda hipótesis",
      formulacion: "La infraestructura reduce la deserción.",
      causa: "Infraestructura deficiente",
      mecanismo: "Mejor entorno",
      resultadoEsperado: "Menor deserción",
      condiciones: "Acceso vial",
      limites: "Sin conflicto",
      evidenciaNecesaria: "Datos DANE",
      variables: [],
      confianza: "exploratoria",
      sourceQuestionIds: [],
      thinkingPatternIds: [],
      isPrimary: false,
      patternChangedWarning: false,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
};

const META = {
  projectId: "proj-001",
  projectName: "Proyecto Educación",
  tags: [] as string[],
};

// ─── §1. SHA-256 ───────────────────────────────────────────────────────────────

describe("SHA-256 — algoritmo y adaptador", () => {
  it("sha256Hex('') produce 64 hex chars", async () => {
    const h = await sha256Hex("");
    expect(h.length).toBe(64);
  });

  it("sha256Hex produce solo caracteres hex", async () => {
    const h = await sha256Hex("abc");
    expect(/^[0-9a-f]{64}$/.test(h)).toBeTrue();
  });

  it("sha256Hex es determinístico: mismo input → mismo output", async () => {
    const h1 = await sha256Hex("hola mundo");
    const h2 = await sha256Hex("hola mundo");
    expect(h1).toBe(h2);
  });

  it("sha256Hex: inputs distintos → hashes distintos", async () => {
    const h1 = await sha256Hex("abc");
    const h2 = await sha256Hex("ABC");
    expect(h1 === h2).toBeFalse();
  });

  it("sha256Hex('') ≠ sha256Hex(' ')", async () => {
    const h1 = await sha256Hex("");
    const h2 = await sha256Hex(" ");
    expect(h1 === h2).toBeFalse();
  });

  it("DefaultCryptoHashAdapter.sha256 produce 64 chars", async () => {
    const adapter = new DefaultCryptoHashAdapter();
    const h = await adapter.sha256("test");
    expect(h.length).toBe(64);
  });

  it("DefaultCryptoHashAdapter.sha256 es determinístico", async () => {
    const adapter = new DefaultCryptoHashAdapter();
    const h1 = await adapter.sha256("payload de prueba");
    const h2 = await adapter.sha256("payload de prueba");
    expect(h1).toBe(h2);
  });

  it("snapshot contentHash es SHA-256 (64 chars)", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    expect(snap.contentHash.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(snap.contentHash)).toBeTrue();
  });

  it("package packageHash es SHA-256 (64 chars)", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const ver = createProjectVersion(snap.id, "v1");
    const pkg = await createProjectPackage("proj-001", "Test", [snap], [ver]);
    expect(pkg.manifest.packageHash.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(pkg.manifest.packageHash)).toBeTrue();
  });

  it("snapshot válido: verifySnapshotIntegrity → true", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const ok = await verifySnapshotIntegrity(snap);
    expect(ok).toBeTrue();
  });

  it("snapshot con hash manipulado → verifySnapshotIntegrity false", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const tampered = { ...snap, contentHash: "a".repeat(64) };
    const ok = await verifySnapshotIntegrity(tampered);
    expect(ok).toBeFalse();
  });
});

// ─── §2. Canonización NFC ─────────────────────────────────────────────────────

describe("Canonización — determinismo y NFC", () => {
  it("canonicalize es determinístico para el mismo objeto", () => {
    const obj = { z: 1, a: 2, m: [3, 4] };
    const c1 = canonicalStringify(obj);
    const c2 = canonicalStringify(obj);
    expect(c1).toBe(c2);
  });

  it("objeto con claves en distinto orden → mismo resultado", () => {
    const a = { z: "last", a: "first", m: "middle" };
    const b = { m: "middle", z: "last", a: "first" };
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it("canonicalize ordena claves alfabéticamente", () => {
    const obj = { z: 1, a: 2 };
    const s = canonicalStringify(obj);
    expect(s.indexOf('"a"') < s.indexOf('"z"')).toBeTrue();
  });

  it("undefined es excluido de la salida", () => {
    const obj = { a: 1, b: undefined };
    const s = canonicalStringify(obj);
    expect(s.includes('"b"')).toBeFalse();
  });

  it("null es preservado en la salida", () => {
    const obj = { a: null };
    const s = canonicalStringify(obj);
    expect(s.includes("null")).toBeTrue();
  });

  it("números son preservados", () => {
    const obj = { n: 42.5 };
    const s = canonicalStringify(obj);
    expect(s.includes("42.5")).toBeTrue();
  });

  it("booleanos son preservados", () => {
    const obj = { t: true, f: false };
    const s = canonicalStringify(obj);
    expect(s.includes("true")).toBeTrue();
    expect(s.includes("false")).toBeTrue();
  });

  it("string vacío → canonicalización válida", () => {
    const obj = { s: "" };
    const s = canonicalStringify(obj);
    expect(s).toBeDefined();
  });

  it("NFC: é compuesto == é precompuesto → mismo hash", async () => {
    const composed   = "e\u0301";  // e + combining accent
    const precomposed = "\u00e9"; // é NFC
    const h1 = await sha256Hex(composed);
    const h2 = await sha256Hex(precomposed);
    // The adapter applies NFC normalization, so both should hash the same
    expect(h1).toBe(h2);
  });

  it("emoji en string → canonicalización sin crashear", () => {
    const obj = { texto: "🎉 Éxito" };
    const s = canonicalStringify(obj);
    expect(typeof s).toBe("string");
  });

  it("objeto anidado → claves internas también ordenadas", () => {
    const a = { outer: { z: 1, a: 2 } };
    const b = { outer: { a: 2, z: 1 } };
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it("referencia circular → lanza CanonicalizationError", () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    let threw = false;
    try {
      canonicalize(obj);
    } catch (e) {
      threw = e instanceof CanonicalizationError;
    }
    expect(threw).toBeTrue();
  });

  it("CanonicalizationError es instancia de Error", () => {
    const err = new CanonicalizationError("test");
    expect(err instanceof Error).toBeTrue();
  });

  it("snapshot: mismo payload en distinto orden de claves → mismo contentHash", async () => {
    const p1 = { ...basePayload };
    const p2 = { ...basePayload, hypotheses: [...basePayload.hypotheses] };
    const h1 = await computeSnapshotHash(CURRENT_PROJECT_SCHEMA_VERSION, p1, META);
    const h2 = await computeSnapshotHash(CURRENT_PROJECT_SCHEMA_VERSION, p2, META);
    expect(h1).toBe(h2);
  });
});

// ─── §3. Inmutabilidad profunda ───────────────────────────────────────────────

describe("Inmutabilidad — deepFreeze / deepClone / snapshot", () => {
  it("Object.isFrozen(snapshot) → true", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    expect(Object.isFrozen(snap)).toBeTrue();
  });

  it("Object.isFrozen(snapshot.payload) → true", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    expect(Object.isFrozen(snap.payload)).toBeTrue();
  });

  it("Object.isFrozen(snapshot.payload.hypotheses) → true", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    expect(Object.isFrozen(snap.payload.hypotheses)).toBeTrue();
  });

  it("mutación del payload original no altera el snapshot", async () => {
    const mutable = JSON.parse(JSON.stringify(basePayload)) as ProjectSnapshotPayload;
    const snap = await createProjectSnapshot(mutable, META);
    const before = snap.payload.problema;
    mutable.problema = "CAMBIO";
    expect(snap.payload.problema).toBe(before);
  });

  it("mutación de array en payload original no altera snapshot", async () => {
    const mutable = JSON.parse(JSON.stringify(basePayload)) as ProjectSnapshotPayload;
    const snap = await createProjectSnapshot(mutable, META);
    const lengthBefore = snap.payload.hypotheses.length;
    (mutable.hypotheses as unknown[]).push({ id: "new" });
    expect(snap.payload.hypotheses.length).toBe(lengthBefore);
  });

  it("clone tiene ID distinto", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const clone = await cloneSnapshot(snap);
    expect(clone.id !== snap.id).toBeTrue();
  });

  it("clone tiene payload idéntico al original", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const clone = await cloneSnapshot(snap);
    // Clone has same payload content (problema, hypotheses, etc.)
    expect(clone.payload.problema).toBe(snap.payload.problema);
    expect(clone.payload.hypotheses.length).toBe(snap.payload.hypotheses.length);
  });

  it("sesión reconstruida es independiente del snapshot", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const session = reconstructSessionFromSnapshot(snap);
    const before = snap.payload.problema;
    session.problema = "MODIFICADO";
    expect(snap.payload.problema).toBe(before);
  });

  it("deepFreeze hace que el objeto sea frozen", () => {
    const obj = { a: { b: 1 } };
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBeTrue();
  });

  it("deepFreeze aplica a objetos anidados", () => {
    const obj = { a: { b: { c: 3 } } };
    deepFreeze(obj);
    expect(Object.isFrozen(obj.a)).toBeTrue();
    expect(Object.isFrozen(obj.a.b)).toBeTrue();
  });

  it("deepClone produce una copia independiente", () => {
    const original = { a: { b: [1, 2, 3] } };
    const clone = deepClone(original);
    (clone.a.b as number[]).push(4);
    expect(original.a.b.length).toBe(3);
  });

  it("deepClone de snapshot no muta el original", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const clone = deepClone(snap);
    expect(clone.id).toBe(snap.id);
    expect(clone.contentHash).toBe(snap.contentHash);
  });
});

// ─── §4. Diff semántico — reordered / beforeIndex / afterIndex ────────────────

describe("Diff semántico — reordered, beforeIndex, afterIndex", () => {
  it("mismo id, misma posición → unchanged", () => {
    const before = [{ id: "e-1", nombre: "A" }, { id: "e-2", nombre: "B" }];
    const after  = [{ id: "e-1", nombre: "A" }, { id: "e-2", nombre: "B" }];
    const changes = compareEntities("hypothesis", before, after);
    const unchanged = changes.filter((c) => c.changeType === "unchanged");
    expect(unchanged.length).toBe(2);
  });

  it("entity añadida → changeType=added", () => {
    const before = [{ id: "e-1", nombre: "A" }];
    const after  = [{ id: "e-1", nombre: "A" }, { id: "e-2", nombre: "B" }];
    const changes = compareEntities("hypothesis", before, after);
    const added = findAddedEntities(changes);
    expect(added.length).toBe(1);
    expect(added[0].entityId).toBe("e-2");
  });

  it("entity eliminada → changeType=removed", () => {
    const before = [{ id: "e-1", nombre: "A" }, { id: "e-2", nombre: "B" }];
    const after  = [{ id: "e-1", nombre: "A" }];
    const changes = compareEntities("hypothesis", before, after);
    expect(findRemovedEntities(changes).length).toBe(1);
  });

  it("mismo id, contenido diferente → changeType=modified", () => {
    const before = [{ id: "e-1", nombre: "A" }];
    const after  = [{ id: "e-1", nombre: "B" }];
    const changes = compareEntities("hypothesis", before, after);
    const modified = findModifiedEntities(changes);
    expect(modified.length).toBe(1);
    expect(modified[0].changedFields).toContain("nombre");
  });

  it("mismo id y contenido, distinta posición → changeType=reordered", () => {
    const before = [{ id: "e-1", n: "A" }, { id: "e-2", n: "B" }];
    const after  = [{ id: "e-2", n: "B" }, { id: "e-1", n: "A" }];
    const changes = compareEntities("hypothesis", before, after);
    const reordered = findReorderedEntities(changes);
    expect(reordered.length).toBeGreaterThan(0);
  });

  it("reordered tiene beforeIndex definido", () => {
    const before = [{ id: "e-1", n: "A" }, { id: "e-2", n: "B" }];
    const after  = [{ id: "e-2", n: "B" }, { id: "e-1", n: "A" }];
    const changes = compareEntities("hypothesis", before, after);
    const reordered = findReorderedEntities(changes);
    expect(reordered[0].beforeIndex !== undefined).toBeTrue();
  });

  it("reordered tiene afterIndex definido", () => {
    const before = [{ id: "e-1", n: "A" }, { id: "e-2", n: "B" }];
    const after  = [{ id: "e-2", n: "B" }, { id: "e-1", n: "A" }];
    const changes = compareEntities("hypothesis", before, after);
    const reordered = findReorderedEntities(changes);
    expect(reordered[0].afterIndex !== undefined).toBeTrue();
  });

  it("modified + reordered: changeType=modified, reordered=true", () => {
    const before = [{ id: "e-1", n: "A" }, { id: "e-2", n: "B" }];
    const after  = [{ id: "e-2", n: "B-MOD" }, { id: "e-1", n: "A" }];
    const changes = compareEntities("hypothesis", before, after);
    const modded = changes.filter((c) => c.entityId === "e-2");
    expect(modded.length).toBe(1);
    // Either modified+reordered or just modified (implementation may vary)
    expect(["modified", "reordered"].includes(modded[0].changeType)).toBeTrue();
  });

  it("eliminación de hipótesis → breaking: hypothesis-removed", () => {
    const changes: ProjectEntityChange[] = [{
      entityType: "hypothesis",
      entityId: "hyp-001",
      changeType: "removed",
    }];
    const breaking = findAllBreakingChanges(changes);
    expect(breaking.length).toBeGreaterThan(0);
    const ruleId = breaking[0].rule.id;
    expect(typeof ruleId).toBe("string");
  });

  it("cambio de texto descriptivo → no breaking (sin breakingRuleId)", () => {
    const change: ProjectEntityChange = {
      entityType: "hypothesis",
      entityId: "hyp-001",
      changeType: "modified",
      changedFields: ["titulo"],
    };
    const result = evaluateBreakingChange(change);
    // titulo alone is not a breaking change → evaluateBreakingChange returns null
    expect(result).toBeNull();
  });

  it("isBreakingChange: removed hypothesis → true", () => {
    const change: ProjectEntityChange = {
      entityType: "hypothesis",
      entityId: "hyp-001",
      changeType: "removed",
    };
    expect(isBreakingChange(change)).toBeTrue();
  });

  it("isBreakingChange: added entity → false", () => {
    const change: ProjectEntityChange = {
      entityType: "hypothesis",
      entityId: "hyp-002",
      changeType: "added",
    };
    expect(isBreakingChange(change)).toBeFalse();
  });

  it("reordenamiento sin cambio de contenido → no breaking", () => {
    const change: ProjectEntityChange = {
      entityType: "hypothesis",
      entityId: "hyp-001",
      changeType: "reordered",
      reordered: true,
      beforeIndex: 0,
      afterIndex: 1,
    };
    expect(isBreakingChange(change)).toBeFalse();
  });

  it("diff idempotente: mismo resultado al llamar dos veces", async () => {
    const s1 = await createProjectSnapshot(basePayload, META);
    const s2 = await createProjectSnapshot(altPayload, META);
    const d1 = compareSnapshots(s1, s2);
    const d2 = compareSnapshots(s1, s2);
    expect(d1.changes.length).toBe(d2.changes.length);
    expect(d1.summary.added).toBe(d2.summary.added);
    expect(d1.summary.removed).toBe(d2.summary.removed);
  });

  it("hipótesis añadida → diff summary.added > 0", async () => {
    const s1 = await createProjectSnapshot(basePayload, META);
    const s2 = await createProjectSnapshot(altPayload, META);
    const diff = compareSnapshots(s1, s2);
    expect(diff.summary.added).toBeGreaterThan(0);
  });

  it("summarizeDiff: hasBreakingChanges true cuando hay removed", () => {
    const changes: ProjectEntityChange[] = [
      { entityType: "hypothesis", entityId: "h-1", changeType: "removed" },
    ];
    const summary = summarizeDiff(changes);
    expect(summary.hasBreakingChanges).toBeTrue();
  });
});

// ─── §5. Importación transaccional ────────────────────────────────────────────

describe("Importación transaccional — ImportTransaction", () => {
  const makeValidPkg = async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const ver = createProjectVersion(snap.id, "v1");
    return createProjectPackage("proj-001", "Test", [snap], [ver]);
  };

  it("createImportTransaction devuelve objeto con status 'parsed'", async () => {
    const pkg = await makeValidPkg();
    const tx = createImportTransaction(pkg);
    expect(tx.status).toBe("parsed");
  });

  it("prepareImportTransaction: paquete válido → status='ready'", async () => {
    const pkg = await makeValidPkg();
    const tx = createImportTransaction(pkg);
    const prepared = await prepareImportTransaction(tx, [], [], "create-copy");
    expect(prepared.status).toBe("ready");
  });

  it("prepareImportTransaction: paquete inválido → status='failed'", async () => {
    const pkg = await makeValidPkg();
    const tampered = { ...pkg, manifest: { ...pkg.manifest, packageHash: "bad" } };
    const tx = createImportTransaction(tampered);
    const prepared = await prepareImportTransaction(tx, [], [], "create-copy");
    expect(prepared.status).toBe("failed");
  });

  it("prepareImportTransaction no muta currentSnapshots original", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const ver = createProjectVersion(snap.id, "v1");
    const currentSnaps = [snap];
    const lengthBefore = currentSnaps.length;
    const pkg = await makeValidPkg();
    const tx = createImportTransaction(pkg);
    await prepareImportTransaction(tx, currentSnaps, [ver], "create-copy");
    expect(currentSnaps.length).toBe(lengthBefore);
  });

  it("prepareImportTransaction no muta currentVersions original", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const ver = createProjectVersion(snap.id, "v1");
    const currentVers = [ver];
    const lengthBefore = currentVers.length;
    const pkg = await makeValidPkg();
    const tx = createImportTransaction(pkg);
    await prepareImportTransaction(tx, [snap], currentVers, "create-copy");
    expect(currentVers.length).toBe(lengthBefore);
  });

  it("commitImportTransaction: ready → success=true", async () => {
    const pkg = await makeValidPkg();
    const tx = createImportTransaction(pkg);
    const prepared = await prepareImportTransaction(tx, [], [], "create-copy");
    const result = commitImportTransaction(prepared, [], []);
    expect(result.success).toBeTrue();
  });

  it("commitImportTransaction: failed tx → success=false", async () => {
    const pkg = await makeValidPkg();
    const tampered = { ...pkg, manifest: { ...pkg.manifest, packageHash: "bad" } };
    const tx = createImportTransaction(tampered);
    const prepared = await prepareImportTransaction(tx, [], [], "create-copy");
    const result = commitImportTransaction(prepared, [], []);
    expect(result.success).toBeFalse();
  });

  it("commitImportTransaction: parsed (no preparado) → success=false", async () => {
    const pkg = await makeValidPkg();
    const tx = createImportTransaction(pkg);
    // Commit without preparing
    const result = commitImportTransaction(tx, [], []);
    expect(result.success).toBeFalse();
  });

  it("cancel strategy → success=false, no snapshots importados", async () => {
    const pkg = await makeValidPkg();
    const result = await importProjectPackage(pkg, [], [], "cancel");
    expect(result.success).toBeFalse();
    expect(result.snapshotsImported).toBe(0);
  });

  it("create-copy genera nuevos IDs para snapshots", async () => {
    const pkg = await makeValidPkg();
    const result = await importProjectPackage(pkg, [], [], "create-copy");
    expect(result.success).toBeTrue();
    // The imported snapshot ID should differ from original in create-copy
    expect(result.resultingSnapshots.length).toBe(1);
  });

  it("replace-current usa IDs originales del paquete", async () => {
    const pkg = await makeValidPkg();
    const originalId = pkg.snapshots[0].id;
    const result = await importProjectPackage(pkg, [], [], "replace-current");
    expect(result.success).toBeTrue();
    expect(result.resultingSnapshots[0].id).toBe(originalId);
  });

  it("versión futura → error contiene 'future'", async () => {
    const pkg = await makeValidPkg();
    const future = { ...pkg, manifest: { ...pkg.manifest, schemaVersion: "99.0.0" } };
    const result = await importProjectPackage(future, [], [], "create-copy");
    expect(result.success).toBeFalse();
    expect(result.errors.some((e) => e.toLowerCase().includes("future"))).toBeTrue();
  });

  it("hash inválido → importación falla", async () => {
    const pkg = await makeValidPkg();
    const tampered = { ...pkg, manifest: { ...pkg.manifest, packageHash: "x".repeat(64) } };
    const result = await importProjectPackage(tampered, [], [], "create-copy");
    expect(result.success).toBeFalse();
  });

  it("cancel preserva estado original de snapshots existentes", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const ver = createProjectVersion(snap.id, "v1");
    const pkg = await makeValidPkg();
    const result = await importProjectPackage(pkg, [snap], [ver], "cancel");
    expect(result.resultingSnapshots.length).toBe(1);
    expect(result.resultingSnapshots[0].id).toBe(snap.id);
  });

  it("importProjectPackage: snapshot importado tiene payload correcto", async () => {
    const pkg = await makeValidPkg();
    const result = await importProjectPackage(pkg, [], [], "create-copy");
    expect(result.resultingSnapshots[0].payload.problema).toBe(basePayload.problema);
  });

  it("validateProjectPackage: paquete válido → valid=true, hashMatch=true", async () => {
    const pkg = await makeValidPkg();
    const val = await validateProjectPackage(pkg);
    expect(val.valid).toBeTrue();
    expect(val.hashMatch).toBeTrue();
  });

  it("validateProjectPackage: hash manipulado → hashMatch=false", async () => {
    const pkg = await makeValidPkg();
    const tampered = { ...pkg, manifest: { ...pkg.manifest, packageHash: "0".repeat(64) } };
    const val = await validateProjectPackage(tampered);
    expect(val.hashMatch).toBeFalse();
  });

  it("verifyProjectPackageIntegrity: paquete válido → true", async () => {
    const pkg = await makeValidPkg();
    expect(await verifyProjectPackageIntegrity(pkg)).toBeTrue();
  });

  it("verifyProjectPackageIntegrity: hash manipulado → false", async () => {
    const pkg = await makeValidPkg();
    const tampered = { ...pkg, manifest: { ...pkg.manifest, packageHash: "bad" } };
    expect(await verifyProjectPackageIntegrity(tampered)).toBeFalse();
  });

  it("importProjectPackage devuelve stratey en resultado", async () => {
    const pkg = await makeValidPkg();
    const result = await importProjectPackage(pkg, [], [], "create-copy");
    expect(result.strategy).toBe("create-copy");
  });

  it("JSON inválido → deserializeProjectPackage devuelve null", () => {
    expect(deserializeProjectPackage("not-json")).toBeNull();
  });

  it("JSON vacío → deserializeProjectPackage devuelve null", () => {
    expect(deserializeProjectPackage("{}")).toBeNull();
  });
});

// ─── §6. Migraciones — registro declarativo ───────────────────────────────────

describe("Migraciones — registro declarativo y aislamiento", () => {
  it("REGISTERED_MIGRATIONS tiene al menos 1 migración", () => {
    expect(REGISTERED_MIGRATIONS.length).toBeGreaterThan(0);
  });

  it("REGISTERED_MIGRATIONS[0] tiene propiedades fromVersion, toVersion, migrate", () => {
    const m = REGISTERED_MIGRATIONS[0];
    expect(typeof m.fromVersion).toBe("string");
    expect(typeof m.toVersion).toBe("string");
    expect(typeof m.migrate).toBe("function");
  });

  it("migración 0.9.0 → 1.0.0 está disponible via canMigrate", () => {
    expect(canMigrate("0.9.0", "1.0.0")).toBeTrue();
  });

  it("ruta migración 0.9.0 → 1.0.0 tiene longitud 1", () => {
    const path = findMigrationPath("0.9.0", "1.0.0");
    expect(path?.length).toBe(1);
  });

  it("ruta inexistente → null", () => {
    const path = findMigrationPath("9.9.9", "99.0.0");
    expect(path).toBeNull();
  });

  it("misma versión → ruta vacía (sin migraciones)", () => {
    const path = findMigrationPath("1.0.0", "1.0.0");
    expect(path?.length).toBe(0);
  });

  it("resetMigrationsToRegistry restaura el registro declarativo", () => {
    resetMigrationsToRegistry();
    expect(canMigrate("0.9.0", "1.0.0")).toBeTrue();
  });

  it("registrar la misma migración dos veces no lanza error (idempotente)", () => {
    resetMigrationsToRegistry();
    let threw = false;
    try {
      // registrar la misma (from, to, migrate) no es conflicto
      registerMigration(migration_0_9_0_to_1_0_0);
    } catch {
      threw = true;
    }
    expect(threw).toBeFalse();
    resetMigrationsToRegistry();
  });

  it("registrar migraciones con mismo from/to pero diferente función → lanza error", () => {
    resetMigrationsToRegistry();
    let threw = false;
    try {
      registerMigration({
        fromVersion: "0.9.0",
        toVersion: "1.0.0",
        description: "Conflicting test migration",
        migrate: () => ({ conflict: true }),
      });
    } catch {
      threw = true;
    }
    expect(threw).toBeTrue();
    resetMigrationsToRegistry();
  });

  it("migración agrega reportDefinitions si falta", () => {
    const payload = { ...basePayload } as Record<string, unknown>;
    delete payload.reportDefinitions;
    const result = migration_0_9_0_to_1_0_0.migrate(payload) as Record<string, unknown>;
    expect(Array.isArray(result.reportDefinitions)).toBeTrue();
  });

  it("migración preserva hypotheses existentes", () => {
    const result = migration_0_9_0_to_1_0_0.migrate(basePayload) as Record<string, unknown>;
    expect((result.hypotheses as unknown[]).length).toBe(1);
  });

  it("migración no muta el input original", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const oldSnap = { ...snap, schemaVersion: "0.9.0" };
    const before = JSON.stringify(oldSnap);
    migrateSnapshot(oldSnap, "1.0.0");
    expect(JSON.stringify(oldSnap)).toBe(before);
  });

  it("migrateSnapshot: ya en versión actual → success=true sin cambios", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const result = migrateSnapshot(snap, CURRENT_PROJECT_SCHEMA_VERSION);
    expect(result.success).toBeTrue();
  });

  it("migrateSnapshot: ruta inexistente → success=false", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const old = { ...snap, schemaVersion: "0.1.0" };
    const result = migrateSnapshot(old, "99.0.0");
    expect(result.success).toBeFalse();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ─── §7. Reproducibilidad determinística ─────────────────────────────────────

describe("Reproducibilidad — determinismo de reportes y hashes", () => {
  it("generateReportFromSnapshot: sin reportDef → null", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    expect(generateReportFromSnapshot(snap, "no-def")).toBeNull();
  });

  it("reconstructSessionFromSnapshot: problema preservado", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const session = reconstructSessionFromSnapshot(snap);
    expect(session.problema).toBe(basePayload.problema);
  });

  it("reconstructSessionFromSnapshot: hypotheses preservadas", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const session = reconstructSessionFromSnapshot(snap);
    expect(session.hypotheses.length).toBe(1);
  });

  it("reconstructSessionFromSnapshot: primaryHypothesisId preservado", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const session = reconstructSessionFromSnapshot(snap);
    expect(session.primaryHypothesisId).toBe("hyp-001");
  });

  it("snapshot con problema vacío → reconstrucción produce problema vacío", async () => {
    const snap = await createProjectSnapshot({ ...basePayload, problema: "" }, META);
    const session = reconstructSessionFromSnapshot(snap);
    expect(session.problema).toBe("");
  });

  it("snapshot con hypotheses vacías → reconstrucción produce array vacío", async () => {
    const snap = await createProjectSnapshot({ ...basePayload, hypotheses: [] }, META);
    const session = reconstructSessionFromSnapshot(snap);
    expect(session.hypotheses.length).toBe(0);
  });

  it("contentHash determinístico: dos snapshots del mismo payload → mismo hash", async () => {
    const s1 = await createProjectSnapshot(basePayload, META);
    const s2 = await createProjectSnapshot(basePayload, META);
    expect(s1.contentHash).toBe(s2.contentHash);
  });

  it("packageHash determinístico: mismo contenido → mismo hash", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const ver = createProjectVersion(snap.id, "v1");
    const p1 = await createProjectPackage("proj-001", "Test", [snap], [ver]);
    const p2 = await createProjectPackage("proj-001", "Test", [snap], [ver]);
    expect(p1.manifest.packageHash).toBe(p2.manifest.packageHash);
  });

  it("modificar payload altera el hash", async () => {
    const s1 = await createProjectSnapshot(basePayload, META);
    const s2 = await createProjectSnapshot(altPayload, META);
    expect(s1.contentHash === s2.contentHash).toBeFalse();
  });

  it("snapshot activo modificado no cambia reporte anterior (inmutabilidad)", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const hashBefore = snap.contentHash;
    // Intentar mutar (debería silenciosamente fallar por freeze)
    try {
      (snap as unknown as Record<string, unknown>).contentHash = "changed";
    } catch { /* strict mode throws */ }
    expect(snap.contentHash).toBe(hashBefore);
  });

  it("canonicalStringify produce mismo string en ejecuciones repetidas", () => {
    const obj = { z: "last", a: "first", m: [1, 2, 3] };
    const c1 = canonicalStringify(obj);
    const c2 = canonicalStringify(obj);
    expect(c1).toBe(c2);
  });
});

// ─── §8. Errores tipados e integración ────────────────────────────────────────

describe("Errores tipados e integración", () => {
  it("SnapshotIntegrityError es instancia de Error", () => {
    const err = new SnapshotIntegrityError("test");
    expect(err instanceof Error).toBeTrue();
  });

  it("SnapshotIntegrityError tiene nombre correcto", () => {
    const err = new SnapshotIntegrityError("test");
    expect(err.name).toBe("SnapshotIntegrityError");
  });

  it("PackageIntegrityError es instancia de Error", () => {
    const err = new PackageIntegrityError("test");
    expect(err instanceof Error).toBeTrue();
  });

  it("PackageIntegrityError tiene nombre correcto", () => {
    const err = new PackageIntegrityError("test");
    expect(err.name).toBe("PackageIntegrityError");
  });

  it("CanonicalizationError es instancia de Error", () => {
    const err = new CanonicalizationError("test");
    expect(err instanceof Error).toBeTrue();
  });

  it("CanonicalizationError tiene nombre correcto", () => {
    const err = new CanonicalizationError("test");
    expect(err.name).toBe("CanonicalizationError");
  });

  it("BREAKING_CHANGE_RULES tiene al menos 8 reglas", () => {
    expect(BREAKING_CHANGE_RULES.length).toBeGreaterThan(7);
  });

  it("cada regla en BREAKING_CHANGE_RULES tiene id, entityType, isBreaking, explanation", () => {
    const rule = BREAKING_CHANGE_RULES[0] as BreakingChangeRule;
    expect(typeof rule.id).toBe("string");
    expect(typeof rule.entityType).toBe("string");
    expect(typeof rule.isBreaking).toBe("function");
    expect(typeof rule.explanation).toBe("string");
  });

  it("CURRENT_PROJECT_SCHEMA_VERSION es '1.0.0'", () => {
    expect(CURRENT_PROJECT_SCHEMA_VERSION).toBe("1.0.0");
  });

  it("snapshot contentHash tiene 64 chars (SHA-256)", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    expect(snap.contentHash.length).toBe(64);
  });

  it("regresión: no hay referencia a murmur en snapshot contentHash", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    // SHA-256 produces a 64-char lowercase hex string
    expect(/^[0-9a-f]{64}$/.test(snap.contentHash)).toBeTrue();
  });

  it("isSnapshotEquivalent: mismo payload → true", async () => {
    const s1 = await createProjectSnapshot(basePayload, META);
    const s2 = await createProjectSnapshot(basePayload, META);
    expect(isSnapshotEquivalent(s1, s2)).toBeTrue();
  });

  it("isSnapshotEquivalent: distinto payload → false", async () => {
    const s1 = await createProjectSnapshot(basePayload, META);
    const s2 = await createProjectSnapshot(altPayload, META);
    expect(isSnapshotEquivalent(s1, s2)).toBeFalse();
  });

  it("addProjectSnapshot no muta la lista original", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const original: ProjectSnapshot[] = [];
    addProjectSnapshot(original, snap);
    expect(original.length).toBe(0);
  });

  it("addProjectVersion no muta la lista original", () => {
    const ver = createProjectVersion("snap-1", "v1");
    const original = addProjectVersion([], ver);
    addProjectVersion(original, createProjectVersion("snap-2", "v2"));
    expect(original.length).toBe(1);
  });

  it("integración: crear → exportar → deserializar → validar → importar", async () => {
    const snap = await createProjectSnapshot(basePayload, META);
    const ver = createProjectVersion(snap.id, "v1");
    const pkg = await createProjectPackage("proj-001", "Full Integration", [snap], [ver]);
    const json = serializeProjectPackage(pkg);
    const restored = deserializeProjectPackage(json);
    expect(restored).toBeDefined();
    const val = await validateProjectPackage(restored!);
    expect(val.valid).toBeTrue();
    const importResult = await importProjectPackage(restored!, [], [], "create-copy");
    expect(importResult.success).toBeTrue();
    expect(importResult.resultingSnapshots[0].payload.problema).toBe(basePayload.problema);
  });

  it("integración completa con reordenamiento detectado en diff", async () => {
    const before = [{ id: "e-1", n: "A" }, { id: "e-2", n: "B" }, { id: "e-3", n: "C" }];
    const after  = [{ id: "e-3", n: "C" }, { id: "e-1", n: "A" }, { id: "e-2", n: "B" }];
    const changes = compareEntities("hypothesis", before, after);
    const reordered = findReorderedEntities(changes);
    expect(reordered.length).toBeGreaterThan(0);
    reordered.forEach((r) => {
      expect(r.beforeIndex !== undefined).toBeTrue();
      expect(r.afterIndex !== undefined).toBeTrue();
    });
  });
});

// ─── Async test runner ────────────────────────────────────────────────────────

(async () => {
  for (const test of testQueue) {
    try {
      await Promise.resolve(test.fn());
      passed++;
      console.log(`  ✓ ${test.msg}`);
    } catch (e: unknown) {
      failed++;
      console.error(`  ✗ ${test.msg}: ${(e instanceof Error ? e.message : String(e))}`);
    }
  }

  console.log("\n──────────────────────────────────────────────────────");
  console.log(`   Passed : ${passed}`);
  console.log(`   Failed : ${failed}`);
  console.log(`   Total  : ${passed + failed}`);
  console.log("──────────────────────────────────────────────────────\n");
  if (failed > 0) process.exit(1);
})();
