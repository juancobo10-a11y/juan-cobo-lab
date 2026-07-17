/**
 * PantallaContrastationMatrix — S-019
 *
 * Screen for building the contrastation matrix: explicit criteria for
 * supporting or refuting each hypothesis.
 *
 * Each row = Indicador × Fuente × EvidenciaEsperada × EvidenciaContraria
 *            × CriterioInterpretacion × Limitaciones × Prioridad
 *
 * Accessibility:
 *   - keyboard navigation throughout
 *   - aria-labels on all interactive elements
 *   - visible focus rings
 *   - real <button> elements only
 *   - no drag-and-drop
 *   - aria-live for validation updates
 */

import { useRef, useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Info, ArrowLeft, ArrowRight,
  RotateCcw, GitCompareArrows,
} from "lucide-react";

import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type {
  ContrastationMatrix,
  ContrastationRow,
  ContrastationValidation,
  Prioridad,
} from "@/contrastation/types";
import { PRIORIDAD_LABELS, PRIORIDAD_LIST } from "@/contrastation/types";
import {
  createEmptyContrastationMatrix,
  createContrastationRow,
  updateContrastationRow,
  removeContrastationRow,
  reutilizarIndicadorEnContrastation,
  reutilizarFuenteEnContrastation,
  validateContrastation,
  confirmContrastationMatrix,
} from "@/contrastation/ContrastationService";

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
  hypothesis: PolicyHypothesis;
  conceptualModel: ConceptualModel;
  matrix: ContrastationMatrix | null;
  onUpdateMatrix: (matrix: ContrastationMatrix) => void;
  onConfirmar: (matrix: ContrastationMatrix) => void;
  onVerCadena: () => void;
  onVolver: () => void;
  onReiniciar: () => void;
}

// ─── Add-row form state ───────────────────────────────────────────────────────

interface AddRowForm {
  indicadorId: string;
  fuenteId: string;
  evidenciaEsperada: string;
  evidenciaContraria: string;
  criterioInterpretacion: string;
  limitaciones: string;
  prioridad: Prioridad | "";
  observaciones: string;
}

const emptyForm = (): AddRowForm => ({
  indicadorId: "",
  fuenteId: "",
  evidenciaEsperada: "",
  evidenciaContraria: "",
  criterioInterpretacion: "",
  limitaciones: "",
  prioridad: "",
  observaciones: "",
});

// ─── Expanded row editor ──────────────────────────────────────────────────────

interface ExpandedRowEditorProps {
  row: ContrastationRow;
  conceptualModel: ConceptualModel;
  onUpdateField: (field: string, value: string | null) => void;
  onReutilizarIndicador: (indicadorId: string) => void;
  onReutilizarFuente: (fuenteId: string) => void;
  onRemove: () => void;
}

function ExpandedRowEditor({
  row, conceptualModel, onUpdateField, onReutilizarIndicador, onReutilizarFuente, onRemove,
}: ExpandedRowEditorProps) {
  const inputCls = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";
  const selectCls = `${inputCls} disabled:opacity-50`;
  const textareaCls = `${inputCls} resize-y`;

  return (
    <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Indicador */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground/70">Indicador</label>
          <select
            aria-label="Indicador para este criterio"
            value={row.indicadorId ?? ""}
            onChange={(e) => onReutilizarIndicador(e.target.value)}
            className={selectCls}
          >
            <option value="">— Sin indicador —</option>
            {conceptualModel.indicators.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.nombre}{ind.unidad ? ` (${ind.unidad})` : ""}
              </option>
            ))}
          </select>
        </div>
        {/* Fuente */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground/70">Fuente</label>
          <select
            aria-label="Fuente de evidencia para este criterio"
            value={row.fuenteId ?? ""}
            onChange={(e) => onReutilizarFuente(e.target.value)}
            className={selectCls}
          >
            <option value="">— Sin fuente —</option>
            {conceptualModel.evidenceSources.map((src) => (
              <option key={src.id} value={src.id}>{src.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Evidencia esperada */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground/70">
          Evidencia esperada <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-muted-foreground/70">¿Qué observaríamos si la hipótesis fuera consistente?</p>
        <textarea
          aria-label="Evidencia esperada"
          value={row.evidenciaEsperada}
          onChange={(e) => onUpdateField("evidenciaEsperada", e.target.value)}
          rows={2}
          placeholder="Si la intervención funciona, esperaríamos observar..."
          className={textareaCls}
        />
      </div>

      {/* Evidencia contraria */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground/70">
          Evidencia contraria <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-muted-foreground/70">¿Qué resultado pondría seriamente en duda la hipótesis?</p>
        <textarea
          aria-label="Evidencia contraria"
          value={row.evidenciaContraria}
          onChange={(e) => onUpdateField("evidenciaContraria", e.target.value)}
          rows={2}
          placeholder="Si el indicador permanece estable o declina, la hipótesis perdería plausibilidad."
          className={textareaCls}
        />
      </div>

      {/* Criterio de interpretación */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground/70">Criterio de interpretación</label>
        <textarea
          aria-label="Criterio de interpretación del resultado"
          value={row.criterioInterpretacion}
          onChange={(e) => onUpdateField("criterioInterpretacion", e.target.value)}
          rows={2}
          placeholder="p. ej. Si el indicador permanece estable pese a la intervención, la hipótesis pierde plausibilidad."
          className={textareaCls}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Limitaciones */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground/70">Limitaciones</label>
          <textarea
            aria-label="Limitaciones del criterio"
            value={row.limitaciones}
            onChange={(e) => onUpdateField("limitaciones", e.target.value)}
            rows={2}
            placeholder="Cobertura parcial, sesgo de respuesta, periodicidad insuficiente..."
            className={textareaCls}
          />
        </div>

        {/* Prioridad + Observaciones */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground/70">Prioridad</label>
            <select
              aria-label="Prioridad del criterio"
              value={row.prioridad}
              onChange={(e) => onUpdateField("prioridad", e.target.value)}
              className={inputCls}
            >
              <option value="">— Sin prioridad —</option>
              {PRIORIDAD_LIST.map((p) => (
                <option key={p} value={p}>{PRIORIDAD_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground/70">Observaciones</label>
            <textarea
              aria-label="Observaciones adicionales"
              value={row.observaciones}
              onChange={(e) => onUpdateField("observaciones", e.target.value)}
              rows={2}
              placeholder="Notas metodológicas..."
              className={textareaCls}
            />
          </div>
        </div>
      </div>

      {/* Remove */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 rounded transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          Eliminar criterio
        </button>
      </div>
    </div>
  );
}

// ─── Row card ─────────────────────────────────────────────────────────────────

interface RowCardProps {
  row: ContrastationRow;
  indicadorNombre: string | null;
  fuenteNombre: string | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  conceptualModel: ConceptualModel;
  onUpdateField: (field: string, value: string | null) => void;
  onReutilizarIndicador: (indicadorId: string) => void;
  onReutilizarFuente: (fuenteId: string) => void;
  onRemove: () => void;
}

function RowCard({
  row, indicadorNombre, fuenteNombre, isExpanded, onToggleExpand,
  conceptualModel, onUpdateField, onReutilizarIndicador, onReutilizarFuente, onRemove,
}: RowCardProps) {
  const prioColor: Record<string, string> = {
    alta: "text-red-600 bg-red-50",
    media: "text-amber-600 bg-amber-50",
    baja: "text-emerald-600 bg-emerald-50",
    "": "text-muted-foreground bg-muted/30",
  };
  const prio = row.prioridad || "";

  return (
    <div className="rounded-xl border border-border bg-white/70 overflow-hidden">
      {/* Summary row */}
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={onToggleExpand}
        className="w-full text-left grid grid-cols-[1fr_1fr_auto] md:grid-cols-[2fr_2fr_2fr_auto] gap-3 items-center px-4 py-3 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors"
      >
        <span className="text-xs text-foreground/80 truncate">
          {indicadorNombre ?? <span className="text-red-400 italic">Sin indicador</span>}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          {fuenteNombre ?? <span className="text-red-400 italic">Sin fuente</span>}
        </span>
        <span className="hidden md:block text-xs text-muted-foreground truncate max-w-xs">
          {row.evidenciaEsperada || <span className="italic text-muted-foreground/50">Sin evidencia esperada</span>}
        </span>
        <div className="flex items-center gap-2">
          {prio && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${prioColor[prio]}`}>
              {PRIORIDAD_LABELS[prio as Prioridad]}
            </span>
          )}
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" aria-hidden="true" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" aria-hidden="true" />}
        </div>
      </button>

      {/* Expanded editor */}
      {isExpanded && (
        <ExpandedRowEditor
          row={row}
          conceptualModel={conceptualModel}
          onUpdateField={onUpdateField}
          onReutilizarIndicador={onReutilizarIndicador}
          onReutilizarFuente={onReutilizarFuente}
          onRemove={onRemove}
        />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PantallaContrastationMatrix({
  hypothesis,
  conceptualModel,
  matrix: matrixProp,
  onUpdateMatrix,
  onConfirmar,
  onVerCadena,
  onVolver,
  onReiniciar,
}: Props) {
  const [matrix, setMatrix] = useState<ContrastationMatrix>(
    () => matrixProp ?? createEmptyContrastationMatrix(hypothesis.id)
  );

  useEffect(() => {
    if (matrixProp && matrixProp.id !== matrix.id) {
      setMatrix(matrixProp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrixProp?.id]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<AddRowForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const firstInputRef = useRef<HTMLSelectElement>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const validation: ContrastationValidation = validateContrastation(matrix);

  useEffect(() => {
    if (showAddForm) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [showAddForm]);

  function applyAndSync(updated: ContrastationMatrix) {
    setMatrix(updated);
    onUpdateMatrix(updated);
  }

  function indicadorNombre(id: string | null) {
    if (!id) return null;
    return conceptualModel.indicators.find((i) => i.id === id)?.nombre ?? null;
  }

  function fuenteNombre(id: string | null) {
    if (!id) return null;
    return conceptualModel.evidenceSources.find((s) => s.id === id)?.nombre ?? null;
  }

  // ── Add row ────────────────────────────────────────────────────────────────

  function validateForm(): string[] {
    const errs: string[] = [];
    if (!form.evidenciaEsperada.trim())
      errs.push("Escribe la evidencia esperada (¿qué observaríamos si la hipótesis fuera consistente?).");
    if (!form.evidenciaContraria.trim())
      errs.push("Escribe la evidencia contraria (¿qué resultado pondría en duda la hipótesis?).");
    return errs;
  }

  function handleAddRow() {
    const errs = validateForm();
    if (errs.length > 0) {
      setFormErrors(errs);
      return;
    }
    setFormErrors([]);
    const updated = createContrastationRow(matrix, conceptualModel, {
      indicadorId: form.indicadorId || null,
      fuenteId: form.fuenteId || null,
      evidenciaEsperada: form.evidenciaEsperada,
      evidenciaContraria: form.evidenciaContraria,
      criterioInterpretacion: form.criterioInterpretacion,
      limitaciones: form.limitaciones,
      prioridad: form.prioridad || "",
      observaciones: form.observaciones,
    });
    applyAndSync(updated);
    setForm(emptyForm());
    setShowAddForm(false);
  }

  function handleRemoveRow(rowId: string) {
    applyAndSync(removeContrastationRow(matrix, rowId));
    if (expandedRowId === rowId) setExpandedRowId(null);
  }

  function handleUpdateField(rowId: string, field: string, value: string | null) {
    applyAndSync(
      updateContrastationRow(matrix, conceptualModel, rowId, { [field]: value } as never)
    );
  }

  function handleReutilizarIndicador(rowId: string, indicadorId: string) {
    if (!indicadorId) {
      applyAndSync(updateContrastationRow(matrix, conceptualModel, rowId, { indicadorId: null }));
      return;
    }
    applyAndSync(reutilizarIndicadorEnContrastation(matrix, conceptualModel, rowId, indicadorId));
  }

  function handleReutilizarFuente(rowId: string, fuenteId: string) {
    if (!fuenteId) {
      applyAndSync(updateContrastationRow(matrix, conceptualModel, rowId, { fuenteId: null }));
      return;
    }
    applyAndSync(reutilizarFuenteEnContrastation(matrix, conceptualModel, rowId, fuenteId));
  }

  function handleConfirmar() {
    const confirmed = confirmContrastationMatrix(matrix);
    setMatrix(confirmed);
    onConfirmar(confirmed);
  }

  const inputCls = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";
  const textareaCls = `${inputCls} resize-y placeholder:text-muted-foreground/50`;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full max-w-5xl mx-auto px-4 py-10"
    >
      <div className="space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="space-y-2">
          <div className="flex items-center gap-2.5 text-muted-foreground/70 text-xs font-mono uppercase tracking-widest">
            <GitCompareArrows className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Matriz de Contrastación</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground leading-snug">
            Criterios de contrastación
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Define explícitamente qué evidencia apoyaría esta hipótesis y qué evidencia
            la debilitaría. Cada fila representa un criterio de contrastación vinculado
            a un indicador y una fuente del modelo conceptual.
          </p>
        </motion.div>

        {/* ── Hypothesis summary ────────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          className="rounded-xl border border-border bg-white/50 p-5 space-y-1"
        >
          <p className="text-xs font-mono text-muted-foreground/60 uppercase tracking-widest">
            Hipótesis en contrastación
          </p>
          <p className="text-sm font-medium text-foreground/90 leading-snug">
            {hypothesis.titulo}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {hypothesis.formulacion}
          </p>
        </motion.div>

        {/* ── Model summary ─────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="rounded-xl border border-border bg-white/40 p-4">
          <p className="text-xs font-mono text-muted-foreground/60 uppercase tracking-widest mb-3">
            Recursos del modelo conceptual disponibles
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground/70">
                Variables ({conceptualModel.variables.length})
              </p>
              <ul className="space-y-0.5">
                {conceptualModel.variables.map((v) => (
                  <li key={v.id} className="text-xs text-muted-foreground truncate">• {v.nombre}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground/70">
                Indicadores ({conceptualModel.indicators.length})
              </p>
              <ul className="space-y-0.5">
                {conceptualModel.indicators.map((i) => (
                  <li key={i.id} className="text-xs text-muted-foreground truncate">• {i.nombre}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground/70">
                Fuentes ({conceptualModel.evidenceSources.length})
              </p>
              <ul className="space-y-0.5">
                {conceptualModel.evidenceSources.map((s) => (
                  <li key={s.id} className="text-xs text-muted-foreground truncate">• {s.nombre}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* ── Validation panel ──────────────────────────────────────────── */}
        {(validation.blockingIssues.length > 0 || validation.warnings.length > 0) && (
          <motion.div
            variants={fadeUp}
            aria-live="polite"
            className="rounded-xl border border-border bg-white/40 p-5 space-y-3"
          >
            {validation.blockingIssues.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-red-600 text-xs font-semibold uppercase tracking-wide">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {validation.blockingIssues.length} problema
                    {validation.blockingIssues.length > 1 ? "s" : ""} que bloquean la confirmación
                  </span>
                </div>
                <ul className="space-y-0.5 pl-5 list-disc text-xs text-red-700">
                  {validation.blockingIssues.map((issue, i) => (
                    <li key={i}>
                      {issue.code === "sin-filas" && "La matriz no tiene criterios. Agrega al menos uno."}
                      {issue.code === "fila-sin-indicador" && `Criterio ${issue.orden + 1}: sin indicador asignado.`}
                      {issue.code === "fila-sin-fuente" && `Criterio ${issue.orden + 1}: sin fuente asignada.`}
                      {issue.code === "fila-sin-evidencia-esperada" && `Criterio ${issue.orden + 1}: sin evidencia esperada.`}
                      {issue.code === "fila-sin-evidencia-contraria" && `Criterio ${issue.orden + 1}: sin evidencia contraria.`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold uppercase tracking-wide">
                  <Info className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {validation.warnings.length} advertencia
                    {validation.warnings.length > 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="space-y-0.5 pl-5 list-disc text-xs text-amber-700">
                  {validation.warnings.map((issue, i) => (
                    <li key={i}>
                      {issue.code === "sin-criterio-interpretacion" && `Criterio ${issue.orden + 1}: sin criterio de interpretación.`}
                      {issue.code === "sin-limitaciones" && `Criterio ${issue.orden + 1}: sin limitaciones documentadas.`}
                      {issue.code === "prioridad-vacia" && `Criterio ${issue.orden + 1}: sin prioridad asignada.`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {validation.isValid && (
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Todos los criterios completos — lista para confirmar</span>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Criteria table ────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground/90">
              Criterios de contrastación
              {matrix.rows.length > 0 && (
                <span className="ml-2 text-muted-foreground font-normal">
                  ({matrix.rows.length})
                </span>
              )}
            </h2>
            {!showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary/30 text-primary bg-primary/5 text-xs font-medium hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Agregar criterio
              </button>
            )}
          </div>

          {/* Empty state */}
          {matrix.rows.length === 0 && !showAddForm && (
            <div className="rounded-xl border border-dashed border-border bg-white/30 py-12 flex flex-col items-center gap-3 text-muted-foreground/60">
              <GitCompareArrows className="w-8 h-8 opacity-40" aria-hidden="true" />
              <p className="text-sm">Sin criterios. Agrega el primero.</p>
            </div>
          )}

          {/* Row list */}
          {matrix.rows.length > 0 && (
            <div className="space-y-2">
              <div
                className="hidden md:grid grid-cols-[2fr_2fr_2fr_auto] gap-3 px-4 py-2 rounded-lg bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide"
                aria-hidden="true"
              >
                <span>Indicador</span>
                <span>Fuente</span>
                <span>Evidencia esperada</span>
                <span>Prioridad</span>
              </div>
              {matrix.rows.map((row) => (
                <RowCard
                  key={row.id}
                  row={row}
                  indicadorNombre={indicadorNombre(row.indicadorId)}
                  fuenteNombre={fuenteNombre(row.fuenteId)}
                  isExpanded={expandedRowId === row.id}
                  onToggleExpand={() =>
                    setExpandedRowId(expandedRowId === row.id ? null : row.id)
                  }
                  conceptualModel={conceptualModel}
                  onUpdateField={(field, value) =>
                    handleUpdateField(row.id, field, value)
                  }
                  onReutilizarIndicador={(indId) =>
                    handleReutilizarIndicador(row.id, indId)
                  }
                  onReutilizarFuente={(srcId) =>
                    handleReutilizarFuente(row.id, srcId)
                  }
                  onRemove={() => handleRemoveRow(row.id)}
                />
              ))}
            </div>
          )}

          {/* Add-row form */}
          {showAddForm && (
            <div
              role="region"
              aria-label="Agregar criterio de contrastación"
              className="rounded-xl border border-primary/20 bg-white/60 p-5 space-y-4"
            >
              <h3 className="text-sm font-semibold text-foreground/90">
                Nuevo criterio
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Indicador */}
                <div className="space-y-1">
                  <label htmlFor="form-indicador" className="text-xs font-medium text-foreground/70">
                    Indicador (del modelo conceptual)
                  </label>
                  <select
                    id="form-indicador"
                    ref={firstInputRef}
                    value={form.indicadorId}
                    onChange={(e) => setForm((f) => ({ ...f, indicadorId: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">— Sin indicador por ahora —</option>
                    {conceptualModel.indicators.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.nombre}{ind.unidad ? ` (${ind.unidad})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fuente */}
                <div className="space-y-1">
                  <label htmlFor="form-fuente" className="text-xs font-medium text-foreground/70">
                    Fuente (del modelo conceptual)
                  </label>
                  <select
                    id="form-fuente"
                    value={form.fuenteId}
                    onChange={(e) => setForm((f) => ({ ...f, fuenteId: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">— Sin fuente por ahora —</option>
                    {conceptualModel.evidenceSources.map((src) => (
                      <option key={src.id} value={src.id}>{src.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Evidencia esperada */}
              <div className="space-y-1">
                <label htmlFor="form-ev-esperada" className="text-xs font-medium text-foreground/70">
                  Evidencia esperada <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-muted-foreground/70">
                  ¿Qué observaríamos si la hipótesis fuera consistente?
                </p>
                <textarea
                  id="form-ev-esperada"
                  value={form.evidenciaEsperada}
                  onChange={(e) => setForm((f) => ({ ...f, evidenciaEsperada: e.target.value }))}
                  rows={2}
                  placeholder="Si la intervención funciona, esperaríamos observar incrementos en..."
                  className={textareaCls}
                />
              </div>

              {/* Evidencia contraria */}
              <div className="space-y-1">
                <label htmlFor="form-ev-contraria" className="text-xs font-medium text-foreground/70">
                  Evidencia contraria <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-muted-foreground/70">
                  ¿Qué resultado pondría seriamente en duda la hipótesis?
                </p>
                <textarea
                  id="form-ev-contraria"
                  value={form.evidenciaContraria}
                  onChange={(e) => setForm((f) => ({ ...f, evidenciaContraria: e.target.value }))}
                  rows={2}
                  placeholder="Si el indicador permanece estable o declina, la hipótesis perdería plausibilidad."
                  className={textareaCls}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Criterio interpretación */}
                <div className="space-y-1">
                  <label htmlFor="form-criterio" className="text-xs font-medium text-foreground/70">
                    Criterio de interpretación
                  </label>
                  <textarea
                    id="form-criterio"
                    value={form.criterioInterpretacion}
                    onChange={(e) => setForm((f) => ({ ...f, criterioInterpretacion: e.target.value }))}
                    rows={2}
                    placeholder="Si permanece estable pese a la intervención, pierde plausibilidad."
                    className={textareaCls}
                  />
                </div>
                {/* Limitaciones */}
                <div className="space-y-1">
                  <label htmlFor="form-limitaciones" className="text-xs font-medium text-foreground/70">
                    Limitaciones
                  </label>
                  <textarea
                    id="form-limitaciones"
                    value={form.limitaciones}
                    onChange={(e) => setForm((f) => ({ ...f, limitaciones: e.target.value }))}
                    rows={2}
                    placeholder="Cobertura parcial, periodicidad insuficiente..."
                    className={textareaCls}
                  />
                </div>
              </div>

              {/* Prioridad */}
              <div className="space-y-1">
                <label htmlFor="form-prioridad" className="text-xs font-medium text-foreground/70">
                  Prioridad
                </label>
                <select
                  id="form-prioridad"
                  value={form.prioridad}
                  onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value as Prioridad | "" }))}
                  className={inputCls}
                >
                  <option value="">— Sin prioridad —</option>
                  {PRIORIDAD_LIST.map((p) => (
                    <option key={p} value={p}>{PRIORIDAD_LABELS[p]}</option>
                  ))}
                </select>
              </div>

              {/* Observaciones */}
              <div className="space-y-1">
                <label htmlFor="form-obs" className="text-xs font-medium text-foreground/70">
                  Observaciones
                </label>
                <textarea
                  id="form-obs"
                  value={form.observaciones}
                  onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                  rows={2}
                  placeholder="Notas metodológicas adicionales..."
                  className={textareaCls}
                />
              </div>

              {/* Form errors */}
              {formErrors.length > 0 && (
                <ul
                  role="alert"
                  aria-live="assertive"
                  className="space-y-0.5 text-xs text-red-600 pl-4 list-disc"
                >
                  {formErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}

              {/* Form actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-5 py-2.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
                >
                  Agregar criterio
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setForm(emptyForm()); setFormErrors([]); }}
                  className="px-5 py-2.5 rounded-lg border border-border text-xs font-medium text-foreground/70 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Navigation ────────────────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={!validation.isValid}
            className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-white text-sm font-medium tracking-wide hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all duration-200"
          >
            Confirmar matriz
            <ArrowRight
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200"
              aria-hidden="true"
            />
          </button>
          {matrix.confirmed && (
            <button
              type="button"
              onClick={onVerCadena}
              className="group flex items-center gap-2.5 px-6 py-3.5 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-medium tracking-wide hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200"
            >
              Ver cadena metodológica
              <ArrowRight
                className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200"
                aria-hidden="true"
              />
            </button>
          )}
          <button
            type="button"
            onClick={onVolver}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-white text-sm font-medium text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver a operacionalización
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
