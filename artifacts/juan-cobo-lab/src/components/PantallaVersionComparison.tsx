/**
 * S-024 — PantallaVersionComparison
 *
 * Side-by-side diff viewer for two project snapshots.
 * Read-only — no editing from this screen.
 */

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Minus, Pencil, ArrowUpDown, Equal, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import type { ProjectSnapshot, ProjectEntityChange, ProjectChangeType } from "@/project-versioning/types";
import { compareSnapshots, generateMethodologicalChangelog } from "@/project-versioning/VersionComparisonService";

const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

// ─── Change type display ──────────────────────────────────────────────────────

const CHANGE_ICONS: Record<ProjectChangeType, React.ReactNode> = {
  added:    <Plus    className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />,
  removed:  <Minus   className="w-3.5 h-3.5 text-red-500"    aria-hidden="true" />,
  modified: <Pencil  className="w-3.5 h-3.5 text-amber-600"  aria-hidden="true" />,
  reordered:<ArrowUpDown className="w-3.5 h-3.5 text-blue-500"  aria-hidden="true" />,
  unchanged:<Equal   className="w-3.5 h-3.5 text-muted-foreground/40" aria-hidden="true" />,
};

const CHANGE_LABELS: Record<ProjectChangeType, string> = {
  added: "Agregado",
  removed: "Eliminado",
  modified: "Modificado",
  reordered: "Reordenado",
  unchanged: "Sin cambios",
};

const CHANGE_BG: Record<ProjectChangeType, string> = {
  added:    "bg-emerald-50 border-emerald-200",
  removed:  "bg-red-50 border-red-200",
  modified: "bg-amber-50 border-amber-200",
  reordered:"bg-blue-50 border-blue-200",
  unchanged:"bg-muted/20 border-border/30",
};

const ENTITY_LABELS: Record<string, string> = {
  hypothesis: "Hipótesis",
  conceptualModel: "Modelos conceptuales",
  conceptualVariable: "Variables",
  conceptualIndicator: "Indicadores",
  evidenceSource: "Fuentes de evidencia",
  operationalizationMatrix: "Matrices de operacionalización",
  contrastationMatrix: "Matrices de contrastación",
  evidenceEvaluationMatrix: "Matrices de evaluación de evidencia",
  observedEvidence: "Evidencias observadas",
  hypothesisEvidenceConclusion: "Conclusiones",
  reportDefinition: "Informes",
  problema: "Problema",
  pack: "Pack de conocimiento",
};

type FilterType = "all" | ProjectChangeType;

// ─── Change row ───────────────────────────────────────────────────────────────

function ChangeRow({ change }: { change: ProjectEntityChange }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = !!(change.before ?? change.after ?? change.changedFields?.length);

  return (
    <li className={`rounded-lg border px-3 py-2.5 ${CHANGE_BG[change.changeType]}`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex-shrink-0" aria-label={CHANGE_LABELS[change.changeType]}>
          {CHANGE_ICONS[change.changeType]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-foreground/80">
              {ENTITY_LABELS[change.entityType] ?? change.entityType}
            </span>
            <span className="font-mono text-xs text-muted-foreground truncate max-w-xs" title={change.entityId}>
              {change.entityId.length > 20 ? `${change.entityId.slice(0, 16)}…` : change.entityId}
            </span>
            {change.changeType === "modified" && change.changedFields && change.changedFields.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({change.changedFields.slice(0, 4).join(", ")}{change.changedFields.length > 4 ? "…" : ""})
              </span>
            )}
          </div>
          {hasDetail && (
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="mt-1 text-xs text-primary/60 hover:text-primary flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded"
              aria-expanded={expanded}
            >
              {expanded ? <ChevronDown className="w-3 h-3" aria-hidden="true" /> : <ChevronRight className="w-3 h-3" aria-hidden="true" />}
              {expanded ? "Ocultar detalle" : "Ver detalle"}
            </button>
          )}
          {expanded && hasDetail && (
            <div className="mt-2 space-y-1.5">
              {change.before !== undefined && (
                <div>
                  <span className="text-xs font-mono text-red-600">− Antes:</span>
                  <pre className="text-xs bg-white/60 rounded px-2 py-1 overflow-x-auto mt-0.5 max-h-32 text-muted-foreground">
                    {JSON.stringify(change.before, null, 2)}
                  </pre>
                </div>
              )}
              {change.after !== undefined && (
                <div>
                  <span className="text-xs font-mono text-emerald-600">+ Después:</span>
                  <pre className="text-xs bg-white/60 rounded px-2 py-1 overflow-x-auto mt-0.5 max-h-32 text-muted-foreground">
                    {JSON.stringify(change.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  baseSnapshot: ProjectSnapshot;
  targetSnapshot: ProjectSnapshot;
  onVolver: () => void;
}

export function PantallaVersionComparison({ baseSnapshot, targetSnapshot, onVolver }: Props) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [showUnchanged, setShowUnchanged] = useState(false);

  const diff = useMemo(() => compareSnapshots(baseSnapshot, targetSnapshot), [baseSnapshot, targetSnapshot]);
  const changelog = useMemo(() => generateMethodologicalChangelog(diff), [diff]);

  const visibleChanges = useMemo(() => {
    let changes = diff.changes;
    if (!showUnchanged) changes = changes.filter((c) => c.changeType !== "unchanged");
    if (filter !== "all") changes = changes.filter((c) => c.changeType === filter);
    return changes;
  }, [diff.changes, filter, showUnchanged]);

  const { summary } = diff;

  const filterOptions: Array<{ value: FilterType; label: string; count: number }> = [
    { value: "all", label: "Todo", count: diff.changes.filter((c) => c.changeType !== "unchanged").length },
    { value: "added", label: "Agregados", count: summary.added },
    { value: "removed", label: "Eliminados", count: summary.removed },
    { value: "modified", label: "Modificados", count: summary.modified },
    { value: "reordered", label: "Reordenados", count: summary.reordered },
  ];

  return (
    <motion.div
      initial="hidden" animate="show" variants={container}
      className="min-h-screen bg-background/95 px-4 py-10 sm:px-8"
    >
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <motion.div variants={fadeUp}>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Comparación de versiones</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            <span><strong>Base:</strong> {baseSnapshot.version}</span>
            <span>→</span>
            <span><strong>Objetivo:</strong> {targetSnapshot.version}</span>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Agregados", count: summary.added, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
            { label: "Eliminados", count: summary.removed, color: "text-red-600 bg-red-50 border-red-200" },
            { label: "Modificados", count: summary.modified, color: "text-amber-600 bg-amber-50 border-amber-200" },
            { label: "Reordenados", count: summary.reordered, color: "text-blue-600 bg-blue-50 border-blue-200" },
            { label: "Sin cambios", count: summary.unchanged, color: "text-muted-foreground bg-muted/20 border-border/30" },
          ].map(({ label, count, color }) => (
            <div key={label} className={`rounded-xl border px-3 py-2.5 text-center ${color}`}>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Breaking changes alert */}
        {summary.hasBreakingChanges && (
          <motion.div variants={fadeUp} className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3" role="alert">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-red-800">
              <strong>Cambios disruptivos detectados.</strong> Se eliminaron entidades que pueden tener dependencias downstream (hipótesis, variables, indicadores o evidencias). Revisa el impacto metodológico antes de continuar.
            </p>
          </motion.div>
        )}

        {/* Changelog by entity type */}
        {changelog.sections.length > 0 && (
          <motion.div variants={fadeUp} className="rounded-xl border border-border bg-white/80 p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Changelog metodológico</h2>
            <div className="space-y-2">
              {changelog.sections.map((s) => (
                <div key={s.entityType} className="flex items-start gap-3">
                  <span className="text-sm font-medium text-foreground/80 w-40 flex-shrink-0">{s.label}</span>
                  <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                    {s.added > 0 && <span className="text-emerald-600">+{s.added} agregados</span>}
                    {s.removed > 0 && <span className="text-red-500">−{s.removed} eliminados</span>}
                    {s.modified > 0 && <span className="text-amber-600">~{s.modified} modificados</span>}
                    {s.reordered > 0 && <span className="text-blue-500">⇅{s.reordered} reordenados</span>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div variants={fadeUp} className="flex flex-wrap gap-2 items-center">
          {filterOptions.map(({ value, label, count }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${filter === value ? "bg-primary text-primary-foreground" : "border border-border text-foreground/70 hover:border-primary/40"}`}
              aria-pressed={filter === value}
            >
              {label} ({count})
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.target.checked)}
              className="rounded"
              aria-label="Mostrar entidades sin cambios"
            />
            Mostrar sin cambios
          </label>
        </motion.div>

        {/* Change list */}
        <motion.div variants={fadeUp}>
          {visibleChanges.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No hay cambios visibles con los filtros seleccionados.
            </div>
          ) : (
            <ul className="space-y-2" role="list" aria-label="Lista de cambios">
              {visibleChanges.map((c, i) => (
                <ChangeRow key={`${c.entityType}-${c.entityId}-${i}`} change={c} />
              ))}
            </ul>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div variants={fadeUp} className="pt-2">
          <button
            type="button"
            onClick={onVolver}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-white text-sm font-medium text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver a versiones
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default PantallaVersionComparison;
