/**
 * S-024 — PantallaProjectVersions
 *
 * Main versioning UI: create snapshots, list versions, compare, export, import.
 * All methodological data passed as props — no internal state fetches.
 */

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, GitBranch, Shield, ShieldCheck, ShieldX,
  Download, Upload, ArrowLeft, Plus, ChevronRight,
  Clock, Tag, Hash, AlertTriangle, CheckCircle2, Circle,
  RotateCcw, Eye, Layers
} from "lucide-react";
import type { ProjectSnapshotPayload, ProjectSnapshot, ProjectVersion, ProjectVersionTag } from "@/project-versioning/types";
import {
  createProjectSnapshot,
  verifySnapshotIntegrity,
  addProjectSnapshot,
  removeProjectSnapshot,
} from "@/project-versioning/SnapshotService";
import {
  createProjectPackage,
  exportProjectPackage,
  buildExportFilename,
  createProjectVersion,
  addProjectVersion,
  removeProjectVersion,
} from "@/project-versioning/ProjectPackageService";
import { compareSnapshots } from "@/project-versioning/VersionComparisonService";

// ─── Fade variants ────────────────────────────────────────────────────────────

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  projectName: string;
  currentPayload: ProjectSnapshotPayload;
  snapshots: ProjectSnapshot[];
  versions: ProjectVersion[];
  onUpdateSnapshots: (snapshots: ProjectSnapshot[]) => void;
  onUpdateVersions: (versions: ProjectVersion[]) => void;
  onCompareVersions: (baseId: string, targetId: string) => void;
  onImport: () => void;
  onVolver: () => void;
  onReiniciar: () => void;
}

const VERSION_TAG_LABELS: Record<ProjectVersionTag, string> = {
  draft: "Borrador",
  review: "En revisión",
  approved: "Aprobada",
  published: "Publicada",
  archived: "Archivada",
};

const VERSION_TAG_COLORS: Record<ProjectVersionTag, string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  published: "bg-primary/10 text-primary",
  archived: "bg-gray-100 text-gray-500",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PantallaProjectVersions({
  projectId,
  projectName,
  currentPayload,
  snapshots,
  versions,
  onUpdateSnapshots,
  onUpdateVersions,
  onCompareVersions,
  onImport,
  onVolver,
  onReiniciar,
}: Props) {
  const [view, setView] = useState<"list" | "create">("list");
  const [versionLabel, setVersionLabel] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState<ProjectVersionTag | "">("");
  const [changeSummary, setChangeSummary] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  // Stats of current payload for preview
  const payloadStats = useMemo(() => ({
    hypotheses: currentPayload.hypotheses.length,
    variables: currentPayload.conceptualModels.flatMap((m) => m.variables).length,
    indicators: currentPayload.conceptualModels.flatMap((m) => m.indicators).length,
    sources: currentPayload.conceptualModels.flatMap((m) => m.evidenceSources).length,
    evidences: currentPayload.evidenceEvaluationMatrices.flatMap((m) => m.observedEvidence ?? []).length,
    conclusions: currentPayload.hypothesisEvidenceConclusions.length,
    reportDefs: currentPayload.reportDefinitions.length,
  }), [currentPayload]);

  const handleCreateSnapshot = useCallback(() => {
    if (!versionLabel.trim()) return;
    setCreating(true);
    try {
      const snap = createProjectSnapshot(
        currentPayload,
        {
          projectId,
          projectName,
          versionLabel: versionLabel.trim(),
          description: description.trim() || undefined,
          tags: tag ? [tag] : [],
          changeSummary: changeSummary.trim() || undefined,
        },
        versionLabel.trim()
      );
      const ver = createProjectVersion(snap.id, versionLabel.trim(), {
        tag: tag || undefined,
        notes: description.trim() || undefined,
        parentVersionId: versions.length > 0 ? versions[versions.length - 1].id : undefined,
      });
      const newSnapshots = addProjectSnapshot(snapshots, snap);
      const newVersions = addProjectVersion(versions, ver);
      onUpdateSnapshots(newSnapshots);
      onUpdateVersions(newVersions);
      setCreated(snap.id);
      setVersionLabel("");
      setDescription("");
      setTag("");
      setChangeSummary("");
      setView("list");
    } finally {
      setCreating(false);
    }
  }, [versionLabel, description, tag, changeSummary, currentPayload, projectId, projectName, snapshots, versions, onUpdateSnapshots, onUpdateVersions]);

  const handleDeleteSnapshot = useCallback((snapshotId: string) => {
    const result = removeProjectSnapshot(snapshots, versions, snapshotId);
    if (result === null) {
      alert("No se puede eliminar este snapshot porque hay versiones que lo referencian. Elimina primero las versiones relacionadas.");
      return;
    }
    onUpdateSnapshots(result);
  }, [snapshots, versions, onUpdateSnapshots]);

  const handleExport = useCallback(() => {
    const pkg = createProjectPackage(projectId, projectName, snapshots, versions);
    const content = exportProjectPackage(pkg);
    const filename = buildExportFilename(projectName, versions[versions.length - 1]?.label);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectId, projectName, snapshots, versions]);

  // Build sorted version+snapshot pairs
  const versionItems = useMemo(() =>
    versions
      .map((v) => ({ version: v, snapshot: snapshots.find((s) => s.id === v.snapshotId) }))
      .filter((item): item is { version: ProjectVersion; snapshot: ProjectSnapshot } => !!item.snapshot)
      .sort((a, b) => b.version.createdAt.localeCompare(a.version.createdAt)),
    [versions, snapshots]
  );

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={container}
      className="min-h-screen bg-background/95 px-4 py-10 sm:px-8"
    >
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-primary/70" aria-hidden="true" />
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                Versiones y snapshots
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Captura, compara y exporta el estado metodológico del proyecto.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={onImport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all"
              aria-label="Importar proyecto"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              Importar
            </button>
            {snapshots.length > 0 && (
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 text-sm text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all"
                aria-label="Exportar proyecto"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Exportar
              </button>
            )}
          </div>
        </motion.div>

        {/* Security notice */}
        <motion.div variants={fadeUp} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-xs text-amber-800">
            <strong>Privacidad:</strong> el paquete exportado contiene el contenido metodológico completo del proyecto en texto plano. El hash garantiza integridad, no confidencialidad. Protege el archivo exportado.
          </p>
        </motion.div>

        {/* Create / List toggle */}
        <motion.div variants={fadeUp} className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${view === "list" ? "bg-primary text-primary-foreground" : "border border-border text-foreground/70 hover:border-primary/40"}`}
            aria-pressed={view === "list"}
          >
            Lista de versiones ({versions.length})
          </button>
          <button
            type="button"
            onClick={() => setView("create")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${view === "create" ? "bg-primary text-primary-foreground" : "border border-border text-foreground/70 hover:border-primary/40"}`}
            aria-pressed={view === "create"}
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Crear snapshot
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {view === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl border border-border bg-white/80 p-6 space-y-6"
            >
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary/60" aria-hidden="true" />
                Nuevo snapshot
              </h2>

              {/* Payload preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Hipótesis", value: payloadStats.hypotheses },
                  { label: "Variables", value: payloadStats.variables },
                  { label: "Indicadores", value: payloadStats.indicators },
                  { label: "Fuentes", value: payloadStats.sources },
                  { label: "Evidencias", value: payloadStats.evidences },
                  { label: "Conclusiones", value: payloadStats.conclusions },
                  { label: "Informes", value: payloadStats.reportDefs },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-center">
                    <div className="text-xl font-bold text-primary">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="version-label" className="block text-sm font-medium text-foreground/80 mb-1">
                    Etiqueta de versión <span className="text-red-500" aria-label="requerido">*</span>
                  </label>
                  <input
                    id="version-label"
                    type="text"
                    value={versionLabel}
                    onChange={(e) => setVersionLabel(e.target.value)}
                    placeholder="ej. v1 — análisis inicial"
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-foreground/80 mb-1">
                    Descripción <span className="text-muted-foreground text-xs">(opcional)</span>
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Notas metodológicas sobre esta versión..."
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="version-tag" className="block text-sm font-medium text-foreground/80 mb-1">
                      Estado
                    </label>
                    <select
                      id="version-tag"
                      value={tag}
                      onChange={(e) => setTag(e.target.value as ProjectVersionTag | "")}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="">Sin estado</option>
                      {(Object.entries(VERSION_TAG_LABELS) as [ProjectVersionTag, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="change-summary" className="block text-sm font-medium text-foreground/80 mb-1">
                      Resumen de cambios
                    </label>
                    <input
                      id="change-summary"
                      type="text"
                      value={changeSummary}
                      onChange={(e) => setChangeSummary(e.target.value)}
                      placeholder="ej. Agregadas 3 fuentes de evidencia"
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateSnapshot}
                  disabled={!versionLabel.trim() || creating}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all"
                  aria-disabled={!versionLabel.trim() || creating}
                >
                  <Camera className="w-4 h-4" aria-hidden="true" />
                  {creating ? "Creando…" : "Crear snapshot"}
                </button>
              </div>
            </motion.div>
          )}

          {view === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              {created && (
                <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  Snapshot creado correctamente.
                </div>
              )}

              {versionItems.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" aria-hidden="true" />
                  <p className="text-sm">No hay snapshots todavía.</p>
                  <p className="text-xs mt-1">Crea el primero para comenzar a versionar el proyecto.</p>
                </div>
              ) : (
                <ul className="space-y-3" role="list" aria-label="Lista de versiones">
                  {versionItems.map(({ version, snapshot }, idx) => {
                    const integrity = verifySnapshotIntegrity(snapshot);
                    const prevSnapshot = idx < versionItems.length - 1
                      ? versionItems[idx + 1].snapshot
                      : null;
                    const diffSummary = prevSnapshot
                      ? compareSnapshots(prevSnapshot, snapshot).summary
                      : null;

                    return (
                      <li key={version.id} className="rounded-xl border border-border bg-white/80 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground text-sm">{version.label}</span>
                              {version.tag && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VERSION_TAG_COLORS[version.tag]}`}>
                                  {VERSION_TAG_LABELS[version.tag]}
                                </span>
                              )}
                            </div>
                            {version.notes && (
                              <p className="text-xs text-muted-foreground">{version.notes}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" aria-hidden="true" />
                                {new Date(snapshot.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}
                              </span>
                              <span className="flex items-center gap-1 font-mono" title="Hash de integridad">
                                <Hash className="w-3 h-3" aria-hidden="true" />
                                {snapshot.contentHash.slice(0, 12)}…
                              </span>
                              <span
                                className={`flex items-center gap-1 ${integrity ? "text-emerald-600" : "text-red-500"}`}
                                aria-label={integrity ? "Integridad verificada" : "Error de integridad"}
                              >
                                {integrity
                                  ? <><ShieldCheck className="w-3 h-3" aria-hidden="true" /><span>Íntegro</span></>
                                  : <><ShieldX className="w-3 h-3" aria-hidden="true" /><span>Hash inválido</span></>
                                }
                              </span>
                              {diffSummary && (diffSummary.added + diffSummary.removed + diffSummary.modified) > 0 && (
                                <span className="text-muted-foreground">
                                  +{diffSummary.added} −{diffSummary.removed} ~{diffSummary.modified}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {idx < versionItems.length - 1 && (
                              <button
                                type="button"
                                onClick={() => onCompareVersions(versionItems[idx + 1].snapshot.id, snapshot.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all"
                                aria-label={`Comparar ${version.label} con la versión anterior`}
                              >
                                <Eye className="w-3 h-3" aria-hidden="true" />
                                Comparar
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav */}
        <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="button"
            onClick={onVolver}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-white text-sm font-medium text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver
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

export default PantallaProjectVersions;
