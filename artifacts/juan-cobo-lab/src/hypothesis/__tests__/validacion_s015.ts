/**
 * Validación S-015 — Hypothesis Builder
 *
 * 18 test cases covering the HypothesisBuilderService pure functions,
 * traceability invariants, and state-preservation rules.
 *
 * Run: npx ts-node src/hypothesis/__tests__/validacion_s015.ts
 */

import {
  createEmptyHypothesis,
  updateHypothesis,
  buildProvisionalFormulacion,
  validateHypothesis,
  computeHypothesisStatus,
  duplicateHypothesis,
  moveHypothesis,
  setPrimaryHypothesis,
  removeHypothesis,
  markPatternChanged,
  linkReflectionAnswer,
  unlinkReflectionAnswer,
  createVariable,
  exceedsRecommendedCount,
  getAnsweredReflections,
  MAX_RECOMMENDED_HYPOTHESES,
  MIN_WORDS_FORMULACION,
} from "../HypothesisBuilderService";

import type {
  PolicyHypothesis,
  ReflectionAnswer,
} from "../types";

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e instanceof Error ? e.message : String(e)}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, msg?: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b)
    throw new Error(
      msg ?? `Expected ${b}, got ${a}`
    );
}

function assertIncludes(arr: unknown[], val: unknown, msg?: string) {
  if (!arr.includes(val))
    throw new Error(msg ?? `Expected array to include ${JSON.stringify(val)}`);
}

function assertNotIncludes(arr: unknown[], val: unknown, msg?: string) {
  if (arr.includes(val))
    throw new Error(msg ?? `Expected array NOT to include ${JSON.stringify(val)}`);
}

function assertTrue(cond: boolean, msg?: string) {
  if (!cond) throw new Error(msg ?? "Expected true");
}

function assertFalse(cond: boolean, msg?: string) {
  if (cond) throw new Error(msg ?? "Expected false");
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PATTERN_IDS = ["socrático"];

function makeComplete(): PolicyHypothesis {
  const h = createEmptyHypothesis(PATTERN_IDS);
  const causaVar = createVariable("Dependencia financiera del regulador", "causa");
  const resultVar = createVariable("Nivel de tarifa sobre el óptimo social", "resultado");
  return updateHypothesis(h, {
    titulo: "Captura regulatoria bloquea la reforma tarifaria",
    formulacion:
      "Cuando los reguladores dependen financieramente de los operadores, " +
      "entonces las tarifas se fijan por encima del óptimo social, " +
      "porque el mecanismo independiente de supervisión queda cooptado.",
    causa: "Dependencia financiera de los reguladores respecto a los operadores que supervisan.",
    mecanismo: "El mecanismo de supervisión independiente queda cooptado por los intereses privados.",
    resultadoEsperado: "Las tarifas se fijan por encima del óptimo social, sin corrección regulatoria efectiva.",
    condiciones: "Donde no existe tribunal de apelación independiente ni vigilancia parlamentaria activa.",
    evidenciaNecesaria: "Estudios de captura regulatoria en servicios públicos latinoamericanos.",
    variables: [causaVar, resultVar],
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log("\nHypothesis Builder Service — Validación S-015");
console.log("══════════════════════════════════════════════\n");

// TC-01: createEmptyHypothesis produces expected defaults
test("TC-01 createEmptyHypothesis — correct defaults", () => {
  const h = createEmptyHypothesis(PATTERN_IDS);
  assertEqual(h.titulo, "");
  assertEqual(h.formulacion, "");
  assertEqual(h.causa, "");
  assertEqual(h.mecanismo, "");
  assertEqual(h.resultadoEsperado, "");
  assertEqual(h.variables, []);
  assertEqual(h.sourceQuestionIds, []);
  assertEqual(h.confianza, "exploratoria");
  assertFalse(!!h.isPrimary, "isPrimary should be falsy");
  assertEqual(h.thinkingPatternIds, PATTERN_IDS);
  assertFalse(!!h.patternChangedWarning, "patternChangedWarning should be falsy");
  assertTrue(h.id.length > 0, "ID must be non-empty");
});

// TC-02: buildProvisionalFormulacion constructs the expected sentence pattern
// Format: "Cuando {causa}, entonces {resultado}, porque {mecanismo}."
test("TC-02 buildProvisionalFormulacion — correct sentence structure", () => {
  const f = buildProvisionalFormulacion(
    "La dependencia financiera del regulador",
    "copta el mecanismo de supervisión",
    "las tarifas reflejan intereses privados"
  );
  // The function lowercases the first char of each argument
  assertTrue(
    f.startsWith("Cuando la dependencia financiera"),
    `Expected 'Cuando la dependencia...' prefix, got: ${f}`
  );
  assertTrue(f.includes("entonces"), `Expected 'entonces', got: ${f}`);
  assertTrue(f.includes("porque"), `Expected 'porque', got: ${f}`);
  // resultado goes in "entonces" slot, mecanismo goes in "porque" slot
  assertTrue(
    f.includes("entonces las tarifas"),
    `Expected resultado in 'entonces' slot, got: ${f}`
  );
  assertTrue(
    f.includes("porque copta"),
    `Expected mecanismo in 'porque' slot, got: ${f}`
  );
});

// TC-03: buildProvisionalFormulacion result is NEVER auto-applied to formulacion
test("TC-03 provisional formulacion not auto-applied (service level)", () => {
  const h = createEmptyHypothesis(PATTERN_IDS);
  const withFields = updateHypothesis(h, {
    causa: "Causa X",
    mecanismo: "Mecanismo Y",
    resultadoEsperado: "Resultado Z",
  });
  // Calling buildProvisionalFormulacion should NOT modify the hypothesis
  buildProvisionalFormulacion("Causa X", "Mecanismo Y", "Resultado Z");
  assertEqual(
    withFields.formulacion,
    "",
    "formulacion must remain empty unless explicitly set"
  );
});

// TC-04: validateHypothesis — incomplete hypothesis has errors
test("TC-04 validateHypothesis — incomplete produces errors", () => {
  const h = createEmptyHypothesis(PATTERN_IDS);
  const result = validateHypothesis(h);
  assertFalse(result.isComplete, "Empty hypothesis should be incomplete");
  assertTrue(result.errors.length > 0, "Should have at least one error");
});

// TC-05: validateHypothesis — complete hypothesis passes
test("TC-05 validateHypothesis — complete hypothesis passes", () => {
  const h = makeComplete();
  const result = validateHypothesis(h);
  assertEqual(result.errors.length, 0, `Expected no errors, got: ${result.errors.join("; ")}`);
  assertTrue(result.isComplete);
});

// TC-06: computeHypothesisStatus is independent of confianza
// "lista-para-contrastar" requires: formulacion + causaVar + resultVar + evidenciaNecesaria
test("TC-06 computeHypothesisStatus — independent of confianza", () => {
  const h = makeComplete(); // already has vars + evidencia
  const exploratoria = updateHypothesis(h, { confianza: "exploratoria" });
  const bienSustentada = updateHypothesis(h, { confianza: "bien-sustentada" });
  const statusA = computeHypothesisStatus(exploratoria);
  const statusB = computeHypothesisStatus(bienSustentada);
  assertEqual(statusA, statusB, "Status must not change with confianza");
  assertEqual(statusA, "lista-para-contrastar", `Expected lista-para-contrastar, got ${statusA}`);
});

// TC-07: computeHypothesisStatus — borrador when empty
test("TC-07 computeHypothesisStatus — borrador when all empty", () => {
  const h = createEmptyHypothesis(PATTERN_IDS);
  assertEqual(computeHypothesisStatus(h), "borrador");
});

// TC-08: computeHypothesisStatus — incompleta when core complete but no variables/formulacion
// "borrador" if causa|mecanismo|resultado is missing; "incompleta" if core present but not all of
// {formulacion + causaVar + resultVar + evidenciaNecesaria}.
test("TC-08 computeHypothesisStatus — incompleta when partially filled", () => {
  // All three core fields present but no variables/formulacion/evidencia
  const h = updateHypothesis(createEmptyHypothesis(PATTERN_IDS), {
    causa: "Alguna causa",
    mecanismo: "Algún mecanismo",
    resultadoEsperado: "Algún resultado observable",
  });
  assertEqual(
    computeHypothesisStatus(h),
    "incompleta",
    "Should be incompleta: core complete but missing formulacion/variables/evidencia"
  );
});

// TC-09: variable roles are preserved through update
test("TC-09 variable roles preserved through update", () => {
  const h = createEmptyHypothesis(PATTERN_IDS);
  const v = createVariable("Concentración de mercado", "mediadora");
  const withVar = updateHypothesis(h, { variables: [v] });
  assertEqual(withVar.variables[0].rol, "mediadora");
  assertEqual(withVar.variables[0].nombre, "Concentración de mercado");
});

// TC-10: sourceQuestionIds traceability — linkReflectionAnswer adds, unlink removes
test("TC-10 sourceQuestionIds traceability — link and unlink", () => {
  const h = createEmptyHypothesis(PATTERN_IDS);
  const linked = linkReflectionAnswer(h, "single:3");
  assertIncludes(linked.sourceQuestionIds, "single:3");
  const unlinked = unlinkReflectionAnswer(linked, "single:3");
  assertNotIncludes(unlinked.sourceQuestionIds, "single:3");
});

// TC-11: linkReflectionAnswer is idempotent
test("TC-11 linkReflectionAnswer — idempotent", () => {
  const h = createEmptyHypothesis(PATTERN_IDS);
  const once = linkReflectionAnswer(h, "primary:1");
  const twice = linkReflectionAnswer(once, "primary:1");
  assertEqual(
    twice.sourceQuestionIds.filter((k) => k === "primary:1").length,
    1,
    "Linking same question twice should not duplicate"
  );
});

// TC-12: duplicateHypothesis produces a new ID, isPrimary=false, titulo gets " (copia)" suffix
test("TC-12 duplicateHypothesis — new ID, isPrimary=false, title suffixed", () => {
  const h = makeComplete();
  const h2 = updateHypothesis(h, { isPrimary: true });
  const dup = duplicateHypothesis(h2);
  assertTrue(dup.id !== h2.id, "Duplicate must have a different ID");
  assertFalse(!!dup.isPrimary, "Duplicate must not be primary");
  assertTrue(
    dup.titulo.startsWith(h2.titulo) && dup.titulo.includes("copia"),
    `Expected title to start with original and include 'copia', got: ${dup.titulo}`
  );
});

// TC-13: moveHypothesis up / down
test("TC-13 moveHypothesis — up and down", () => {
  const a = createEmptyHypothesis(PATTERN_IDS);
  const b = createEmptyHypothesis(PATTERN_IDS);
  const c = createEmptyHypothesis(PATTERN_IDS);
  const list = [a, b, c];

  const movedUp = moveHypothesis(list, b.id, "up");
  assertEqual(movedUp[0].id, b.id);
  assertEqual(movedUp[1].id, a.id);

  const movedDown = moveHypothesis(list, b.id, "down");
  assertEqual(movedDown[2].id, b.id);
  assertEqual(movedDown[1].id, c.id);
});

// TC-14: setPrimaryHypothesis — only one primary at a time
test("TC-14 setPrimaryHypothesis — ensures single primary", () => {
  const a = createEmptyHypothesis(PATTERN_IDS);
  const b = createEmptyHypothesis(PATTERN_IDS);
  const setA = setPrimaryHypothesis([a, b], a.id);
  assertTrue(!!setA.find((h) => h.id === a.id)!.isPrimary, "a should be primary");
  assertFalse(!!setA.find((h) => h.id === b.id)!.isPrimary, "b should not be primary");

  const setB = setPrimaryHypothesis(setA, b.id);
  assertFalse(!!setB.find((h) => h.id === a.id)!.isPrimary, "a should no longer be primary");
  assertTrue(!!setB.find((h) => h.id === b.id)!.isPrimary, "b should now be primary");
});

// TC-15: removeHypothesis — removes correct element
test("TC-15 removeHypothesis — removes correct element", () => {
  const a = createEmptyHypothesis(PATTERN_IDS);
  const b = createEmptyHypothesis(PATTERN_IDS);
  const result = removeHypothesis([a, b], a.id);
  assertEqual(result.length, 1);
  assertEqual(result[0].id, b.id);
});

// TC-16: markPatternChanged — sets flag on all, preserves hypothesis content
test("TC-16 markPatternChanged — sets flag, preserves content", () => {
  const h = makeComplete();
  const marked = markPatternChanged([h]);
  assertTrue(marked.length === 1, "Should return a list with one element");
  assertTrue(!!marked[0].patternChangedWarning, "patternChangedWarning must be true");
  assertEqual(marked[0].formulacion, h.formulacion, "formulacion must be preserved");
  assertEqual(marked[0].causa, h.causa, "causa must be preserved");
});

// TC-17: heuristic — vague terms warning fires when formulacion has a vague term AND
// resultadoEsperado is empty (per §11: `hasVague && !h.resultadoEsperado.trim()`).
// VAGUE_TERMS = ["mejorar","fortalecer","optimizar","adecuado","importante","significativo"]
test("TC-17 validateHypothesis — vague terms trigger warning", () => {
  const causaVar = createVariable("Factor A", "causa");
  const h = updateHypothesis(createEmptyHypothesis(PATTERN_IDS), {
    titulo: "Hipótesis con términos vagos",
    // "fortalecer" is in VAGUE_TERMS
    formulacion:
      "Cuando los incentivos son adecuados, entonces se puede fortalecer la gobernanza, " +
      "porque los actores responden a señales de mercado.",
    causa: "Incentivos institucionales inadecuados.",
    mecanismo: "Los actores responden a señales de mercado cuando los incentivos cambian.",
    // resultadoEsperado intentionally left empty to satisfy the warning condition
    variables: [causaVar],
  });
  const result = validateHypothesis(h);
  assertTrue(
    result.warnings.some((w) => /término|vag|contrastable/i.test(w)),
    `Expected vague-term warning, got warnings: [${result.warnings.join("; ")}]`
  );
});

// TC-18: exceedsRecommendedCount threshold
test("TC-18 exceedsRecommendedCount — threshold at MAX_RECOMMENDED", () => {
  const list: PolicyHypothesis[] = Array.from(
    { length: MAX_RECOMMENDED_HYPOTHESES },
    () => createEmptyHypothesis(PATTERN_IDS)
  );
  assertFalse(exceedsRecommendedCount(list), "Exactly MAX should not exceed");
  const one_more = [...list, createEmptyHypothesis(PATTERN_IDS)];
  assertTrue(exceedsRecommendedCount(one_more), "MAX+1 should exceed");
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n── Resultado ───────────────────────────────────`);
console.log(`   Passed : ${passed}`);
console.log(`   Failed : ${failed}`);
console.log(`   Total  : ${passed + failed}\n`);

if (failed > 0) process.exit(1);
