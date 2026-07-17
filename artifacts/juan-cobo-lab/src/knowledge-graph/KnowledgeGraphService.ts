/**
 * KnowledgeGraphService — S-020
 *
 * Pure functions for building, querying, and validating the HELIOS
 * Knowledge Graph. No sector-specific knowledge. No side effects.
 * No external dependencies. No mutation of original session entities.
 *
 * Graph model:
 *   Edge direction: source → target means "source depends on / references target"
 *   findDependencies(node) = outgoing edges from node = what node needs
 *   findDependents(node)   = incoming edges to node  = what needs node
 *
 * Node ID convention (deterministic):
 *   problem:            "node-problem"
 *   hypothesis:         "node-hyp-{hypothesis.id}"
 *   conceptual-variable:"node-var-{variable.id}"
 *   indicator:          "node-ind-{indicator.id}"
 *   evidence-source:    "node-src-{source.id}"
 *   operationalization-row: "node-oprow-{row.id}"
 *   contrastation-row:  "node-ctrow-{row.id}"
 *
 * Edge ID convention (deterministic):
 *   "edge-{sourceNodeId}--{relationType}--{targetNodeId}"
 */

import type {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraph,
  HeliosGraphInput,
  NodeType,
  RelationType,
  OrphanReport,
  GraphValidation,
  GraphError,
  GraphWarning,
} from "./types";

// ─── ID helpers ───────────────────────────────────────────────────────────────

function nodeId(type: string, refId: string): string {
  return `node-${type}-${refId}`;
}

const PROBLEM_NODE_ID = "node-problem";

function edgeId(sourceId: string, rel: RelationType, targetId: string): string {
  return `edge-${sourceId}--${rel}--${targetId}`;
}

function generateEdgeId(): string {
  return `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── buildGraph ───────────────────────────────────────────────────────────────

/**
 * Build a KnowledgeGraph from the current HELIOS session state.
 *
 * The graph references original entities by refId — no data is duplicated.
 * Idempotent: given the same input, produces the same graph.
 */
export function buildGraph(input: HeliosGraphInput): KnowledgeGraph {
  const nodes: KnowledgeNode[] = [];
  const edges: KnowledgeEdge[] = [];

  // ── Problem node ──────────────────────────────────────────────────────────
  if (input.problema) {
    nodes.push({
      id: PROBLEM_NODE_ID,
      type: "problem",
      refId: "problem",
      metadata: { label: input.problema.slice(0, 80) + (input.problema.length > 80 ? "…" : "") },
    });
  }

  // ── Hypotheses ────────────────────────────────────────────────────────────
  for (const hyp of input.hypotheses) {
    const hypNodeId = nodeId("hyp", hyp.id);
    nodes.push({
      id: hypNodeId,
      type: "hypothesis",
      refId: hyp.id,
      metadata: { label: hyp.titulo, formulacion: hyp.formulacion },
    });

    // hypothesis → problem: supports
    if (input.problema) {
      edges.push({
        id: edgeId(hypNodeId, "supports", PROBLEM_NODE_ID),
        source: hypNodeId,
        target: PROBLEM_NODE_ID,
        relationType: "supports",
      });
    }
  }

  // ── Conceptual models → variables, indicators, sources ────────────────────
  for (const cm of input.conceptualModels) {
    const hypNodeId = nodeId("hyp", cm.hypothesisId);

    // Variables
    for (const v of cm.variables) {
      const varNodeId = nodeId("var", v.id);
      nodes.push({
        id: varNodeId,
        type: "conceptual-variable",
        refId: v.id,
        metadata: { label: v.nombre, rol: v.rol },
      });
      // variable → hypothesis: belongs-to
      edges.push({
        id: edgeId(varNodeId, "belongs-to", hypNodeId),
        source: varNodeId,
        target: hypNodeId,
        relationType: "belongs-to",
      });
    }

    // Indicators
    for (const ind of cm.indicators) {
      const indNodeId = nodeId("ind", ind.id);
      const varNodeId = nodeId("var", ind.variableId);
      nodes.push({
        id: indNodeId,
        type: "indicator",
        refId: ind.id,
        metadata: { label: ind.nombre, unidad: ind.unidad, variableId: ind.variableId },
      });
      // indicator → variable: derives-from
      edges.push({
        id: edgeId(indNodeId, "derives-from", varNodeId),
        source: indNodeId,
        target: varNodeId,
        relationType: "derives-from",
      });
      // indicator → variable: measures
      edges.push({
        id: edgeId(indNodeId, "measures", varNodeId),
        source: indNodeId,
        target: varNodeId,
        relationType: "measures",
      });
    }

    // Evidence sources
    for (const src of cm.evidenceSources) {
      const srcNodeId = nodeId("src", src.id);
      nodes.push({
        id: srcNodeId,
        type: "evidence-source",
        refId: src.id,
        metadata: { label: src.nombre, tipo: src.tipo },
      });
      // source → each covered indicator: uses
      for (const indRefId of src.indicadorIds) {
        const indNodeId = nodeId("ind", indRefId);
        edges.push({
          id: edgeId(srcNodeId, "uses", indNodeId),
          source: srcNodeId,
          target: indNodeId,
          relationType: "uses",
        });
      }
    }
  }

  // ── Operationalization matrices ───────────────────────────────────────────
  for (const opMatrix of input.operationalizationMatrices) {
    for (const row of opMatrix.rows) {
      const rowNodeId = nodeId("oprow", row.id);
      nodes.push({
        id: rowNodeId,
        type: "operationalization-row",
        refId: row.id,
        metadata: {
          label: row.dimension.nombre || `Fila op. ${row.orden + 1}`,
          variableId: row.variableId,
          indicatorId: row.indicatorId,
          sourceId: row.sourceId,
        },
      });

      // op-row → variable: operationalizes
      const varNodeId = nodeId("var", row.variableId);
      edges.push({
        id: edgeId(rowNodeId, "operationalizes", varNodeId),
        source: rowNodeId,
        target: varNodeId,
        relationType: "operationalizes",
      });

      // op-row → indicator: measures (if set)
      if (row.indicatorId) {
        const indNodeId = nodeId("ind", row.indicatorId);
        edges.push({
          id: edgeId(rowNodeId, "measures", indNodeId),
          source: rowNodeId,
          target: indNodeId,
          relationType: "measures",
        });
      }

      // op-row → source: uses (if set)
      if (row.sourceId) {
        const srcNodeId = nodeId("src", row.sourceId);
        edges.push({
          id: edgeId(rowNodeId, "uses", srcNodeId),
          source: rowNodeId,
          target: srcNodeId,
          relationType: "uses",
        });
      }
    }
  }

  // ── Contrastation matrices ────────────────────────────────────────────────
  for (const ctMatrix of input.contrastationMatrices) {
    const hypNodeId = nodeId("hyp", ctMatrix.hypothesisId);

    for (const row of ctMatrix.rows) {
      const rowNodeId = nodeId("ctrow", row.id);
      nodes.push({
        id: rowNodeId,
        type: "contrastation-row",
        refId: row.id,
        metadata: {
          label: `Criterio ${row.orden + 1}`,
          indicadorId: row.indicadorId,
          fuenteId: row.fuenteId,
          prioridad: row.prioridad,
        },
      });

      // ct-row → hypothesis: contrasts
      edges.push({
        id: edgeId(rowNodeId, "contrasts", hypNodeId),
        source: rowNodeId,
        target: hypNodeId,
        relationType: "contrasts",
      });

      // ct-row → indicator: uses (if set)
      if (row.indicadorId) {
        const indNodeId = nodeId("ind", row.indicadorId);
        edges.push({
          id: edgeId(rowNodeId, "uses", indNodeId),
          source: rowNodeId,
          target: indNodeId,
          relationType: "uses",
        });
      }

      // ct-row → source: uses (if set)
      if (row.fuenteId) {
        const srcNodeId = nodeId("src", row.fuenteId);
        edges.push({
          id: edgeId(rowNodeId, "uses", srcNodeId),
          source: rowNodeId,
          target: srcNodeId,
          relationType: "uses",
        });
      }
    }
  }

  // ── S-022: Evidence evaluation layer ────────────────────────────────────────
  for (const eem of (input.evidenceEvaluationMatrices ?? [])) {
    for (const ev of eem.observedEvidence) {
      const evNodeId = nodeId("oe", ev.id);
      nodes.push({
        id: evNodeId,
        type: "observed-evidence",
        refId: ev.id,
        metadata: { label: ev.title || `Evidencia ${ev.id.slice(-4)}` },
      });
      // observed-evidence → contrastation-row (observes)
      const ctRowNodeId = nodeId("ctrow", ev.contrastationRowId);
      edges.push({
        id: edgeId(evNodeId, "observes", ctRowNodeId),
        source: evNodeId,
        target: ctRowNodeId,
        relationType: "observes",
      });
    }
    for (const a of eem.assessments) {
      const aNodeId = nodeId("ea", a.id);
      nodes.push({
        id: aNodeId,
        type: "evidence-assessment",
        refId: a.id,
        metadata: { label: `Evaluación: ${a.direction}` },
      });
      // evidence-assessment → observed-evidence (evaluates)
      const evNodeId = nodeId("oe", a.observedEvidenceId);
      edges.push({
        id: edgeId(aNodeId, "evaluates", evNodeId),
        source: aNodeId,
        target: evNodeId,
        relationType: "evaluates",
      });
    }
  }

  // ── S-022: Hypothesis evidence conclusions ────────────────────────────────
  for (const hec of (input.hypothesisEvidenceConclusions ?? [])) {
    const hecNodeId = nodeId("hec", hec.id);
    nodes.push({
      id: hecNodeId,
      type: "hypothesis-conclusion",
      refId: hec.id,
      metadata: {
        label: hec.conclusionText.slice(0, 60) || "Conclusión metodológica",
      },
    });
    // hypothesis-conclusion → hypothesis (concludes-about)
    const hypNodeId = nodeId("hyp", hec.hypothesisId);
    edges.push({
      id: edgeId(hecNodeId, "concludes-about", hypNodeId),
      source: hecNodeId,
      target: hypNodeId,
      relationType: "concludes-about",
    });
    // hypothesis-conclusion → supporting evidence (supports-conclusion)
    for (const evId of hec.mainSupportingEvidenceIds) {
      const evNodeId = nodeId("oe", evId);
      edges.push({
        id: edgeId(hecNodeId, "supports-conclusion", evNodeId),
        source: hecNodeId,
        target: evNodeId,
        relationType: "supports-conclusion",
      });
    }
    // hypothesis-conclusion → weakening evidence (weakens-conclusion)
    for (const evId of hec.mainWeakeningEvidenceIds) {
      const evNodeId = nodeId("oe", evId);
      edges.push({
        id: edgeId(hecNodeId, "weakens-conclusion", evNodeId),
        source: hecNodeId,
        target: evNodeId,
        relationType: "weakens-conclusion",
      });
    }
  }

  return { nodes, edges };
}

// ─── addNode ──────────────────────────────────────────────────────────────────

/** Add a node to the graph (pure). Silently ignores duplicate IDs. */
export function addNode(
  graph: KnowledgeGraph,
  node: KnowledgeNode
): KnowledgeGraph {
  if (graph.nodes.some((n) => n.id === node.id)) return graph;
  return { ...graph, nodes: [...graph.nodes, node] };
}

// ─── removeNode ───────────────────────────────────────────────────────────────

/**
 * Remove a node and all edges that connect to it (pure).
 * Does NOT cascade-delete dependent nodes — caller must decide.
 */
export function removeNode(
  graph: KnowledgeGraph,
  nodeId: string
): KnowledgeGraph {
  return {
    nodes: graph.nodes.filter((n) => n.id !== nodeId),
    edges: graph.edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    ),
  };
}

// ─── addEdge ──────────────────────────────────────────────────────────────────

/**
 * Add an edge to the graph (pure).
 * Guards:
 *  - Source and target nodes must exist.
 *  - Duplicate (source, target, relationType) triples are rejected.
 */
export function addEdge(
  graph: KnowledgeGraph,
  edge: KnowledgeEdge
): KnowledgeGraph {
  const sourceExists = graph.nodes.some((n) => n.id === edge.source);
  const targetExists = graph.nodes.some((n) => n.id === edge.target);
  if (!sourceExists || !targetExists) {
    throw new Error(
      `addEdge: source '${edge.source}' or target '${edge.target}' not found in graph.`
    );
  }
  const duplicate = graph.edges.some(
    (e) =>
      e.source === edge.source &&
      e.target === edge.target &&
      e.relationType === edge.relationType
  );
  if (duplicate) {
    throw new Error(
      `addEdge: duplicate edge (${edge.source} --${edge.relationType}--> ${edge.target}).`
    );
  }
  return { ...graph, edges: [...graph.edges, edge] };
}

// ─── removeEdge ───────────────────────────────────────────────────────────────

/** Remove an edge by ID (pure). Silent no-op if not found. */
export function removeEdge(
  graph: KnowledgeGraph,
  edgeId: string
): KnowledgeGraph {
  return { ...graph, edges: graph.edges.filter((e) => e.id !== edgeId) };
}

// ─── findDependencies ─────────────────────────────────────────────────────────

/**
 * Direct dependencies: nodes that nodeId depends on.
 * = targets of outgoing edges from nodeId.
 *
 * Example: findDependencies(indicator) → [variable]
 */
export function findDependencies(
  graph: KnowledgeGraph,
  nodeId: string
): KnowledgeNode[] {
  const targetIds = new Set(
    graph.edges
      .filter((e) => e.source === nodeId)
      .map((e) => e.target)
  );
  return graph.nodes.filter((n) => targetIds.has(n.id));
}

/**
 * All dependencies (recursive BFS).
 * Returns all nodes reachable by following outgoing edges.
 */
export function findAllDependencies(
  graph: KnowledgeGraph,
  nodeId: string
): KnowledgeNode[] {
  const visited = new Set<string>();
  const queue = [nodeId];
  const result: KnowledgeNode[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const deps = findDependencies(graph, current);
    for (const dep of deps) {
      if (!visited.has(dep.id)) {
        result.push(dep);
        queue.push(dep.id);
      }
    }
  }
  return result;
}

// ─── findDependents ───────────────────────────────────────────────────────────

/**
 * Direct dependents: nodes that depend on nodeId.
 * = sources of incoming edges to nodeId.
 *
 * Example: findDependents(variable) → [indicator, op-row]
 */
export function findDependents(
  graph: KnowledgeGraph,
  nodeId: string
): KnowledgeNode[] {
  const sourceIds = new Set(
    graph.edges
      .filter((e) => e.target === nodeId)
      .map((e) => e.source)
  );
  return graph.nodes.filter((n) => sourceIds.has(n.id));
}

/**
 * All dependents (recursive BFS) — used for impact calculation.
 * Returns all nodes reachable by following INCOMING edges (reverse traversal).
 */
export function findAllDependents(
  graph: KnowledgeGraph,
  nodeId: string
): KnowledgeNode[] {
  const visited = new Set<string>();
  const queue = [nodeId];
  const result: KnowledgeNode[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const deps = findDependents(graph, current);
    for (const dep of deps) {
      if (!visited.has(dep.id)) {
        result.push(dep);
        queue.push(dep.id);
      }
    }
  }
  return result;
}

// ─── detectOrphans ────────────────────────────────────────────────────────────

/**
 * Detect structural orphans and broken references.
 *
 * Does NOT auto-correct. Returns a report for display.
 */
export function detectOrphans(graph: KnowledgeGraph): OrphanReport {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  // Isolated nodes: no edges at all
  const connectedNodeIds = new Set<string>();
  for (const e of graph.edges) {
    connectedNodeIds.add(e.source);
    connectedNodeIds.add(e.target);
  }
  const isolatedNodes = graph.nodes.filter((n) => !connectedNodeIds.has(n.id));

  // Broken edges: source or target node missing
  const brokenEdges = graph.edges.filter(
    (e) => !nodeById.has(e.source) || !nodeById.has(e.target)
  );

  // Indicators with no derives-from or measures edge to a variable
  const indicatorNodes = graph.nodes.filter((n) => n.type === "indicator");
  const indicatorsWithoutVariable = indicatorNodes.filter((ind) => {
    return !graph.edges.some(
      (e) =>
        e.source === ind.id &&
        (e.relationType === "derives-from" || e.relationType === "measures") &&
        nodeById.get(e.target)?.type === "conceptual-variable"
    );
  });

  // Sources with no uses edge to any indicator
  const sourceNodes = graph.nodes.filter((n) => n.type === "evidence-source");
  const sourcesWithoutIndicator = sourceNodes.filter((src) => {
    return !graph.edges.some(
      (e) =>
        e.source === src.id &&
        e.relationType === "uses" &&
        nodeById.get(e.target)?.type === "indicator"
    );
  });

  // Op-rows with no operationalizes edge to a variable
  const opRowNodes = graph.nodes.filter((n) => n.type === "operationalization-row");
  const opRowsWithoutVariable = opRowNodes.filter((row) => {
    return !graph.edges.some(
      (e) =>
        e.source === row.id &&
        e.relationType === "operationalizes" &&
        nodeById.get(e.target)?.type === "conceptual-variable"
    );
  });

  // Contrastation rows with no contrasts edge to a hypothesis
  const ctRowNodes = graph.nodes.filter((n) => n.type === "contrastation-row");
  const contrastationWithoutHypothesis = ctRowNodes.filter((row) => {
    return !graph.edges.some(
      (e) =>
        e.source === row.id &&
        e.relationType === "contrasts" &&
        nodeById.get(e.target)?.type === "hypothesis"
    );
  });

  // ── S-021 §15.2: unusedIndicators — valid but not referenced by any row ──
  // An indicator is "unused" when it has its required derives-from/measures edge
  // (i.e. is NOT in indicatorsWithoutVariable) but no op-row or ct-row targets it.
  const indicatorsTargetedByRows = new Set<string>();
  for (const e of graph.edges) {
    const srcNode = nodeById.get(e.source);
    if (
      (srcNode?.type === "operationalization-row" || srcNode?.type === "contrastation-row") &&
      (e.relationType === "measures" || e.relationType === "uses")
    ) {
      const tgtNode = nodeById.get(e.target);
      if (tgtNode?.type === "indicator") {
        indicatorsTargetedByRows.add(e.target);
      }
    }
  }
  const validIndicators = indicatorNodes.filter(
    (n) => !indicatorsWithoutVariable.some((o) => o.id === n.id)
  );
  const unusedIndicators = validIndicators.filter(
    (n) => !indicatorsTargetedByRows.has(n.id)
  );

  // ── S-021 §15.2: unusedSources — valid but not referenced by any row ──────
  // A source is "unused" when it has its required uses→indicator edge
  // (i.e. is NOT in sourcesWithoutIndicator) but no op-row or ct-row targets it.
  const sourcesTargetedByRows = new Set<string>();
  for (const e of graph.edges) {
    const srcNode = nodeById.get(e.source);
    if (
      (srcNode?.type === "operationalization-row" || srcNode?.type === "contrastation-row") &&
      e.relationType === "uses"
    ) {
      const tgtNode = nodeById.get(e.target);
      if (tgtNode?.type === "evidence-source") {
        sourcesTargetedByRows.add(e.target);
      }
    }
  }
  const validSources = sourceNodes.filter(
    (n) => !sourcesWithoutIndicator.some((o) => o.id === n.id)
  );
  const unusedSources = validSources.filter(
    (n) => !sourcesTargetedByRows.has(n.id)
  );

  return {
    isolatedNodes,
    brokenEdges,
    indicatorsWithoutVariable,
    sourcesWithoutIndicator,
    opRowsWithoutVariable,
    contrastationWithoutHypothesis,
    unusedIndicators,
    unusedSources,
  };
}

// ─── validateGraph ────────────────────────────────────────────────────────────

/**
 * Validate structural integrity of the graph.
 *
 * Errors (block confirmation):
 *  - illegal-cycle: cycle detected in the DAG
 *  - broken-reference: edge source/target doesn't exist
 *  - duplicate-edge: same (source, target, relationType) triple
 *  - orphan-node: indicator/variable/source with no edges
 *
 * Warnings (informational):
 *  - redundant-relations: node with many edges to same target
 *  - isolated-entity: node with no edges
 */
export function validateGraph(graph: KnowledgeGraph): GraphValidation {
  const errors: GraphError[] = [];
  const warnings: GraphWarning[] = [];
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  // ── Broken references ──────────────────────────────────────────────────────
  for (const edge of graph.edges) {
    if (!nodeById.has(edge.source)) {
      errors.push({ code: "broken-reference", edgeId: edge.id, missingNodeId: edge.source });
    }
    if (!nodeById.has(edge.target)) {
      errors.push({ code: "broken-reference", edgeId: edge.id, missingNodeId: edge.target });
    }
  }

  // ── Duplicate edges ────────────────────────────────────────────────────────
  const seen = new Map<string, string>(); // canonical key → first edgeId
  for (const edge of graph.edges) {
    const key = `${edge.source}::${edge.relationType}::${edge.target}`;
    const existing = seen.get(key);
    if (existing) {
      errors.push({ code: "duplicate-edge", edgeId1: existing, edgeId2: edge.id });
    } else {
      seen.set(key, edge.id);
    }
  }

  // ── Cycle detection (DFS) ──────────────────────────────────────────────────
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const node of graph.nodes) color.set(node.id, WHITE);

  function dfs(nodeId: string, path: string[]): boolean {
    color.set(nodeId, GRAY);
    const outgoing = graph.edges
      .filter((e) => e.source === nodeId)
      .map((e) => e.target);

    for (const neighbor of outgoing) {
      if (!color.has(neighbor)) continue; // broken ref — reported above
      if (color.get(neighbor) === GRAY) {
        // Cycle detected
        const cycleStart = path.indexOf(neighbor);
        const cycle = cycleStart >= 0
          ? [...path.slice(cycleStart), neighbor]
          : [...path, neighbor];
        errors.push({ code: "illegal-cycle", cycle });
        return true;
      }
      if (color.get(neighbor) === WHITE) {
        if (dfs(neighbor, [...path, nodeId])) return true;
      }
    }
    color.set(nodeId, BLACK);
    return false;
  }

  for (const node of graph.nodes) {
    if (color.get(node.id) === WHITE) {
      dfs(node.id, []);
    }
  }

  // ── Orphan nodes ──────────────────────────────────────────────────────────
  const connectedIds = new Set<string>();
  for (const e of graph.edges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }
  const orphanTypes: NodeType[] = ["indicator", "conceptual-variable", "evidence-source"];
  for (const node of graph.nodes) {
    if (!connectedIds.has(node.id) && orphanTypes.includes(node.type)) {
      errors.push({ code: "orphan-node", nodeId: node.id, nodeType: node.type });
    }
  }

  // ── Warnings: redundant relations ─────────────────────────────────────────
  // Node pairs with >2 edges between them
  const pairCount = new Map<string, number>();
  for (const edge of graph.edges) {
    const pairKey = `${edge.source}::${edge.target}`;
    pairCount.set(pairKey, (pairCount.get(pairKey) ?? 0) + 1);
  }
  for (const [pairKey, count] of pairCount) {
    if (count > 2) {
      const sourceId = pairKey.split("::")[0];
      warnings.push({ code: "redundant-relations", nodeId: sourceId, count });
    }
  }

  // ── Warnings: isolated entities ───────────────────────────────────────────
  for (const node of graph.nodes) {
    if (!connectedIds.has(node.id)) {
      warnings.push({ code: "isolated-entity", nodeId: node.id, nodeType: node.type });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── topologicalTraversal ─────────────────────────────────────────────────────

/**
 * Topological ordering of nodes using Kahn's algorithm (BFS).
 *
 * Returns nodes in topological order (sources first, sinks last).
 * If a cycle exists, the returned array will be shorter than graph.nodes.
 * Call validateGraph() first to detect cycles explicitly.
 *
 * "Sources" here means nodes with no incoming edges (in-degree = 0)
 * in the graph — i.e., the most fundamental entities.
 */
export function topologicalTraversal(graph: KnowledgeGraph): KnowledgeNode[] {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  // Compute in-degrees
  const inDegree = new Map<string, number>();
  for (const node of graph.nodes) inDegree.set(node.id, 0);
  for (const edge of graph.edges) {
    if (nodeById.has(edge.target)) {
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }

  // Queue starts with all zero-in-degree nodes
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const result: KnowledgeNode[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const node = nodeById.get(currentId);
    if (node) result.push(node);

    // Reduce in-degree of neighbors
    for (const edge of graph.edges) {
      if (edge.source === currentId) {
        const newDeg = (inDegree.get(edge.target) ?? 1) - 1;
        inDegree.set(edge.target, newDeg);
        if (newDeg === 0) {
          queue.push(edge.target);
        }
      }
    }
  }

  return result;
}

// ─── topologicalTraversalDependentsFirst / DependenciesFirst ──────────────────

/**
 * S-021 §15.1 — Explicit alias: "dependents first"
 *
 * Returns nodes in topological order where the most-derived entities
 * (those that depend on others, e.g. op-rows, ct-rows) come first.
 * = current topologicalTraversal() behavior.
 *
 * Kahn's algorithm on the original graph; nodes with in-degree=0 start first.
 * In HELIOS convention (source→target = depends-on), in-degree=0 nodes are those
 * that nothing depends on, i.e., the most "derived" entities.
 */
export function topologicalTraversalDependentsFirst(graph: KnowledgeGraph): KnowledgeNode[] {
  return topologicalTraversal(graph);
}

/**
 * S-021 §15.1 — Explicit alias: "dependencies first"
 *
 * Returns nodes in topological order where the most fundamental entities
 * (those that others depend on, e.g. problem, hypotheses, variables) come first.
 * = reverse of topologicalTraversal().
 *
 * Useful for generating a linear document (problem→hypothesis→variables→…).
 */
export function topologicalTraversalDependenciesFirst(graph: KnowledgeGraph): KnowledgeNode[] {
  return [...topologicalTraversal(graph)].reverse();
}

// ─── computeImpact ────────────────────────────────────────────────────────────

/**
 * Compute the full deletion impact of removing a node.
 * Returns all nodes that would lose a dependency if nodeId were removed.
 * Grouped by type for display.
 */
export function computeImpact(
  graph: KnowledgeGraph,
  nodeId: string
): Map<string, KnowledgeNode[]> {
  const allDependents = findAllDependents(graph, nodeId);
  const grouped = new Map<string, KnowledgeNode[]>();
  for (const dep of allDependents) {
    const list = grouped.get(dep.type) ?? [];
    list.push(dep);
    grouped.set(dep.type, list);
  }
  return grouped;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Count incoming edges for a node (in-degree). */
export function inDegree(graph: KnowledgeGraph, nodeId: string): number {
  return graph.edges.filter((e) => e.target === nodeId).length;
}

/** Count outgoing edges for a node (out-degree). */
export function outDegree(graph: KnowledgeGraph, nodeId: string): number {
  return graph.edges.filter((e) => e.source === nodeId).length;
}

/** Returns all edges connected to a node (incoming or outgoing). */
export function edgesOf(graph: KnowledgeGraph, nodeId: string): KnowledgeEdge[] {
  return graph.edges.filter((e) => e.source === nodeId || e.target === nodeId);
}
