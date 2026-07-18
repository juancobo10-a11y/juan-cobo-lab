/**
 * S-023 — PantallaReportBuilder
 *
 * UI for the Report Builder:
 *   - Configurar tab: edit nombre/desc/fecha, toggle sections, reorder sections
 *   - Vista previa tab: read-only rendered report (HTML inline)
 *   - Export: Markdown, HTML, JSON (browser download)
 *   - Keyboard accessible; semantic headings; tables accessible
 */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Eye,
  Settings,
  Download,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Info,
  CheckCircle,
  RotateCcw,
} from "lucide-react";

import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type { OperationalizationMatrix } from "@/operationalization/types";
import type { ContrastationMatrix } from "@/contrastation/types";
import type { EvidenceEvaluationMatrix, HypothesisEvidenceConclusion } from "@/evidence-evaluation/types";
import type { MethodologicalAudit } from "@/methodological-consistency/types";
import type { ReportDefinition, ReportSectionType, ReportBuildInput } from "@/report-builder/types";
import {
  createReportDefinition,
  updateReportDefinition,
  toggleSection,
  reorderSections,
  generateReport,
  validateReport,
  summarizeReport,
} from "@/report-builder/ReportBuilderService";
import { SECTION_TITLES, DEFAULT_SECTION_ORDER } from "@/report-builder/types";
import { MarkdownExporter } from "@/report-builder/exporters/MarkdownExporter";
import { HtmlExporter } from "@/report-builder/exporters/HtmlExporter";
import { JsonExporter } from "@/report-builder/exporters/JsonExporter";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  problema: string;
  perequePatternTitulo?: string | null;
  hypothesis: PolicyHypothesis;
  conceptualModel?: ConceptualModel | null;
  operationalizationMatrix?: OperationalizationMatrix | null;
  contrastationMatrix?: ContrastationMatrix | null;
  evidenceEvaluationMatrix?: EvidenceEvaluationMatrix | null;
  hypothesisEvidenceConclusion?: HypothesisEvidenceConclusion | null;
  audit?: MethodologicalAudit | null;
  /** Persisted in session — null means not yet created */
  reportDefinition?: ReportDefinition | null;
  onUpdateDefinition: (def: ReportDefinition) => void;
  onVolver: () => void;
  onReiniciar: () => void;
}

// ─── Download helper ──────────────────────────────────────────────────────────

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Subcomponent: SectionRow ─────────────────────────────────────────────────

interface SectionRowProps {
  tipo: ReportSectionType;
  visible: boolean;
  orden: number;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SectionRow({ tipo, visible, isFirst, isLast, onToggle, onMoveUp, onMoveDown }: SectionRowProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors duration-150 ${
        visible
          ? "bg-white border-border"
          : "bg-muted/30 border-border/50 opacity-60"
      }`}
    >
      {/* Toggle */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${visible ? "Ocultar" : "Mostrar"} sección ${SECTION_TITLES[tipo]}`}
        className="flex-shrink-0 text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded transition-colors"
      >
        {visible ? (
          <ToggleRight className="w-5 h-5" />
        ) : (
          <ToggleLeft className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Section name */}
      <span className={`flex-1 text-sm font-medium ${visible ? "text-foreground" : "text-muted-foreground"}`}>
        {SECTION_TITLES[tipo]}
      </span>

      {/* Reorder arrows */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label={`Mover ${SECTION_TITLES[tipo]} arriba`}
          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label={`Mover ${SECTION_TITLES[tipo]} abajo`}
          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PantallaReportBuilder({
  problema,
  perequePatternTitulo,
  hypothesis,
  conceptualModel,
  operationalizationMatrix,
  contrastationMatrix,
  evidenceEvaluationMatrix,
  hypothesisEvidenceConclusion,
  audit,
  reportDefinition: reportDefinitionProp,
  onUpdateDefinition,
  onVolver,
  onReiniciar,
}: Props) {
  // Initialize definition in local state if not yet persisted
  const [localDef, setLocalDef] = useState<ReportDefinition>(
    () => reportDefinitionProp ?? createReportDefinition(hypothesis.id)
  );

  const def = localDef;

  const updateDef = useCallback(
    (next: ReportDefinition) => {
      setLocalDef(next);
      onUpdateDefinition(next);
    },
    [onUpdateDefinition]
  );

  // Build input from props
  const buildInput = useMemo((): ReportBuildInput => ({
    problema,
    perequePatternTitulo: perequePatternTitulo ?? null,
    hypotheses: [hypothesis],
    conceptualModels: conceptualModel ? [conceptualModel] : [],
    operationalizationMatrices: operationalizationMatrix ? [operationalizationMatrix] : [],
    contrastationMatrices: contrastationMatrix ? [contrastationMatrix] : [],
    evidenceEvaluationMatrices: evidenceEvaluationMatrix ? [evidenceEvaluationMatrix] : [],
    hypothesisEvidenceConclusions: hypothesisEvidenceConclusion
      ? [hypothesisEvidenceConclusion]
      : [],
    audit: audit ?? undefined,
  }), [
    problema,
    perequePatternTitulo,
    hypothesis,
    conceptualModel,
    operationalizationMatrix,
    contrastationMatrix,
    evidenceEvaluationMatrix,
    hypothesisEvidenceConclusion,
    audit,
  ]);

  // Validation
  const validation = useMemo(() => validateReport(def, buildInput), [def, buildInput]);

  // Generated report (for preview and export)
  const generatedReport = useMemo(
    () => (validation.canGenerate ? generateReport(def, buildInput) : null),
    [def, buildInput, validation.canGenerate]
  );

  const summary = useMemo(
    () => (generatedReport ? summarizeReport(generatedReport) : null),
    [generatedReport]
  );

  // Tab state
  const [tab, setTab] = useState<"configurar" | "vista-previa">("configurar");

  // Sorted sections for display
  const sortedSections = useMemo(
    () => [...def.secciones].sort((a, b) => a.orden - b.orden),
    [def.secciones]
  );

  // Handlers for section reorder
  const handleMoveUp = useCallback(
    (tipo: ReportSectionType) => {
      const sorted = [...def.secciones].sort((a, b) => a.orden - b.orden);
      const idx = sorted.findIndex((s) => s.tipo === tipo);
      if (idx <= 0) return;
      const newOrder = sorted.map((s) => s.tipo);
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      updateDef(reorderSections(def, newOrder));
    },
    [def, updateDef]
  );

  const handleMoveDown = useCallback(
    (tipo: ReportSectionType) => {
      const sorted = [...def.secciones].sort((a, b) => a.orden - b.orden);
      const idx = sorted.findIndex((s) => s.tipo === tipo);
      if (idx === -1 || idx >= sorted.length - 1) return;
      const newOrder = sorted.map((s) => s.tipo);
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      updateDef(reorderSections(def, newOrder));
    },
    [def, updateDef]
  );

  // Export handlers
  const handleExportMarkdown = useCallback(() => {
    if (!generatedReport) return;
    const md = new MarkdownExporter().export(generatedReport);
    downloadFile(md, `${def.nombre.replace(/\s+/g, "-")}.md`, "text/markdown");
  }, [generatedReport, def.nombre]);

  const handleExportHtml = useCallback(() => {
    if (!generatedReport) return;
    const html = new HtmlExporter().export(generatedReport);
    downloadFile(html, `${def.nombre.replace(/\s+/g, "-")}.html`, "text/html");
  }, [generatedReport, def.nombre]);

  const handleExportJson = useCallback(() => {
    if (!generatedReport) return;
    const json = new JsonExporter().export(generatedReport);
    downloadFile(json, `${def.nombre.replace(/\s+/g, "-")}.json`, "application/json");
  }, [generatedReport, def.nombre]);

  // HTML preview content
  const previewHtml = useMemo(
    () => (generatedReport ? new HtmlExporter().export(generatedReport) : null),
    [generatedReport]
  );

  const errors = validation.issues.filter((i) => i.tipo === "error");
  const warnings = validation.issues.filter((i) => i.tipo === "warning");

  return (
    <motion.div
      key="report-builder"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-5xl mx-auto px-4 py-8 space-y-6"
    >
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground mb-3">
          <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
          <span>Report Builder</span>
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground">
          Generar informe metodológico
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          El informe se reconstruye desde el modelo de conocimiento de HELIOS. Selecciona las secciones, ajusta el orden y exporta en el formato que necesites.
        </p>
      </div>

      {/* Validation messages */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-medium text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>No se puede generar el informe</span>
          </div>
          <ul className="pl-6 space-y-1">
            {errors.map((e) => (
              <li key={e.codigo} className="text-sm text-destructive">
                [{e.codigo}] {e.mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && errors.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-medium text-sm">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>Advertencias</span>
          </div>
          <ul className="pl-6 space-y-1">
            {warnings.map((w) => (
              <li key={w.codigo} className="text-sm text-amber-700">
                [{w.codigo}] {w.mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}
      {errors.length === 0 && summary && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2.5 text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Informe listo — {summary.seccionesGeneradas} secciones, {summary.bloques} bloques, {summary.entidadesReferenciadas} entidades referenciadas.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["configurar", "vista-previa"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 -mb-px ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            aria-selected={tab === t}
            role="tab"
          >
            {t === "configurar" ? (
              <><Settings className="w-4 h-4" /> Configurar</>
            ) : (
              <><Eye className="w-4 h-4" /> Vista previa</>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "configurar" ? (
          <motion.div
            key="configurar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Metadata form */}
            <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
              <h2 className="text-base font-semibold text-foreground">Metadatos del informe</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="report-nombre" className="text-sm font-medium text-foreground">
                    Nombre
                  </label>
                  <input
                    id="report-nombre"
                    type="text"
                    value={def.nombre}
                    onChange={(e) =>
                      updateDef(updateReportDefinition(def, { nombre: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Nombre del informe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="report-fecha" className="text-sm font-medium text-foreground">
                    Fecha
                  </label>
                  <input
                    id="report-fecha"
                    type="date"
                    value={def.fecha}
                    onChange={(e) =>
                      updateDef(updateReportDefinition(def, { fecha: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="report-desc" className="text-sm font-medium text-foreground">
                  Descripción
                </label>
                <textarea
                  id="report-desc"
                  rows={2}
                  value={def.descripcion}
                  onChange={(e) =>
                    updateDef(updateReportDefinition(def, { descripcion: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Descripción opcional del informe"
                />
              </div>
            </div>

            {/* Sections config */}
            <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Secciones</h2>
                <span className="text-xs text-muted-foreground">
                  {sortedSections.filter((s) => s.visible).length} / {sortedSections.length} activas
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Activa/desactiva secciones y ajusta el orden con las flechas.
              </p>
              <div
                className="space-y-2"
                role="list"
                aria-label="Secciones del informe"
              >
                {sortedSections.map((s, idx) => (
                  <div key={s.tipo} role="listitem">
                    <SectionRow
                      tipo={s.tipo}
                      visible={s.visible}
                      orden={s.orden}
                      isFirst={idx === 0}
                      isLast={idx === sortedSections.length - 1}
                      onToggle={() => updateDef(toggleSection(def, s.tipo))}
                      onMoveUp={() => handleMoveUp(s.tipo)}
                      onMoveDown={() => handleMoveDown(s.tipo)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="vista-previa"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {!previewHtml ? (
              <div className="rounded-2xl border border-border bg-muted/20 p-12 text-center text-muted-foreground text-sm">
                No se puede generar la vista previa. Revisa los errores arriba.
              </div>
            ) : (
              <div
                className="rounded-2xl border border-border overflow-hidden shadow-sm bg-white"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
                role="region"
                aria-label="Vista previa del informe"
              >
                <iframe
                  title="Vista previa del informe"
                  srcDoc={previewHtml}
                  className="w-full"
                  style={{ height: "70vh", border: "none" }}
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export bar */}
      <div className="rounded-2xl border border-border bg-muted/20 p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" />
          Exportar informe
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportMarkdown}
            disabled={!generatedReport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white text-sm font-medium hover:bg-muted/30 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Markdown (.md)
          </button>
          <button
            type="button"
            onClick={handleExportHtml}
            disabled={!generatedReport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white text-sm font-medium hover:bg-muted/30 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            HTML (.html)
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            disabled={!generatedReport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white text-sm font-medium hover:bg-muted/30 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            JSON (.json)
          </button>
        </div>
        {!generatedReport && (
          <p className="text-xs text-muted-foreground mt-2">
            Resuelve los errores de validación para habilitar la exportación.
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onVolver}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <button
          type="button"
          onClick={onReiniciar}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reiniciar sesión
        </button>
      </div>
    </motion.div>
  );
}
