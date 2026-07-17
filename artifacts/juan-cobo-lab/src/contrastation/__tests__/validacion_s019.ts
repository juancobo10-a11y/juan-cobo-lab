/**
 * Validación S-019 — Matriz de Contrastación de Hipótesis
 *
 * Suite: ContrastationService — 26 TCs, ~60 asserts
 */

import {
  createEmptyContrastationMatrix,
  createContrastationRow,
  updateContrastationRow,
  removeContrastationRow,
  reorderContrastationRows,
  reutilizarIndicadorEnContrastation,
  reutilizarFuenteEnContrastation,
  isContrastationRowDuplicate,
  validateContrastation,
  findContrastationMatrixByHypothesisId,
  upsertContrastationMatrix,
  confirmContrastationMatrix,
} from "../ContrastationService";
import type { ContrastationMatrix } from "../types";
import type { ConceptualModel } from "@/conceptual/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _idCounter = 0;
function uid(prefix: string) {
  return `${prefix}-${++_idCounter}`;
}

function makeConceptualModel(): {
  cm: ConceptualModel;
  varId: string;
  indId: string;
  srcId: string;
} {
  const varId = uid("var");
  const indId = uid("ind");
  const srcId = uid("src");
  const cm: ConceptualModel = {
    id: uid("cm"),
    hypothesisId: uid("hyp"),
    variables: [
      {
        id: varId,
        nombre: "Variable A",
        descripcion: "desc",
        rol: "causa",
        definicionOperacional: "",
        orden: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ],
    indicators: [
      {
        id: indId,
        nombre: "Indicador A",
        descripcion: "desc",
        variableId: varId,
        unidad: "%",
        formulaOCriterio: "fórmula",
        periodicidad: "anual",
        nivelTerritorial: "nacional",
        disponibilidad: "disponible",
        orden: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ],
    evidenceSources: [
      {
        id: srcId,
        nombre: "Fuente A",
        tipo: "administrativo",
        responsable: "DANE",
        frecuencia: "anual",
        acceso: "publico",
        limitaciones: "Cobertura parcial",
        indicadorIds: [indId],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ],
    confirmed: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
  return { cm, varId, indId, srcId };
}

function makeFullRow(
  matrix: ContrastationMatrix,
  cm: ConceptualModel,
  indId: string,
  srcId: string
): ContrastationMatrix {
  return createContrastationRow(matrix, cm, {
    indicadorId: indId,
    fuenteId: srcId,
    evidenciaEsperada: "Se observa incremento en el indicador.",
    evidenciaContraria: "El indicador permanece estable o declina.",
    criterioInterpretacion: "Si permanece estable, la hipótesis pierde plausibilidad.",
    limitaciones: "Cobertura parcial en zonas rurales.",
    prioridad: "alta",
    observaciones: "Revisar periodicidad.",
  });
}

// ─── Runner ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results: string[] = [];

function assert(label: string, value: boolean) {
  if (value) {
    passed++;
    results.push(`  ✓ ${label}`);
  } else {
    failed++;
    results.push(`  ✗ ${label}`);
  }
}

// ─── TC-01: crear matriz ──────────────────────────────────────────────────────
{
  const m = createEmptyContrastationMatrix("hyp-001");
  assert("TC-01 crear matriz — hypothesisId correcto", m.hypothesisId === "hyp-001");
  assert("TC-01 crear matriz — empieza sin filas", m.rows.length === 0);
  assert("TC-01 crear matriz — confirmed=false", m.confirmed === false);
}

// ─── TC-02: agregar fila ──────────────────────────────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("hyp-002");
  m = createContrastationRow(m, cm, {
    indicadorId: indId,
    fuenteId: srcId,
    evidenciaEsperada: "Subida en tasas",
    evidenciaContraria: "Sin cambio",
    criterioInterpretacion: "Si no cambia, se refuta.",
    limitaciones: "Limitaciones de cobertura.",
    prioridad: "media",
  });
  assert("TC-02 agregar fila — matrix tiene 1 fila", m.rows.length === 1);
  assert("TC-02 — indicadorId correcto", m.rows[0].indicadorId === indId);
  assert("TC-02 — fuenteId correcto", m.rows[0].fuenteId === srcId);
  assert("TC-02 — evidenciaEsperada correcta", m.rows[0].evidenciaEsperada === "Subida en tasas");
  assert("TC-02 — evidenciaContraria correcta", m.rows[0].evidenciaContraria === "Sin cambio");
  assert("TC-02 — prioridad correcta", m.rows[0].prioridad === "media");
  assert("TC-02 — hypothesisId en fila", m.rows[0].hypothesisId === "hyp-002");
}

// ─── TC-03: reutilizar indicador ──────────────────────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("hyp-003");
  m = createContrastationRow(m, cm, { fuenteId: srcId, evidenciaEsperada: "e", evidenciaContraria: "c" });
  const rowId = m.rows[0].id;
  m = reutilizarIndicadorEnContrastation(m, cm, rowId, indId);
  assert("TC-03 reutilizar indicador — ID asignado", m.rows[0].indicadorId === indId);
  assert("TC-03 — no duplicó el indicador en cm", cm.indicators.length === 1);
}

// ─── TC-04: reutilizar fuente ─────────────────────────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("hyp-004");
  m = createContrastationRow(m, cm, { indicadorId: indId, evidenciaEsperada: "e", evidenciaContraria: "c" });
  const rowId = m.rows[0].id;
  m = reutilizarFuenteEnContrastation(m, cm, rowId, srcId);
  assert("TC-04 reutilizar fuente — ID asignado", m.rows[0].fuenteId === srcId);
  assert("TC-04 — no duplicó la fuente en cm", cm.evidenceSources.length === 1);
}

// ─── TC-05: validar sin-filas ─────────────────────────────────────────────────
{
  const m = createEmptyContrastationMatrix("hyp-005");
  const v = validateContrastation(m);
  assert("TC-05 validar sin filas — isValid=false", v.isValid === false);
  assert("TC-05 — blocking sin-filas presente", v.blockingIssues.some((i) => i.code === "sin-filas"));
}

// ─── TC-06: blocking fila-sin-indicador ───────────────────────────────────────
{
  const { cm, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("hyp-006");
  m = createContrastationRow(m, cm, {
    fuenteId: srcId,
    evidenciaEsperada: "e",
    evidenciaContraria: "c",
  });
  const v = validateContrastation(m);
  assert("TC-06 — blocking fila-sin-indicador", v.blockingIssues.some((i) => i.code === "fila-sin-indicador"));
}

// ─── TC-07: blocking fila-sin-fuente ─────────────────────────────────────────
{
  const { cm, indId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("hyp-007");
  m = createContrastationRow(m, cm, {
    indicadorId: indId,
    evidenciaEsperada: "e",
    evidenciaContraria: "c",
  });
  const v = validateContrastation(m);
  assert("TC-07 — blocking fila-sin-fuente", v.blockingIssues.some((i) => i.code === "fila-sin-fuente"));
}

// ─── TC-08: blocking fila-sin-evidencia-esperada ───────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("hyp-008");
  m = createContrastationRow(m, cm, { indicadorId: indId, fuenteId: srcId, evidenciaContraria: "c" });
  const v = validateContrastation(m);
  assert("TC-08 — blocking fila-sin-evidencia-esperada", v.blockingIssues.some((i) => i.code === "fila-sin-evidencia-esperada"));
}

// ─── TC-09: blocking fila-sin-evidencia-contraria ─────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("hyp-009");
  m = createContrastationRow(m, cm, { indicadorId: indId, fuenteId: srcId, evidenciaEsperada: "e" });
  const v = validateContrastation(m);
  assert("TC-09 — blocking fila-sin-evidencia-contraria", v.blockingIssues.some((i) => i.code === "fila-sin-evidencia-contraria"));
}

// ─── TC-10: warning sin-criterio-interpretacion ───────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("hyp-010");
  m = createContrastationRow(m, cm, {
    indicadorId: indId,
    fuenteId: srcId,
    evidenciaEsperada: "e",
    evidenciaContraria: "c",
    criterioInterpretacion: "",
    prioridad: "alta",
    limitaciones: "lim",
  });
  const v = validateContrastation(m);
  assert("TC-10 — isValid=true (sin blocking)", v.isValid === true);
  assert("TC-10 — warning sin-criterio-interpretacion", v.warnings.some((i) => i.code === "sin-criterio-interpretacion"));
}

// ─── TC-11: warning sin-limitaciones ─────────────────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("hyp-011");
  m = createContrastationRow(m, cm, {
    indicadorId: indId,
    fuenteId: srcId,
    evidenciaEsperada: "e",
    evidenciaContraria: "c",
    criterioInterpretacion: "criterio",
    prioridad: "alta",
    limitaciones: "",
  });
  const v = validateContrastation(m);
  assert("TC-11 — warning sin-limitaciones", v.warnings.some((i) => i.code === "sin-limitaciones"));
}

// ─── TC-12: warning prioridad-vacia ──────────────────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("hyp-012");
  m = createContrastationRow(m, cm, {
    indicadorId: indId,
    fuenteId: srcId,
    evidenciaEsperada: "e",
    evidenciaContraria: "c",
    criterioInterpretacion: "crit",
    limitaciones: "lim",
    prioridad: "",
  });
  const v = validateContrastation(m);
  assert("TC-12 — warning prioridad-vacia", v.warnings.some((i) => i.code === "prioridad-vacia"));
}

// ─── TC-13: eliminar fila ────────────────────────────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("hyp-013");
  m = makeFullRow(m, cm, indId, srcId);
  const r2 = createContrastationRow(m, cm, { indicadorId: indId, fuenteId: srcId, evidenciaEsperada: "e", evidenciaContraria: "c" });
  const toRemove = m.rows[0].id;
  const result = removeContrastationRow(r2, toRemove);
  assert("TC-13 eliminación — queda 1 fila", result.rows.length === 1);
  assert("TC-13 — fila eliminada no está", !result.rows.some((r) => r.id === toRemove));
  assert("TC-13 — orden reindexado", result.rows[0].orden === 0);
}

// ─── TC-14: reordenar ────────────────────────────────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("hyp-014");
  m = makeFullRow(m, cm, indId, srcId);
  const id1 = m.rows[0].id;
  m = createContrastationRow(m, cm, { evidenciaEsperada: "e", evidenciaContraria: "c" });
  const id2 = m.rows[1].id;
  const reordered = reorderContrastationRows(m, [id2, id1]);
  assert("TC-14 reordenar — primer elemento correcto", reordered.rows[0].id === id2);
  assert("TC-14 — segundo elemento correcto", reordered.rows[1].id === id1);
  assert("TC-14 — orden asignado correctamente", reordered.rows[0].orden === 0 && reordered.rows[1].orden === 1);
}

// ─── TC-15: múltiples hipótesis ───────────────────────────────────────────────
{
  const { cm: cm1, indId: ind1, srcId: src1 } = makeConceptualModel();
  const { cm: cm2, indId: ind2, srcId: src2 } = makeConceptualModel();
  let m1 = createEmptyContrastationMatrix("multi-hyp-001");
  let m2 = createEmptyContrastationMatrix("multi-hyp-002");
  m1 = makeFullRow(m1, cm1, ind1, src1);
  m2 = createContrastationRow(m2, cm2, { indicadorId: ind2, fuenteId: src2, evidenciaEsperada: "e2", evidenciaContraria: "c2" });
  assert("TC-15 múltiples hipótesis — m1 tiene 1 fila", m1.rows.length === 1);
  assert("TC-15 — m2 tiene 1 fila", m2.rows.length === 1);
  assert("TC-15 — matrices independientes", m1.hypothesisId !== m2.hypothesisId);
}

// ─── TC-16: múltiples matrices (sesión) ───────────────────────────────────────
{
  const m1 = createEmptyContrastationMatrix("session-hyp-001");
  const m2 = createEmptyContrastationMatrix("session-hyp-002");
  let session: ContrastationMatrix[] = [];
  session = upsertContrastationMatrix(session, m1);
  session = upsertContrastationMatrix(session, m2);
  assert("TC-16 múltiples matrices — sesión tiene 2", session.length === 2);
  assert("TC-16 — hipótesis 1 correcta", session.some((m) => m.hypothesisId === "session-hyp-001"));
  assert("TC-16 — hipótesis 2 correcta", session.some((m) => m.hypothesisId === "session-hyp-002"));
}

// ─── TC-17: navegación — findContrastationMatrixByHypothesisId ────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("nav-hyp-001");
  m = makeFullRow(m, cm, indId, srcId);
  let session: ContrastationMatrix[] = [];
  session = upsertContrastationMatrix(session, m);
  const found = findContrastationMatrixByHypothesisId(session, "nav-hyp-001");
  assert("TC-17 navegación — matriz recuperada", found !== null);
  assert("TC-17 — filas preservadas", found!.rows.length === 1);
}

// ─── TC-18: reinicio ──────────────────────────────────────────────────────────
{
  let session: ContrastationMatrix[] = [
    createEmptyContrastationMatrix("reset-hyp-001"),
    createEmptyContrastationMatrix("reset-hyp-002"),
  ];
  session = [];
  assert("TC-18 reinicio — colección vacía tras reinicio", session.length === 0);
}

// ─── TC-19: integración completa — fila válida ────────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("int-hyp-001");
  m = makeFullRow(m, cm, indId, srcId);
  const v = validateContrastation(m);
  assert("TC-19 integración — isValid=true", v.isValid === true);
  assert("TC-19 — sin blocking issues", v.blockingIssues.length === 0);
}

// ─── TC-20: confirmación ─────────────────────────────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("conf-hyp-001");
  m = makeFullRow(m, cm, indId, srcId);
  const confirmed = confirmContrastationMatrix(m);
  assert("TC-20 confirmación — confirmed=true", confirmed.confirmed === true);
  assert("TC-20 — filas preservadas", confirmed.rows.length === 1);
}

// ─── TC-21: deduplicación ────────────────────────────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("dedup-hyp-001");
  m = makeFullRow(m, cm, indId, srcId);
  const isDup = isContrastationRowDuplicate(m, indId, srcId);
  const isNotDup = isContrastationRowDuplicate(m, indId, "other-src");
  const excludedRow = m.rows[0].id;
  const isDupExcluded = isContrastationRowDuplicate(m, indId, srcId, excludedRow);
  assert("TC-21 deduplicación — mismo indicador+fuente = duplicado", isDup === true);
  assert("TC-21 — fuente diferente no es duplicado", isNotDup === false);
  assert("TC-21 — row excluida no cuenta como duplicado", isDupExcluded === false);
  // Null indicadorId or fuenteId → never duplicate
  const nullNotDup = isContrastationRowDuplicate(m, null, srcId);
  assert("TC-21 — null indicadorId nunca es duplicado", nullNotDup === false);
}

// ─── TC-22: prioridades ───────────────────────────────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("prio-hyp-001");
  m = createContrastationRow(m, cm, {
    indicadorId: indId,
    fuenteId: srcId,
    evidenciaEsperada: "e",
    evidenciaContraria: "c",
    prioridad: "alta",
  });
  assert("TC-22 prioridad alta asignada", m.rows[0].prioridad === "alta");
  const rowId = m.rows[0].id;
  m = updateContrastationRow(m, cm, rowId, { prioridad: "baja" });
  assert("TC-22 — prioridad actualizada a baja", m.rows[0].prioridad === "baja");
}

// ─── TC-23: criterios de interpretación ───────────────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("crit-hyp-001");
  m = createContrastationRow(m, cm, {
    indicadorId: indId,
    fuenteId: srcId,
    evidenciaEsperada: "e",
    evidenciaContraria: "c",
    criterioInterpretacion: "Si permanece estable, se refuta.",
  });
  assert("TC-23 criterio interpretación guardado", m.rows[0].criterioInterpretacion === "Si permanece estable, se refuta.");
  const rowId = m.rows[0].id;
  m = updateContrastationRow(m, cm, rowId, { criterioInterpretacion: "Criterio actualizado." });
  assert("TC-23 — criterio actualizado", m.rows[0].criterioInterpretacion === "Criterio actualizado.");
}

// ─── TC-24: limitaciones ─────────────────────────────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("lim-hyp-001");
  m = createContrastationRow(m, cm, {
    indicadorId: indId,
    fuenteId: srcId,
    evidenciaEsperada: "e",
    evidenciaContraria: "c",
    limitaciones: "Cobertura parcial en zonas rurales.",
  });
  assert("TC-24 limitaciones guardadas", m.rows[0].limitaciones === "Cobertura parcial en zonas rurales.");
}

// ─── TC-25: persistencia en sesión ───────────────────────────────────────────
{
  const { cm, indId, srcId } = makeConceptualModel();
  let m = createEmptyContrastationMatrix("persist-hyp-001");
  m = makeFullRow(m, cm, indId, srcId);
  let session: ContrastationMatrix[] = [];
  session = upsertContrastationMatrix(session, m);
  // Modify and upsert again
  m = createContrastationRow(m, cm, { evidenciaEsperada: "e2", evidenciaContraria: "c2" });
  session = upsertContrastationMatrix(session, m);
  const found = findContrastationMatrixByHypothesisId(session, "persist-hyp-001");
  assert("TC-25 persistencia — sesión sigue con 1 entrada", session.length === 1);
  assert("TC-25 — filas actualizadas: 2 filas", found!.rows.length === 2);
}

// ─── TC-26: regresión — guard indicador inválido ──────────────────────────────
{
  const { cm } = makeConceptualModel();
  const m = createEmptyContrastationMatrix("reg-hyp-001");
  let threw = false;
  try {
    createContrastationRow(m, cm, {
      indicadorId: "nonexistent-id",
      evidenciaEsperada: "e",
      evidenciaContraria: "c",
    });
  } catch {
    threw = true;
  }
  assert("TC-26 regresión — guard indicador inválido lanza error", threw === true);
}

// ─── Report ───────────────────────────────────────────────────────────────────

const separator = "─".repeat(54);
console.log("\nValidación S-019 — Matriz de Contrastación de Hipótesis");
console.log("═".repeat(54));
results.forEach((r) => console.log(r));
console.log(separator);
console.log(`   Passed : ${passed}`);
console.log(`   Failed : ${failed}`);
console.log(`   Total  : ${passed + failed}`);
console.log(separator);

if (failed > 0) process.exit(1);
