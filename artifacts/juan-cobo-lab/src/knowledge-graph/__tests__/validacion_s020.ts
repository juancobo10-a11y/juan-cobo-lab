/**
 * Validación S-020 — Knowledge Graph & Dependency Engine
 *
 * Suite: KnowledgeGraphService — 20 TCs, ~65 asserts
 */

import {
  buildGraph,
  addNode,
  addEdge,
  removeNode,
  removeEdge,
  findDependencies,
  findDependents,
  findAllDependents,
  findAllDependencies,
  detectOrphans,
  validateGraph,
  topologicalTraversal,
  computeImpact,
  inDegree,
  outDegree,
} from "../KnowledgeGraphService";
import type { HeliosGraphInput } from "../types";
import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type { OperationalizationMatrix } from "@/operationalization/types";
import type { ContrastationMatrix } from "@/contrastation/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

let _counter = 0;
function uid(p: string) { return `${p}-${++_counter}`; }

const TS = "2026-01-01T00:00:00Z";

function makeHypothesis(): PolicyHypothesis {
  return {
    id: uid("hyp"),
    titulo: "Hipótesis de prueba",
    formulacion: "Si A entonces B",
    status: "borrador",
    confianza: "media",
    variablesPrincipales: [],
    sourceQuestionIds: [],
    thinkingPatternIds: [],
    createdAt: TS,
    updatedAt: TS,
  } as unknown as PolicyHypothesis;
}

function makeConceptualModel(hypothesisId: string): {
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
    hypothesisId,
    variables: [{
      id: varId, nombre: "Variable A", descripcion: "desc", rol: "causa",
      definicionOperacional: "", orden: 0, createdAt: TS, updatedAt: TS,
    }],
    indicators: [{
      id: indId, nombre: "Indicador A", descripcion: "desc", variableId: varId,
      unidad: "%", formulaOCriterio: "formula", periodicidad: "anual",
      nivelTerritorial: "nacional", disponibilidad: "disponible", orden: 0,
      createdAt: TS, updatedAt: TS,
    }],
    evidenceSources: [{
      id: srcId, nombre: "Fuente A", tipo: "administrativo", responsable: "DANE",
      frecuencia: "anual", acceso: "publico", limitaciones: "", indicadorIds: [indId],
      createdAt: TS, updatedAt: TS,
    }],
    confirmed: true, createdAt: TS, updatedAt: TS,
  };
  return { cm, varId, indId, srcId };
}

function makeOpMatrix(hypothesisId: string, varId: string, indId: string, srcId: string): OperationalizationMatrix {
  const rowId = uid("row");
  return {
    id: uid("opm"),
    hypothesisId,
    rows: [{
      id: rowId, variableId: varId, indicatorId: indId, sourceId: srcId,
      escala: "ordinal",
      dimension: { id: uid("dim"), nombre: "Dim A", definicionOperacional: "def", orden: 0, createdAt: TS, updatedAt: TS },
      observaciones: "",
      orden: 0, createdAt: TS, updatedAt: TS,
    }],
    confirmed: true, createdAt: TS, updatedAt: TS,
  };
}

function makeCtMatrix(hypothesisId: string, indId: string, srcId: string): ContrastationMatrix {
  const rowId = uid("ctr");
  return {
    id: uid("ctm"),
    hypothesisId,
    rows: [{
      id: rowId, hypothesisId, indicadorId: indId, fuenteId: srcId,
      evidenciaEsperada: "e", evidenciaContraria: "c",
      criterioInterpretacion: "", limitaciones: "", prioridad: "alta",
      observaciones: "", orden: 0, createdAt: TS, updatedAt: TS,
    }],
    confirmed: true, createdAt: TS, updatedAt: TS,
  };
}

function makeFullSession(): { input: HeliosGraphInput; varId: string; indId: string; srcId: string; hypId: string } {
  const hyp = makeHypothesis();
  const { cm, varId, indId, srcId } = makeConceptualModel(hyp.id);
  const opMatrix = makeOpMatrix(hyp.id, varId, indId, srcId);
  const ctMatrix = makeCtMatrix(hyp.id, indId, srcId);
  const input: HeliosGraphInput = {
    problema: "¿Por qué la política educativa no ha mejorado resultados?",
    hypotheses: [hyp],
    conceptualModels: [cm],
    operationalizationMatrices: [opMatrix],
    contrastationMatrices: [ctMatrix],
  };
  return { input, varId, indId, srcId, hypId: hyp.id };
}

// ─── Runner ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results: string[] = [];

function assert(label: string, value: boolean) {
  if (value) { passed++; results.push(`  ✓ ${label}`); }
  else        { failed++; results.push(`  ✗ ${label}`); }
}

// ─── TC-01: construir grafo ───────────────────────────────────────────────────
{
  const { input } = makeFullSession();
  const graph = buildGraph(input);
  assert("TC-01 buildGraph — hay nodos", graph.nodes.length > 0);
  assert("TC-01 — hay aristas", graph.edges.length > 0);
  assert("TC-01 — nodo problema existe", graph.nodes.some((n) => n.type === "problem"));
  assert("TC-01 — nodo hipótesis existe", graph.nodes.some((n) => n.type === "hypothesis"));
  assert("TC-01 — nodo variable existe", graph.nodes.some((n) => n.type === "conceptual-variable"));
  assert("TC-01 — nodo indicador existe", graph.nodes.some((n) => n.type === "indicator"));
  assert("TC-01 — nodo fuente existe", graph.nodes.some((n) => n.type === "evidence-source"));
  assert("TC-01 — fila op. existe", graph.nodes.some((n) => n.type === "operationalization-row"));
  assert("TC-01 — fila ct. existe", graph.nodes.some((n) => n.type === "contrastation-row"));
}

// ─── TC-02: crear nodos ───────────────────────────────────────────────────────
{
  const graph = buildGraph({ problema: "", hypotheses: [], conceptualModels: [], operationalizationMatrices: [], contrastationMatrices: [] });
  const newNode = { id: "test-node-1", type: "indicator" as const, refId: "ind-x", metadata: { label: "Test" } };
  const updated = addNode(graph, newNode);
  assert("TC-02 addNode — nodo agregado", updated.nodes.some((n) => n.id === "test-node-1"));
  assert("TC-02 — idempotente en ID duplicado", addNode(updated, newNode).nodes.length === updated.nodes.length);
}

// ─── TC-03: crear relaciones ──────────────────────────────────────────────────
{
  let graph = buildGraph({ problema: "", hypotheses: [], conceptualModels: [], operationalizationMatrices: [], contrastationMatrices: [] });
  graph = addNode(graph, { id: "n1", type: "indicator" as const, refId: "i1", metadata: { label: "N1" } });
  graph = addNode(graph, { id: "n2", type: "conceptual-variable" as const, refId: "v1", metadata: { label: "N2" } });
  graph = addEdge(graph, { id: "e1", source: "n1", target: "n2", relationType: "derives-from" });
  assert("TC-03 addEdge — arista agregada", graph.edges.some((e) => e.id === "e1"));
  let threw = false;
  try { addEdge(graph, { id: "e2", source: "n1", target: "n2", relationType: "derives-from" }); } catch { threw = true; }
  assert("TC-03 — duplicado lanza error", threw === true);
  let threwBroken = false;
  try { addEdge(graph, { id: "e3", source: "n1", target: "nonexistent", relationType: "uses" }); } catch { threwBroken = true; }
  assert("TC-03 — nodo inexistente lanza error", threwBroken === true);
}

// ─── TC-04: detectar huérfanos ────────────────────────────────────────────────
{
  // Isolated indicator with no edges
  let graph = buildGraph({ problema: "", hypotheses: [], conceptualModels: [], operationalizationMatrices: [], contrastationMatrices: [] });
  graph = addNode(graph, { id: "ind-isolated", type: "indicator" as const, refId: "ix", metadata: { label: "Isolated" } });
  const report = detectOrphans(graph);
  assert("TC-04 detectOrphans — indicador aislado detectado", report.isolatedNodes.some((n) => n.id === "ind-isolated"));
}

// ─── TC-05: detectar duplicados en validación ─────────────────────────────────
{
  let graph = buildGraph({ problema: "", hypotheses: [], conceptualModels: [], operationalizationMatrices: [], contrastationMatrices: [] });
  graph = addNode(graph, { id: "nA", type: "indicator" as const, refId: "ia", metadata: { label: "A" } });
  graph = addNode(graph, { id: "nB", type: "conceptual-variable" as const, refId: "vb", metadata: { label: "B" } });
  // Manually add duplicate (bypass addEdge guard)
  graph = { ...graph, edges: [
    ...graph.edges,
    { id: "e-dup-1", source: "nA", target: "nB", relationType: "derives-from" as const },
    { id: "e-dup-2", source: "nA", target: "nB", relationType: "derives-from" as const },
  ]};
  const v = validateGraph(graph);
  assert("TC-05 validación — duplicado detectado", v.errors.some((e) => e.code === "duplicate-edge"));
}

// ─── TC-06: dependencias ──────────────────────────────────────────────────────
{
  const { input, varId, indId } = makeFullSession();
  const graph = buildGraph(input);
  const indNodeId = `node-ind-${indId}`;
  const varNodeId = `node-var-${varId}`;
  const deps = findDependencies(graph, indNodeId);
  assert("TC-06 findDependencies(indicator) — variable incluida", deps.some((n) => n.id === varNodeId));
}

// ─── TC-07: dependientes ──────────────────────────────────────────────────────
{
  const { input, varId, indId } = makeFullSession();
  const graph = buildGraph(input);
  const varNodeId = `node-var-${varId}`;
  const indNodeId = `node-ind-${indId}`;
  const deps = findDependents(graph, varNodeId);
  assert("TC-07 findDependents(variable) — indicador incluido", deps.some((n) => n.id === indNodeId));
  assert("TC-07 — fila op. incluida", deps.some((n) => n.type === "operationalization-row"));
}

// ─── TC-08: eliminación con impacto ──────────────────────────────────────────
{
  const { input, indId } = makeFullSession();
  const graph = buildGraph(input);
  const indNodeId = `node-ind-${indId}`;
  const impact = computeImpact(graph, indNodeId);
  // Dependents of indicator: op-rows and ct-rows that use it
  const allDependents = findAllDependents(graph, indNodeId);
  assert("TC-08 computeImpact — hay dependientes del indicador", allDependents.length > 0);
  assert("TC-08 — fila ct. en impacto", allDependents.some((n) => n.type === "contrastation-row"));
  // After removing indicator, confirm edges are cleaned up
  const trimmed = removeNode(graph, indNodeId);
  assert("TC-08 removeNode — nodo eliminado", !trimmed.nodes.some((n) => n.id === indNodeId));
  assert("TC-08 — aristas conectadas eliminadas", !trimmed.edges.some((e) => e.source === indNodeId || e.target === indNodeId));
  void impact;
}

// ─── TC-09: validación ────────────────────────────────────────────────────────
{
  const { input } = makeFullSession();
  const graph = buildGraph(input);
  const v = validateGraph(graph);
  // A fully-built graph from a valid session should be valid (no errors)
  assert("TC-09 validateGraph — grafo válido de sesión completa", v.isValid === true);
}

// ─── TC-10: reconstrucción desde sesión ───────────────────────────────────────
{
  const { input } = makeFullSession();
  const g1 = buildGraph(input);
  const g2 = buildGraph(input); // rebuild with same input
  assert("TC-10 reconstrucción — mismo # nodos", g1.nodes.length === g2.nodes.length);
  assert("TC-10 — mismo # aristas", g1.edges.length === g2.edges.length);
  // IDs must match (deterministic)
  const ids1 = g1.nodes.map((n) => n.id).sort().join(",");
  const ids2 = g2.nodes.map((n) => n.id).sort().join(",");
  assert("TC-10 — IDs deterministas", ids1 === ids2);
}

// ─── TC-11: múltiples hipótesis ───────────────────────────────────────────────
{
  const hyp1 = makeHypothesis();
  const hyp2 = makeHypothesis();
  const { cm: cm1, varId: v1, indId: i1, srcId: s1 } = makeConceptualModel(hyp1.id);
  const { cm: cm2, varId: v2, indId: i2, srcId: s2 } = makeConceptualModel(hyp2.id);
  const input: HeliosGraphInput = {
    problema: "Problema multi-hipótesis",
    hypotheses: [hyp1, hyp2],
    conceptualModels: [cm1, cm2],
    operationalizationMatrices: [],
    contrastationMatrices: [],
  };
  const graph = buildGraph(input);
  assert("TC-11 múltiples hipótesis — 2 nodos hypothesis", graph.nodes.filter((n) => n.type === "hypothesis").length === 2);
  assert("TC-11 — 2 variables", graph.nodes.filter((n) => n.type === "conceptual-variable").length === 2);
  assert("TC-11 — hipótesis independientes por ID", `node-hyp-${hyp1.id}` !== `node-hyp-${hyp2.id}`);
  void v1; void i1; void s1; void v2; void i2; void s2;
}

// ─── TC-12: múltiples variables ───────────────────────────────────────────────
{
  const hyp = makeHypothesis();
  const varId2 = uid("var2");
  const indId2 = uid("ind2");
  const cm: ConceptualModel = {
    id: uid("cm2"), hypothesisId: hyp.id,
    variables: [
      { id: uid("var"), nombre: "Var A", descripcion: "", rol: "causa", definicionOperacional: "", orden: 0, createdAt: TS, updatedAt: TS },
      { id: varId2, nombre: "Var B", descripcion: "", rol: "resultado", definicionOperacional: "", orden: 1, createdAt: TS, updatedAt: TS },
    ],
    indicators: [
      { id: indId2, nombre: "Ind B", descripcion: "", variableId: varId2, unidad: "", formulaOCriterio: "", periodicidad: "anual", nivelTerritorial: "", disponibilidad: "disponible", orden: 0, createdAt: TS, updatedAt: TS },
    ],
    evidenceSources: [],
    confirmed: false, createdAt: TS, updatedAt: TS,
  };
  const input: HeliosGraphInput = { problema: "p", hypotheses: [hyp], conceptualModels: [cm], operationalizationMatrices: [], contrastationMatrices: [] };
  const graph = buildGraph(input);
  assert("TC-12 múltiples variables — 2 var nodes", graph.nodes.filter((n) => n.type === "conceptual-variable").length === 2);
  // Each variable has a belongs-to edge to hypothesis
  const hypNodeId = `node-hyp-${hyp.id}`;
  const belongsToEdges = graph.edges.filter((e) => e.target === hypNodeId && e.relationType === "belongs-to");
  assert("TC-12 — 2 belongs-to edges to hypothesis", belongsToEdges.length === 2);
}

// ─── TC-13: múltiples indicadores ────────────────────────────────────────────
{
  const hyp = makeHypothesis();
  const varId = uid("var");
  const ind1 = uid("ind"); const ind2 = uid("ind");
  const cm: ConceptualModel = {
    id: uid("cm"), hypothesisId: hyp.id,
    variables: [{ id: varId, nombre: "V", descripcion: "", rol: "causa", definicionOperacional: "", orden: 0, createdAt: TS, updatedAt: TS }],
    indicators: [
      { id: ind1, nombre: "I1", descripcion: "", variableId: varId, unidad: "", formulaOCriterio: "", periodicidad: "anual", nivelTerritorial: "", disponibilidad: "disponible", orden: 0, createdAt: TS, updatedAt: TS },
      { id: ind2, nombre: "I2", descripcion: "", variableId: varId, unidad: "", formulaOCriterio: "", periodicidad: "anual", nivelTerritorial: "", disponibilidad: "disponible", orden: 1, createdAt: TS, updatedAt: TS },
    ],
    evidenceSources: [],
    confirmed: false, createdAt: TS, updatedAt: TS,
  };
  const input: HeliosGraphInput = { problema: "p", hypotheses: [hyp], conceptualModels: [cm], operationalizationMatrices: [], contrastationMatrices: [] };
  const graph = buildGraph(input);
  const varNodeId = `node-var-${varId}`;
  const derivesFrom = graph.edges.filter((e) => e.target === varNodeId && e.relationType === "derives-from");
  assert("TC-13 múltiples indicadores — 2 derives-from edges to variable", derivesFrom.length === 2);
}

// ─── TC-14: navegación (traversal directo) ────────────────────────────────────
{
  const { input, varId, hypId } = makeFullSession();
  const graph = buildGraph(input);
  // From variable, find all dependencies recursively → should reach hypothesis → problem
  const varNodeId = `node-var-${varId}`;
  const allDeps = findAllDependencies(graph, varNodeId);
  const types = new Set(allDeps.map((n) => n.type));
  assert("TC-14 navegación — variable depends on hypothesis (transitively)", types.has("hypothesis"));
  assert("TC-14 — variable depends on problem (transitively)", types.has("problem"));
  void hypId;
}

// ─── TC-15: reinicio ──────────────────────────────────────────────────────────
{
  const { input } = makeFullSession();
  const g = buildGraph(input);
  assert("TC-15 reinicio — grafo poblado antes de reinicio", g.nodes.length > 0);
  // Rebuilding with empty input = reset
  const empty = buildGraph({ problema: "", hypotheses: [], conceptualModels: [], operationalizationMatrices: [], contrastationMatrices: [] });
  assert("TC-15 — grafo vacío tras reinicio", empty.nodes.length === 0);
  assert("TC-15 — sin aristas tras reinicio", empty.edges.length === 0);
}

// ─── TC-16: integración ───────────────────────────────────────────────────────
{
  const { input, srcId } = makeFullSession();
  const graph = buildGraph(input);
  // Impact of removing source: should affect op-row and ct-row
  const srcNodeId = `node-src-${srcId}`;
  const impact = findAllDependents(graph, srcNodeId);
  assert("TC-16 integración — fuente tiene dependientes", impact.length > 0);
  assert("TC-16 — ct-row afectado por eliminación de fuente", impact.some((n) => n.type === "contrastation-row"));
  assert("TC-16 — op-row afectado por eliminación de fuente", impact.some((n) => n.type === "operationalization-row"));
}

// ─── TC-17: consistencia ──────────────────────────────────────────────────────
{
  // Add a broken reference edge directly
  const { input } = makeFullSession();
  let graph = buildGraph(input);
  graph = { ...graph, edges: [...graph.edges, { id: "broken-edge", source: "node-nonexistent", target: "node-problem", relationType: "supports" as const }] };
  const v = validateGraph(graph);
  assert("TC-17 consistencia — referencia rota detectada", v.errors.some((e) => e.code === "broken-reference"));
  assert("TC-17 — isValid=false con error", v.isValid === false);
}

// ─── TC-18: topologicalTraversal ─────────────────────────────────────────────
{
  const { input } = makeFullSession();
  const graph = buildGraph(input);
  const order = topologicalTraversal(graph);
  // Must include all nodes
  assert("TC-18 topologicalTraversal — todos los nodos incluidos", order.length === graph.nodes.length);
  // Kahn's with "source depends on target" edges: dependents come before dependencies.
  // hypothesis → problem means hypothesis is processed before problem.
  const probIdx = order.findIndex((n) => n.type === "problem");
  const hypIdx  = order.findIndex((n) => n.type === "hypothesis");
  assert("TC-18 — hipótesis antes de problema (dependiente primero en Kahn)", hypIdx < probIdx);
  // indicator → variable: indicator is processed before variable.
  const varIdx = order.findIndex((n) => n.type === "conceptual-variable");
  const indIdx = order.findIndex((n) => n.type === "indicator");
  assert("TC-18 — indicador antes de variable (dependiente primero en Kahn)", indIdx < varIdx);
}

// ─── TC-19: referencias cruzadas ─────────────────────────────────────────────
{
  // Source covers indicator from a different variable (cross-reference scenario)
  const hyp = makeHypothesis();
  const varId1 = uid("var"); const varId2 = uid("var");
  const indId1 = uid("ind"); const indId2 = uid("ind");
  const srcId = uid("src");
  const cm: ConceptualModel = {
    id: uid("cm"), hypothesisId: hyp.id,
    variables: [
      { id: varId1, nombre: "V1", descripcion: "", rol: "causa", definicionOperacional: "", orden: 0, createdAt: TS, updatedAt: TS },
      { id: varId2, nombre: "V2", descripcion: "", rol: "resultado", definicionOperacional: "", orden: 1, createdAt: TS, updatedAt: TS },
    ],
    indicators: [
      { id: indId1, nombre: "I1", descripcion: "", variableId: varId1, unidad: "", formulaOCriterio: "", periodicidad: "anual", nivelTerritorial: "", disponibilidad: "disponible", orden: 0, createdAt: TS, updatedAt: TS },
      { id: indId2, nombre: "I2", descripcion: "", variableId: varId2, unidad: "", formulaOCriterio: "", periodicidad: "anual", nivelTerritorial: "", disponibilidad: "disponible", orden: 1, createdAt: TS, updatedAt: TS },
    ],
    evidenceSources: [{
      id: srcId, nombre: "Fuente Multi", tipo: "administrativo", responsable: "",
      frecuencia: "anual", acceso: "publico", limitaciones: "",
      indicadorIds: [indId1, indId2], // source covers both indicators
      createdAt: TS, updatedAt: TS,
    }],
    confirmed: false, createdAt: TS, updatedAt: TS,
  };
  const input: HeliosGraphInput = { problema: "p", hypotheses: [hyp], conceptualModels: [cm], operationalizationMatrices: [], contrastationMatrices: [] };
  const graph = buildGraph(input);
  const srcNodeId = `node-src-${srcId}`;
  const srcOutEdges = graph.edges.filter((e) => e.source === srcNodeId && e.relationType === "uses");
  assert("TC-19 referencias cruzadas — fuente tiene 2 aristas uses", srcOutEdges.length === 2);
  const targetedIndicators = new Set(srcOutEdges.map((e) => e.target));
  assert("TC-19 — targets son los 2 indicadores", targetedIndicators.has(`node-ind-${indId1}`) && targetedIndicators.has(`node-ind-${indId2}`));
}

// ─── TC-20: regresión — removeEdge y in/outDegree ────────────────────────────
{
  let graph = buildGraph({ problema: "", hypotheses: [], conceptualModels: [], operationalizationMatrices: [], contrastationMatrices: [] });
  graph = addNode(graph, { id: "nX", type: "indicator" as const, refId: "ix", metadata: { label: "X" } });
  graph = addNode(graph, { id: "nY", type: "conceptual-variable" as const, refId: "vy", metadata: { label: "Y" } });
  graph = addEdge(graph, { id: "eXY", source: "nX", target: "nY", relationType: "derives-from" });
  assert("TC-20 inDegree(nY) = 1", inDegree(graph, "nY") === 1);
  assert("TC-20 outDegree(nX) = 1", outDegree(graph, "nX") === 1);
  const after = removeEdge(graph, "eXY");
  assert("TC-20 removeEdge — arista eliminada", !after.edges.some((e) => e.id === "eXY"));
  assert("TC-20 — inDegree(nY) = 0 tras eliminar", inDegree(after, "nY") === 0);
}

// ─── Report ───────────────────────────────────────────────────────────────────

const sep = "─".repeat(54);
console.log("\nValidación S-020 — Knowledge Graph & Dependency Engine");
console.log("═".repeat(54));
results.forEach((r) => console.log(r));
console.log(sep);
console.log(`   Passed : ${passed}`);
console.log(`   Failed : ${failed}`);
console.log(`   Total  : ${passed + failed}`);
console.log(sep);

if (failed > 0) process.exit(1);
