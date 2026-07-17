/**
 * PantallaOperationalizationMatrix — S-018
 *
 * Screen for building the operationalization matrix that bridges the
 * conceptual model and the empirical design.
 *
 * Each row = Variable × Dimension × Indicator × Scale × Source × Notes
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
  RotateCcw, Table2,
} from "lucide-react";

import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type {
  OperationalizationMatrix,
  OperationalizationRow,
  EscalaMedicion,
  OperationalizationValidation,
} from "@/operationalization/types";
import { ESCALAS_LABELS, ESCALAS_LIST } from "@/operationalization/types";
import {
  createEmptyMatrix,
  createRow,
  updateRow,
  updateDimension,
  removeRow,
  reutilizarIndicador,
  reutilizarFuente,
  validateOperationalization,
  confirmMatrix,
} from "@/operationalization/OperationalizationService";

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
  matrix: OperationalizationMatrix | null;
  onUpdateMatrix: (matrix: OperationalizationMatrix) => void;
  onConfirmar: (matrix: OperationalizationMatrix) => void;
  onVolver: () => void;
  onReiniciar: () => void;
}

// ─── Add-row form state ───────────────────────────────────────────────────────

interface AddRowForm {
  variableId: string;
  dimensionNombre: string;
  dimensionDefinicion: string;
  indicatorId: string;
  escala: EscalaMedicion | "";
  sourceId: string;
  observaciones: string;
}

const emptyForm = (): AddRowForm => ({
  variableId: "",
  dimensionNombre: "",
  dimensionDefinicion: "",
  indicatorId: "",
  escala: "",
  sourceId: "",
  observaciones: "",
});

// ─── Component ───────────────────────────────────────────────────────────────

export function PantallaOperationalizationMatrix({
  problema,
  hypothesis,
  conceptualModel,
  matrix: matrixProp,
  onUpdateMatrix,
  onConfirmar,
  onVolver,
  onReiniciar,
}: Props) {
  // ── Matrix state ────────────────────────────────────────────────────────────
  const [matrix, setMatrix] = useState<OperationalizationMatrix>(
    () => matrixProp ?? createEmptyMatrix(hypothesis.id)
  );

  // Sync if parent passes an updated matrix (e.g. after navigate back)
  useEffect(() => {
    if (matrixProp && matrixProp.id !== matrix.id) {
      setMatrix(matrixProp);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrixProp?.id]);

  // ── Add-row form ────────────────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<AddRowForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const firstInputRef = useRef<HTMLSelectElement>(null);

  // ── Expanded rows (for edit) ─────────────────────────────────────────────
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validation: OperationalizationValidation = validateOperationalization(
    matrix,
    conceptualModel
  );

  // ── Focus first input when form opens ───────────────────────────────────────
  useEffect(() => {
    if (showAddForm) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [showAddForm]);

  // ── Sync to parent on every change ──────────────────────────────────────────
  function applyAndSync(updated: OperationalizationMatrix) {
    setMatrix(updated);
    onUpdateMatrix(updated);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function variableName(variableId: string) {
    return (
      conceptualModel.variables.find((v) => v.id === variableId)?.nombre ??
      "Variable eliminada"
    );
  }

  function indicatorName(indicatorId: string | null) {
    if (!indicatorId) return null;
    return (
      conceptualModel.indicators.find((i) => i.id === indicatorId)?.nombre ?? null
    );
  }

  function indicatorUnit(indicatorId: string | null) {
    if (!indicatorId) return "";
    return conceptualModel.indicators.find((i) => i.id === indicatorId)?.unidad ?? "";
  }

  function sourceName(sourceId: string | null) {
    if (!sourceId) return null;
    return (
      conceptualModel.evidenceSources.find((s) => s.id === sourceId)?.nombre ?? null
    );
  }

  // Indicators for a given variableId (for the selector)
  function indicatorsForVariable(variableId: string) {
    return conceptualModel.indicators.filter((i) => i.variableId === variableId);
  }

  // Sources that reference any indicator for a given variableId
  function sourcesForVariable(variableId: string) {
    const indIds = new Set(
      conceptualModel.indicators
        .filter((i) => i.variableId === variableId)
        .map((i) => i.id)
    );
    return conceptualModel.evidenceSources.filter((s) =>
      s.indicadorIds.some((id) => indIds.has(id))
    );
  }

  // ── Add row ──────────────────────────────────────────────────────────────────

  function validateForm(): string[] {
    const errs: string[] = [];
    if (!form.variableId) errs.push("Selecciona una variable conceptual.");
    if (!form.dimensionNombre.trim()) errs.push("Escribe el nombre de la dimensión.");
    if (!form.dimensionDefinicion.trim())
      errs.push("Escribe la definición operacional de la dimensión.");
    return errs;
  }

  function handleAddRow() {
    const errs = validateForm();
    if (errs.length > 0) {
      setFormErrors(errs);
      return;
    }
    setFormErrors([]);
    const updated = createRow(matrix, conceptualModel, {
      variableId: form.variableId,
      dimensionNombre: form.dimensionNombre,
      dimensionDefinicion: form.dimensionDefinicion,
      indicatorId: form.indicatorId || null,
      escala: form.escala || "",
      sourceId: form.sourceId || null,
      observaciones: form.observaciones,
    });
    applyAndSync(updated);
    setForm(emptyForm());
    setShowAddForm(false);
  }

  // ── Remove row ───────────────────────────────────────────────────────────────

  function handleRemoveRow(rowId: string) {
    applyAndSync(removeRow(matrix, rowId));
    if (expandedRowId === rowId) setExpandedRowId(null);
  }

  // ── Inline edit ──────────────────────────────────────────────────────────────

  function handleUpdateDimension(
    rowId: string,
    field: "nombre" | "definicionOperacional",
    value: string
  ) {
    applyAndSync(updateDimension(matrix, rowId, { [field]: value }));
  }

  function handleUpdateRowField(
    rowId: string,
    field: keyof Pick<
      OperationalizationRow,
      "indicatorId" | "escala" | "sourceId" | "observaciones"
    >,
    value: string | null
  ) {
    applyAndSync(
      updateRow(matrix, conceptualModel, rowId, { [field]: value } as never)
    );
  }

  function handleReutilizarIndicador(rowId: string, indicatorId: string) {
    applyAndSync(reutilizarIndicador(matrix, conceptualModel, rowId, indicatorId));
  }

  function handleReutilizarFuente(rowId: string, sourceId: string) {
    applyAndSync(reutilizarFuente(matrix, conceptualModel, rowId, sourceId));
  }

  // ── Confirm ───────────────────────────────────────────────────────────────────

  function handleConfirmar() {
    const confirmed = confirmMatrix(matrix);
    setMatrix(confirmed);
    onConfirmar(confirmed);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full max-w-5xl mx-auto px-4 py-10"
    >
      <div className="space-y-8">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="space-y-2">
          <div className="flex items-center gap-2.5 text-muted-foreground/70 text-xs font-mono uppercase tracking-widest">
            <Table2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Matriz de Operacionalización</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground leading-snug">
            Operacionalización de constructos
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Transforma cada variable del modelo conceptual en dimensiones observables,
            indicadores verificables y fuentes de evidencia. Cada fila representa una
            dimensión de una variable.
          </p>
        </motion.div>

        {/* ── Hypothesis summary ────────────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          className="rounded-xl border border-border bg-white/50 p-5 space-y-1"
        >
          <p className="text-xs font-mono text-muted-foreground/60 uppercase tracking-widest">
            Hipótesis en operacionalización
          </p>
          <p className="text-sm font-medium text-foreground/90 leading-snug">
            {hypothesis.titulo}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {hypothesis.formulacion}
          </p>
        </motion.div>

        {/* ── Validation panel ─────────────────────────────────────────────── */}
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
                      {issue.code === "sin-filas" && "La matriz no tiene filas. Agrega al menos una dimensión."}
                      {issue.code === "variable-sin-dimension" && `Variable sin dimensión: "${issue.nombreVariable}".`}
                      {issue.code === "dimension-sin-definicion" && `Dimensión sin definición operacional: "${issue.dimensionNombre}".`}
                      {issue.code === "indicador-ausente" && `Sin indicador asignado: "${issue.dimensionNombre}".`}
                      {issue.code === "fuente-ausente" && `Sin fuente asignada: "${issue.dimensionNombre}".`}
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
                      {issue.code === "unidad-vacia" && `Sin unidad en indicador — dimensión: "${issue.dimensionNombre}".`}
                      {issue.code === "escala-vacia" && `Sin escala de medición — dimensión: "${issue.dimensionNombre}".`}
                      {issue.code === "observaciones-vacias" && `Sin observaciones — dimensión: "${issue.dimensionNombre}".`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {validation.isValid && (
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Matriz completa — lista para confirmar</span>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Matrix table ─────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground/90">
              Filas de la matriz
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
                Agregar fila
              </button>
            )}
          </div>

          {/* Empty state */}
          {matrix.rows.length === 0 && !showAddForm && (
            <div className="rounded-xl border border-dashed border-border bg-white/30 py-12 flex flex-col items-center gap-3 text-muted-foreground/60">
              <Table2 className="w-8 h-8 opacity-40" aria-hidden="true" />
              <p className="text-sm">La matriz está vacía. Agrega la primera dimensión.</p>
            </div>
          )}

          {/* Rows */}
          {matrix.rows.length > 0 && (
            <div className="space-y-2">
              {/* Table header */}
              <div
                className="hidden md:grid grid-cols-[2fr_2fr_2fr_1.5fr_1fr_2fr] gap-2 px-4 py-2 rounded-lg bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide"
                aria-hidden="true"
              >
                <span>Variable / Dimensión</span>
                <span>Definición operacional</span>
                <span>Indicador</span>
                <span>Escala</span>
                <span>Unidad</span>
                <span>Fuente</span>
              </div>

              {matrix.rows.map((row) => (
                <MatrixRow
                  key={row.id}
                  row={row}
                  variableName={variableName(row.variableId)}
                  indicatorName={indicatorName(row.indicatorId)}
                  indicatorUnit={indicatorUnit(row.indicatorId)}
                  sourceName={sourceName(row.sourceId)}
                  isExpanded={expandedRowId === row.id}
                  onToggleExpand={() =>
                    setExpandedRowId(expandedRowId === row.id ? null : row.id)
                  }
                  onRemove={() => handleRemoveRow(row.id)}
                  onUpdateDimension={(field, value) =>
                    handleUpdateDimension(row.id, field, value)
                  }
                  onUpdateField={(field, value) =>
                    handleUpdateRowField(row.id, field, value)
                  }
                  indicatorsForVariable={indicatorsForVariable(row.variableId)}
                  sourcesForVariable={sourcesForVariable(row.variableId)}
                  onReutilizarIndicador={(indId) =>
                    handleReutilizarIndicador(row.id, indId)
                  }
                  onReutilizarFuente={(srcId) =>
                    handleReutilizarFuente(row.id, srcId)
                  }
                />
              ))}
            </div>
          )}

          {/* Add-row form */}
          {showAddForm && (
            <div
              role="region"
              aria-label="Agregar fila a la matriz"
              className="rounded-xl border border-primary/20 bg-white/60 p-5 space-y-4"
            >
              <h3 className="text-sm font-semibold text-foreground/90">
                Nueva fila
              </h3>

              {/* Variable selector */}
              <div className="space-y-1">
                <label
                  htmlFor="form-variable"
                  className="text-xs font-medium text-foreground/70"
                >
                  Variable conceptual <span className="text-red-500">*</span>
                </label>
                <select
                  id="form-variable"
                  ref={firstInputRef}
                  value={form.variableId}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      variableId: e.target.value,
                      indicatorId: "",
                      sourceId: "",
                    }));
                  }}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <option value="">— Selecciona una variable —</option>
                  {conceptualModel.variables.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dimension nombre */}
              <div className="space-y-1">
                <label
                  htmlFor="form-dim-nombre"
                  className="text-xs font-medium text-foreground/70"
                >
                  Nombre de la dimensión <span className="text-red-500">*</span>
                </label>
                <input
                  id="form-dim-nombre"
                  type="text"
                  value={form.dimensionNombre}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dimensionNombre: e.target.value }))
                  }
                  placeholder="p. ej. Infraestructura"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>

              {/* Dimension definición operacional */}
              <div className="space-y-1">
                <label
                  htmlFor="form-dim-def"
                  className="text-xs font-medium text-foreground/70"
                >
                  Definición operacional <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-muted-foreground/70">
                  ¿Cómo sabré que esta dimensión está presente?
                </p>
                <textarea
                  id="form-dim-def"
                  value={form.dimensionDefinicion}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dimensionDefinicion: e.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Existencia de aulas equipadas y personal certificado en el establecimiento."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y"
                />
              </div>

              {/* Indicator selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label
                    htmlFor="form-indicator"
                    className="text-xs font-medium text-foreground/70"
                  >
                    Indicador (reutilizar del modelo)
                  </label>
                  <select
                    id="form-indicator"
                    value={form.indicatorId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, indicatorId: e.target.value }))
                    }
                    disabled={!form.variableId}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <option value="">— Ninguno por ahora —</option>
                    {form.variableId &&
                      indicatorsForVariable(form.variableId).map((ind) => (
                        <option key={ind.id} value={ind.id}>
                          {ind.nombre}
                          {ind.unidad ? ` (${ind.unidad})` : ""}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Source selector */}
                <div className="space-y-1">
                  <label
                    htmlFor="form-source"
                    className="text-xs font-medium text-foreground/70"
                  >
                    Fuente (reutilizar del modelo)
                  </label>
                  <select
                    id="form-source"
                    value={form.sourceId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sourceId: e.target.value }))
                    }
                    disabled={!form.variableId}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <option value="">— Ninguna por ahora —</option>
                    {form.variableId &&
                      sourcesForVariable(form.variableId).map((src) => (
                        <option key={src.id} value={src.id}>
                          {src.nombre}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Scale selector */}
              <div className="space-y-1">
                <label
                  htmlFor="form-escala"
                  className="text-xs font-medium text-foreground/70"
                >
                  Escala de medición
                </label>
                <select
                  id="form-escala"
                  value={form.escala}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      escala: e.target.value as EscalaMedicion | "",
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <option value="">— Sin escala —</option>
                  {ESCALAS_LIST.map((e) => (
                    <option key={e} value={e}>
                      {ESCALAS_LABELS[e]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Observations */}
              <div className="space-y-1">
                <label
                  htmlFor="form-observaciones"
                  className="text-xs font-medium text-foreground/70"
                >
                  Observaciones metodológicas
                </label>
                <textarea
                  id="form-observaciones"
                  value={form.observaciones}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, observaciones: e.target.value }))
                  }
                  rows={2}
                  placeholder="Caveats, limitaciones de cobertura, notas de periodicidad..."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y"
                />
              </div>

              {/* Form errors */}
              {formErrors.length > 0 && (
                <ul
                  role="alert"
                  aria-live="assertive"
                  className="space-y-0.5 text-xs text-red-600 pl-4 list-disc"
                >
                  {formErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}

              {/* Form actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-5 py-2.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
                >
                  Agregar fila
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setForm(emptyForm());
                    setFormErrors([]);
                  }}
                  className="px-5 py-2.5 rounded-lg border border-border text-xs font-medium text-foreground/70 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Navigation ───────────────────────────────────────────────────── */}
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
          <button
            type="button"
            onClick={onVolver}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-white text-sm font-medium text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver al modelo
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

        {/* ── Traceability summary ──────────────────────────────────────────── */}
        {matrix.rows.length > 0 && (
          <motion.div
            variants={fadeUp}
            className="rounded-xl border border-border/60 bg-white/30 p-5 space-y-3"
          >
            <p className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest">
              Cadena de trazabilidad
            </p>
            <div className="text-xs text-muted-foreground space-y-1.5">
              <p>
                <span className="font-medium text-foreground/70">Problema:</span>{" "}
                {problema}
              </p>
              <p>
                <span className="font-medium text-foreground/70">Hipótesis:</span>{" "}
                {hypothesis.titulo}
              </p>
              <div>
                <p className="font-medium text-foreground/70 mb-1">
                  Matriz ({matrix.rows.length} fila{matrix.rows.length > 1 ? "s" : ""}):
                </p>
                <ul className="pl-4 space-y-0.5 list-disc">
                  {matrix.rows.map((row) => (
                    <li key={row.id}>
                      <span className="font-medium">{variableName(row.variableId)}</span>
                      {" → "}
                      {row.dimension.nombre}
                      {row.indicatorId && (
                        <>
                          {" → "}
                          {indicatorName(row.indicatorId)}
                          {indicatorUnit(row.indicatorId) &&
                            ` (${indicatorUnit(row.indicatorId)})`}
                        </>
                      )}
                      {row.escala && ` [${ESCALAS_LABELS[row.escala as EscalaMedicion]}]`}
                      {row.sourceId && (
                        <>
                          {" — "}
                          {sourceName(row.sourceId)}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── MatrixRow sub-component ─────────────────────────────────────────────────

interface MatrixRowProps {
  row: OperationalizationRow;
  variableName: string;
  indicatorName: string | null;
  indicatorUnit: string;
  sourceName: string | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onUpdateDimension: (
    field: "nombre" | "definicionOperacional",
    value: string
  ) => void;
  onUpdateField: (
    field: keyof Pick<
      OperationalizationRow,
      "indicatorId" | "escala" | "sourceId" | "observaciones"
    >,
    value: string | null
  ) => void;
  indicatorsForVariable: { id: string; nombre: string; unidad: string }[];
  sourcesForVariable: { id: string; nombre: string }[];
  onReutilizarIndicador: (indicatorId: string) => void;
  onReutilizarFuente: (sourceId: string) => void;
}

function MatrixRow({
  row,
  variableName,
  indicatorName,
  indicatorUnit,
  sourceName,
  isExpanded,
  onToggleExpand,
  onRemove,
  onUpdateDimension,
  onUpdateField,
  indicatorsForVariable,
  sourcesForVariable,
  onReutilizarIndicador,
  onReutilizarFuente,
}: MatrixRowProps) {
  return (
    <div className="rounded-xl border border-border bg-white/60 overflow-hidden">
      {/* Collapsed row */}
      <div className="grid grid-cols-[1fr_auto] gap-2 px-4 py-3 items-start">
        <div
          className="grid grid-cols-1 md:grid-cols-[2fr_2fr_2fr_1.5fr_1fr_2fr] gap-x-3 gap-y-1 text-sm cursor-pointer"
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label={`Fila: ${variableName} — ${row.dimension.nombre}. ${isExpanded ? "Colapsar" : "Expandir"} para editar.`}
          onClick={onToggleExpand}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleExpand();
            }
          }}
        >
          {/* Variable / Dimension */}
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground/60 md:hidden">
              Variable / Dimensión
            </p>
            <p className="font-medium text-foreground/90 text-xs leading-tight">
              {variableName}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              {row.dimension.nombre || (
                <span className="italic opacity-50">Sin nombre</span>
              )}
            </p>
          </div>

          {/* Definición operacional */}
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground/60 md:hidden">
              Definición operacional
            </p>
            <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
              {row.dimension.definicionOperacional || (
                <span className="italic text-red-400">Sin definición</span>
              )}
            </p>
          </div>

          {/* Indicator */}
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground/60 md:hidden">
              Indicador
            </p>
            <p className="text-xs leading-tight">
              {indicatorName ?? (
                <span className="italic text-red-400">Sin indicador</span>
              )}
            </p>
          </div>

          {/* Scale */}
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground/60 md:hidden">
              Escala
            </p>
            <p className="text-xs leading-tight">
              {row.escala ? (
                ESCALAS_LABELS[row.escala as EscalaMedicion]
              ) : (
                <span className="italic text-amber-500">Sin escala</span>
              )}
            </p>
          </div>

          {/* Unit */}
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground/60 md:hidden">
              Unidad
            </p>
            <p className="text-xs leading-tight text-muted-foreground">
              {indicatorUnit || "—"}
            </p>
          </div>

          {/* Source */}
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground/60 md:hidden">
              Fuente
            </p>
            <p className="text-xs leading-tight">
              {sourceName ?? (
                <span className="italic text-red-400">Sin fuente</span>
              )}
            </p>
          </div>
        </div>

        {/* Row actions */}
        <div className="flex items-center gap-1 pt-0.5 shrink-0">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={isExpanded ? "Colapsar fila" : "Expandir fila para editar"}
            className="p-1.5 rounded-md text-muted-foreground/50 hover:text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Eliminar fila ${row.dimension.nombre}`}
            className="p-1.5 rounded-md text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded edit panel */}
      {isExpanded && (
        <div className="border-t border-border/60 px-4 py-4 space-y-4 bg-white/40">
          {/* Dimension nombre */}
          <div className="space-y-1">
            <label
              htmlFor={`dim-nombre-${row.id}`}
              className="text-xs font-medium text-foreground/70"
            >
              Nombre de la dimensión
            </label>
            <input
              id={`dim-nombre-${row.id}`}
              type="text"
              defaultValue={row.dimension.nombre}
              onBlur={(e) => onUpdateDimension("nombre", e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>

          {/* Dimension definición */}
          <div className="space-y-1">
            <label
              htmlFor={`dim-def-${row.id}`}
              className="text-xs font-medium text-foreground/70"
            >
              Definición operacional
            </label>
            <p className="text-xs text-muted-foreground/60">
              ¿Cómo sabré que esta dimensión está presente?
            </p>
            <textarea
              id={`dim-def-${row.id}`}
              defaultValue={row.dimension.definicionOperacional}
              onBlur={(e) =>
                onUpdateDimension("definicionOperacional", e.target.value)
              }
              rows={2}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Indicator */}
            <div className="space-y-1">
              <label
                htmlFor={`ind-${row.id}`}
                className="text-xs font-medium text-foreground/70"
              >
                Indicador
              </label>
              <select
                id={`ind-${row.id}`}
                value={row.indicatorId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    onReutilizarIndicador(val);
                  } else {
                    onUpdateField("indicatorId", null);
                  }
                }}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <option value="">— Sin indicador —</option>
                {indicatorsForVariable.map((ind) => (
                  <option key={ind.id} value={ind.id}>
                    {ind.nombre}
                    {ind.unidad ? ` (${ind.unidad})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Source */}
            <div className="space-y-1">
              <label
                htmlFor={`src-${row.id}`}
                className="text-xs font-medium text-foreground/70"
              >
                Fuente
              </label>
              <select
                id={`src-${row.id}`}
                value={row.sourceId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    onReutilizarFuente(val);
                  } else {
                    onUpdateField("sourceId", null);
                  }
                }}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <option value="">— Sin fuente —</option>
                {sourcesForVariable.map((src) => (
                  <option key={src.id} value={src.id}>
                    {src.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scale */}
          <div className="space-y-1">
            <label
              htmlFor={`escala-${row.id}`}
              className="text-xs font-medium text-foreground/70"
            >
              Escala de medición
            </label>
            <select
              id={`escala-${row.id}`}
              value={row.escala}
              onChange={(e) =>
                onUpdateField(
                  "escala",
                  e.target.value as EscalaMedicion | ""
                )
              }
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value="">— Sin escala —</option>
              {ESCALAS_LIST.map((e) => (
                <option key={e} value={e}>
                  {ESCALAS_LABELS[e]}
                </option>
              ))}
            </select>
          </div>

          {/* Observations */}
          <div className="space-y-1">
            <label
              htmlFor={`obs-${row.id}`}
              className="text-xs font-medium text-foreground/70"
            >
              Observaciones metodológicas
            </label>
            <textarea
              id={`obs-${row.id}`}
              defaultValue={row.observaciones}
              onBlur={(e) => onUpdateField("observaciones", e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y"
            />
          </div>
        </div>
      )}
    </div>
  );
}
