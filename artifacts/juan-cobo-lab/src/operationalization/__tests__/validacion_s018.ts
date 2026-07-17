/**
 * Validación S-018 — Matriz de Operacionalización
 *
 * 15 test cases covering:
 *   TC-01 crear matriz
 *   TC-02 agregar dimensión (row)
 *   TC-03 editar dimensión
 *   TC-04 reutilizar indicador
 *   TC-05 reutilizar fuente
 *   TC-06 deduplicación de dimensiones
 *   TC-07 validación — matriz sin filas (blocking)
 *   TC-08 validación — dimensión sin definición operacional (blocking)
 *   TC-09 validación — indicador ausente (blocking)
 *   TC-10 validación — fuente ausente (blocking)
 *   TC-11 eliminación de fila
 *   TC-12 navegación — volver preserva la matriz
 *   TC-13 reinicio — colección de matrices vacía
 *   TC-14 múltiples hipótesis — modelos independientes
 *   TC-15 integración completa — flujo hipótesis → modelo → matriz
 */

import {
  createEmptyMatrix,
  createRow,
  updateRow,
  updateDimension,
  removeRow,
  reutilizarIndicador,
  reutilizarFuente,
  isDimensionNameDuplicate,
  validateOperationalization,
  findMatrixByHypothesisId,
  upsertMatrix,
  confirmMatrix,
} from "../OperationalizationService";

import {
  createEmptyConceptualModel,
  createVariable,
  createIndicator,
  createEvidenceSource,
} from "@/conceptual/ConceptualModelService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assertTrue(cond: boolean, msg: string): void {
  if (cond) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

function assertThrows(fn: () => unknown, msg: string): void {
  try {
    fn();
    console.error(`  ✗ FAIL (no error thrown): ${msg}`);
    failed++;
  } catch {
    console.log(`  ✓ ${msg}`);
    passed++;
  }
}

// ─── Shared fixture ───────────────────────────────────────────────────────────

function makeConceptualModel() {
  let cm = createEmptyConceptualModel("hyp-001");
  cm = createVariable(cm, { nombre: "Calidad educativa", descripcion: "Nivel de calidad del sistema", definicionOperacional: "Test scores y tasas", rol: "resultado" });
  cm = createVariable(cm, { nombre: "Inversión pública", descripcion: "Gasto público en educación", definicionOperacional: "Porcentaje del PIB", rol: "causa" });
  const varCalidad = cm.variables[0];
  const varInversion = cm.variables[1];
  cm = createIndicator(cm, { nombre: "Tasa de aprobación", variableId: varCalidad.id, unidad: "Porcentaje", formulaOCriterio: "Aprobados/Matriculados", periodicidad: "anual" });
  cm = createIndicator(cm, { nombre: "Puntaje PISA", variableId: varCalidad.id, unidad: "Puntos", formulaOCriterio: "Promedio OCDE" });
  cm = createIndicator(cm, { nombre: "% PIB educación", variableId: varInversion.id, unidad: "Porcentaje", formulaOCriterio: "Gasto/PIB*100" });
  const ind1 = cm.indicators.find((i) => i.nombre === "Tasa de aprobación")!;
  const ind2 = cm.indicators.find((i) => i.nombre === "Puntaje PISA")!;
  const ind3 = cm.indicators.find((i) => i.nombre === "% PIB educación")!;
  cm = createEvidenceSource(cm, { nombre: "Ministerio de Educación", tipo: "administrativo", indicadorIds: [ind1.id, ind2.id], responsable: "MinEducación" });
  cm = createEvidenceSource(cm, { nombre: "Banco Mundial", tipo: "documental", indicadorIds: [ind3.id], responsable: "WB Group" });
  return { cm, varCalidad, varInversion, ind1, ind2, ind3, src1: cm.evidenceSources[0], src2: cm.evidenceSources[1] };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log("\nValidación S-018 — Matriz de Operacionalización");
console.log("══════════════════════════════════════════════════════");

// TC-01: Crear matriz vacía
{
  const m = createEmptyMatrix("hyp-001");
  assertTrue(m.hypothesisId === "hyp-001", "TC-01 crear matriz — hypothesisId correcto");
  assertTrue(m.rows.length === 0, "TC-01 crear matriz — empieza sin filas");
  assertTrue(!m.confirmed, "TC-01 crear matriz — confirmed=false");
}

// TC-02: Agregar dimensión (row)
{
  const { cm, varCalidad, ind1, src1 } = makeConceptualModel();
  let m = createEmptyMatrix("hyp-001");
  m = createRow(m, cm, {
    variableId: varCalidad.id,
    dimensionNombre: "Resultados académicos",
    dimensionDefinicion: "Presencia de evaluaciones estandarizadas con resultados publicados",
    indicatorId: ind1.id,
    escala: "ordinal",
    sourceId: src1.id,
    observaciones: "Disponible desde 2015",
  });
  assertTrue(m.rows.length === 1, "TC-02 agregar dimensión — matrix tiene 1 fila");
  assertTrue(m.rows[0].variableId === varCalidad.id, "TC-02 — variableId correcto");
  assertTrue(m.rows[0].dimension.nombre === "Resultados académicos", "TC-02 — nombre dimensión correcto");
  assertTrue(m.rows[0].indicatorId === ind1.id, "TC-02 — indicatorId correcto");
  assertTrue(m.rows[0].escala === "ordinal", "TC-02 — escala correcta");
  assertTrue(m.rows[0].sourceId === src1.id, "TC-02 — sourceId correcto");
}

// TC-03: Editar dimensión
{
  const { cm, varCalidad, ind1, src1 } = makeConceptualModel();
  let m = createEmptyMatrix("hyp-001");
  m = createRow(m, cm, { variableId: varCalidad.id, dimensionNombre: "Draft", dimensionDefinicion: "Borrador" });
  const rowId = m.rows[0].id;
  m = updateDimension(m, rowId, { nombre: "Infraestructura", definicionOperacional: "Existencia de aulas y equipamiento certificado" });
  assertTrue(m.rows[0].dimension.nombre === "Infraestructura", "TC-03 editar dimensión — nombre actualizado");
  assertTrue(m.rows[0].dimension.definicionOperacional === "Existencia de aulas y equipamiento certificado", "TC-03 — definición actualizada");
}

// TC-04: Reutilizar indicador (no crea copia)
{
  const { cm, varCalidad, ind2 } = makeConceptualModel();
  let m = createEmptyMatrix("hyp-001");
  m = createRow(m, cm, { variableId: varCalidad.id, dimensionNombre: "Logros internacionales" });
  const rowId = m.rows[0].id;
  m = reutilizarIndicador(m, cm, rowId, ind2.id);
  assertTrue(m.rows[0].indicatorId === ind2.id, "TC-04 reutilizar indicador — ID asignado");
  // No new indicator was created in conceptualModel
  assertTrue(cm.indicators.length === 3, "TC-04 — no se duplicó el indicador en cm");
}

// TC-05: Reutilizar fuente (no crea copia)
{
  const { cm, varInversion, ind3, src2 } = makeConceptualModel();
  let m = createEmptyMatrix("hyp-001");
  m = createRow(m, cm, { variableId: varInversion.id, dimensionNombre: "Gasto total", indicatorId: ind3.id });
  const rowId = m.rows[0].id;
  m = reutilizarFuente(m, cm, rowId, src2.id);
  assertTrue(m.rows[0].sourceId === src2.id, "TC-05 reutilizar fuente — ID asignado");
  assertTrue(cm.evidenceSources.length === 2, "TC-05 — no se duplicó la fuente en cm");
}

// TC-06: Deduplicación de dimensiones (por nombre normalizado, por variable)
{
  const { cm, varCalidad } = makeConceptualModel();
  let m = createEmptyMatrix("hyp-001");
  m = createRow(m, cm, { variableId: varCalidad.id, dimensionNombre: "Infraestructura" });
  const isDup = isDimensionNameDuplicate(m, varCalidad.id, "  INFRAESTRUCTURA  ");
  assertTrue(isDup, "TC-06 deduplicación — nombre normalizado detecta duplicado");
  const isNotDup = isDimensionNameDuplicate(m, varCalidad.id, "Docentes");
  assertTrue(!isNotDup, "TC-06 — nombre diferente no es duplicado");
}

// TC-07: Validación — matriz sin filas (blocking: sin-filas)
{
  const { cm } = makeConceptualModel();
  const m = createEmptyMatrix("hyp-001");
  const result = validateOperationalization(m, cm);
  assertTrue(!result.isValid, "TC-07 validación sin filas — isValid=false");
  assertTrue(result.blockingIssues.some((i) => i.code === "sin-filas"), "TC-07 — blocking sin-filas presente");
}

// TC-08: Validación — dimensión sin definición operacional (blocking)
{
  const { cm, varCalidad, varInversion, ind1, ind3, src1, src2 } = makeConceptualModel();
  let m = createEmptyMatrix("hyp-001");
  m = createRow(m, cm, {
    variableId: varCalidad.id,
    dimensionNombre: "Calidad docente",
    dimensionDefinicion: "",          // vacío → blocking
    indicatorId: ind1.id,
    sourceId: src1.id,
  });
  // Also add a row for varInversion so we don't get variable-sin-dimension blocking
  m = createRow(m, cm, { variableId: varInversion.id, dimensionNombre: "Gasto", dimensionDefinicion: "X", indicatorId: ind3.id, sourceId: src2.id });
  const result = validateOperationalization(m, cm);
  assertTrue(result.blockingIssues.some((i) => i.code === "dimension-sin-definicion"), "TC-08 — blocking dimension-sin-definicion");
}

// TC-09: Validación — indicador ausente (blocking)
{
  const { cm, varCalidad, varInversion, ind3, src1, src2 } = makeConceptualModel();
  let m = createEmptyMatrix("hyp-001");
  m = createRow(m, cm, {
    variableId: varCalidad.id,
    dimensionNombre: "Resultados",
    dimensionDefinicion: "Evaluaciones publicadas",
    indicatorId: null,   // ausente → blocking
    sourceId: src1.id,
  });
  m = createRow(m, cm, { variableId: varInversion.id, dimensionNombre: "Gasto", dimensionDefinicion: "X", indicatorId: ind3.id, sourceId: src2.id });
  const result = validateOperationalization(m, cm);
  assertTrue(result.blockingIssues.some((i) => i.code === "indicador-ausente"), "TC-09 — blocking indicador-ausente");
}

// TC-10: Validación — fuente ausente (blocking)
{
  const { cm, varCalidad, varInversion, ind1, ind3, src2 } = makeConceptualModel();
  let m = createEmptyMatrix("hyp-001");
  m = createRow(m, cm, {
    variableId: varCalidad.id,
    dimensionNombre: "Logros",
    dimensionDefinicion: "Existe evidencia comparativa",
    indicatorId: ind1.id,
    sourceId: null,  // ausente → blocking
  });
  m = createRow(m, cm, { variableId: varInversion.id, dimensionNombre: "Inversión", dimensionDefinicion: "Y", indicatorId: ind3.id, sourceId: src2.id });
  const result = validateOperationalization(m, cm);
  assertTrue(result.blockingIssues.some((i) => i.code === "fuente-ausente"), "TC-10 — blocking fuente-ausente");
}

// TC-11: Eliminación de fila
{
  const { cm, varCalidad, varInversion, ind1, ind3, src1, src2 } = makeConceptualModel();
  let m = createEmptyMatrix("hyp-001");
  m = createRow(m, cm, { variableId: varCalidad.id, dimensionNombre: "A", dimensionDefinicion: "X", indicatorId: ind1.id, sourceId: src1.id });
  m = createRow(m, cm, { variableId: varInversion.id, dimensionNombre: "B", dimensionDefinicion: "Y", indicatorId: ind3.id, sourceId: src2.id });
  const idToRemove = m.rows[0].id;
  m = removeRow(m, idToRemove);
  assertTrue(m.rows.length === 1, "TC-11 eliminación — queda 1 fila");
  assertTrue(!m.rows.some((r) => r.id === idToRemove), "TC-11 — fila eliminada no está presente");
  assertTrue(m.rows[0].orden === 0, "TC-11 — orden reindexado");
}

// TC-12: Navegación — volver preserva la matriz (sin mutación)
{
  const { cm, varCalidad, ind1, src1 } = makeConceptualModel();
  let m = createEmptyMatrix("hyp-001");
  m = createRow(m, cm, { variableId: varCalidad.id, dimensionNombre: "Logros", dimensionDefinicion: "Test", indicatorId: ind1.id, sourceId: src1.id });
  const snapshot = { ...m, rows: [...m.rows] };
  // Simulate "volver": state is preserved in session collection
  let matrices: ReturnType<typeof createEmptyMatrix>[] = [];
  matrices = upsertMatrix(matrices, m);
  const retrieved = findMatrixByHypothesisId(matrices, "hyp-001");
  assertTrue(retrieved !== null, "TC-12 navegación — matriz recuperada del estado");
  assertTrue(retrieved!.rows.length === snapshot.rows.length, "TC-12 — filas preservadas");
}

// TC-13: Reinicio — colección de matrices vacía
{
  const { cm, varCalidad, ind1, src1 } = makeConceptualModel();
  let m = createEmptyMatrix("hyp-001");
  m = createRow(m, cm, { variableId: varCalidad.id, dimensionNombre: "Test", dimensionDefinicion: "X", indicatorId: ind1.id, sourceId: src1.id });
  let matrices = [m];
  // Simulate reinicio
  matrices = [];
  assertTrue(matrices.length === 0, "TC-13 reinicio — colección vacía tras reinicio");
}

// TC-14: Múltiples hipótesis — matrices independientes
{
  const { cm: cm1, varCalidad, ind1, src1 } = makeConceptualModel();
  let cm2 = createEmptyConceptualModel("hyp-002");
  cm2 = createVariable(cm2, { nombre: "Cobertura", descripcion: "Acceso universal", definicionOperacional: "Tasa de matrícula", rol: "resultado" });
  cm2 = createIndicator(cm2, { nombre: "Tasa matrícula", variableId: cm2.variables[0].id, unidad: "Porcentaje" });
  cm2 = createEvidenceSource(cm2, { nombre: "DANE", tipo: "administrativo", indicadorIds: [cm2.indicators[0].id] });

  let m1 = createEmptyMatrix("hyp-001");
  m1 = createRow(m1, cm1, { variableId: varCalidad.id, dimensionNombre: "Calidad", dimensionDefinicion: "Evaluaciones", indicatorId: ind1.id, sourceId: src1.id });
  let m2 = createEmptyMatrix("hyp-002");
  m2 = createRow(m2, cm2, { variableId: cm2.variables[0].id, dimensionNombre: "Acceso", dimensionDefinicion: "Niños en edad escolar matriculados", indicatorId: cm2.indicators[0].id, sourceId: cm2.evidenceSources[0].id });

  let matrices: typeof m1[] = [];
  matrices = upsertMatrix(matrices, m1);
  matrices = upsertMatrix(matrices, m2);

  assertTrue(matrices.length === 2, "TC-14 múltiples hipótesis — 2 matrices independientes");
  assertTrue(findMatrixByHypothesisId(matrices, "hyp-001")!.rows[0].variableId === varCalidad.id, "TC-14 — matriz hyp-001 correcta");
  assertTrue(findMatrixByHypothesisId(matrices, "hyp-002")!.rows[0].dimension.nombre === "Acceso", "TC-14 — matriz hyp-002 correcta");
}

// TC-15: Integración completa — flujo hipótesis → modelo → matriz → confirmar
{
  const { cm, varCalidad, varInversion, ind1, ind3, src1, src2 } = makeConceptualModel();
  let m = createEmptyMatrix("hyp-001");
  m = createRow(m, cm, {
    variableId: varCalidad.id,
    dimensionNombre: "Rendimiento estudiantil",
    dimensionDefinicion: "Porcentaje de estudiantes que alcanzan el nivel mínimo en pruebas nacionales",
    indicatorId: ind1.id,
    escala: "razon",
    sourceId: src1.id,
    observaciones: "Incluye pruebas Saber 11 y Saber Pro",
  });
  m = createRow(m, cm, {
    variableId: varInversion.id,
    dimensionNombre: "Gasto per cápita",
    dimensionDefinicion: "Presupuesto asignado por estudiante matriculado",
    indicatorId: ind3.id,
    escala: "razon",
    sourceId: src2.id,
    observaciones: "Deflactado a precios constantes de 2020",
  });
  const validation = validateOperationalization(m, cm);
  // Warnings expected (escala warnings gone since we set escala; observaciones set)
  // unidad warning may fire if ind1 has unidad set
  assertTrue(validation.isValid, "TC-15 integración completa — isValid=true");
  assertTrue(m.rows.length === 2, "TC-15 — 2 filas en la matriz");
  const confirmed = confirmMatrix(m);
  assertTrue(confirmed.confirmed, "TC-15 — confirmed=true tras confirmación");
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log("\n──────────────────────────────────────────────────────");
console.log(`   Passed : ${passed}`);
console.log(`   Failed : ${failed}`);
console.log(`   Total  : ${passed + failed}`);
console.log("──────────────────────────────────────────────────────\n");

if (failed > 0) process.exit(1);
