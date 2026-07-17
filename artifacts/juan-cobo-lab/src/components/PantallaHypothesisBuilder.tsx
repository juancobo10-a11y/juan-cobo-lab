/**
 * S-015 — PantallaHypothesisBuilder
 *
 * Allows the analyst to formulate, structure, and manage multiple hypotheses
 * after "Démosle pereque". All data stays in session memory (§20).
 *
 * ADR-0001: HELIOS does not invent hypotheses — it guides structuring.
 * ADR-0005: Every hypothesis must be explicit, testable, and revisable.
 */

import { useState, useRef, useEffect, useId } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ArrowRight, Plus, Copy, Star, Trash2, ChevronUp, ChevronDown, ChevronRight, X, AlertCircle, CheckCircle2, Info, Lightbulb } from "lucide-react";

import type { PerequeMode } from "@/pages/Helios";
import type {
  PolicyHypothesis,
  HypothesisVariable,
  HypothesisVariableRole,
  HypothesisConfidence,
  ReflectionAnswer,
} from "@/hypothesis/types";
import { HYPOTHESIS_TEMPLATES } from "@/hypothesis/types";
import {
  createEmptyHypothesis,
  updateHypothesis,
  buildProvisionalFormulacion,
  validateHypothesis,
  computeHypothesisStatus,
  duplicateHypothesis,
  moveHypothesis,
  setPrimaryHypothesis,
  removeHypothesis,
  createVariable,
  removeVariable,
  updateVariable,
  linkReflectionAnswer,
  unlinkReflectionAnswer,
  getAnsweredReflections,
  exceedsRecommendedCount,
  MAX_RECOMMENDED_HYPOTHESES,
} from "@/hypothesis/HypothesisBuilderService";

// ─── Motion variants ──────────────────────────────────────────────────────────
const screenEnter: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.3 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger: Variants = { visible: { transition: { staggerChildren: 0.07 } } };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPatternIdsFromPerequeMode(perequeMode: PerequeMode): string[] {
  if (perequeMode.mode === "single") return [perequeMode.pattern.metadata.id];
  return [
    perequeMode.primaryPattern.metadata.id,
    perequeMode.secondaryPattern.metadata.id,
  ];
}

function getPatternLabel(perequeMode: PerequeMode): string {
  if (perequeMode.mode === "single") return perequeMode.pattern.metadata.titulo;
  return `${perequeMode.primaryPattern.metadata.titulo} + ${perequeMode.secondaryPattern.metadata.titulo}`;
}

const statusStyle: Record<string, string> = {
  "borrador": "bg-stone-100 text-stone-600 ring-stone-200",
  "incompleta": "bg-amber-50 text-amber-700 ring-amber-200",
  "lista-para-contrastar": "bg-emerald-50 text-emerald-700 ring-emerald-200",
};
const statusLabel: Record<string, string> = {
  "borrador": "Borrador",
  "incompleta": "Incompleta",
  "lista-para-contrastar": "Lista para contrastar",
};
const confidenceStyle: Record<HypothesisConfidence, string> = {
  "exploratoria": "bg-blue-50 text-blue-700 ring-blue-200",
  "plausible": "bg-violet-50 text-violet-700 ring-violet-200",
  "bien-sustentada": "bg-emerald-50 text-emerald-700 ring-emerald-200",
};
const confidenceLabel: Record<HypothesisConfidence, string> = {
  "exploratoria": "Exploratoria",
  "plausible": "Plausible",
  "bien-sustentada": "Bien sustentada",
};
const roleLabel: Record<HypothesisVariableRole, string> = {
  causa: "Causa",
  resultado: "Resultado",
  mediadora: "Mediadora",
  moderadora: "Moderadora",
  control: "Control",
};

// ─── TextareaField ────────────────────────────────────────────────────────────

function TextareaField({
  label,
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
  hint,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground/60">
        {label}{required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      {hint && (
        <p className="text-xs text-muted-foreground/50 italic leading-relaxed">{hint}</p>
      )}
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-primary leading-[1.75] placeholder:text-muted-foreground/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 resize-none transition-colors"
        aria-required={required}
      />
    </div>
  );
}

// ─── HypothesisCard ───────────────────────────────────────────────────────────

function HypothesisCard({
  hypothesis,
  index,
  total,
  isEditing,
  onEdit,
  onDuplicate,
  onMarkPrimary,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  hypothesis: PolicyHypothesis;
  index: number;
  total: number;
  isEditing: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onMarkPrimary: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const status = computeHypothesisStatus(hypothesis);

  return (
    <div
      className={`rounded-2xl border bg-white transition-all duration-200 ${
        isEditing ? "border-accent/40 shadow-md" : "border-border hover:border-border/80"
      }`}
    >
      <div className="px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {hypothesis.isPrimary && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent text-white ring-0">
                  <Star className="w-2.5 h-2.5" aria-hidden="true" />
                  Principal
                </span>
              )}
              {hypothesis.patternChangedWarning && (
                <span className="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                  Enfoque cambiado
                </span>
              )}
              <span
                className={`text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${statusStyle[status]}`}
              >
                {statusLabel[status]}
              </span>
              <span
                className={`text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${confidenceStyle[hypothesis.confianza]}`}
              >
                {confidenceLabel[hypothesis.confianza]}
              </span>
            </div>

            <h3 className="font-serif text-base text-primary leading-snug mb-1.5">
              {hypothesis.titulo || <span className="italic text-muted-foreground/40">Sin título</span>}
            </h3>

            {hypothesis.formulacion && (
              <p className="text-sm text-foreground/60 leading-[1.7] line-clamp-2">
                {hypothesis.formulacion}
              </p>
            )}

            <div className="flex items-center gap-3 mt-3 text-[10px] font-mono text-muted-foreground/45 uppercase tracking-wide">
              <span>{hypothesis.variables.length} variable{hypothesis.variables.length !== 1 ? "s" : ""}</span>
              <span>·</span>
              <span>{hypothesis.sourceQuestionIds.length} insumo{hypothesis.sourceQuestionIds.length !== 1 ? "s" : ""} vinculado{hypothesis.sourceQuestionIds.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              aria-label="Mover arriba"
              className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-muted/20 disabled:opacity-20 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === total - 1}
              aria-label="Mover abajo"
              className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-muted/20 disabled:opacity-20 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
          >
            {isEditing ? "Cerrar editor" : "Editar"}
            {!isEditing && <ChevronRight className="w-3 h-3" />}
          </button>
          <span className="text-border" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onDuplicate}
            aria-label="Duplicar hipótesis"
            className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
          >
            <Copy className="w-3 h-3" aria-hidden="true" />
            Duplicar
          </button>
          {!hypothesis.isPrimary && (
            <>
              <span className="text-border" aria-hidden="true">·</span>
              <button
                type="button"
                onClick={onMarkPrimary}
                aria-label="Marcar como hipótesis principal"
                className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
              >
                <Star className="w-3 h-3" aria-hidden="true" />
                Principal
              </button>
            </>
          )}
          <span className="text-border" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Eliminar hipótesis"
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-colors"
          >
            <Trash2 className="w-3 h-3" aria-hidden="true" />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HypothesisEditor ─────────────────────────────────────────────────────────

function HypothesisEditor({
  hypothesis,
  reflectionAnswers,
  onChange,
}: {
  hypothesis: PolicyHypothesis;
  reflectionAnswers: ReflectionAnswer[];
  onChange: (updated: PolicyHypothesis) => void;
}) {
  const idBase = useId();
  const answeredReflections = getAnsweredReflections(reflectionAnswers);
  const [showReflections, setShowReflections] = useState(answeredReflections.length > 0);
  const [showTemplates, setShowTemplates] = useState(false);
  const [generatedFormulacion, setGeneratedFormulacion] = useState<string | null>(null);
  const [newVarNombre, setNewVarNombre] = useState("");
  const [newVarRol, setNewVarRol] = useState<HypothesisVariableRole>("causa");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const validation = validateHypothesis(hypothesis);

  const canGenerateFormulacion =
    hypothesis.causa.trim() && hypothesis.mecanismo.trim() && hypothesis.resultadoEsperado.trim();

  function handleFieldChange(field: keyof PolicyHypothesis, value: string) {
    onChange(updateHypothesis(hypothesis, { [field]: value } as Partial<PolicyHypothesis>));
  }

  function handleGenerateFormulacion() {
    const provisional = buildProvisionalFormulacion(
      hypothesis.causa,
      hypothesis.mecanismo,
      hypothesis.resultadoEsperado
    );
    setGeneratedFormulacion(provisional);
  }

  function handleApplyFormulacion() {
    if (!generatedFormulacion) return;
    onChange(updateHypothesis(hypothesis, { formulacion: generatedFormulacion }));
    setGeneratedFormulacion(null);
  }

  function handleAddVariable() {
    if (!newVarNombre.trim()) return;
    const variable = createVariable(newVarNombre.trim(), newVarRol);
    onChange(updateHypothesis(hypothesis, { variables: [...hypothesis.variables, variable] }));
    setNewVarNombre("");
    setNewVarRol("causa");
  }

  function handleRemoveVariable(varId: string) {
    if (deleteConfirm === varId) {
      onChange(removeVariable(hypothesis, varId));
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(varId);
    }
  }

  function handleUpdateVariableRol(varId: string, rol: HypothesisVariableRole) {
    onChange(updateVariable(hypothesis, varId, { rol }));
  }

  function handleLinkAnswer(questionKey: string) {
    onChange(linkReflectionAnswer(hypothesis, questionKey));
  }

  function handleUnlinkAnswer(questionKey: string) {
    onChange(unlinkReflectionAnswer(hypothesis, questionKey));
  }

  return (
    <div className="rounded-2xl border border-accent/20 bg-white p-6 space-y-6">

      {/* ── Título ──────────────────────────────────────────────── */}
      <TextareaField
        id={`${idBase}-titulo`}
        label="Título"
        value={hypothesis.titulo}
        onChange={(v) => handleFieldChange("titulo", v)}
        placeholder="Breve etiqueta para identificar esta hipótesis"
        rows={1}
      />

      {/* ── Elementos de reflexión disponibles ──────────────────── */}
      {answeredReflections.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowReflections((s) => !s)}
            aria-expanded={showReflections}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-accent/70 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
            Elementos de la reflexión ({answeredReflections.length})
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform ${showReflections ? "rotate-90" : ""}`}
              aria-hidden="true"
            />
          </button>

          <AnimatePresence>
            {showReflections && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2.5">
                  {answeredReflections.map((ans) => {
                    const isLinked = hypothesis.sourceQuestionIds.includes(ans.questionKey);
                    return (
                      <div
                        key={ans.questionKey}
                        className={`rounded-xl px-4 py-3 border text-sm ${
                          isLinked
                            ? "border-accent/30 bg-accent/5"
                            : "border-border bg-muted/20"
                        }`}
                      >
                        <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/50 mb-1">
                          {ans.patternTitulo} · {ans.categoria}
                        </p>
                        <p className="text-xs text-foreground/60 leading-relaxed italic mb-2">
                          {ans.questionText}
                        </p>
                        <p className="text-sm text-primary leading-[1.7] mb-3">
                          {ans.answerText}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            isLinked
                              ? handleUnlinkAnswer(ans.questionKey)
                              : handleLinkAnswer(ans.questionKey)
                          }
                          aria-pressed={isLinked}
                          className={`text-[10px] font-mono uppercase tracking-wide px-2.5 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                            isLinked
                              ? "bg-accent/15 text-accent hover:bg-accent/25"
                              : "bg-muted/50 text-muted-foreground/60 hover:bg-accent/10 hover:text-accent"
                          }`}
                        >
                          {isLinked ? "✓ Insumo vinculado" : "Usar como insumo"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Plantillas metodológicas ─────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowTemplates((s) => !s)}
          aria-expanded={showTemplates}
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
        >
          Plantillas metodológicas
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform ${showTemplates ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
        </button>
        <AnimatePresence>
          {showTemplates && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2.5">
                {HYPOTHESIS_TEMPLATES.map((tpl) => (
                  <div key={tpl.id} className="rounded-xl border border-border bg-muted/10 px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/50 mb-1">
                      {tpl.nombre}
                    </p>
                    <p className="text-sm font-medium text-primary mb-1">{tpl.estructura}</p>
                    <p className="text-xs text-foreground/50 italic leading-relaxed">{tpl.ejemplo}</p>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground/40 italic">
                  Las plantillas son estructuras metodológicas genéricas. No contienen conocimiento específico de ningún sector.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Formulación ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <TextareaField
          id={`${idBase}-formulacion`}
          label="Formulación"
          value={hypothesis.formulacion}
          onChange={(v) => handleFieldChange("formulacion", v)}
          placeholder='Ej: "Cuando los costos operativos superan la capacidad institucional, la continuidad del servicio se deteriora porque los operadores no pueden financiar la operación."'
          rows={3}
          required
          hint="Una hipótesis conecta una causa, un mecanismo y un resultado observable."
        />
        {canGenerateFormulacion && !generatedFormulacion && (
          <button
            type="button"
            onClick={handleGenerateFormulacion}
            className="text-xs text-accent/70 hover:text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
          >
            Generar formulación provisional desde los campos causa, mecanismo y resultado
          </button>
        )}
        {generatedFormulacion && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <p className="text-[10px] font-mono uppercase tracking-wide text-accent/60 mb-1.5">
              Formulación provisional generada
            </p>
            <p className="text-sm text-primary italic leading-[1.75] mb-3">{generatedFormulacion}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleApplyFormulacion}
                className="text-xs font-medium text-accent hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
              >
                Usar esta formulación
              </button>
              <button
                type="button"
                onClick={() => setGeneratedFormulacion(null)}
                className="text-xs text-muted-foreground/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
              >
                Descartar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Causa ──────────────────────────────────────────────── */}
      <TextareaField
        id={`${idBase}-causa`}
        label="Causa o condición"
        value={hypothesis.causa}
        onChange={(v) => handleFieldChange("causa", v)}
        placeholder="¿Qué factor, decisión, condición o comportamiento podría estar produciendo el problema?"
        hint="¿Qué factor, decisión, condición o comportamiento podría estar produciendo el problema?"
        rows={2}
        required
      />

      {/* ── Mecanismo ──────────────────────────────────────────── */}
      <TextareaField
        id={`${idBase}-mecanismo`}
        label="Mecanismo"
        value={hypothesis.mecanismo}
        onChange={(v) => handleFieldChange("mecanismo", v)}
        placeholder="¿Cómo o por qué esa causa produciría el resultado?"
        hint="¿Cómo o por qué esa causa produciría el resultado?"
        rows={2}
        required
      />

      {/* ── Resultado esperado ─────────────────────────────────── */}
      <TextareaField
        id={`${idBase}-resultado`}
        label="Resultado esperado"
        value={hypothesis.resultadoEsperado}
        onChange={(v) => handleFieldChange("resultadoEsperado", v)}
        placeholder="¿Qué cambio observable debería producirse si la hipótesis es correcta?"
        hint="¿Qué cambio observable debería producirse si la hipótesis es correcta?"
        rows={2}
        required
      />

      {/* ── Condiciones ────────────────────────────────────────── */}
      <TextareaField
        id={`${idBase}-condiciones`}
        label="Condiciones"
        value={hypothesis.condiciones ?? ""}
        onChange={(v) => handleFieldChange("condiciones", v)}
        placeholder="¿Bajo qué circunstancias debería cumplirse?"
        hint="¿Bajo qué circunstancias debería cumplirse?"
        rows={2}
      />

      {/* ── Límites ────────────────────────────────────────────── */}
      <TextareaField
        id={`${idBase}-limites`}
        label="Límites"
        value={hypothesis.limites ?? ""}
        onChange={(v) => handleFieldChange("limites", v)}
        placeholder="¿En qué casos podría no cumplirse?"
        hint="¿En qué casos podría no cumplirse?"
        rows={2}
      />

      {/* ── Evidencia necesaria ─────────────────────────────────── */}
      <TextareaField
        id={`${idBase}-evidencia`}
        label="Evidencia necesaria"
        value={hypothesis.evidenciaNecesaria ?? ""}
        onChange={(v) => handleFieldChange("evidenciaNecesaria", v)}
        placeholder="¿Qué información permitiría apoyarla o refutarla?"
        hint="¿Qué información permitiría apoyarla o refutarla?"
        rows={2}
      />

      {/* ── Variables ───────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground/60">
          Variables
        </p>

        {hypothesis.variables.length > 0 ? (
          <div className="space-y-2" role="list" aria-label="Variables de la hipótesis">
            {hypothesis.variables.map((v) => (
              <div
                key={v.id}
                role="listitem"
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/10 px-4 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-primary font-medium">{v.nombre}</span>
                  {v.descripcion && (
                    <span className="text-xs text-muted-foreground/50 ml-2">{v.descripcion}</span>
                  )}
                </div>
                <select
                  value={v.rol}
                  onChange={(e) =>
                    handleUpdateVariableRol(v.id, e.target.value as HypothesisVariableRole)
                  }
                  aria-label={`Rol de ${v.nombre}`}
                  className="shrink-0 text-[10px] font-mono uppercase tracking-wide rounded-lg border border-border bg-white px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  {(Object.keys(roleLabel) as HypothesisVariableRole[]).map((r) => (
                    <option key={r} value={r}>{roleLabel[r]}</option>
                  ))}
                </select>
                {deleteConfirm === v.id ? (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRemoveVariable(v.id)}
                      className="text-[10px] font-mono text-red-600 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-colors"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(null)}
                      className="text-[10px] font-mono text-muted-foreground/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRemoveVariable(v.id)}
                    aria-label={`Eliminar variable ${v.nombre}`}
                    className="shrink-0 text-muted-foreground/30 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/40 italic">
            Sin variables. Una hipótesis completa tiene al menos una variable causa y una resultado.
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={newVarNombre}
            onChange={(e) => setNewVarNombre(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddVariable(); } }}
            placeholder="Nombre de la variable"
            aria-label="Nombre de nueva variable"
            className="flex-1 rounded-xl border border-border bg-white px-4 py-2 text-sm text-primary placeholder:text-muted-foreground/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
          />
          <select
            value={newVarRol}
            onChange={(e) => setNewVarRol(e.target.value as HypothesisVariableRole)}
            aria-label="Rol de la nueva variable"
            className="shrink-0 rounded-xl border border-border bg-white px-3 py-2 text-xs font-mono uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            {(Object.keys(roleLabel) as HypothesisVariableRole[]).map((r) => (
              <option key={r} value={r}>{roleLabel[r]}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddVariable}
            disabled={!newVarNombre.trim()}
            aria-label="Agregar variable"
            className="shrink-0 p-2 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Nivel de confianza ──────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground/60">
          Nivel de confianza
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Nivel de confianza">
          {(Object.keys(confidenceLabel) as HypothesisConfidence[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(updateHypothesis(hypothesis, { confianza: c }))}
              aria-pressed={hypothesis.confianza === c}
              className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                hypothesis.confianza === c
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-white text-foreground/60 hover:border-accent/40 hover:text-primary"
              }`}
            >
              {confidenceLabel[c]}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground/45 leading-relaxed">
          {hypothesis.confianza === "exploratoria" && "Existe una relación plausible, pero todavía hay poca evidencia."}
          {hypothesis.confianza === "plausible" && "La hipótesis cuenta con argumentos o evidencia parcial."}
          {hypothesis.confianza === "bien-sustentada" && "Existen fundamentos empíricos o teóricos suficientes para priorizar su contrastación."}
        </div>
      </div>

      {/* ── Validación metodológica ─────────────────────────────── */}
      <div className="rounded-xl border border-border bg-muted/10 px-4 py-4 space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/50">
          Validación metodológica
        </p>

        {validation.errors.length > 0 && (
          <div className="space-y-1.5" role="alert" aria-live="polite">
            {validation.errors.map((e) => (
              <div key={e} className="flex items-start gap-2 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{e}</span>
              </div>
            ))}
          </div>
        )}

        {validation.warnings.length > 0 && (
          <div className="space-y-1.5" aria-live="polite">
            {validation.warnings.map((w) => (
              <div key={w} className="flex items-start gap-2 text-xs text-amber-700/80">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {validation.strengths.length > 0 && (
          <div className="space-y-1.5">
            {validation.strengths.map((s) => (
              <div key={s} className="flex items-start gap-2 text-xs text-emerald-700/80">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}

        {validation.errors.length === 0 && validation.warnings.length === 0 && validation.strengths.length === 0 && (
          <p className="text-xs text-muted-foreground/40 italic">
            Completa los campos para ver el diagnóstico metodológico.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── PantallaHypothesisBuilder ────────────────────────────────────────────────

export function PantallaHypothesisBuilder({
  problema,
  perequeMode,
  reflectionAnswers,
  hypotheses,
  primaryHypothesisId,
  onUpdateHypotheses,
  onUpdatePrimaryId,
  onContinuar,
  onVolver,
}: {
  problema: string;
  perequeMode: PerequeMode;
  reflectionAnswers: ReflectionAnswer[];
  hypotheses: PolicyHypothesis[];
  primaryHypothesisId: string | undefined;
  onUpdateHypotheses: (h: PolicyHypothesis[]) => void;
  onUpdatePrimaryId: (id: string | undefined) => void;
  onContinuar: () => void;
  onVolver: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const patternIds = getPatternIdsFromPerequeMode(perequeMode);
  const exceedsLimit = exceedsRecommendedCount(hypotheses);

  function handleNew() {
    const h = createEmptyHypothesis(patternIds);
    const updated = [...hypotheses, h];
    onUpdateHypotheses(updated);
    setEditingId(h.id);
  }

  function handleEdit(id: string) {
    setEditingId((prev) => (prev === id ? null : id));
    setDeleteConfirmId(null);
  }

  function handleUpdate(updated: PolicyHypothesis) {
    onUpdateHypotheses(hypotheses.map((h) => (h.id === updated.id ? updated : h)));
  }

  function handleDuplicate(id: string) {
    const h = hypotheses.find((x) => x.id === id);
    if (!h) return;
    const dup = duplicateHypothesis(h);
    onUpdateHypotheses([...hypotheses, dup]);
  }

  function handleMarkPrimary(id: string) {
    const updated = setPrimaryHypothesis(hypotheses, id);
    onUpdateHypotheses(updated);
    onUpdatePrimaryId(id);
  }

  function handleMove(id: string, dir: "up" | "down") {
    onUpdateHypotheses(moveHypothesis(hypotheses, id, dir));
  }

  function handleDelete(id: string) {
    if (deleteConfirmId === id) {
      onUpdateHypotheses(removeHypothesis(hypotheses, id));
      if (editingId === id) setEditingId(null);
      if (primaryHypothesisId === id) onUpdatePrimaryId(undefined);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
    }
  }

  return (
    <motion.div
      key="hypothesis-builder"
      variants={screenEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-[calc(100vh-4rem)]"
    >
      <div className="max-w-2xl mx-auto px-6 py-20 w-full">

        {/* ── Contexto ──────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/60">
            <span className="text-accent" aria-hidden="true">◆</span>
            Analizando
          </span>
          <p className="mt-1.5 text-lg font-serif italic text-primary/70">
            "{problema}"
          </p>
          <p className="mt-1 text-xs text-muted-foreground/45 font-mono">
            Enfoque: {getPatternLabel(perequeMode)}
          </p>
        </motion.div>

        {/* ── Título ────────────────────────────────────────────── */}
        <motion.h2
          ref={headingRef}
          tabIndex={-1}
          variants={fadeUp}
          className="font-serif text-4xl md:text-5xl text-primary leading-[1.15] mb-4 focus:outline-none"
        >
          Construyamos hipótesis
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="text-base text-foreground/60 leading-relaxed mb-10"
        >
          Una hipótesis conecta una causa, un mecanismo y un resultado que puede contrastarse con evidencia.
        </motion.p>

        {/* ── Advertencia >5 hipótesis ─────────────────────────── */}
        {exceedsLimit && (
          <motion.div
            variants={fadeUp}
            className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-5 py-4"
            role="status"
            aria-live="polite"
          >
            <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-sm text-amber-700/90 leading-relaxed">
              Para mantener el análisis manejable, conviene priorizar las hipótesis más relevantes.
              Actualmente tienes {hypotheses.length} (recomendado: hasta {MAX_RECOMMENDED_HYPOTHESES}).
            </p>
          </motion.div>
        )}

        {/* ── Nueva hipótesis ──────────────────────────────────── */}
        <motion.div variants={fadeUp} className="mb-8">
          <button
            type="button"
            onClick={handleNew}
            className="group flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-dashed border-accent/40 bg-accent/5 text-sm font-medium text-accent hover:bg-accent/10 hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" aria-hidden="true" />
            Nueva hipótesis
          </button>
        </motion.div>

        {/* ── Lista de hipótesis ───────────────────────────────── */}
        {hypotheses.length === 0 && (
          <motion.div
            variants={fadeUp}
            className="mb-10 rounded-2xl border border-dashed border-border bg-muted/10 px-8 py-12 text-center"
          >
            <p className="font-serif text-xl text-primary/40 mb-2">Sin hipótesis aún</p>
            <p className="text-sm text-muted-foreground/50">
              Usa el botón de arriba para crear tu primera hipótesis.
            </p>
          </motion.div>
        )}

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-4 mb-10"
          role="list"
          aria-label="Hipótesis"
        >
          {hypotheses.map((h, i) => (
            <motion.div key={h.id} variants={fadeUp} role="listitem">
              {/* Delete confirmation overlay */}
              {deleteConfirmId === h.id ? (
                <div className="rounded-2xl border border-red-200 bg-red-50/60 px-6 py-5">
                  <p className="text-sm font-medium text-red-700 mb-3">
                    ¿Eliminar "{h.titulo || "esta hipótesis"}"?
                  </p>
                  <p className="text-xs text-red-600/70 mb-4">Esta acción no se puede deshacer.</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(h.id)}
                      className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-medium hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors"
                    >
                      Eliminar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-4 py-2 rounded-xl border border-border bg-white text-xs font-medium text-foreground/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <HypothesisCard
                    hypothesis={h}
                    index={i}
                    total={hypotheses.length}
                    isEditing={editingId === h.id}
                    onEdit={() => handleEdit(h.id)}
                    onDuplicate={() => handleDuplicate(h.id)}
                    onMarkPrimary={() => handleMarkPrimary(h.id)}
                    onMoveUp={() => handleMove(h.id, "up")}
                    onMoveDown={() => handleMove(h.id, "down")}
                    onDelete={() => handleDelete(h.id)}
                  />
                  <AnimatePresence>
                    {editingId === h.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden mt-2"
                      >
                        <HypothesisEditor
                          hypothesis={h}
                          reflectionAnswers={reflectionAnswers}
                          onChange={handleUpdate}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* ── Botones ───────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-5">
          <button
            onClick={onContinuar}
            disabled={hypotheses.length === 0}
            className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-white text-sm font-medium tracking-wide hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all duration-200"
          >
            Revisar hipótesis
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" aria-hidden="true" />
          </button>
          <button
            onClick={onVolver}
            className="text-sm text-muted-foreground/60 hover:text-primary underline-offset-4 hover:underline transition-colors duration-200"
          >
            Volver al pereque
          </button>
        </motion.div>

      </div>
    </motion.div>
  );
}
