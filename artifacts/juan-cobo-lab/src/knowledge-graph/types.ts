/**
 * S-020 — Knowledge Graph & Dependency Engine
 *
 * ADR-0009: Las relaciones son entidades de primer nivel.
 * HELIOS no debe depender únicamente de jerarquías de objetos.
 * Las relaciones entre entidades constituyen conocimiento y deben
 * representarse explícitamente.
 *
 * Design decisions:
 *  - Graph is built from session state on demand — never persisted.
 *  - Nodes reference original entities by refId (no data duplication).
 *  - Edge direction: source → target means "source references / depends on target"
 *    (e.g., indicator → variable means indicator derives-from variable).
 *  - topologicalTraversal uses Kahn's algorithm; detects cycles.
 *  - All functions are pure — no mutation of original entities.
 */

import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type { OperationalizationMatrix } from "@/operationalization/types";
import type { ContrastationMatrix } from "@/contrastation/types";

// ─── Node types ───────────────────────────────────────────────────────────────

export type NodeType =
  | "problem"
  | "hypothesis"
  | "conceptual-variable"
  | "indicator"
  | "evidence-source"
  | "operationalization-row"
  | "contrastation-row";

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  "problem": "Problema",
  "hypothesis": "Hipótesis",
  "conceptual-variable": "Variable conceptual",
  "indicator": "Indicador",
  "evidence-source": "Fuente de evidencia",
  "operationalization-row": "Fila de operacionalización",
  "contrastation-row": "Criterio de contrastación",
};

// ─── Edge (relation) types ────────────────────────────────────────────────────

export type RelationType =
  | "supports"       // hypothesis supports/addresses problem
  | "operationalizes"// op-row operationalizes variable
  | "measures"       // indicator measures variable; op-row measures indicator
  | "uses"           // ct-row uses indicator/source; op-row uses source; source uses indicator
  | "contrasts"      // ct-row contrasts hypothesis
  | "derives-from"   // indicator derives-from variable (conceptual derivation)
  | "belongs-to";    // variable belongs-to hypothesis (via conceptual model)

export const RELATION_LABELS: Record<RelationType, string> = {
  "supports": "apoya/aborda",
  "operationalizes": "operacionaliza",
  "measures": "mide",
  "uses": "utiliza",
  "contrasts": "contrasta",
  "derives-from": "deriva de",
  "belongs-to": "pertenece a",
};

// ─── Node ─────────────────────────────────────────────────────────────────────

/**
 * A node in the knowledge graph.
 *
 * refId: ID of the original entity in session state.
 * metadata: human-readable display data (nombre, etc.) — read-only snapshot.
 */
export interface KnowledgeNode {
  id: string;
  type: NodeType;
  /** ID of the original HELIOS entity */
  refId: string;
  metadata: {
    label: string;
    [key: string]: unknown;
  };
}

// ─── Edge ─────────────────────────────────────────────────────────────────────

/**
 * A directed relationship between two nodes.
 *
 * Direction: source depends on / references target.
 * e.g., indicator (source) → variable (target) with relationType "derives-from"
 * means the indicator derives from / depends on the variable.
 */
export interface KnowledgeEdge {
  id: string;
  /** ID of the source KnowledgeNode */
  source: string;
  /** ID of the target KnowledgeNode */
  target: string;
  relationType: RelationType;
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

// ─── Build input ──────────────────────────────────────────────────────────────

/** Session state passed to buildGraph(). */
export interface HeliosGraphInput {
  problema: string;
  hypotheses: PolicyHypothesis[];
  conceptualModels: ConceptualModel[];
  operationalizationMatrices: OperationalizationMatrix[];
  contrastationMatrices: ContrastationMatrix[];
}

// ─── Orphan report ────────────────────────────────────────────────────────────

export interface OrphanReport {
  /** Nodes with no edges at all */
  isolatedNodes: KnowledgeNode[];
  /** Edges whose source or target node does not exist in the graph */
  brokenEdges: KnowledgeEdge[];
  /** Indicators with no derives-from/measures edge to a variable */
  indicatorsWithoutVariable: KnowledgeNode[];
  /** Sources with no uses edges to any indicator */
  sourcesWithoutIndicator: KnowledgeNode[];
  /** Operationalization rows with no operationalizes edge to a variable */
  opRowsWithoutVariable: KnowledgeNode[];
  /** Contrastation rows with no contrasts edge to a hypothesis */
  contrastationWithoutHypothesis: KnowledgeNode[];
}

// ─── Graph validation ─────────────────────────────────────────────────────────

export type GraphError =
  | { code: "illegal-cycle";      cycle: string[] }
  | { code: "broken-reference";   edgeId: string; missingNodeId: string }
  | { code: "duplicate-edge";     edgeId1: string; edgeId2: string }
  | { code: "orphan-node";        nodeId: string; nodeType: NodeType };

export type GraphWarning =
  | { code: "redundant-relations"; nodeId: string; count: number }
  | { code: "isolated-entity";     nodeId: string; nodeType: NodeType };

export interface GraphValidation {
  isValid: boolean;
  errors: GraphError[];
  warnings: GraphWarning[];
}
