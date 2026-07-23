/**
 * S-026 — PantallaFuentes
 *
 * Screen for managing Knowledge Sources (Fuentes de Conocimiento) within a
 * HELIOS Understanding Case. Each source is an object that provides information
 * potentially relevant for building understanding.
 *
 * Conceptual distinctions preserved in this UI:
 *   Fuente (Source):             origin of the content.
 *   Información (Information):   content incorporated from the source.
 *   Contribución (Contribution): cognitive unit to be extracted (future: S-027).
 *   Evidencia (Evidence):        information evaluated against a hypothesis.
 *
 * S-026 scope: create, read, update, delete, and status-transition sources.
 * The "Analizar fuente" action (contribution extraction) is shown disabled
 * as a forward-looking signal for S-027.
 */

import React, { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Library,
  FileText,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  CheckCircle,
  Clock,
  Sparkles,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  createSource,
  updateSource,
  changeStatus,
  deleteSource,
  replaceSource,
  validateSource,
} from "@/knowledge-sources/KnowledgeSourceService";
import type {
  KnowledgeSource,
  KnowledgeSourceInput,
  KnowledgeSourceStatus,
  KnowledgeSourceType,
} from "@/knowledge-sources/types";
import {
  SOURCE_STATUS_LABELS,
  SOURCE_TYPE_LABELS,
  ENABLED_SOURCE_TYPES_S026,
} from "@/knowledge-sources/types";

// ─── Animation variants ───────────────────────────────────────────────────────

const screenEnter: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: { opacity: 0, y: -16, transition: { duration: 0.3 } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ─── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<KnowledgeSourceStatus, string> = {
  draft: "bg-zinc-50 text-zinc-500 ring-zinc-200/60",
  registered: "bg-blue-50 text-blue-600 ring-blue-200/60",
  "ready-for-analysis": "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  processed: "bg-violet-50 text-violet-700 ring-violet-200/60",
  rejected: "bg-red-50 text-red-600 ring-red-200/60",
  archived: "bg-zinc-50 text-zinc-400 ring-zinc-200/40",
};

function StatusBadge({ status }: { status: KnowledgeSourceStatus }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${STATUS_STYLES[status]}`}
    >
      {SOURCE_STATUS_LABELS[status]}
    </span>
  );
}

// ─── Delete confirmation dialog ────────────────────────────────────────────────

function DeleteConfirmDialog({
  source,
  onConfirm,
  onCancel,
}: {
  source: KnowledgeSource;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-xl border border-border p-6 max-w-sm w-full"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h3
              id="delete-dialog-title"
              className="text-sm font-semibold text-primary mb-1"
            >
              Eliminar fuente de conocimiento
            </h3>
            <p className="text-xs text-foreground/60 leading-relaxed">
              ¿Eliminar permanentemente la fuente{" "}
              <span className="font-medium text-primary">"{source.title}"</span>?
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-border text-foreground/70 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors duration-150"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors duration-150"
          >
            Eliminar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Source form ───────────────────────────────────────────────────────────────

const EMPTY_FORM: Omit<KnowledgeSourceInput, "caseId"> = {
  title: "",
  sourceType: "pasted-text",
  content: "",
  author: "",
  institution: "",
  publicationDate: "",
  language: "",
  referenceUrl: "",
  notes: "",
};

function SourceForm({
  caseId,
  initial,
  onSave,
  onCancel,
  saveLabel = "Guardar como borrador",
}: {
  caseId: string;
  initial?: Partial<Omit<KnowledgeSourceInput, "caseId">>;
  onSave: (input: KnowledgeSourceInput) => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [errors, setErrors] = useState<string[]>([]);
  const [showMeta, setShowMeta] = useState(false);

  const ALL_TYPES: KnowledgeSourceType[] = [
    "pasted-text",
    "document",
    "web",
    "dataset",
    "interview",
    "note",
    "other",
  ];

  const set = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: KnowledgeSourceInput = { caseId, ...form };
    const result = validateSource(input);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    onSave(input);
  };

  const fieldClass =
    "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-primary placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all duration-200";

  const labelClass =
    "block text-xs font-mono uppercase tracking-[0.14em] text-foreground/55 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label htmlFor="ks-title" className={labelClass}>
          Título <span className="text-accent">*</span>
        </label>
        <input
          id="ks-title"
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Nombre descriptivo de la fuente"
          className={fieldClass}
          maxLength={200}
          autoFocus
        />
      </div>

      {/* Source type */}
      <div>
        <label htmlFor="ks-type" className={labelClass}>
          Tipo de fuente <span className="text-accent">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((t) => {
            const enabled = (ENABLED_SOURCE_TYPES_S026 as KnowledgeSourceType[]).includes(t);
            return (
              <button
                key={t}
                type="button"
                disabled={!enabled}
                onClick={() => enabled && set("sourceType", t)}
                title={!enabled ? "Próxima funcionalidad" : undefined}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                  form.sourceType === t && enabled
                    ? "border-accent bg-accent/10 text-accent font-medium"
                    : enabled
                    ? "border-border bg-white text-foreground/60 hover:border-accent/40 hover:text-primary"
                    : "border-border/40 bg-zinc-50 text-foreground/30 cursor-not-allowed"
                }`}
              >
                {SOURCE_TYPE_LABELS[t]}
                {!enabled && (
                  <span className="ml-1 text-[9px] font-mono text-foreground/25">próx.</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div>
        <label htmlFor="ks-content" className={labelClass}>
          Contenido <span className="text-accent">*</span>
        </label>
        <textarea
          id="ks-content"
          value={form.content}
          onChange={(e) => set("content", e.target.value)}
          rows={8}
          placeholder="Pega aquí el texto de la fuente de conocimiento…"
          className={`${fieldClass} resize-y leading-relaxed font-sans`}
        />
      </div>

      {/* Optional metadata toggle */}
      <button
        type="button"
        onClick={() => setShowMeta((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-foreground/50 hover:text-primary transition-colors duration-150"
      >
        {showMeta ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
        {showMeta ? "Ocultar metadatos opcionales" : "Añadir metadatos opcionales"}
      </button>

      {showMeta && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1"
        >
          <div>
            <label htmlFor="ks-author" className={labelClass}>
              Autor / Autora
            </label>
            <input
              id="ks-author"
              type="text"
              value={form.author}
              onChange={(e) => set("author", e.target.value)}
              placeholder="Nombre del autor o autora"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="ks-institution" className={labelClass}>
              Institución
            </label>
            <input
              id="ks-institution"
              type="text"
              value={form.institution}
              onChange={(e) => set("institution", e.target.value)}
              placeholder="Entidad o editorial"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="ks-date" className={labelClass}>
              Fecha de publicación
            </label>
            <input
              id="ks-date"
              type="text"
              value={form.publicationDate}
              onChange={(e) => set("publicationDate", e.target.value)}
              placeholder="YYYY o YYYY-MM-DD"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="ks-language" className={labelClass}>
              Idioma
            </label>
            <input
              id="ks-language"
              type="text"
              value={form.language}
              onChange={(e) => set("language", e.target.value)}
              placeholder="es, en, fr…"
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ks-url" className={labelClass}>
              URL de referencia
            </label>
            <input
              id="ks-url"
              type="url"
              value={form.referenceUrl}
              onChange={(e) => set("referenceUrl", e.target.value)}
              placeholder="https:// o DOI"
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ks-notes" className={labelClass}>
              Notas internas del analista
            </label>
            <textarea
              id="ks-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Observaciones propias sobre esta fuente (no forman parte del contenido)…"
              className={`${fieldClass} resize-y`}
            />
          </div>
        </motion.div>
      )}

      {/* Validation errors */}
      {errors.length > 0 && (
        <ul className="space-y-1">
          {errors.map((err, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-red-600">
              <span className="mt-0.5 shrink-0">•</span>
              {err}
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all duration-200"
        >
          <CheckCircle className="size-4" />
          {saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-border text-sm text-foreground/60 hover:text-primary hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Source card ───────────────────────────────────────────────────────────────

function SourceCard({
  source,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  source: KnowledgeSource;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (newStatus: KnowledgeSourceStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const canRegister = source.status === "draft";
  const canMarkReady = source.status === "registered";
  const canReturnToRegistered = source.status === "ready-for-analysis";
  const canReturnToDraft = source.status === "registered";
  const isArchived = source.status === "archived";

  return (
    <div
      className={`rounded-2xl border ${isArchived ? "border-border/40 opacity-60" : "border-border"} bg-white overflow-hidden transition-all duration-200`}
    >
      {/* Card header */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <FileText className="size-4 text-accent shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold text-primary leading-snug">
                {source.title}
              </span>
              <StatusBadge status={source.status} />
              <span className="text-[10px] font-mono uppercase tracking-wide text-foreground/35 px-2 py-0.5 rounded-full bg-zinc-50 ring-1 ring-zinc-200/60">
                {SOURCE_TYPE_LABELS[source.sourceType]}
              </span>
            </div>
            {/* Content preview */}
            <p
              className={`text-xs text-foreground/55 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}
            >
              {source.content}
            </p>
            {source.content.length > 120 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-[11px] text-accent hover:underline focus-visible:outline-none"
              >
                {expanded ? "Ver menos" : "Ver contenido completo"}
              </button>
            )}
            {/* Optional metadata summary */}
            {(source.author || source.institution || source.publicationDate) && (
              <p className="mt-1.5 text-[11px] text-foreground/40">
                {[source.author, source.institution, source.publicationDate]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {source.notes && (
              <p className="mt-1.5 text-[11px] text-foreground/40 italic">
                Nota: {source.notes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Card actions */}
      {!isArchived && (
        <div className="px-5 py-3 border-t border-border/40 bg-zinc-50/50 flex flex-wrap items-center gap-2">
          {/* Primary status actions */}
          {canRegister && (
            <button
              type="button"
              onClick={() => onStatusChange("registered")}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 transition-colors duration-150"
            >
              <CheckCircle className="size-3.5" />
              Registrar
            </button>
          )}
          {canReturnToDraft && (
            <button
              type="button"
              onClick={() => onStatusChange("draft")}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 transition-colors duration-150"
            >
              <Clock className="size-3.5" />
              Volver a borrador
            </button>
          )}
          {canMarkReady && (
            <button
              type="button"
              onClick={() => onStatusChange("ready-for-analysis")}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 transition-colors duration-150"
            >
              <CheckCircle className="size-3.5" />
              Marcar lista para análisis
            </button>
          )}
          {canReturnToRegistered && (
            <button
              type="button"
              onClick={() => onStatusChange("registered")}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 transition-colors duration-150"
            >
              <Clock className="size-3.5" />
              Regresar a registrada
            </button>
          )}

          {/* Analizar fuente — disabled, forward signal for S-027 */}
          <span
            title="La extracción de contribuciones estará disponible en una próxima versión (S-027)"
            className="cursor-not-allowed"
            aria-label="Analizar fuente — próxima funcionalidad"
          >
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-dashed border-border text-foreground/30 select-none">
              <Sparkles className="size-3.5" />
              Analizar fuente
              <span className="text-[9px] font-mono uppercase tracking-wide ml-0.5">
                S-027
              </span>
            </span>
          </span>

          {/* Edit and delete — right-aligned */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-foreground/60 hover:text-primary hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors duration-150"
            >
              <Pencil className="size-3.5" />
              Editar
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-colors duration-150"
            >
              <Trash2 className="size-3.5" />
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Archived state */}
      {isArchived && (
        <div className="px-5 py-3 border-t border-border/40 bg-zinc-50/50 flex items-center gap-2">
          <span className="text-xs text-foreground/40 italic">
            Fuente archivada — no disponible para análisis.
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PantallaFuentesProps {
  /** ID of the active Understanding Case. */
  caseId: string;
  /** Display name of the active Understanding Case. */
  caseName: string;
  /** All sources belonging to this case. */
  sources: KnowledgeSource[];
  /** Full list of all sources across all cases (needed for updateSources). */
  allSources: KnowledgeSource[];
  /** Called when the sources list changes. Passes the full updated allSources array. */
  onUpdateSources: (updated: KnowledgeSource[]) => void;
  /** Navigate back to the previous screen. */
  onVolver: () => void;
  /** Restart the full HELIOS session. */
  onReiniciar: () => void;
}

export default function PantallaFuentes({
  caseId,
  caseName,
  sources,
  allSources,
  onUpdateSources,
  onVolver,
}: PantallaFuentesProps) {
  type UIMode =
    | { kind: "list" }
    | { kind: "creating" }
    | { kind: "editing"; sourceId: string };

  const [mode, setMode] = useState<UIMode>({ kind: "list" });
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeSource | null>(null);

  // ── Create ──
  const handleCreate = (input: KnowledgeSourceInput) => {
    const created = createSource(input);
    onUpdateSources([...allSources, created]);
    setMode({ kind: "list" });
  };

  // ── Update ──
  const handleUpdate = (sourceId: string, input: KnowledgeSourceInput) => {
    const existing = allSources.find((s) => s.id === sourceId);
    if (!existing) return;
    const updated = updateSource(existing, {
      title: input.title.trim(),
      sourceType: input.sourceType,
      content: input.content.trim(),
      author: input.author?.trim() || undefined,
      institution: input.institution?.trim() || undefined,
      publicationDate: input.publicationDate?.trim() || undefined,
      language: input.language?.trim() || undefined,
      referenceUrl: input.referenceUrl?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    });
    onUpdateSources(replaceSource(allSources, updated));
    setMode({ kind: "list" });
  };

  // ── Status change ──
  const handleStatusChange = (
    source: KnowledgeSource,
    newStatus: KnowledgeSourceStatus
  ) => {
    const result = changeStatus(source, newStatus);
    if (!result.success) return;
    onUpdateSources(replaceSource(allSources, result.source));
  };

  // ── Delete ──
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    onUpdateSources(deleteSource(allSources, deleteTarget.id));
    setDeleteTarget(null);
  };

  // ── Editing initial values ──
  const editingSource =
    mode.kind === "editing"
      ? allSources.find((s) => s.id === mode.sourceId)
      : null;

  const activeSources = sources.filter((s) => s.status !== "archived");
  const archivedSources = sources.filter((s) => s.status === "archived");
  const [showArchived, setShowArchived] = useState(false);

  return (
    <>
      <motion.div
        key="fuentes"
        variants={screenEnter}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="min-h-[calc(100vh-4rem)] pb-20"
      >
        <div className="max-w-3xl mx-auto px-6 py-12 w-full">
          {/* Back nav */}
          <motion.div variants={fadeUp} className="mb-8">
            <button
              type="button"
              onClick={onVolver}
              className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-foreground/50 hover:text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-md px-1"
            >
              <ArrowLeft className="size-3.5" />
              Volver
            </button>
          </motion.div>

          {/* Header */}
          <motion.div variants={stagger}>
            <motion.p
              variants={fadeUp}
              className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-3"
            >
              HELIOS · Fuentes de conocimiento
            </motion.p>
            <motion.div variants={fadeUp} className="flex items-start gap-3 mb-2">
              <Library className="size-6 text-accent mt-0.5 shrink-0" />
              <h1 className="font-serif text-3xl md:text-4xl text-primary leading-tight">
                Fuentes de conocimiento
              </h1>
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="text-sm text-foreground/55 leading-relaxed mb-1"
            >
              Caso:{" "}
              <span className="font-medium text-primary">{caseName}</span>
            </motion.p>
            <motion.p
              variants={fadeUp}
              className="text-xs text-foreground/40 leading-relaxed mb-8 max-w-xl"
            >
              Registra aquí las fuentes de información relevantes para el caso.
              Incorporar una fuente no implica que su contenido sea verdadero,
              pertinente o que constituya evidencia. Las fuentes marcadas como
              listas para análisis estarán disponibles para la extracción de
              contribuciones cognitivas en una próxima versión.
            </motion.p>
          </motion.div>

          {/* ── Form: creating ── */}
          <AnimatePresence mode="wait">
            {mode.kind === "creating" && (
              <motion.div
                key="form-create"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-accent/30 bg-white p-6 mb-8"
              >
                <div className="flex items-center gap-2 mb-5">
                  <Plus className="size-4 text-accent" />
                  <h2 className="text-sm font-semibold text-primary">
                    Nueva fuente de conocimiento
                  </h2>
                  <button
                    type="button"
                    onClick={() => setMode({ kind: "list" })}
                    className="ml-auto text-foreground/40 hover:text-primary transition-colors"
                    aria-label="Cancelar creación"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <SourceForm
                  caseId={caseId}
                  onSave={handleCreate}
                  onCancel={() => setMode({ kind: "list" })}
                  saveLabel="Guardar como borrador"
                />
              </motion.div>
            )}

            {/* ── Form: editing ── */}
            {mode.kind === "editing" && editingSource && (
              <motion.div
                key={`form-edit-${editingSource.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-blue-200 bg-white p-6 mb-8"
              >
                <div className="flex items-center gap-2 mb-5">
                  <Pencil className="size-4 text-blue-500" />
                  <h2 className="text-sm font-semibold text-primary">
                    Editar fuente de conocimiento
                  </h2>
                  <button
                    type="button"
                    onClick={() => setMode({ kind: "list" })}
                    className="ml-auto text-foreground/40 hover:text-primary transition-colors"
                    aria-label="Cancelar edición"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <SourceForm
                  caseId={caseId}
                  initial={{
                    title: editingSource.title,
                    sourceType: editingSource.sourceType,
                    content: editingSource.content,
                    author: editingSource.author,
                    institution: editingSource.institution,
                    publicationDate: editingSource.publicationDate,
                    language: editingSource.language,
                    referenceUrl: editingSource.referenceUrl,
                    notes: editingSource.notes,
                  }}
                  onSave={(input) => handleUpdate(editingSource.id, input)}
                  onCancel={() => setMode({ kind: "list" })}
                  saveLabel="Guardar cambios"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── List view ── */}
          {mode.kind === "list" && (
            <motion.div variants={stagger} className="space-y-4">
              {/* Add button */}
              <motion.div variants={fadeUp}>
                <button
                  type="button"
                  onClick={() => setMode({ kind: "creating" })}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-xl border-2 border-dashed border-border bg-white text-sm text-foreground/60 hover:border-accent/50 hover:text-primary hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200 w-full justify-center"
                >
                  <Plus className="size-4" />
                  Nueva fuente de conocimiento
                </button>
              </motion.div>

              {/* Active sources */}
              {activeSources.length === 0 && mode.kind === "list" && (
                <motion.div
                  variants={fadeUp}
                  className="text-center py-16 text-foreground/35"
                >
                  <Library className="size-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium mb-1">
                    Aún no hay fuentes de conocimiento en este caso
                  </p>
                  <p className="text-xs leading-relaxed max-w-sm mx-auto">
                    Incorpora la primera fuente usando el botón de arriba.
                    Recuerda: registrar una fuente no implica que su contenido
                    sea verdadero ni que constituya evidencia.
                  </p>
                </motion.div>
              )}

              {activeSources.map((src) => (
                <motion.div key={src.id} variants={fadeUp}>
                  <SourceCard
                    source={src}
                    onEdit={() => setMode({ kind: "editing", sourceId: src.id })}
                    onDelete={() => setDeleteTarget(src)}
                    onStatusChange={(s) => handleStatusChange(src, s)}
                  />
                </motion.div>
              ))}

              {/* Archived sources */}
              {archivedSources.length > 0 && (
                <motion.div variants={fadeUp}>
                  <button
                    type="button"
                    onClick={() => setShowArchived((v) => !v)}
                    className="flex items-center gap-2 text-xs text-foreground/40 hover:text-primary transition-colors py-1"
                  >
                    {showArchived ? (
                      <ChevronUp className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )}
                    {archivedSources.length} fuente
                    {archivedSources.length !== 1 ? "s" : ""} archivada
                    {archivedSources.length !== 1 ? "s" : ""}
                  </button>
                  {showArchived &&
                    archivedSources.map((src) => (
                      <div key={src.id} className="mt-2">
                        <SourceCard
                          source={src}
                          onEdit={() => {}}
                          onDelete={() => setDeleteTarget(src)}
                          onStatusChange={(s) => handleStatusChange(src, s)}
                        />
                      </div>
                    ))}
                </motion.div>
              )}

              {/* Summary stats */}
              {sources.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  className="pt-4 border-t border-border/40 flex flex-wrap gap-4 text-xs text-foreground/40"
                >
                  <span>
                    {sources.filter((s) => s.status === "draft").length} borrador
                    {sources.filter((s) => s.status === "draft").length !== 1 ? "es" : ""}
                  </span>
                  <span>
                    {sources.filter((s) => s.status === "registered").length} registrada
                    {sources.filter((s) => s.status === "registered").length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-emerald-600">
                    {sources.filter((s) => s.status === "ready-for-analysis").length} lista
                    {sources.filter((s) => s.status === "ready-for-analysis").length !== 1 ? "s" : ""}{" "}
                    para análisis
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmDialog
            source={deleteTarget}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
