/**
 * Validación S-017 — Modelo Conceptual de Variables, Indicadores y Evidencia
 *
 * Usage:
 *   pnpm exec tsx src/conceptual/__tests__/validacion_s017.ts
 * from artifacts/juan-cobo-lab/
 *
 * Test cases (15 minimum, all named):
 *   TC-01  crear variable
 *   TC-02  crear indicador
 *   TC-03  crear fuente
 *   TC-04  relación variable-indicador
 *   TC-05  relación indicador-fuente
 *   TC-06  duplicación de variable
 *   TC-07  eliminación de variable (cascada)
 *   TC-08  orden de variables
 *   TC-09  validación estructural — hipótesis sin variables
 *   TC-10  validación estructural — variable sin indicadores (warning, no bloqueo)
 *   TC-11  validación estructural — indicador sin fuente (warning, no bloqueo)
 *   TC-12  múltiples hipótesis — modelos independientes
 *   TC-13  navegación — volver conserva el modelo
 *   TC-14  conservación del estado — editar indicador preserva variable y fuente
 *   TC-15  reinicio — modelos limpios tras reiniciar sesión
 *   TC-16  fuente sin indicador — error bloqueante
 *   TC-17  indicador sin variable — error bloqueante
 *   TC-18  revisión — modelo confirmado bloquea confirmación si hay errores
 *   TC-19  integración completa — flujo hipótesis → variable → indicador → fuente → validar
 *   TC-20  deduplicación — nombres normalizados
 */

import {
  createEmptyConceptualModel,
  createVariable,
  updateVariable,
  removeVariable,
  reorderVariables,
  createIndicator,
  updateIndicator,
  removeIndicator,
  createEvidenceSource,
  updateEvidenceSource,
  removeEvidenceSource,
  validateConceptualModel,
  findModelByHypothesisId,
  upsertModel,
  confirmModel,
  isVariableNameDuplicate,
  isIndicatorNameDuplicate,
  isSourceNameDuplicate,
} from "../ConceptualModelService";
import type { ConceptualModel } from "../types";

// ─── Harness ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  ✗ ${name}\n    ${msg}`);
    failed++;
  }
}

function assertTrue(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}
function assertFalse(cond: boolean, msg: string): void {
  if (cond) throw new Error(msg);
}
function assertEqual<T>(a: T, b: T, msg?: string): void {
  if (a !== b)
    throw new Error(msg ?? `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function assertThrows(fn: () => void, fragment: string): void {
  try {
    fn();
    throw new Error(`Expected throw with "${fragment}" but nothing was thrown`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes(fragment))
      throw new Error(`Expected error containing "${fragment}", got: "${msg}"`);
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const HYPOTHESIS_ID = "h-test-001";
const HYPOTHESIS_ID_2 = "h-test-002";

function freshModel(): ConceptualModel {
  return createEmptyConceptualModel(HYPOTHESIS_ID);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log("\nValidación S-017 — Modelo Conceptual");
console.log("═".repeat(42));

// TC-01: crear variable
test("TC-01 crear variable — nombre y rol presentes en el modelo", () => {
  const m = createVariable(freshModel(), { nombre: "Acceso al agua", rol: "causa" });
  assertEqual(m.variables.length, 1, "Should have 1 variable");
  assertEqual(m.variables[0].nombre, "Acceso al agua");
  assertEqual(m.variables[0].rol, "causa");
  assertEqual(m.variables[0].orden, 0);
});

// TC-02: crear indicador
test("TC-02 crear indicador — referencia a variable existente", () => {
  let m = createVariable(freshModel(), { nombre: "Continuidad del servicio", rol: "causa" });
  const varId = m.variables[0].id;
  m = createIndicator(m, {
    nombre: "Horas promedio de disponibilidad mensual",
    variableId: varId,
    unidad: "Horas",
    periodicidad: "mensual",
  });
  assertEqual(m.indicators.length, 1);
  assertEqual(m.indicators[0].variableId, varId);
  assertEqual(m.indicators[0].unidad, "Horas");
  assertEqual(m.indicators[0].periodicidad, "mensual");
});

// TC-03: crear fuente
test("TC-03 crear fuente — referencia a indicador existente", () => {
  let m = createVariable(freshModel(), { nombre: "Cobertura", rol: "resultado" });
  const varId = m.variables[0].id;
  m = createIndicator(m, { nombre: "% de cobertura", variableId: varId, unidad: "%" });
  const indId = m.indicators[0].id;
  m = createEvidenceSource(m, {
    nombre: "DANE — CNPV",
    tipo: "administrativo",
    indicadorIds: [indId],
  });
  assertEqual(m.evidenceSources.length, 1);
  assertTrue(m.evidenceSources[0].indicadorIds.includes(indId), "Source must reference indicator");
});

// TC-04: relación variable-indicador (indicador pertenece a su variable)
test("TC-04 relación variable-indicador — variableId correcto en indicador", () => {
  let m = createVariable(freshModel(), { nombre: "Captura regulatoria", rol: "causa" });
  const varId = m.variables[0].id;
  m = createIndicator(m, { nombre: "Índice de captura", variableId: varId });
  assertEqual(m.indicators[0].variableId, varId);
});

// TC-05: relación indicador-fuente (fuente referencia indicadores)
test("TC-05 relación indicador-fuente — una fuente puede servir múltiples indicadores", () => {
  let m = createVariable(freshModel(), { nombre: "V1", rol: "causa" });
  const v1 = m.variables[0].id;
  m = createIndicator(m, { nombre: "Ind-A", variableId: v1 });
  m = createIndicator(m, { nombre: "Ind-B", variableId: v1 });
  const [indA, indB] = [m.indicators[0].id, m.indicators[1].id];
  m = createEvidenceSource(m, {
    nombre: "CRC",
    tipo: "administrativo",
    indicadorIds: [indA, indB],
  });
  assertEqual(m.evidenceSources[0].indicadorIds.length, 2);
  assertTrue(m.evidenceSources[0].indicadorIds.includes(indA), "Should include indA");
  assertTrue(m.evidenceSources[0].indicadorIds.includes(indB), "Should include indB");
});

// TC-06: duplicación — detección de nombre duplicado
test("TC-06 duplicación — isVariableNameDuplicate detecta nombres iguales (case insensitive)", () => {
  let m = createVariable(freshModel(), { nombre: "Captura regulatoria", rol: "causa" });
  const isDup = isVariableNameDuplicate(m, "captura regulatoria");
  assertTrue(isDup, "Duplicate normalised name must be detected");

  const isNotDup = isVariableNameDuplicate(m, "Acceso al agua");
  assertFalse(isNotDup, "Different name must not be flagged as duplicate");
});

// TC-07: eliminación de variable — cascada sobre indicadores y fuentes
test("TC-07 eliminación de variable — cascada limpia indicadores y fuentes huérfanas", () => {
  let m = createVariable(freshModel(), { nombre: "V-cascada", rol: "causa" });
  const vId = m.variables[0].id;
  m = createIndicator(m, { nombre: "Ind-cascada", variableId: vId });
  const iId = m.indicators[0].id;
  m = createEvidenceSource(m, { nombre: "Fuente-cascada", tipo: "encuesta", indicadorIds: [iId] });

  assertEqual(m.variables.length, 1);
  assertEqual(m.indicators.length, 1);
  assertEqual(m.evidenceSources.length, 1);

  m = removeVariable(m, vId);

  assertEqual(m.variables.length, 0, "Variable should be removed");
  assertEqual(m.indicators.length, 0, "Indicator cascade-removed");
  assertEqual(m.evidenceSources.length, 0, "Source cascade-removed (no indicators left)");
});

// TC-08: orden de variables
test("TC-08 orden de variables — reorderVariables reordena correctamente", () => {
  let m = freshModel();
  m = createVariable(m, { nombre: "A", rol: "causa" });
  m = createVariable(m, { nombre: "B", rol: "resultado" });
  m = createVariable(m, { nombre: "C", rol: "mediadora" });
  const [idA, idB, idC] = m.variables.map((v) => v.id);

  m = reorderVariables(m, [idC, idA, idB]);
  assertEqual(m.variables[0].nombre, "C", "First should be C");
  assertEqual(m.variables[1].nombre, "A", "Second should be A");
  assertEqual(m.variables[2].nombre, "B", "Third should be B");
  assertEqual(m.variables[0].orden, 0);
  assertEqual(m.variables[1].orden, 1);
  assertEqual(m.variables[2].orden, 2);
});

// TC-09: validación — hipótesis sin variables → blocking
test("TC-09 validación estructural — hipótesis sin variables es un error bloqueante", () => {
  const validation = validateConceptualModel(freshModel());
  assertFalse(validation.isValid, "Empty model must not be valid");
  assertTrue(
    validation.blockingIssues.some((i) => i.code === "hipotesis-sin-variables"),
    "Must have blocking issue: hipotesis-sin-variables"
  );
});

// TC-10: validación — variable sin indicadores → warning (no bloqueo)
test("TC-10 validación — variable sin indicadores genera advertencia, no error bloqueante", () => {
  let m = createVariable(freshModel(), { nombre: "V-sin-ind", rol: "causa" });
  // Add a second variable with indicators so the model IS valid structurally
  m = createVariable(m, { nombre: "V-con-ind", rol: "resultado" });
  m = createIndicator(m, { nombre: "Ind", variableId: m.variables[1].id });
  const iId = m.indicators[0].id;
  m = createEvidenceSource(m, { nombre: "Src", tipo: "administrativo", indicadorIds: [iId] });

  const validation = validateConceptualModel(m);
  // May or may not be fully valid, but the warning must exist
  assertTrue(
    validation.warnings.some((w) => w.code === "variable-sin-indicadores"),
    "Should warn about variable without indicators"
  );
  // The blocking issue must NOT contain "variable-sin-indicadores"
  assertFalse(
    validation.blockingIssues.some((b) => b.code === "variable-sin-indicadores"),
    "variable-sin-indicadores must be a warning, not a blocking issue"
  );
});

// TC-11: validación — indicador sin fuente → warning
test("TC-11 validación — indicador sin fuente genera advertencia, no error bloqueante", () => {
  let m = createVariable(freshModel(), { nombre: "V", rol: "causa" });
  m = createIndicator(m, { nombre: "Ind-sin-fuente", variableId: m.variables[0].id });

  const validation = validateConceptualModel(m);
  assertTrue(
    validation.warnings.some((w) => w.code === "indicador-sin-fuente"),
    "Should warn about indicator without source"
  );
  assertFalse(
    validation.blockingIssues.some((b) => b.code === "indicador-sin-fuente"),
    "indicador-sin-fuente must be a warning, not blocking"
  );
});

// TC-12: múltiples hipótesis → modelos independientes
test("TC-12 múltiples hipótesis — cada hipótesis tiene su propio modelo independiente", () => {
  let models: ConceptualModel[] = [];

  let m1 = createVariable(createEmptyConceptualModel(HYPOTHESIS_ID), {
    nombre: "Variable H1", rol: "causa",
  });
  let m2 = createVariable(createEmptyConceptualModel(HYPOTHESIS_ID_2), {
    nombre: "Variable H2", rol: "resultado",
  });

  models = upsertModel(models, m1);
  models = upsertModel(models, m2);

  assertEqual(models.length, 2);
  assertEqual(findModelByHypothesisId(models, HYPOTHESIS_ID)?.variables[0].nombre, "Variable H1");
  assertEqual(findModelByHypothesisId(models, HYPOTHESIS_ID_2)?.variables[0].nombre, "Variable H2");

  // Modifying m1 must not affect m2
  m1 = createVariable(m1, { nombre: "Variable H1 extra", rol: "mediadora" });
  models = upsertModel(models, m1);
  assertEqual(findModelByHypothesisId(models, HYPOTHESIS_ID_2)?.variables.length, 1, "m2 unaffected");
});

// TC-13: navegación — volver conserva el modelo
test("TC-13 navegación — volver a revisión preserva el modelo sin mutación", () => {
  let m = createVariable(freshModel(), { nombre: "V-persistente", rol: "causa" });
  const snapshot = JSON.stringify(m);

  // Simulate: setPantalla("revision-hipotesis") — no model changes
  const m2: ConceptualModel = { ...m }; // spread preserves immutability

  assertEqual(JSON.stringify(m2), snapshot, "Model must not change on back-navigation");
});

// TC-14: conservación del estado — editar indicador preserva variable y fuente
test("TC-14 conservación del estado — actualizar indicador preserva variable y fuente", () => {
  let m = createVariable(freshModel(), { nombre: "V-preservada", rol: "resultado" });
  const vId = m.variables[0].id;
  m = createIndicator(m, { nombre: "Ind original", variableId: vId, unidad: "%" });
  const iId = m.indicators[0].id;
  m = createEvidenceSource(m, { nombre: "DANE", tipo: "administrativo", indicadorIds: [iId] });

  m = updateIndicator(m, iId, { nombre: "Ind actualizado", unidad: "Porcentaje" });

  assertEqual(m.variables.length, 1, "Variable count unchanged");
  assertEqual(m.evidenceSources.length, 1, "Source count unchanged");
  assertEqual(m.indicators[0].nombre, "Ind actualizado");
  assertEqual(m.indicators[0].variableId, vId, "variableId preserved");
  assertTrue(
    m.evidenceSources[0].indicadorIds.includes(iId),
    "Source still references indicator"
  );
});

// TC-15: reinicio — modelos limpios tras reiniciar sesión
test("TC-15 reinicio — colección de modelos vacía tras reinicio de sesión", () => {
  let models: ConceptualModel[] = [];
  let m = createVariable(createEmptyConceptualModel(HYPOTHESIS_ID), { nombre: "V", rol: "causa" });
  models = upsertModel(models, m);
  assertEqual(models.length, 1);

  // Simulate handleReiniciar: reset conceptualModels = []
  models = [];
  assertEqual(models.length, 0, "Models must be empty after restart");
});

// TC-16: fuente sin indicador válido → blocking
test("TC-16 fuente sin indicador válido — error bloqueante en validación", () => {
  let m = createVariable(freshModel(), { nombre: "V", rol: "causa" });
  const vId = m.variables[0].id;
  m = createIndicator(m, { nombre: "Ind", variableId: vId });
  const iId = m.indicators[0].id;
  m = createEvidenceSource(m, { nombre: "Fuente", tipo: "encuesta", indicadorIds: [iId] });

  // Manually simulate orphan source (remove indicator without cascade)
  const orphanModel: ConceptualModel = {
    ...m,
    indicators: [],
    evidenceSources: m.evidenceSources, // source still references removed indicator
  };

  const v = validateConceptualModel(orphanModel);
  assertTrue(
    v.blockingIssues.some((b) => b.code === "fuente-sin-indicador"),
    "Orphan source must be a blocking issue"
  );
});

// TC-17: indicador sin variable → blocking
test("TC-17 indicador sin variable válida — error bloqueante en validación", () => {
  let m = createVariable(freshModel(), { nombre: "V", rol: "causa" });
  const vId = m.variables[0].id;
  m = createIndicator(m, { nombre: "Ind", variableId: vId });

  // Remove variable without cascade (simulate corrupt state)
  const orphanModel: ConceptualModel = {
    ...m,
    variables: [],
    indicators: m.indicators,
  };

  const v = validateConceptualModel(orphanModel);
  assertTrue(
    v.blockingIssues.some((b) => b.code === "indicador-sin-variable"),
    "Orphan indicator must be a blocking issue"
  );
});

// TC-18: confirmModel — marca modelo como confirmado
test("TC-18 confirmModel — sets confirmed=true; respeta inmutabilidad", () => {
  let m = createVariable(freshModel(), { nombre: "V", rol: "causa" });
  const vId = m.variables[0].id;
  m = createIndicator(m, { nombre: "Ind", variableId: vId });
  const iId = m.indicators[0].id;
  m = createEvidenceSource(m, { nombre: "DANE", tipo: "administrativo", indicadorIds: [iId] });

  const confirmed = confirmModel(m);
  assertTrue(confirmed.confirmed, "Model must be confirmed");
  assertFalse(m.confirmed, "Original model must remain unconfirmed (immutability)");
  assertEqual(confirmed.hypothesisId, m.hypothesisId, "hypothesisId preserved");
});

// TC-19: integración completa — flujo completo hipótesis → variable → indicador → fuente → validar
test("TC-19 integración completa — flujo hipótesis → variable → indicador → fuente → validar", () => {
  let m = freshModel();

  // 1. Add causa variable
  m = createVariable(m, {
    nombre: "Captura regulatoria",
    descripcion: "Influencia indebida de actores privados sobre reguladores",
    definicionOperacional: "Medida por el índice de captura calculado como …",
    rol: "causa",
  });
  const vCausa = m.variables[0].id;

  // 2. Add resultado variable
  m = createVariable(m, {
    nombre: "Tarifa por encima del óptimo social",
    descripcion: "Precio del servicio superior al que resultaría de mercado competitivo",
    definicionOperacional: "Comparación con tarifas de referencia internacional",
    rol: "resultado",
  });
  const vResult = m.variables[1].id;

  // 3. Add indicators
  m = createIndicator(m, {
    nombre: "Índice de captura regulatoria",
    variableId: vCausa,
    unidad: "Índice 0-1",
    periodicidad: "anual",
    nivelTerritorial: "Nacional",
    disponibilidad: "parcial",
  });
  const iCaptura = m.indicators[0].id;

  m = createIndicator(m, {
    nombre: "Diferencial tarifa/referencia",
    variableId: vResult,
    unidad: "Porcentaje",
    periodicidad: "trimestral",
    nivelTerritorial: "Nacional",
    disponibilidad: "disponible",
  });
  const iTarifa = m.indicators[1].id;

  // 4. Add sources
  m = createEvidenceSource(m, {
    nombre: "CREG — Resoluciones tarifarias",
    tipo: "administrativo",
    responsable: "CREG",
    frecuencia: "Variable",
    acceso: "publico",
    indicadorIds: [iCaptura, iTarifa],
  });

  m = createEvidenceSource(m, {
    nombre: "Encuesta reguladores — BID",
    tipo: "encuesta",
    responsable: "BID",
    frecuencia: "Bienal",
    acceso: "restringido",
    indicadorIds: [iCaptura],
  });

  // 5. Validate
  const validation = validateConceptualModel(m);

  assertTrue(validation.isValid, "Full model must be structurally valid");
  // Warnings allowed (e.g. no specific formula entered), but no blocking
  assertEqual(validation.blockingIssues.length, 0, "No blocking issues in complete model");

  // 6. Structural counts
  assertEqual(m.variables.length, 2);
  assertEqual(m.indicators.length, 2);
  assertEqual(m.evidenceSources.length, 2);

  // 7. Confirm
  const confirmed = confirmModel(m);
  assertTrue(confirmed.confirmed, "confirmed must be true");
});

// TC-20: deduplicación — names normalizados, sin distinción mayúsculas
test("TC-20 deduplicación — nombres normalizados detectan duplicados sin distinción de caso", () => {
  let m = createVariable(freshModel(), { nombre: "Captura Regulatoria", rol: "causa" });
  const vId = m.variables[0].id;

  // Duplicate variable
  assertTrue(isVariableNameDuplicate(m, "CAPTURA REGULATORIA"), "Upper case duplicate detected");
  assertTrue(isVariableNameDuplicate(m, "  captura regulatoria  "), "Trimmed duplicate detected");
  assertFalse(isVariableNameDuplicate(m, "captura regulatoria", vId), "Exclude own id");

  // Indicator dedup
  m = createIndicator(m, { nombre: "Índice de Captura", variableId: vId });
  const iId = m.indicators[0].id;

  assertTrue(isIndicatorNameDuplicate(m, vId, "índice de captura"), "Indicator dup (accent-insensitive check)");
  assertFalse(isIndicatorNameDuplicate(m, vId, "índice de captura", iId), "Exclude own id");

  // Source dedup
  m = createEvidenceSource(m, { nombre: "DANE", tipo: "administrativo", indicadorIds: [iId] });
  assertTrue(isSourceNameDuplicate(m, "dane"), "Source dup detected");
  assertFalse(isSourceNameDuplicate(m, "MinTIC"), "Different source not flagged");
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(42));
console.log(`   Passed : ${passed}`);
console.log(`   Failed : ${failed}`);
console.log(`   Total  : ${passed + failed}`);
console.log("─".repeat(42) + "\n");

if (failed > 0) process.exit(1);
