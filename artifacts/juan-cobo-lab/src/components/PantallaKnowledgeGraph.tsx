/**
 * PantallaKnowledgeGraph — S-020
 *
 * Navigable tree view of the HELIOS Knowledge Graph.
 * Shows: Problema → Hipótesis → Variables → Indicadores → Fuentes
 *
 * Each node shows:
 *   - Tipo
 *   - Dependencias directas (# outgoing edges)
 *   - Dependientes directos (# incoming edges)
 *   - Cantidad total de relaciones
 *
 * Impact panel: when a node is selected, shows what would be affected
 * if that entity were removed.
 *
 * Accessibility:
 *   - Full keyboard navigation (Tab, Enter, Escape, Arrow keys)
 *   - aria-expanded on collapsible nodes
 *   - aria-live on impact panel
 *   - No canvas, no graph library
 */

import { useState, useMemo, useCallback } from "react";
import { motion, type Variants } from "framer-motion";
import {
  ChevronDown, ChevronRight, ArrowLeft, RotateCcw,
  Share2, AlertCircle, Info, Network,
} from "lucide-react";

import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type { OperationalizationMatrix } from "@/operationalization/types";
import type { ContrastationMatrix } from "@/contrastation/types";
import type { KnowledgeNode, KnowledgeGraph } from "@/knowledge-graph/types";
import { NODE_TYPE_LABELS } from "@/knowledge-graph/types";
import {
  buildGraph,
  findDependencies,
  findDependents,
  findAllDependents,
  inDegree,
  outDegree,
  detectOrphans,
  validateGraph,
} from "@/knowledge-graph/KnowledgeGraphService";

// ─── Animation variants ───────────────────────────────────────────────────────

const pageVariants: Variants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

const fadeUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  problema: string;
  hypotheses: PolicyHypothesis[];
  conceptualModels: ConceptualModel[];
  operationalizationMatrices: OperationalizationMatrix[];
  contrastationMatrices: ContrastationMatrix[];
  onVolver: () => void;
  onReiniciar: () => void;
}

// ─── Node badge color ─────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  "problem":                "bg-slate-100 text-slate-700",
  "hypothesis":             "bg-indigo-100 text-indigo-700",
  "conceptual-variable":    "bg-violet-100 text-violet-700",
  "indicator":              "bg-blue-100 text-blue-700",
  "evidence-source":        "bg-emerald-100 text-emerald-700",
  "operationalization-row": "bg-amber-100 text-amber-700",
  "contrastation-row":      "bg-red-100 text-red-700",
};

// ─── Impact panel ─────────────────────────────────────────────────────────────

interface ImpactPanelProps {
  graph: KnowledgeGraph;
  selectedNode: KnowledgeNode | null;
}

function ImpactPanel({ graph, selectedNode }: ImpactPanelProps) {
  if (!selectedNode) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground/50">
        <Share2 className="w-7 h-7 opacity-30" aria-hidden="true" />
        <p className="text-sm">Selecciona un nodo para ver el impacto de su eliminación.</p>
      </div>
    );
  }

  const allDeps = findAllDependents(graph, selectedNode.id);
  const directDeps = findDependencies(graph, selectedNode.id);
  const directDependents = findDependents(graph, selectedNode.id);

  const grouped = new Map<string, KnowledgeNode[]>();
  for (const dep of allDeps) {
    const list = grouped.get(dep.type) ?? [];
    list.push(dep);
    grouped.set(dep.type, list);
  }

  return (
    <div aria-live="polite" className="space-y-4">
      {/* Selected node summary */}
      <div className="rounded-lg border border-border bg-white/60 p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLOR[selectedNode.type] ?? "bg-muted text-muted-foreground"}`}>
            {NODE_TYPE_LABELS[selectedNode.type]}
          </span>
          <span className="text-sm font-medium text-foreground/90 truncate">
            {selectedNode.metadata.label as string}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/30 p-2">
            <p className="text-lg font-semibold text-foreground">{outDegree(graph, selectedNode.id)}</p>
            <p className="text-xs text-muted-foreground">Dependencias</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-2">
            <p className="text-lg font-semibold text-foreground">{inDegree(graph, selectedNode.id)}</p>
            <p className="text-xs text-muted-foreground">Dependientes</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-2">
            <p className="text-lg font-semibold text-foreground">{outDegree(graph, selectedNode.id) + inDegree(graph, selectedNode.id)}</p>
            <p className="text-xs text-muted-foreground">Relaciones</p>
          </div>
        </div>
      </div>

      {/* Direct dependencies */}
      {directDeps.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
            Depende de ({directDeps.length})
          </p>
          <ul className="space-y-1">
            {directDeps.map((dep) => (
              <li key={dep.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`px-1.5 py-0.5 rounded text-xs ${TYPE_COLOR[dep.type] ?? "bg-muted"}`}>
                  {NODE_TYPE_LABELS[dep.type]}
                </span>
                <span className="truncate">{dep.metadata.label as string}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Direct dependents */}
      {directDependents.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
            Lo necesitan ({directDependents.length})
          </p>
          <ul className="space-y-1">
            {directDependents.map((dep) => (
              <li key={dep.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`px-1.5 py-0.5 rounded text-xs ${TYPE_COLOR[dep.type] ?? "bg-muted"}`}>
                  {NODE_TYPE_LABELS[dep.type]}
                </span>
                <span className="truncate">{dep.metadata.label as string}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cascade impact */}
      {allDeps.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-red-600">
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wide">
              Impacto en cascada ({allDeps.length} entidades)
            </p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 space-y-2">
            {Array.from(grouped.entries()).map(([type, nodes]) => (
              <div key={type}>
                <p className="text-xs font-medium text-red-700">
                  {NODE_TYPE_LABELS[type as keyof typeof NODE_TYPE_LABELS] ?? type} ({nodes.length})
                </p>
                <ul className="pl-3 space-y-0.5">
                  {nodes.map((n) => (
                    <li key={n.id} className="text-xs text-red-600 truncate">
                      • {n.metadata.label as string}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {allDeps.length === 0 && directDeps.length === 0 && directDependents.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60 bg-muted/20 rounded-lg p-3">
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Este nodo no tiene relaciones en el grafo actual.</span>
        </div>
      )}
    </div>
  );
}

// ─── Node row ─────────────────────────────────────────────────────────────────

interface NodeRowProps {
  node: KnowledgeNode;
  graph: KnowledgeGraph;
  depth: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (node: KnowledgeNode) => void;
  onToggle: () => void;
  children?: React.ReactNode;
  hasChildren: boolean;
}

function NodeRow({
  node, graph, depth, isSelected, isExpanded, onSelect, onToggle, children, hasChildren,
}: NodeRowProps) {
  const outs = outDegree(graph, node.id);
  const ins = inDegree(graph, node.id);

  return (
    <div style={{ paddingLeft: `${depth * 16}px` }}>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? "bg-primary/10 border border-primary/30"
            : "hover:bg-muted/40"
        }`}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
        tabIndex={0}
        onClick={() => { onSelect(node); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(node); }
          if (e.key === "ArrowRight" && hasChildren && !isExpanded) { e.preventDefault(); onToggle(); }
          if (e.key === "ArrowLeft" && hasChildren && isExpanded) { e.preventDefault(); onToggle(); }
        }}
      >
        {/* Toggle chevron */}
        <button
          type="button"
          tabIndex={-1}
          aria-label={isExpanded ? "Colapsar" : "Expandir"}
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(); }}
          className={`flex-shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground/50 ${!hasChildren ? "invisible" : ""}`}
        >
          {isExpanded
            ? <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            : <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />}
        </button>

        {/* Type badge */}
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${TYPE_COLOR[node.type] ?? "bg-muted"}`}>
          {NODE_TYPE_LABELS[node.type]}
        </span>

        {/* Label */}
        <span className="text-xs text-foreground/80 truncate flex-1 min-w-0">
          {node.metadata.label as string}
        </span>

        {/* Edge counts */}
        <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-muted-foreground/50">
          <span title="Dependencias (aristas salientes)">↗{outs}</span>
          <span title="Dependientes (aristas entrantes)">↙{ins}</span>
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div role="group">{children}</div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PantallaKnowledgeGraph({
  problema,
  hypotheses,
  conceptualModels,
  operationalizationMatrices,
  contrastationMatrices,
  onVolver,
  onReiniciar,
}: Props) {
  // Build graph on render (on-demand, not persisted)
  const graph: KnowledgeGraph = useMemo(
    () => buildGraph({ problema, hypotheses, conceptualModels, operationalizationMatrices, contrastationMatrices }),
    [problema, hypotheses, conceptualModels, operationalizationMatrices, contrastationMatrices]
  );

  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["node-problem"]));

  const toggle = useCallback((nodeId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const orphans = useMemo(() => detectOrphans(graph), [graph]);
  const validation = useMemo(() => validateGraph(graph), [graph]);

  const hasOrphanWarnings =
    orphans.isolatedNodes.length > 0 ||
    orphans.brokenEdges.length > 0 ||
    orphans.indicatorsWithoutVariable.length > 0 ||
    orphans.sourcesWithoutIndicator.length > 0;

  // Find nodes by type
  const nodeByType = useCallback((type: string) => graph.nodes.filter((n) => n.type === type), [graph]);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full max-w-6xl mx-auto px-4 py-10"
    >
      <div className="space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="space-y-2">
          <div className="flex items-center gap-2.5 text-muted-foreground/70 text-xs font-mono uppercase tracking-widest">
            <Network className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Knowledge Graph</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground leading-snug">
            Grafo de conocimiento
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Representación explícita de todas las relaciones entre entidades del análisis.
            Selecciona un nodo para ver sus dependencias y el impacto de su eliminación.
          </p>
        </motion.div>

        {/* ── Stats bar ─────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Nodos", value: graph.nodes.length },
            { label: "Relaciones", value: graph.edges.length },
            { label: "Hipótesis", value: nodeByType("hypothesis").length },
            { label: "Variables", value: nodeByType("conceptual-variable").length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-white/60 p-3 text-center">
              <p className="text-xl font-semibold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Orphan / validation warnings ──────────────────────────────── */}
        {(hasOrphanWarnings || !validation.isValid) && (
          <motion.div
            variants={fadeUp}
            aria-live="polite"
            className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2"
          >
            <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold uppercase tracking-wide">
              <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Advertencias del grafo</span>
            </div>
            <ul className="text-xs text-amber-700 space-y-0.5 pl-4 list-disc">
              {orphans.isolatedNodes.length > 0 && (
                <li>{orphans.isolatedNodes.length} nodo(s) aislado(s) sin relaciones.</li>
              )}
              {orphans.brokenEdges.length > 0 && (
                <li>{orphans.brokenEdges.length} relación(es) con referencias rotas.</li>
              )}
              {orphans.indicatorsWithoutVariable.length > 0 && (
                <li>{orphans.indicatorsWithoutVariable.length} indicador(es) sin variable asignada.</li>
              )}
              {orphans.sourcesWithoutIndicator.length > 0 && (
                <li>{orphans.sourcesWithoutIndicator.length} fuente(s) sin indicador asociado.</li>
              )}
              {validation.errors.filter((e) => e.code === "illegal-cycle").length > 0 && (
                <li>Se detectaron ciclos en el grafo — estructura inválida.</li>
              )}
            </ul>
          </motion.div>
        )}

        {/* ── Main layout: tree + impact panel ─────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-5">

          {/* Tree */}
          <div className="rounded-xl border border-border bg-white/50 p-4 min-h-[400px] overflow-auto" role="tree" aria-label="Árbol del Knowledge Graph">
            {graph.nodes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground/50">
                <Network className="w-8 h-8 opacity-30" aria-hidden="true" />
                <p className="text-sm">No hay datos en la sesión. Completa al menos una etapa del análisis.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {/* Problema */}
                {nodeByType("problem").map((probNode) => (
                  <NodeRow
                    key={probNode.id}
                    node={probNode}
                    graph={graph}
                    depth={0}
                    isSelected={selectedNode?.id === probNode.id}
                    isExpanded={expanded.has(probNode.id)}
                    hasChildren={nodeByType("hypothesis").length > 0}
                    onSelect={setSelectedNode}
                    onToggle={() => toggle(probNode.id)}
                  >
                    {/* Hipótesis */}
                    {nodeByType("hypothesis").map((hypNode) => (
                      <NodeRow
                        key={hypNode.id}
                        node={hypNode}
                        graph={graph}
                        depth={1}
                        isSelected={selectedNode?.id === hypNode.id}
                        isExpanded={expanded.has(hypNode.id)}
                        hasChildren={graph.edges.some((e) => e.target === hypNode.id && graph.nodes.find((n) => n.id === e.source)?.type === "conceptual-variable")}
                        onSelect={setSelectedNode}
                        onToggle={() => toggle(hypNode.id)}
                      >
                        {/* Variables for this hypothesis */}
                        {graph.edges
                          .filter((e) => e.target === hypNode.id && e.relationType === "belongs-to")
                          .map((e) => graph.nodes.find((n) => n.id === e.source))
                          .filter(Boolean)
                          .map((varNode) => varNode!)
                          .map((varNode) => (
                            <NodeRow
                              key={varNode.id}
                              node={varNode}
                              graph={graph}
                              depth={2}
                              isSelected={selectedNode?.id === varNode.id}
                              isExpanded={expanded.has(varNode.id)}
                              hasChildren={graph.edges.some((e) => e.target === varNode.id && (e.relationType === "derives-from" || e.relationType === "measures"))}
                              onSelect={setSelectedNode}
                              onToggle={() => toggle(varNode.id)}
                            >
                              {/* Indicators for this variable */}
                              {graph.edges
                                .filter((e) => e.target === varNode.id && e.relationType === "derives-from")
                                .map((e) => graph.nodes.find((n) => n.id === e.source))
                                .filter(Boolean)
                                .map((indNode) => indNode!)
                                .map((indNode) => (
                                  <NodeRow
                                    key={indNode.id}
                                    node={indNode}
                                    graph={graph}
                                    depth={3}
                                    isSelected={selectedNode?.id === indNode.id}
                                    isExpanded={expanded.has(indNode.id)}
                                    hasChildren={graph.edges.some((e) => e.source === indNode.id && e.relationType === "uses" && graph.nodes.find((n) => n.id === e.target)?.type === "evidence-source") ||
                                      graph.edges.some((e) => e.target === indNode.id && e.relationType === "uses")}
                                    onSelect={setSelectedNode}
                                    onToggle={() => toggle(indNode.id)}
                                  >
                                    {/* Sources that cover this indicator */}
                                    {graph.edges
                                      .filter((e) => e.target === indNode.id && e.relationType === "uses")
                                      .map((e) => graph.nodes.find((n) => n.id === e.source))
                                      .filter((n) => n?.type === "evidence-source")
                                      .filter(Boolean)
                                      .map((srcNode) => srcNode!)
                                      .map((srcNode) => (
                                        <NodeRow
                                          key={`${indNode.id}--${srcNode.id}`}
                                          node={srcNode}
                                          graph={graph}
                                          depth={4}
                                          isSelected={selectedNode?.id === srcNode.id}
                                          isExpanded={false}
                                          hasChildren={false}
                                          onSelect={setSelectedNode}
                                          onToggle={() => {}}
                                        >
                                          {null}
                                        </NodeRow>
                                      ))}
                                  </NodeRow>
                                ))}
                            </NodeRow>
                          ))}
                      </NodeRow>
                    ))}
                  </NodeRow>
                ))}

                {/* Show op-rows and ct-rows separately if any */}
                {nodeByType("operationalization-row").length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <p className="text-xs font-mono text-muted-foreground/50 uppercase tracking-wide px-2 pb-1.5">
                      Filas de operacionalización ({nodeByType("operationalization-row").length})
                    </p>
                    {nodeByType("operationalization-row").map((rowNode) => (
                      <NodeRow
                        key={rowNode.id}
                        node={rowNode}
                        graph={graph}
                        depth={0}
                        isSelected={selectedNode?.id === rowNode.id}
                        isExpanded={false}
                        hasChildren={false}
                        onSelect={setSelectedNode}
                        onToggle={() => {}}
                      >
                        {null}
                      </NodeRow>
                    ))}
                  </div>
                )}
                {nodeByType("contrastation-row").length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <p className="text-xs font-mono text-muted-foreground/50 uppercase tracking-wide px-2 pb-1.5">
                      Criterios de contrastación ({nodeByType("contrastation-row").length})
                    </p>
                    {nodeByType("contrastation-row").map((rowNode) => (
                      <NodeRow
                        key={rowNode.id}
                        node={rowNode}
                        graph={graph}
                        depth={0}
                        isSelected={selectedNode?.id === rowNode.id}
                        isExpanded={false}
                        hasChildren={false}
                        onSelect={setSelectedNode}
                        onToggle={() => {}}
                      >
                        {null}
                      </NodeRow>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Impact panel */}
          <div className="rounded-xl border border-border bg-white/50 p-4">
            <p className="text-xs font-mono text-muted-foreground/60 uppercase tracking-widest mb-4">
              Impacto del cambio
            </p>
            <ImpactPanel graph={graph} selectedNode={selectedNode} />
          </div>
        </motion.div>

        {/* ── Navigation ────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onVolver}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-white text-sm font-medium text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver a revisión metodológica
          </button>
          <button
            type="button"
            onClick={onReiniciar}
            className="flex items-center gap-1.5 text-sm text-muted-foreground/50 hover:text-red-500 transition-colors duration-200"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reiniciar análisis
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
