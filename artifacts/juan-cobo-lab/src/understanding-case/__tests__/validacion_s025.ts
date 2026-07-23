/**
 * S-025 — Validación: Understanding Case Foundation
 *
 * Test suite covering:
 *   §1.  Creación de UnderstandingCase
 *   §2.  Validación de campos obligatorios
 *   §3.  Actualización de metadatos
 *   §4.  Asociación caso-problema
 *   §5.  Inclusión en snapshot
 *   §6.  Estabilidad del hash
 *   §7.  Exportación e importación
 *   §8.  Migración 1.0.0 → 1.1.0
 *   §9.  Diff semántico y rutas de migración
 *   §10. Regresión — suites anteriores
 */

import {
  createCase,
  validateCase,
  updateCase,
  synthesizeCaseFromPayload,
  isSynthesizedCase,
} from "@/understanding-case/UnderstandingCaseService";
import type { UnderstandingCase, UnderstandingCaseInput } from "@/understanding-case/types";
import {
  createProjectSnapshot,
  verifySnapshotIntegrity,
} from "@/project-versioning/SnapshotService";
import {
  createProjectPackage,
  importProjectPackage,
  createProjectVersion,
  validateProjectPackage,
} from "@/project-versioning/ProjectPackageService";
import {
  canMigrate,
  migrateSnapshot,
} from "@/project-versioning/migrations/MigrationService";
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  REGISTERED_MIGRATIONS,
} from "@/project-versioning";
import type {
  ProjectSnapshotPayload,
  ProjectSnapshotMetadata,
  ProjectSnapshot,
} from "@/project-versioning/types";

// ─── Minimal async test harness ───────────────────────────────────────────────

type TestFn = () => void | Promise<void>;
interface TestCase { name: string; fn: TestFn; }
interface Suite { name: string; cases: TestCase[]; }

const suites: Suite[] = [];
let currentSuite: Suite | null = null;

function describe(name: string, fn: () => void) {
  const suite: Suite = { name, cases: [] };
  suites.push(suite);
  currentSuite = suite;
  fn();
  currentSuite = null;
}

function it(name: string, fn: TestFn) {
  if (!currentSuite) throw new Error("it() called outside describe()");
  currentSuite.cases.push({ name, fn });
}

class AssertionError extends Error {}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected)
        throw new AssertionError(
          `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
        );
    },
    toEqual(expected: T) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new AssertionError(
          `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
        );
    },
    toBeTruthy() {
      if (!actual)
        throw new AssertionError(`Expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual)
        throw new AssertionError(`Expected falsy, got ${JSON.stringify(actual)}`);
    },
    toBeNull() {
      if (actual !== null)
        throw new AssertionError(`Expected null, got ${JSON.stringify(actual)}`);
    },
    toBeUndefined() {
      if (actual !== undefined)
        throw new AssertionError("Expected undefined, got " + JSON.stringify(actual));
    },
    toBeDefined() {
      if (actual === undefined)
        throw new AssertionError("Expected defined, got undefined");
    },
    toBeGreaterThan(n: number) {
      if ((actual as number) <= n)
        throw new AssertionError(`Expected ${actual} > ${n}`);
    },
    toBeGreaterThanOrEqual(n: number) {
      if ((actual as number) < n)
        throw new AssertionError(`Expected ${actual} >= ${n}`);
    },
    toContain(sub: string) {
      if (typeof actual !== "string" || !actual.includes(sub))
        throw new AssertionError(`Expected "${actual}" to contain "${sub}"`);
    },
    toMatch(re: RegExp) {
      if (typeof actual !== "string" || !re.test(actual))
        throw new AssertionError(`Expected "${actual}" to match ${re}`);
    },
    toBeTrue() {
      if (actual !== true)
        throw new AssertionError(`Expected true, got ${actual}`);
    },
    toBeFalse() {
      if (actual !== false)
        throw new AssertionError(`Expected false, got ${actual}`);
    },
    not: {
      toBe(expected: T) {
        if (actual === expected)
          throw new AssertionError(`Expected not ${JSON.stringify(expected)}`);
      },
      toBeNull() {
        if (actual === null)
          throw new AssertionError("Expected not null");
      },
      toBeUndefined() {
        if (actual === undefined)
          throw new AssertionError("Expected not undefined");
      },
    },
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_INPUT: UnderstandingCaseInput = {
  name: "Crisis hídrica en municipios rurales",
  understandingQuestion:
    "¿Por qué persiste la escasez de agua potable en municipios rurales a pesar de la inversión pública?",
  purpose: "Orientar una política sectorial de agua",
  domain: "Política pública de agua potable y saneamiento",
  scope: "Colombia, 2015-2025",
  description: "Análisis de las causas estructurales de la brecha hídrica.",
};

const MINIMAL_INPUT: UnderstandingCaseInput = {
  name: "Caso mínimo",
  understandingQuestion: "¿Qué ocurre aquí?",
  purpose: "Explorar el fenómeno",
  domain: "Política social",
};

const META: ProjectSnapshotMetadata = {
  projectId: "test-project",
  projectName: "Test Project",
  tags: [],
};

function makePayload(
  overrides?: Partial<ProjectSnapshotPayload>
): ProjectSnapshotPayload {
  return {
    understandingCase: null,
    knowledgeSources: [],
    contributions: [],
    problema: "Problema analítico del fenómeno estudiado",
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

/**
 * Build a minimal ProjectSnapshot for migration tests.
 * contentHash is a placeholder — migrateSnapshot only reads schemaVersion + payload.
 */
function makeLegacySnapshot(
  payload: unknown,
  schemaVersion: string
): ProjectSnapshot {
  return {
    id: "legacy-test-id",
    version: "1.0",
    schemaVersion,
    metadata: META,
    payload: payload as ProjectSnapshotPayload,
    contentHash: "0".repeat(64),
    createdAt: "2024-01-01T00:00:00.000Z",
  };
}

// ─── §1. Creación de UnderstandingCase ────────────────────────────────────────

describe("Creación de UnderstandingCase", () => {
  it("createCase con todos los campos → objeto con id, createdAt, updatedAt", () => {
    const c = createCase(VALID_INPUT);
    expect(c.id).toBeTruthy();
    expect(c.createdAt).toBeTruthy();
    expect(c.updatedAt).toBeTruthy();
  });

  it("createCase status por defecto es 'active'", () => {
    const c = createCase(MINIMAL_INPUT);
    expect(c.status).toBe("active");
  });

  it("createCase preserva name exactamente (trimmed)", () => {
    const c = createCase({ ...VALID_INPUT, name: "  Crisis hídrica  " });
    expect(c.name).toBe("Crisis hídrica");
  });

  it("createCase preserva understandingQuestion", () => {
    const c = createCase(VALID_INPUT);
    expect(c.understandingQuestion).toBe(VALID_INPUT.understandingQuestion);
  });

  it("createCase preserva purpose y domain", () => {
    const c = createCase(VALID_INPUT);
    expect(c.purpose).toBe(VALID_INPUT.purpose);
    expect(c.domain).toBe(VALID_INPUT.domain);
  });

  it("createCase con campos opcionales → scope y description presentes", () => {
    const c = createCase(VALID_INPUT);
    expect(c.scope).toBe(VALID_INPUT.scope);
    expect(c.description).toBe(VALID_INPUT.description);
  });

  it("createCase sin campos opcionales → scope y description ausentes", () => {
    const c = createCase(MINIMAL_INPUT);
    expect(c.scope).toBeUndefined();
    expect(c.description).toBeUndefined();
  });

  it("createCase createdAt es ISO-8601 válido", () => {
    const c = createCase(MINIMAL_INPUT);
    expect(new Date(c.createdAt).getTime()).toBeGreaterThan(0);
  });

  it("createCase status respeta el valor suministrado", () => {
    const c = createCase({ ...MINIMAL_INPUT, status: "draft" });
    expect(c.status).toBe("draft");
  });

  it("createCase sin migrationOrigin (caso de usuario)", () => {
    const c = createCase(VALID_INPUT);
    expect(c.migrationOrigin).toBeUndefined();
  });
});

// ─── §2. Validación de campos obligatorios ────────────────────────────────────

describe("Validación de campos obligatorios", () => {
  it("name ausente → valid=false", () => {
    const r = validateCase({ ...VALID_INPUT, name: "" });
    expect(r.valid).toBeFalse();
  });

  it("name blank → error incluye 'nombre'", () => {
    const r = validateCase({ ...VALID_INPUT, name: "   " });
    expect(r.valid).toBeFalse();
    expect(r.errors.some((e) => e.toLowerCase().includes("nombre"))).toBeTrue();
  });

  it("understandingQuestion ausente → valid=false", () => {
    const r = validateCase({ ...VALID_INPUT, understandingQuestion: "" });
    expect(r.valid).toBeFalse();
  });

  it("purpose ausente → valid=false", () => {
    const r = validateCase({ ...VALID_INPUT, purpose: "" });
    expect(r.valid).toBeFalse();
  });

  it("domain ausente → valid=false", () => {
    const r = validateCase({ ...VALID_INPUT, domain: "" });
    expect(r.valid).toBeFalse();
  });

  it("scope y description ausentes → valid=true", () => {
    const r = validateCase(MINIMAL_INPUT);
    expect(r.valid).toBeTrue();
    expect(r.errors.length).toBe(0);
  });

  it("todos los campos requeridos presentes → valid=true, errors=[]", () => {
    const r = validateCase(VALID_INPUT);
    expect(r.valid).toBeTrue();
    expect(r.errors.length).toBe(0);
  });

  it("múltiples campos ausentes → errores independientes por campo", () => {
    const r = validateCase({
      name: "",
      understandingQuestion: "",
      purpose: "x",
      domain: "y",
    });
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("createCase con campo inválido lanza error", () => {
    let threw = false;
    try {
      createCase({ ...VALID_INPUT, name: "" });
    } catch {
      threw = true;
    }
    expect(threw).toBeTrue();
  });
});

// ─── §3. Actualización de metadatos ──────────────────────────────────────────

describe("Actualización de metadatos", () => {
  it("updateCase retorna nuevo objeto (no muta el original)", () => {
    const original = createCase(VALID_INPUT);
    const updated = updateCase(original, { name: "Nuevo nombre" });
    expect(original.name).toBe(VALID_INPUT.name);
    expect(updated.name).toBe("Nuevo nombre");
  });

  it("updateCase cambia updatedAt", async () => {
    const c = createCase(VALID_INPUT);
    await new Promise((r) => setTimeout(r, 5));
    const updated = updateCase(c, { name: "Otro nombre" });
    expect(updated.updatedAt >= c.updatedAt).toBeTrue();
  });

  it("updateCase preserva id", () => {
    const c = createCase(VALID_INPUT);
    const updated = updateCase(c, { name: "Nuevo" });
    expect(updated.id).toBe(c.id);
  });

  it("updateCase preserva createdAt", () => {
    const c = createCase(VALID_INPUT);
    const updated = updateCase(c, { purpose: "Otro propósito" });
    expect(updated.createdAt).toBe(c.createdAt);
  });

  it("updateCase parcial solo cambia el campo indicado", () => {
    const c = createCase(VALID_INPUT);
    const updated = updateCase(c, { domain: "Nuevo dominio" });
    expect(updated.domain).toBe("Nuevo dominio");
    expect(updated.name).toBe(c.name);
    expect(updated.purpose).toBe(c.purpose);
  });

  it("updateCase con scope vacío → scope undefined", () => {
    const c = createCase(VALID_INPUT);
    const updated = updateCase(c, { scope: "" });
    expect(updated.scope).toBeUndefined();
  });

  it("updateCase status a 'archived'", () => {
    const c = createCase(VALID_INPUT);
    const updated = updateCase(c, { status: "archived" });
    expect(updated.status).toBe("archived");
  });
});

// ─── §4. Asociación caso-problema ────────────────────────────────────────────

describe("Asociación caso-problema", () => {
  it("understandingQuestion y problema son conceptos distintos", () => {
    const c = createCase(VALID_INPUT);
    const problema = "Formulación analítica del fenómeno";
    expect(c.understandingQuestion).not.toBe(problema);
  });

  it("ambos coexisten en el payload sin conflicto", () => {
    const c = createCase(VALID_INPUT);
    const payload = makePayload({ understandingCase: c, problema: "Mi problema" });
    expect(payload.understandingCase?.name).toBe(VALID_INPUT.name);
    expect(payload.problema).toBe("Mi problema");
  });

  it("cambiar problema no altera understandingCase", () => {
    const c = createCase(VALID_INPUT);
    const payload1 = makePayload({ understandingCase: c, problema: "Problema A" });
    const payload2 = { ...payload1, problema: "Problema B" };
    expect(payload2.understandingCase?.understandingQuestion).toBe(
      payload1.understandingCase?.understandingQuestion
    );
  });

  it("isSynthesizedCase: caso de usuario → false", () => {
    const c = createCase(VALID_INPUT);
    expect(isSynthesizedCase(c)).toBeFalse();
  });

  it("understandingCase: null en payload es válido (sin caso asignado)", () => {
    const payload = makePayload({ understandingCase: null });
    expect(payload.understandingCase).toBeNull();
  });
});

// ─── §5. Inclusión en snapshot ────────────────────────────────────────────────

describe("Inclusión en snapshot", () => {
  it("snapshot con understandingCase → campo presente en payload", async () => {
    const c = createCase(VALID_INPUT);
    const payload = makePayload({ understandingCase: c });
    const snap = await createProjectSnapshot(payload, META);
    expect(snap.payload.understandingCase?.id).toBe(c.id);
  });

  it("contentHash es 64 chars hexadecimales", async () => {
    const c = createCase(VALID_INPUT);
    const payload = makePayload({ understandingCase: c });
    const snap = await createProjectSnapshot(payload, META);
    expect(/^[0-9a-f]{64}$/.test(snap.contentHash)).toBeTrue();
  });

  it("verifySnapshotIntegrity → true cuando caso incluido", async () => {
    const c = createCase(VALID_INPUT);
    const snap = await createProjectSnapshot(
      makePayload({ understandingCase: c }),
      META
    );
    const valid = await verifySnapshotIntegrity(snap);
    expect(valid).toBeTrue();
  });

  it("schemaVersion del snapshot es '1.3.0'", async () => {
    const snap = await createProjectSnapshot(makePayload(), META);
    expect(snap.schemaVersion).toBe("1.3.0");
  });

  it("snapshot con understandingCase: null → campo null en payload", async () => {
    const snap = await createProjectSnapshot(
      makePayload({ understandingCase: null }),
      META
    );
    expect(snap.payload.understandingCase).toBeNull();
  });
});

// ─── §6. Estabilidad del hash ─────────────────────────────────────────────────

describe("Estabilidad del hash", () => {
  it("integridad verificable: hash no se corrompe al serializar/deserializar", async () => {
    const c = createCase(VALID_INPUT);
    const snap = await createProjectSnapshot(
      makePayload({ understandingCase: c }),
      META
    );
    const serialized = JSON.stringify(snap);
    const deserialized = JSON.parse(serialized);
    const valid = await verifySnapshotIntegrity(deserialized);
    expect(valid).toBeTrue();
  });

  it("nombre del caso diferente → hash diferente", async () => {
    const c1 = createCase(VALID_INPUT);
    const c2 = createCase({
      ...VALID_INPUT,
      name: "Nombre radicalmente diferente para este test",
    });
    const meta: ProjectSnapshotMetadata = { ...META, versionLabel: "v1" };
    const s1 = await createProjectSnapshot(
      makePayload({ understandingCase: c1 }),
      meta
    );
    const s2 = await createProjectSnapshot(
      makePayload({ understandingCase: c2 }),
      meta
    );
    expect(s1.contentHash).not.toBe(s2.contentHash);
  });

  it("understandingCase: null vs caso definido → hashes distintos", async () => {
    const c = createCase(VALID_INPUT);
    const meta: ProjectSnapshotMetadata = { ...META, versionLabel: "v1" };
    const sNull = await createProjectSnapshot(
      makePayload({ understandingCase: null }),
      meta
    );
    const sCase = await createProjectSnapshot(
      makePayload({ understandingCase: c }),
      meta
    );
    expect(sNull.contentHash).not.toBe(sCase.contentHash);
  });

  it("understandingQuestion diferente → hash diferente", async () => {
    const meta: ProjectSnapshotMetadata = { ...META, versionLabel: "v1" };
    const c1 = createCase(VALID_INPUT);
    const c2 = createCase({
      ...VALID_INPUT,
      understandingQuestion: "¿Pregunta completamente diferente para el test?",
    });
    const s1 = await createProjectSnapshot(
      makePayload({ understandingCase: c1 }),
      meta
    );
    const s2 = await createProjectSnapshot(
      makePayload({ understandingCase: c2 }),
      meta
    );
    expect(s1.contentHash).not.toBe(s2.contentHash);
  });

  it("verifySnapshotIntegrity → false cuando hash alterado manualmente", async () => {
    const snap = await createProjectSnapshot(makePayload(), META);
    const tampered: ProjectSnapshot = {
      ...snap,
      contentHash: "a".repeat(64),
    };
    const valid = await verifySnapshotIntegrity(tampered);
    expect(valid).toBeFalse();
  });
});

// ─── §7. Exportación e importación ───────────────────────────────────────────

describe("Exportación e importación", () => {
  it("paquete 1.1.0 → packageHash tiene 64 chars", async () => {
    const c = createCase(VALID_INPUT);
    const snap = await createProjectSnapshot(
      makePayload({ understandingCase: c }),
      META
    );
    const ver = createProjectVersion(snap.id, "v1.0");
    const pkg = await createProjectPackage("p001", "Mi Proyecto", [snap], [ver]);
    expect(/^[0-9a-f]{64}$/.test(pkg.manifest.packageHash)).toBeTrue();
  });

  it("re-importación preserva understandingCase exactamente", async () => {
    const c = createCase(VALID_INPUT);
    const snap = await createProjectSnapshot(
      makePayload({ understandingCase: c }),
      META
    );
    const ver = createProjectVersion(snap.id, "v1.0");
    const pkg = await createProjectPackage("p001", "Mi Proyecto", [snap], [ver]);
    const result = await importProjectPackage(pkg, [], [], "create-copy");
    expect(result.success).toBeTrue();
    const importedCase = result.resultingSnapshots[0]?.payload.understandingCase;
    expect(importedCase?.understandingQuestion).toBe(c.understandingQuestion);
    expect(importedCase?.name).toBe(c.name);
  });

  it("validateProjectPackage pasa para paquete válido", async () => {
    const c = createCase(MINIMAL_INPUT);
    const snap = await createProjectSnapshot(
      makePayload({ understandingCase: c }),
      META
    );
    const ver = createProjectVersion(snap.id, "v1.0");
    const pkg = await createProjectPackage("p002", "Test", [snap], [ver]);
    const integrityResult = await validateProjectPackage(pkg);
    expect(integrityResult.valid).toBeTrue();
  });

  it("paquete con hash alterado → detección de corrupción", async () => {
    const snap = await createProjectSnapshot(makePayload(), META);
    const ver = createProjectVersion(snap.id, "v1.0");
    const pkg = await createProjectPackage("p003", "Test", [snap], [ver]);
    const tampered = {
      ...pkg,
      manifest: { ...pkg.manifest, packageHash: "a".repeat(64) },
    };
    const integrityResult = await validateProjectPackage(tampered);
    expect(integrityResult.valid).toBeFalse();
  });
});

// ─── §8. Migración 1.0.0 → 1.1.0 ────────────────────────────────────────────

describe("Migración 1.0.0 → 1.1.0", () => {
  const legacyPayload = {
    problema:
      "¿Por qué persiste la brecha digital donde ya existe cobertura?",
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

  // Migration takes a ProjectSnapshot — wrap the legacy payload
  function legacySnap(): ProjectSnapshot {
    return makeLegacySnapshot(legacyPayload, "1.0.0");
  }

  it("canMigrate('1.0.0', '1.1.0') → true", () => {
    expect(canMigrate("1.0.0", "1.1.0")).toBeTrue();
  });

  it("migración produce understandingCase (no null, no undefined)", () => {
    const result = migrateSnapshot(legacySnap(), "1.1.0");
    expect(result.success).toBeTrue();
    const p = result.migratedPayload as Record<string, unknown>;
    expect(p.understandingCase !== null).toBeTrue();
    expect(p.understandingCase !== undefined).toBeTrue();
  });

  it("caso sintetizado tiene migrationOrigin", () => {
    const result = migrateSnapshot(legacySnap(), "1.1.0");
    const p = result.migratedPayload as Record<string, unknown>;
    const c = p.understandingCase as UnderstandingCase;
    expect(c.migrationOrigin !== undefined).toBeTrue();
  });

  it("migrationOrigin.fromSchemaVersion === '1.0.0'", () => {
    const result = migrateSnapshot(legacySnap(), "1.1.0");
    const p = result.migratedPayload as Record<string, unknown>;
    const c = p.understandingCase as UnderstandingCase;
    expect(c.migrationOrigin?.fromSchemaVersion).toBe("1.0.0");
  });

  it("understandingQuestion del caso sintetizado igual al problema original", () => {
    const result = migrateSnapshot(legacySnap(), "1.1.0");
    const p = result.migratedPayload as Record<string, unknown>;
    const c = p.understandingCase as UnderstandingCase;
    expect(c.understandingQuestion).toBe(legacyPayload.problema);
  });

  it("nombre del caso sintetizado derivado del problema (no vacío)", () => {
    const result = migrateSnapshot(legacySnap(), "1.1.0");
    const p = result.migratedPayload as Record<string, unknown>;
    const c = p.understandingCase as UnderstandingCase;
    expect(c.name.length).toBeGreaterThan(0);
  });

  it("isSynthesizedCase(migratedCase) === true", () => {
    const result = migrateSnapshot(legacySnap(), "1.1.0");
    const p = result.migratedPayload as Record<string, unknown>;
    const c = p.understandingCase as UnderstandingCase;
    expect(isSynthesizedCase(c)).toBeTrue();
  });

  it("todos los campos del payload 1.0.0 se preservan tras migración", () => {
    const result = migrateSnapshot(legacySnap(), "1.1.0");
    const p = result.migratedPayload as Record<string, unknown>;
    expect(p.problema).toBe(legacyPayload.problema);
    expect(Array.isArray(p.hypotheses)).toBeTrue();
    expect(Array.isArray(p.reportDefinitions)).toBeTrue();
    expect(Array.isArray(p.evidenceEvaluationMatrices)).toBeTrue();
  });

  it("migración de problema vacío → understandingCase con nombre fallback", () => {
    const emptySnap = makeLegacySnapshot(
      { ...legacyPayload, problema: "" },
      "1.0.0"
    );
    const result = migrateSnapshot(emptySnap, "1.1.0");
    const p = result.migratedPayload as Record<string, unknown>;
    const c = p.understandingCase as UnderstandingCase;
    expect(c.name.length).toBeGreaterThan(0);
  });

  it("synthesizeCaseFromPayload produce caso con status 'active'", () => {
    const c = synthesizeCaseFromPayload(
      "Un problema de política pública",
      "1.0.0"
    );
    expect(c.status).toBe("active");
  });
});

// ─── §9. Diff semántico y rutas de migración ─────────────────────────────────

describe("Diff semántico y rutas de migración", () => {
  it("mismo understandingCase → hash de snapshot válido (integridad preservada)", async () => {
    const c = createCase(VALID_INPUT);
    const snap = await createProjectSnapshot(
      makePayload({ understandingCase: c }),
      META
    );
    const valid = await verifySnapshotIntegrity(snap);
    expect(valid).toBeTrue();
  });

  it("nombre del caso modificado → hash distinto", async () => {
    const c1 = createCase(VALID_INPUT);
    const c2 = updateCase(c1, {
      name: "Nombre radicalmente diferente para este test §9",
    });
    const meta: ProjectSnapshotMetadata = { ...META, versionLabel: "v1" };
    const s1 = await createProjectSnapshot(
      makePayload({ understandingCase: c1 }),
      meta
    );
    const s2 = await createProjectSnapshot(
      makePayload({ understandingCase: c2 }),
      meta
    );
    expect(s1.contentHash).not.toBe(s2.contentHash);
  });

  it("ruta 2 saltos 0.9.0 → 1.1.0 disponible (canMigrate)", () => {
    expect(canMigrate("0.9.0", "1.1.0")).toBeTrue();
  });

  it("migración en 2 saltos 0.9.0 → 1.1.0 produce understandingCase sintetizado", () => {
    const payload09 = {
      problema: "Problema de prueba para ruta 0.9.0",
      packActivo: null,
      thinkingUserSelection: null,
      reflectionAnswers: [],
      hypotheses: [],
      conceptualModels: [],
      operationalizationMatrices: [],
      contrastationMatrices: [],
      evidenceMatrices: [], // pre-1.0.0 field name
      hypothesisEvidenceConclusions: [],
    };
    const snap09 = makeLegacySnapshot(payload09, "0.9.0");
    const result = migrateSnapshot(snap09, "1.1.0");
    expect(result.success).toBeTrue();
    const p = result.migratedPayload as Record<string, unknown>;
    const c = p.understandingCase as UnderstandingCase;
    expect(c !== null && c !== undefined).toBeTrue();
    expect(isSynthesizedCase(c)).toBeTrue();
  });
});

// ─── §10. Regresión ───────────────────────────────────────────────────────────

describe("Regresión — compatibilidad con suites anteriores", () => {
  it("CURRENT_PROJECT_SCHEMA_VERSION === '1.3.0'", () => {
    expect(CURRENT_PROJECT_SCHEMA_VERSION).toBe("1.3.0");
  });

  it("REGISTERED_MIGRATIONS tiene al menos 2 migraciones", () => {
    expect(REGISTERED_MIGRATIONS.length).toBeGreaterThanOrEqual(2);
  });

  it("migración 0.9.0 → 1.0.0 sigue disponible", () => {
    expect(canMigrate("0.9.0", "1.0.0")).toBeTrue();
  });

  it("migración 1.0.0 → 1.1.0 disponible en registry", () => {
    const m = REGISTERED_MIGRATIONS.find(
      (m) => m.fromVersion === "1.0.0" && m.toVersion === "1.1.0"
    );
    expect(m !== undefined).toBeTrue();
  });

  it("createProjectSnapshot sin understandingCase no lanza error", async () => {
    const payloadSinCaso: ProjectSnapshotPayload = {
      problema: "Problema sin caso",
      knowledgeSources: [],
      contributions: [],
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
    let threw = false;
    try {
      await createProjectSnapshot(payloadSinCaso, META);
    } catch {
      threw = true;
    }
    expect(threw).toBeFalse();
  });
});

// ─── Runner ───────────────────────────────────────────────────────────────────

async function run() {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const suite of suites) {
    console.log(`\n  ${suite.name}`);
    for (const tc of suite.cases) {
      try {
        await Promise.resolve(tc.fn());
        console.log(`    ✓ ${tc.name}`);
        passed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`    ✗ ${tc.name}: ${msg}`);
        failures.push(`${suite.name} › ${tc.name}: ${msg}`);
        failed++;
      }
    }
  }

  console.log(`
──────────────────────────────────────────────────────
   Passed : ${passed}
   Failed : ${failed}
   Total  : ${passed + failed}
──────────────────────────────────────────────────────`);

  if (failed > 0) {
    console.error("\nFailed tests:");
    failures.forEach((f) => console.error(`  ✗ ${f}`));
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
