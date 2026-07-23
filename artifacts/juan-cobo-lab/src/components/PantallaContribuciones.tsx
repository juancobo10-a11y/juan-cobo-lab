/**
 * S-027 — PantallaContribuciones
 *
 * Screen for managing Contributions (Contribuciones) extracted from a
 * single Knowledge Source. Accessible exclusively from PantallaFuentes.
 *
 * S-027 scope (no AI, no automation):
 *   - Create, read, update, delete contributions manually.
 *   - Change contribution status (propose, validate, reject, archive).
 *   - View the source excerpt that supports each contribution.
 *   - Display source-level warnings (e.g. source not in enabled state).
 *
 * Referential invariants enforced here AND in ContributionService:
 *   - sourceId always equals the current source.
 *   - caseId always equals the current case.
 *   - New contributions only allowed for registered / ready-for-analysis sources.
 *
 * All contributions created from this UI have origin = "human" (ADR-0016).
 */

import React, { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  FileText,
  Quote,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Archive,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  RotateCcw,
} from "lucide-react";
import {
  createContribution,
  updateContribution,
  changeContributionStatus,
  deleteContribution,
  replaceContribution,
  validateContribution,
} from "@/contributions/ContributionService";
import type {
  Contribution,
  ContributionInput,
  ContributionStatus,
  ContributionType,
  SourceLocation,
} from "@/contributions/types";
import {
  CONTRIBUTION_TYPE_LABELS,
  CONTRIBUTION_STATUS_LABELS,
  VALID_CONTRIBUTION_STATUS_TRANSITIONS,
  ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS,
} from "@/contributions/types";
import type { KnowledgeSource } from "@/knowledge-sources/types";

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
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ─── Status styles ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ContributionStatus, string> = {
  draft: "bg-zinc-50 text-zinc-500 ring-zinc-200/60",
  proposed: "bg-blue-50 text-blue-600 ring-blue-200/60",
  validated: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  rejected: "bg-red-50 text-red-600 ring-red-200/60",
  archived: "bg-zinc-50 text-zinc-400 ring-zinc-200/40",
};

function StatusBadge({ status }: { status: ContributionStatus }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${STATUS_STYLES[status]}`}
    >
      {CONTRIBUTION_STATUS_LABELS[status]}
    </span>
  );
}

// ─── Type badge ───────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<ContributionType, string> = {
  finding: "text-emerald-700 bg-emerald-50",
  definition: "text-blue-700 bg-blue-50",
  fact: "text-sky-700 bg-sky-50",
  claim: "text-amber-700 bg-amber-50",
  "causal-mechanism": "text-violet-700 bg-violet-50",
  recommendation: "text-teal-700 bg-teal-50",
  limitation: "text-orange-700 bg-orange-50",
  assumption: "text-purple-700 bg-purple-50",
  contradiction: "text-red-700 bg-red-50",
  question: "text-indigo-700 bg-indigo-50",
  other: "text-zinc-600 bg-zinc-50",
};

function TypeBadge({ type }: { type: ContributionType }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded ${TYPE_COLORS[type]}`}
    >
      {CONTRIBUTION_TYPE_LABELS[type]}
    </span>
  );
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteConfirmDialog({
  contribution,
  onConfirm,
  onCancel,
}: {
  contribution: Contribution;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-contrib-title"
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
              id="delete-contrib-title"
              className="text-sm font-semibold text-primary mb-1"
            >
              Eliminar contribución
            </h3>
            <p className="text-xs text-foreground/60 leading-relaxed">
              ¿Eliminar permanentemente esta contribución?{" "}
              <span className="font-medium text-primary">
                "{contribution.statement.slice(0, 60)}
                {contribution.statement.length > 60 ? "…" : ""}"
              </span>{" "}
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-border text-foreground/70 hover:bg-zinc-50 transition-colors duration-150"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors duration-150"
          >
            Eliminar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Contribution form ────────────────────────────────────────────────────────

const CONTRIB_TYPES: ContributionType[] = [
  "finding",
  "definition",
  "fact",
  "claim",
  "causal-mechanism",
  "recommendation",
  "limitation",
  "assumption",
  "contradiction",
  "question",
  "other",
];

interface ContribFormState {
  type: ContributionType;
  statement: string;
  sourceExcerpt: string;
  locationDescription: string;
  interpretation: string;
  relevance: string;
}

const EMPTY_FORM: ContribFormState = {
  type: "finding",
  statement: "",
  sourceExcerpt: "",
  locationDescription: "",
  interpretation: "",
  relevance: "",
};

function ContributionForm({
  caseId,
  sourceId,
  initial,
  onSave,
  onCancel,
  saveLabel = "Guardar contribución",
}: {
  caseId: string;
  sourceId: string;
  initial?: Partial<ContribFormState>;
  onSave: (input: ContributionInput) => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  const [form, setForm] = useState<ContribFormState>({ ...EMPTY_FORM, ...initial });
  const [errors, setErrors] = useState<string[]>([]);
  const [showOptional, setShowOptional] = useState(false);

  const set = (key: keyof ContribFormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const location: SourceLocation | undefined = form.locationDescription.trim()
      ? { description: form.locationDescription.trim() }
      : undefined;

    const input: ContributionInput = {
      caseId,
      sourceId,
      type: form.type,
      statement: form.statement,
      sourceExcerpt: form.sourceExcerpt,
      sourceLocation: location,
      interpretation: form.interpretation || undefined,
      relevance: form.relevance || undefined,
      origin: "human",
    };

    const result = validateContribution(input);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    onSave(input);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type selector */}
      <div>
        <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2">
          Tipo de contribución <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CONTRIB_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("type", t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${
                form.type === t
                  ? `${TYPE_COLORS[t]} ring-1 ring-current/30 font-semibold`
                  : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {CONTRIBUTION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Statement */}
      <div>
        <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">
          Enunciado de la contribución <span className="text-red-400">*</span>
        </label>
        <p className="text-[11px] text-foreground/40 mb-2">
          Formulación original del analista — no una copia textual de la fuente. Mín. 10, máx. 2 000 caracteres.
        </p>
        <textarea
          value={form.statement}
          onChange={(e) => set("statement", e.target.value)}
          rows={3}
          placeholder="La brecha digital persiste no por ausencia de infraestructura sino por déficits de apropiación…"
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm text-primary placeholder:text-foreground/25 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none transition-shadow"
        />
        <div className="flex justify-end mt-0.5">
          <span className={`text-[10px] ${form.statement.length > 2000 ? "text-red-500" : "text-foreground/30"}`}>
            {form.statement.length}/2000
          </span>
        </div>
      </div>

      {/* Source excerpt */}
      <div>
        <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">
          Fragmento original <span className="text-red-400">*</span>
        </label>
        <p className="text-[11px] text-foreground/40 mb-2">
          Texto exacto de la fuente que respalda esta contribución. Mín. 10 caracteres.
        </p>
        <textarea
          value={form.sourceExcerpt}
          onChange={(e) => set("sourceExcerpt", e.target.value)}
          rows={3}
          placeholder="Copia aquí el fragmento textual de la fuente…"
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm text-primary placeholder:text-foreground/25 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none transition-shadow font-mono text-xs leading-relaxed"
        />
        <div className="flex justify-end mt-0.5">
          <span className={`text-[10px] ${form.sourceExcerpt.length > 5000 ? "text-red-500" : "text-foreground/30"}`}>
            {form.sourceExcerpt.length}/5000
          </span>
        </div>
      </div>

      {/* Optional fields toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-foreground/50 hover:text-foreground/80 transition-colors"
        >
          {showOptional ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          {showOptional ? "Ocultar campos opcionales" : "Añadir localización, interpretación y relevancia"}
        </button>
      </div>

      <AnimatePresence>
        {showOptional && (
          <motion.div
            key="optional"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden space-y-4"
          >
            {/* Location description */}
            <div>
              <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">
                Localización en la fuente
              </label>
              <input
                type="text"
                value={form.locationDescription}
                onChange={(e) => set("locationDescription", e.target.value)}
                placeholder="Ej: párrafo 3, p. 45, sección 2.3"
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-primary placeholder:text-foreground/25 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
              />
            </div>

            {/* Interpretation */}
            <div>
              <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">
                Interpretación
              </label>
              <p className="text-[11px] text-foreground/40 mb-2">
                ¿Por qué este fragmento constituye una contribución? Máx. 1 000 caracteres.
              </p>
              <textarea
                value={form.interpretation}
                onChange={(e) => set("interpretation", e.target.value)}
                rows={2}
                placeholder="Este fragmento revela que…"
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm text-primary placeholder:text-foreground/25 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none transition-shadow"
              />
              <div className="flex justify-end mt-0.5">
                <span className={`text-[10px] ${form.interpretation.length > 1000 ? "text-red-500" : "text-foreground/30"}`}>
                  {form.interpretation.length}/1000
                </span>
              </div>
            </div>

            {/* Relevance */}
            <div>
              <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">
                Relevancia para el análisis
              </label>
              <textarea
                value={form.relevance}
                onChange={(e) => set("relevance", e.target.value)}
                rows={2}
                placeholder="Podría ser relevante para…"
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm text-primary placeholder:text-foreground/25 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none transition-shadow"
              />
              <div className="flex justify-end mt-0.5">
                <span className={`text-[10px] ${form.relevance.length > 500 ? "text-red-500" : "text-foreground/30"}`}>
                  {form.relevance.length}/500
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Errors */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl bg-red-50 border border-red-200 p-3"
          >
            <ul className="space-y-1">
              {errors.map((err, i) => (
                <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                  <AlertTriangle className="size-3 mt-0.5 flex-shrink-0" />
                  {err}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-xl border border-border text-foreground/70 hover:bg-zinc-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-5 py-2 text-sm rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
        >
          {saveLabel}
        </button>
      </div>
    </form>
  );
}

// ─── Contribution card ────────────────────────────────────────────────────────

function ContributionCard({
  contribution,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  contribution: Contribution;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (newStatus: ContributionStatus) => void;
}) {
  const [showExcerpt, setShowExcerpt] = useState(false);
  const allowed = VALID_CONTRIBUTION_STATUS_TRANSITIONS[contribution.status];
  const isArchived = contribution.status === "archived";

  return (
    <motion.div
      variants={fadeUp}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition-opacity ${
        isArchived ? "opacity-60 border-zinc-200" : "border-border/60"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge type={contribution.type} />
          <StatusBadge status={contribution.status} />
          {contribution.origin === "agent-assisted" && (
            <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded font-mono">
              Agente
            </span>
          )}
        </div>
        {!isArchived && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={onEdit}
              title="Editar"
              className="p-1.5 rounded-lg text-foreground/40 hover:text-accent hover:bg-accent/5 transition-colors"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Eliminar"
              className="p-1.5 rounded-lg text-foreground/40 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Statement */}
      <p className="text-sm text-primary leading-relaxed mb-2">
        {contribution.statement}
      </p>

      {/* Source excerpt toggle */}
      <button
        type="button"
        onClick={() => setShowExcerpt((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-foreground/45 hover:text-foreground/70 transition-colors mb-2"
      >
        <Quote className="size-3" />
        {showExcerpt ? "Ocultar fragmento" : "Ver fragmento original"}
        {showExcerpt ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>

      <AnimatePresence>
        {showExcerpt && (
          <motion.div
            key="excerpt"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <blockquote className="border-l-2 border-accent/30 pl-3 mb-2 text-xs text-foreground/60 font-mono leading-relaxed bg-zinc-50/60 rounded-r-lg py-2 pr-2">
              "{contribution.sourceExcerpt}"
            </blockquote>
            {contribution.sourceLocation?.description && (
              <p className="text-[11px] text-foreground/40 mb-2">
                📍 {contribution.sourceLocation.description}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional fields */}
      {contribution.interpretation && (
        <p className="text-xs text-foreground/55 italic leading-relaxed mb-1">
          <span className="font-semibold not-italic text-foreground/40">Interpretación:</span>{" "}
          {contribution.interpretation}
        </p>
      )}
      {contribution.relevance && (
        <p className="text-xs text-foreground/55 leading-relaxed mb-1">
          <span className="font-semibold text-foreground/40">Relevancia:</span>{" "}
          {contribution.relevance}
        </p>
      )}

      {/* Status actions */}
      {!isArchived && allowed.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/30">
          {allowed.includes("proposed") && contribution.status === "draft" && (
            <button
              type="button"
              onClick={() => onStatusChange("proposed")}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <FileText className="size-3" />
              Proponer
            </button>
          )}
          {allowed.includes("validated") && (
            <button
              type="button"
              onClick={() => onStatusChange("validated")}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <CheckCircle className="size-3" />
              Validar
            </button>
          )}
          {allowed.includes("rejected") && (
            <button
              type="button"
              onClick={() => onStatusChange("rejected")}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <XCircle className="size-3" />
              Rechazar
            </button>
          )}
          {allowed.includes("draft") && contribution.status !== "draft" && (
            <button
              type="button"
              onClick={() => onStatusChange("draft")}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-zinc-50 text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <RotateCcw className="size-3" />
              Volver a borrador
            </button>
          )}
          {allowed.includes("archived") && (
            <button
              type="button"
              onClick={() => onStatusChange("archived")}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-zinc-50 text-zinc-500 hover:bg-zinc-100 transition-colors"
            >
              <Archive className="size-3" />
              Archivar
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PantallaContribucionesProps {
  /** The source from which contributions are extracted. */
  source: KnowledgeSource;
  /** ID of the active UnderstandingCase. */
  caseId: string;
  /** Name of the active UnderstandingCase. */
  caseName: string;
  /** Contributions for this source only (pre-filtered by sourceId). */
  contributions: Contribution[];
  /** Full contributions array (used to write back via onUpdateContributions). */
  allContributions: Contribution[];
  /** Callback to update the full contributions array in Helios state. */
  onUpdateContributions: (contributions: Contribution[]) => void;
  /** Navigate back to PantallaFuentes. */
  onVolver: () => void;
  /** Full reset. */
  onReiniciar: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PantallaContribuciones({
  source,
  caseId,
  caseName,
  contributions,
  allContributions,
  onUpdateContributions,
  onVolver,
  onReiniciar,
}: PantallaContribucionesProps) {
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editTarget, setEditTarget] = useState<Contribution | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contribution | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Source enablement check (S-027: only registered + ready-for-analysis allow new contributions)
  const enabledStatuses: string[] = [...ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS];
  const sourceEnabled = enabledStatuses.includes(source.status);

  const activeContribs = contributions.filter((c) => c.status !== "archived");
  const archivedContribs = contributions.filter((c) => c.status === "archived");

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCreate = (input: ContributionInput) => {
    const created = createContribution(input);
    onUpdateContributions([...allContributions, created]);
    setMode("list");
  };

  const handleEdit = (contribution: Contribution) => {
    setEditTarget(contribution);
    setMode("edit");
  };

  const handleSaveEdit = (input: ContributionInput) => {
    if (!editTarget) return;
    const updated = updateContribution(editTarget, {
      type: input.type,
      statement: input.statement,
      sourceExcerpt: input.sourceExcerpt,
      sourceLocation: input.sourceLocation,
      interpretation: input.interpretation,
      relevance: input.relevance,
    });
    onUpdateContributions(replaceContribution(allContributions, updated));
    setEditTarget(null);
    setMode("list");
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    onUpdateContributions(deleteContribution(allContributions, deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleStatusChange = (contribution: Contribution, newStatus: ContributionStatus) => {
    const result = changeContributionStatus(contribution, newStatus);
    if (!result.success) return; // Should not happen — UI only shows valid transitions
    onUpdateContributions(replaceContribution(allContributions, result.contribution));
  };

  // ── Render form ─────────────────────────────────────────────────────────────

  if (mode === "create") {
    return (
      <motion.div
        key="contrib-form-create"
        variants={screenEnter}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="max-w-2xl mx-auto px-6 py-10"
      >
        <button
          type="button"
          onClick={() => setMode("list")}
          className="flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground/80 mb-8 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Volver a contribuciones
        </button>

        <h2 className="text-xl font-semibold text-primary mb-1">Nueva contribución</h2>
        <p className="text-sm text-foreground/50 mb-6">
          Fuente:{" "}
          <span className="font-medium text-foreground/70">{source.title}</span>
        </p>

        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
          <ContributionForm
            caseId={caseId}
            sourceId={source.id}
            onSave={handleCreate}
            onCancel={() => setMode("list")}
            saveLabel="Crear contribución"
          />
        </div>
      </motion.div>
    );
  }

  if (mode === "edit" && editTarget) {
    // Pre-fill from existing contribution
    const initial: Partial<ContribFormState> = {
      type: editTarget.type,
      statement: editTarget.statement,
      sourceExcerpt: editTarget.sourceExcerpt,
      locationDescription: editTarget.sourceLocation?.description ?? "",
      interpretation: editTarget.interpretation ?? "",
      relevance: editTarget.relevance ?? "",
    };

    return (
      <motion.div
        key="contrib-form-edit"
        variants={screenEnter}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="max-w-2xl mx-auto px-6 py-10"
      >
        <button
          type="button"
          onClick={() => { setMode("list"); setEditTarget(null); }}
          className="flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground/80 mb-8 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Volver a contribuciones
        </button>

        <h2 className="text-xl font-semibold text-primary mb-1">Editar contribución</h2>
        <p className="text-sm text-foreground/50 mb-6">
          Fuente:{" "}
          <span className="font-medium text-foreground/70">{source.title}</span>
        </p>

        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
          <ContributionForm
            caseId={caseId}
            sourceId={source.id}
            initial={initial}
            onSave={handleSaveEdit}
            onCancel={() => { setMode("list"); setEditTarget(null); }}
            saveLabel="Guardar cambios"
          />
        </div>
      </motion.div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────

  return (
    <>
      <motion.div
        key="contrib-list"
        variants={screenEnter}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="max-w-2xl mx-auto px-6 py-10"
      >
        {/* Back button */}
        <button
          type="button"
          onClick={onVolver}
          className="flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground/80 mb-8 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Volver a fuentes de conocimiento
        </button>

        {/* Header */}
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="flex items-start justify-between gap-4 mb-2">
            <div>
              <p className="text-xs text-foreground/40 uppercase tracking-widest mb-1">
                {caseName} · Fuente de conocimiento
              </p>
              <h1 className="text-2xl font-serif font-bold text-primary leading-tight">
                {source.title}
              </h1>
            </div>
          </motion.div>

          {/* Source status warning */}
          {!sourceEnabled && (
            <motion.div variants={fadeUp} className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
              <Info className="size-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-0.5">
                  Esta fuente no admite nuevas contribuciones
                </p>
                <p className="text-xs text-amber-600/80">
                  El estado actual es{" "}
                  <span className="font-mono font-medium">"{source.status}"</span>.
                  Solo las fuentes en estado{" "}
                  <span className="font-mono font-medium">registrada</span> o{" "}
                  <span className="font-mono font-medium">lista para análisis</span>{" "}
                  aceptan nuevas contribuciones. Las contribuciones existentes son visibles.
                </p>
              </div>
            </motion.div>
          )}

          {/* Stats + Create button */}
          <motion.div variants={fadeUp} className="flex items-center justify-between mt-6 mb-4">
            <div className="flex items-center gap-3 text-xs text-foreground/40">
              <span>
                {contributions.length} contribución
                {contributions.length !== 1 ? "es" : ""} en total
              </span>
              {contributions.filter((c) => c.status === "validated").length > 0 && (
                <span className="text-emerald-600 font-medium">
                  {contributions.filter((c) => c.status === "validated").length} validada
                  {contributions.filter((c) => c.status === "validated").length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {sourceEnabled && (
              <button
                type="button"
                onClick={() => setMode("create")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors shadow-sm"
              >
                <Plus className="size-4" />
                Nueva contribución
              </button>
            )}
          </motion.div>

          {/* Empty state */}
          {contributions.length === 0 && (
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-dashed border-border/50 bg-zinc-50/40 py-12 px-6 text-center"
            >
              <FileText className="size-8 text-foreground/20 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground/40 mb-1">
                Sin contribuciones aún
              </p>
              <p className="text-xs text-foreground/30">
                {sourceEnabled
                  ? "Crea la primera contribución extrayendo una idea clave de esta fuente."
                  : "Esta fuente no está en un estado que permita nuevas contribuciones."}
              </p>
            </motion.div>
          )}

          {/* Active contributions */}
          <motion.div variants={stagger} className="space-y-3">
            {activeContribs.map((c) => (
              <ContributionCard
                key={c.id}
                contribution={c}
                onEdit={() => handleEdit(c)}
                onDelete={() => setDeleteTarget(c)}
                onStatusChange={(s) => handleStatusChange(c, s)}
              />
            ))}
          </motion.div>

          {/* Archived contributions */}
          {archivedContribs.length > 0 && (
            <motion.div variants={fadeUp} className="mt-6">
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/60 transition-colors mb-2"
              >
                {showArchived ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                {archivedContribs.length} contribución
                {archivedContribs.length !== 1 ? "es" : ""} archivada
                {archivedContribs.length !== 1 ? "s" : ""}
              </button>
              {showArchived && (
                <div className="space-y-3">
                  {archivedContribs.map((c) => (
                    <ContributionCard
                      key={c.id}
                      contribution={c}
                      onEdit={() => {}}
                      onDelete={() => setDeleteTarget(c)}
                      onStatusChange={(s) => handleStatusChange(c, s)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Stats footer */}
          {contributions.length > 0 && (
            <motion.div
              variants={fadeUp}
              className="mt-6 pt-4 border-t border-border/40 flex flex-wrap gap-4 text-xs text-foreground/40"
            >
              {(["draft", "proposed", "validated", "rejected"] as ContributionStatus[]).map((s) => {
                const count = contributions.filter((c) => c.status === s).length;
                if (count === 0) return null;
                return (
                  <span key={s} className={s === "validated" ? "text-emerald-600" : ""}>
                    {count} {CONTRIBUTION_STATUS_LABELS[s].toLowerCase()}
                    {count !== 1 ? (s === "draft" ? "es" : "s") : ""}
                  </span>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmDialog
            contribution={deleteTarget}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
