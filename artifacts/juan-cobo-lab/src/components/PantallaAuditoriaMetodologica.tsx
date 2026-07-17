/**
 * PantallaAuditoriaMetodologica — S-021
 *
 * Audit screen: runs MethodologicalConsistencyService and presents findings
 * with full filter UI, finding detail panel, and navigation to affected stages.
 *
 * Accessibility:
 *  - aria-live on filter results
 *  - Severity badges with text (not just color)
 *  - Keyboard: Tab/Enter to select finding, filter buttons accessible
 *  - Semantic headings
 *  - Descriptive button labels
 */

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw, AlertCircle, AlertTriangle, Lightbulb, ChevronRight, X } from "lucide-react";
import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type { OperationalizationMatrix } from "@/operationalization/types";
import type { ContrastationMatrix } from "@/contrastation/types";
import {
  runMethodologicalAudit,
  groupFindingsByCategory,
} from "@/methodological-consistency/MethodologicalConsistencyService";
import type {
  MethodologicalFinding,
  MethodologicalSeverity,
  MethodologicalRuleCategory,
  MethodologicalEntityType,
} from "@/methodological-consistency/types";
import {
  SEVERITY_LABELS,
  RULE_CATEGORY_LABELS,
  ENTITY_TYPE_LABELS,
} from "@/methodological-consistency/types";

// ─── Animation ────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  problema: string;
  hypotheses: PolicyHypothesis[];
  conceptualModels: ConceptualModel[];
  operationalizationMatrices: OperationalizationMatrix[];
  contrastationMatrices: ContrastationMatrix[];
  /** S-022: evidence evaluation data for EVD rules */
  evidenceEvaluationMatrices?: import("@/evidence-evaluation/types").EvidenceEvaluationMatrix[];
  hypothesisEvidenceConclusions?: import("@/evidence-evaluation/types").HypothesisEvidenceConclusion[];
  onVolver: () => void;
  onReiniciar: () => void;
  onIrAHipotesis: () => void;
  onIrAModelo: () => void;
  onIrAOperacionalizacion: () => void;
  onIrAContrastation: () => void;
  /** S-020 optional */
  onVerKnowledgeGraph?: () => void;
}

// ─── Entity type → nav callback ───────────────────────────────────────────────

function entityNav(
  type: MethodologicalEntityType,
  cbs: Pick<Props, "onIrAHipotesis" | "onIrAModelo" | "onIrAOperacionalizacion" | "onIrAContrastation">
): (() => void) | null {
  switch (type) {
    case "hypothesis":
      return cbs.onIrAHipotesis;
    case "conceptual-model":
    case "conceptual-variable":
    case "indicator":
    case "evidence-source":
      return cbs.onIrAModelo;
    case "operationalization-matrix":
    case "operationalization-row":
      return cbs.onIrAOperacionalizacion;
    case "contrastation-matrix":
    case "contrastation-row":
      return cbs.onIrAContrastation;
    default:
      return null;
  }
}

// ─── Severity styles ──────────────────────────────────────────────────────────

const SEVERITY_STYLE: Record<MethodologicalSeverity, { badge: string; icon: React.ReactNode; border: string }> = {
  error:      { badge: "bg-red-100 text-red-700",     icon: <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />,   border: "border-red-200" },
  warning:    { badge: "bg-amber-100 text-amber-700", icon: <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />, border: "border-amber-200" },
  suggestion: { badge: "bg-blue-100 text-blue-700",   icon: <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />,    border: "border-blue-200" },
};

// ─── Finding card ─────────────────────────────────────────────────────────────

function FindingCard({
  finding,
  selected,
  onSelect,
}: {
  finding: MethodologicalFinding;
  selected: boolean;
  onSelect: () => void;
}) {
  const sev = SEVERITY_STYLE[finding.severity];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${SEVERITY_LABELS[finding.severity]}: ${finding.title}`}
      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        selected
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : `${sev.border} bg-white/60 hover:bg-white hover:shadow-sm`
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 shrink-0 ${sev.badge}`}>
          {sev.icon}
          {finding.ruleId}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground leading-snug truncate">
            {finding.title}
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-2">
            {finding.explanation.slice(0, 90)}…
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Finding detail ───────────────────────────────────────────────────────────

function FindingDetail({
  finding,
  callbacks,
  onClose,
}: {
  finding: MethodologicalFinding;
  callbacks: Pick<Props, "onIrAHipotesis" | "onIrAModelo" | "onIrAOperacionalizacion" | "onIrAContrastation">;
  onClose: () => void;
}) {
  const sev = SEVERITY_STYLE[finding.severity];

  return (
    <motion.div
      key={finding.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border ${sev.border} bg-white overflow-hidden h-full flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sev.badge}`}>
              {sev.icon}
              {SEVERITY_LABELS[finding.severity]}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60">{finding.ruleId}</span>
          </div>
          <h3 className="text-sm font-semibold text-foreground">{finding.title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Explanation */}
        <section aria-labelledby={`exp-${finding.id}`}>
          <h4 id={`exp-${finding.id}`} className="text-[10px] font-mono font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2">
            ¿Qué se encontró?
          </h4>
          <p className="text-xs text-foreground/80 leading-relaxed">{finding.explanation}</p>
        </section>

        {/* Evidence */}
        {finding.evidence.length > 0 && (
          <section aria-labelledby={`ev-${finding.id}`}>
            <h4 id={`ev-${finding.id}`} className="text-[10px] font-mono font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2">
              Evidencia estructural
            </h4>
            <ul className="space-y-1" role="list">
              {finding.evidence.map((ev, i) => (
                <li key={i} className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-1.5 font-mono">
                  {ev}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Entity refs */}
        {finding.entityRefs.length > 0 && (
          <section aria-labelledby={`ent-${finding.id}`}>
            <h4 id={`ent-${finding.id}`} className="text-[10px] font-mono font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2">
              Entidades involucradas
            </h4>
            <ul className="space-y-1.5" role="list">
              {finding.entityRefs.map((ref, i) => {
                const cb = entityNav(ref.type, callbacks);
                return (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 bg-white/50">
                    <div className="min-w-0">
                      <span className="text-[10px] text-muted-foreground/60 block">{ENTITY_TYPE_LABELS[ref.type] ?? ref.type}</span>
                      <span className="text-xs text-foreground/80 truncate block">{ref.label ?? ref.id}</span>
                    </div>
                    {cb && (
                      <button
                        type="button"
                        onClick={cb}
                        aria-label={`Ir a ${ENTITY_TYPE_LABELS[ref.type] ?? ref.type}: ${ref.label ?? ref.id}`}
                        className="shrink-0 flex items-center gap-1 text-[11px] text-primary hover:text-primary/70 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded transition-colors"
                      >
                        Ir a etapa
                        <ChevronRight className="w-3 h-3" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Suggested action */}
        {finding.suggestedAction && (
          <section aria-labelledby={`act-${finding.id}`}>
            <h4 id={`act-${finding.id}`} className="text-[10px] font-mono font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2">
              Acción sugerida
            </h4>
            <p className="text-xs text-foreground/70 bg-muted/20 rounded-lg px-3 py-2.5 border border-border/40 leading-relaxed">
              {finding.suggestedAction}
            </p>
          </section>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PantallaAuditoriaMetodologica({
  problema,
  hypotheses,
  conceptualModels,
  operationalizationMatrices,
  contrastationMatrices,
  evidenceEvaluationMatrices,
  hypothesisEvidenceConclusions,
  onVolver,
  onReiniciar,
  onIrAHipotesis,
  onIrAModelo,
  onIrAOperacionalizacion,
  onIrAContrastation,
  onVerKnowledgeGraph,
}: Props) {

  // ── Run audit (memoized — deterministic from session) ──────────────────────
  const audit = useMemo(
    () =>
      runMethodologicalAudit({
        problema,
        hypotheses,
        conceptualModels,
        operationalizationMatrices,
        contrastationMatrices,
        evidenceEvaluationMatrices,
        hypothesisEvidenceConclusions,
      } as any),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── UI state ───────────────────────────────────────────────────────────────
  const [filterSeverity, setFilterSeverity] = useState<"all" | MethodologicalSeverity>("all");
  const [filterCategory, setFilterCategory] = useState<"all" | MethodologicalRuleCategory>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Filtered findings ──────────────────────────────────────────────────────
  const byCategory = useMemo(() => groupFindingsByCategory(audit.findings), [audit.findings]);
  const categories = useMemo(() => [...byCategory.keys()] as MethodologicalRuleCategory[], [byCategory]);

  const filtered = useMemo(() => {
    return audit.findings.filter((f) => {
      if (filterSeverity !== "all" && f.severity !== filterSeverity) return false;
      if (filterCategory !== "all") {
        const catFindings = byCategory.get(filterCategory) ?? [];
        if (!catFindings.some((cf) => cf.id === f.id)) return false;
      }
      return true;
    });
  }, [audit.findings, filterSeverity, filterCategory, byCategory]);

  const selectedFinding = useMemo(
    () => filtered.find((f) => f.id === selectedId) ?? null,
    [filtered, selectedId]
  );

  const { errors, warnings, suggestions } = audit.summary;

  const navCbs = { onIrAHipotesis, onIrAModelo, onIrAOperacionalizacion, onIrAContrastation };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      key="auditoria-metodologica"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
      className="max-w-5xl mx-auto px-4 py-10 space-y-6"
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono font-semibold text-muted-foreground/50 uppercase tracking-widest">
            Auditoría metodológica
          </span>
          {audit.summary.blocking ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" aria-hidden="true" /> Bloqueante
            </span>
          ) : audit.summary.complete ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Completo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Con advertencias
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Evaluación de consistencia</h1>
        <p className="text-sm text-muted-foreground/70">
          {hypotheses.length} {hypotheses.length === 1 ? "hipótesis" : "hipótesis"} evaluada{hypotheses.length !== 1 ? "s" : ""}
          {" · "}
          {audit.evaluatedRuleIds.length} reglas ejecutadas
          {" · "}
          {new Date(audit.generatedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
        </p>

        {/* Summary badges */}
        <div className="flex flex-wrap items-center gap-3 mt-4" role="region" aria-label="Resumen de hallazgos">
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle className="w-4 h-4 text-red-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-red-700">{errors}</span>
            <span className="text-xs text-red-600/70">error{errors !== 1 ? "es" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 border border-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-amber-700">{warnings}</span>
            <span className="text-xs text-amber-600/70">advertencia{warnings !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 border border-blue-100">
            <Lightbulb className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-blue-700">{suggestions}</span>
            <span className="text-xs text-blue-600/70">sugerencia{suggestions !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </motion.div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Filtros de hallazgos">
          {/* Severity filters */}
          {(["all", "error", "warning", "suggestion"] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => { setFilterSeverity(sev); setSelectedId(null); }}
              aria-pressed={filterSeverity === sev}
              aria-label={`Filtrar por ${sev === "all" ? "todos" : SEVERITY_LABELS[sev]}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                filterSeverity === sev
                  ? "bg-foreground text-background"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {sev === "all" ? "Todos" : SEVERITY_LABELS[sev]}
            </button>
          ))}
          {/* Separator */}
          <span className="w-px h-6 bg-border/50 self-center" aria-hidden="true" />
          {/* Category filters */}
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { setFilterCategory(cat === filterCategory ? "all" : cat); setSelectedId(null); }}
              aria-pressed={filterCategory === cat}
              aria-label={`Filtrar por categoría: ${RULE_CATEGORY_LABELS[cat]}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                filterCategory === cat
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted/30 text-muted-foreground/70 hover:bg-muted/50"
              }`}
            >
              {RULE_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Main content: list + detail ──────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {filtered.length} hallazgo{filtered.length !== 1 ? "s" : ""} mostrado{filtered.length !== 1 ? "s" : ""}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground/50 text-sm">
            No hay hallazgos con los filtros seleccionados.
          </div>
        ) : (
          <div className={`grid gap-4 ${selectedFinding ? "lg:grid-cols-[1fr_1.2fr]" : "grid-cols-1"}`}>
            {/* Findings list */}
            <div className="space-y-2" role="list" aria-label={`${filtered.length} hallazgos`}>
              {filtered.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  selected={selectedId === finding.id}
                  onSelect={() => setSelectedId(selectedId === finding.id ? null : finding.id)}
                />
              ))}
            </div>

            {/* Detail panel */}
            {selectedFinding && (
              <div className="min-h-[320px]">
                <FindingDetail
                  finding={selectedFinding}
                  callbacks={navCbs}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onVolver}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-white text-sm font-medium text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Volver a revisión
        </button>
        {onVerKnowledgeGraph && (
          <button
            type="button"
            onClick={onVerKnowledgeGraph}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-white text-sm font-medium text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
          >
            Ver Knowledge Graph
          </button>
        )}
        <button
          type="button"
          onClick={onReiniciar}
          className="flex items-center gap-1.5 text-sm text-muted-foreground/50 hover:text-red-500 transition-colors duration-200"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Reiniciar análisis
        </button>
      </motion.div>
    </motion.div>
  );
}
