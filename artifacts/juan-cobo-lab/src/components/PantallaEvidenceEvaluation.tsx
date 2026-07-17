/**
 * S-022 — PantallaEvidenceEvaluation
 *
 * Pantalla de registro y evaluación de evidencia observada.
 *
 * Para cada criterio de contrastación:
 *   - Muestra información del criterio (indicador, fuente esperada,
 *     evidenciaEsperada, evidenciaContraria, criterioInterpretacion)
 *   - Lista evidencias observadas con acciones: editar, eliminar, evaluar
 *   - Formulario inline de evidencia (agregar / editar)
 *   - Panel de evaluación (dirección, confianza, justificación, limitaciones, etc.)
 *
 * HELIOS no asigna automáticamente dirección ni confianza (ADR-0011).
 */

import { useState, useCallback, useEffect } from "react";
import {
  ChevronDown, ChevronRight, Plus, Pencil, Trash2, ArrowLeft,
  ArrowRight, RotateCcw, CheckCircle2, AlertCircle, AlertTriangle,
  ClipboardList, Eye, EyeOff, Info,
} from "lucide-react";
import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type { ContrastationMatrix, ContrastationRow } from "@/contrastation/types";
import type {
  EvidenceEvaluationMatrix,
  ObservedEvidence,
  EvidenceDirection,
  EvidenceConfidenceLevel,
} from "@/evidence-evaluation/types";
import {
  EVIDENCE_DIRECTION_LABELS,
  EVIDENCE_CONFIDENCE_LABELS,
  EVIDENCE_DIRECTION_COLOR,
} from "@/evidence-evaluation/types";
import {
  createEvidenceEvaluationMatrix,
  createObservedEvidence,
  updateObservedEvidence,
  removeObservedEvidence,
  reorderObservedEvidence,
  createEvidenceAssessment,
  updateEvidenceAssessment,
  findEvidenceByContrastationRow,
  findAssessmentByEvidence,
  validateEvidenceEvaluation,
  confirmEvidenceEvaluationMatrix,
  summarizeEvidenceEvaluation,
} from "@/evidence-evaluation/EvidenceEvaluationService";

// ─── Tipos de datos de formularios ───────────────────────────────────────────

interface EvidenceFormData {
  title: string;
  description: string;
  observedValue: string;
  observedUnit: string;
  observationDate: string;
  periodStart: string;
  periodEnd: string;
  location: string;
  population: string;
  sourceReference: string;
  sourcePage: string;
  sourceSection: string;
  notes: string;
}

function blankEvidenceForm(): EvidenceFormData {
  return {
    title: "", description: "", observedValue: "", observedUnit: "",
    observationDate: "", periodStart: "", periodEnd: "", location: "",
    population: "", sourceReference: "", sourcePage: "", sourceSection: "",
    notes: "",
  };
}

interface AssessmentFormData {
  direction: EvidenceDirection | "";
  confidence: EvidenceConfidenceLevel | "";
  justification: string;
  limitations: string;
  alternativeInterpretations: string;
  additionalEvidenceNeeded: string;
  reviewed: boolean;
}

function blankAssessmentForm(): AssessmentFormData {
  return {
    direction: "", confidence: "", justification: "", limitations: "",
    alternativeInterpretations: "", additionalEvidenceNeeded: "", reviewed: false,
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  hypothesis: PolicyHypothesis;
  conceptualModel: ConceptualModel;
  contrastationMatrix: ContrastationMatrix;
  evidenceMatrix: EvidenceEvaluationMatrix | null;
  onUpdateMatrix: (matrix: EvidenceEvaluationMatrix) => void;
  onConfirmar: (matrix: EvidenceEvaluationMatrix) => void;
  onIrAConclusion: () => void;
  onVolver: () => void;
  onReiniciar: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveIndicatorName(model: ConceptualModel, id: string | null): string {
  if (!id) return "(sin indicador)";
  const ind = model.indicators.find((i) => i.id === id);
  return ind?.nombre ?? id;
}

function resolveSourceName(model: ConceptualModel, id: string | null): string {
  if (!id) return "(sin fuente)";
  const src = model.evidenceSources.find((s) => s.id === id);
  return src?.nombre ?? id;
}

// ─── Subcomponent: EvidenceCard ───────────────────────────────────────────────

function EvidenceCard({
  ev,
  assessment,
  onEdit,
  onDelete,
  onEvaluate,
}: {
  ev: ObservedEvidence;
  assessment: ReturnType<typeof findAssessmentByEvidence>;
  onEdit: () => void;
  onDelete: () => void;
  onEvaluate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
          aria-label={expanded ? "Colapsar detalle" : "Expandir detalle"}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
          {!expanded && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {ev.description}
            </p>
          )}
          {assessment && (
            <span
              className={`mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${EVIDENCE_DIRECTION_COLOR[assessment.direction]}`}
            >
              {EVIDENCE_DIRECTION_LABELS[assessment.direction]}
              {" · "}
              {EVIDENCE_CONFIDENCE_LABELS[assessment.confidence]}
            </span>
          )}
          {!assessment && (
            <span className="mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 font-medium">
              Sin evaluación
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEvaluate}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary/5 text-primary hover:bg-primary/10 transition-colors font-medium"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            {assessment ? "Editar evaluación" : "Evaluar"}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Editar evidencia"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
            aria-label="Eliminar evidencia"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-2 text-xs text-muted-foreground">
          <p><span className="font-medium text-foreground">Descripción:</span> {ev.description}</p>
          {ev.observedValue && (
            <p>
              <span className="font-medium text-foreground">Valor observado:</span>{" "}
              {ev.observedValue} {ev.observedUnit}
            </p>
          )}
          {(ev.observationDate || ev.periodStart) && (
            <p>
              <span className="font-medium text-foreground">Período:</span>{" "}
              {ev.observationDate ?? `${ev.periodStart ?? ""} — ${ev.periodEnd ?? ""}`}
            </p>
          )}
          {ev.location && (
            <p><span className="font-medium text-foreground">Lugar:</span> {ev.location}</p>
          )}
          {ev.population && (
            <p><span className="font-medium text-foreground">Población:</span> {ev.population}</p>
          )}
          {ev.sourceReference && (
            <p>
              <span className="font-medium text-foreground">Referencia:</span>{" "}
              {ev.sourceReference}
              {ev.sourcePage ? `, p. ${ev.sourcePage}` : ""}
              {ev.sourceSection ? ` [${ev.sourceSection}]` : ""}
            </p>
          )}
          {ev.notes && (
            <p><span className="font-medium text-foreground">Notas:</span> {ev.notes}</p>
          )}
          {assessment && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="font-medium text-foreground mb-1">Evaluación:</p>
              <p>{assessment.justification}</p>
              {assessment.limitations && (
                <p className="mt-1"><span className="font-medium">Limitaciones:</span> {assessment.limitations}</p>
              )}
              {assessment.alternativeInterpretations && (
                <p className="mt-1"><span className="font-medium">Alternativas:</span> {assessment.alternativeInterpretations}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Subcomponent: EvidenceForm ───────────────────────────────────────────────

function EvidenceForm({
  row,
  initialData,
  onSave,
  onCancel,
}: {
  row: ContrastationRow;
  initialData: EvidenceFormData;
  onSave: (data: EvidenceFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EvidenceFormData>(initialData);
  const [showOptional, setShowOptional] = useState(false);

  function field(key: keyof EvidenceFormData) {
    return {
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  const canSave = form.title.trim().length > 0 && form.description.trim().length > 0;

  return (
    <div className="border border-primary/20 rounded-xl bg-primary/5 p-4 space-y-3">
      <p className="text-xs font-semibold text-primary uppercase tracking-wide">
        Evidencia observada
      </p>

      {/* Required */}
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            {...field("title")}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            placeholder="Ej. Encuesta ECV 2024 — reducción de acceso a agua"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Descripción del hallazgo <span className="text-red-500">*</span>
          </label>
          <textarea
            {...field("description")}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
            rows={3}
            placeholder="Qué se encontró al consultar la fuente..."
          />
        </div>
      </div>

      {/* Valor observado */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Valor observado</label>
          <input
            {...field("observedValue")}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            placeholder="Ej. 38.5 o 'Aumento significativo'"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Unidad</label>
          <input
            {...field("observedUnit")}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            placeholder="Ej. % hogares"
          />
        </div>
      </div>

      {/* Referencia */}
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Referencia bibliográfica</label>
        <input
          {...field("sourceReference")}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          placeholder="Ej. DANE (2024). Encuesta de Calidad de Vida. Bogotá."
        />
      </div>

      {/* Campos opcionales */}
      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        {showOptional ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        {showOptional ? "Ocultar campos opcionales" : "Mostrar campos opcionales"}
      </button>

      {showOptional && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Página(s)</label>
              <input {...field("sourcePage")} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" placeholder="Ej. 47-49" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Sección</label>
              <input {...field("sourceSection")} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" placeholder="Ej. Cap. 3" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Fecha observación</label>
              <input type="date" {...field("observationDate")} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Período inicio</label>
              <input type="date" {...field("periodStart")} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Período fin</label>
              <input type="date" {...field("periodEnd")} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Ubicación geográfica</label>
              <input {...field("location")} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" placeholder="Ej. Municipios rurales" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Población</label>
              <input {...field("population")} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" placeholder="Ej. Hogares con NBI" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Notas adicionales</label>
            <textarea {...field("notes")} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none" rows={2} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave(form)}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          Guardar evidencia
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Subcomponent: AssessmentForm ─────────────────────────────────────────────

function AssessmentForm({
  evidence,
  row,
  initialData,
  onSave,
  onCancel,
}: {
  evidence: ObservedEvidence;
  row: ContrastationRow;
  initialData: AssessmentFormData;
  onSave: (data: AssessmentFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AssessmentFormData>(initialData);

  const directions: EvidenceDirection[] = ["supports", "weakens", "mixed", "inconclusive", "not-applicable"];
  const confidences: EvidenceConfidenceLevel[] = ["low", "medium", "high"];

  const canSave = form.direction !== "" && form.confidence !== "" && form.justification.trim().length > 0;

  return (
    <div className="border border-emerald-200 rounded-xl bg-emerald-50/30 p-4 space-y-4">
      <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
        Evaluación metodológica
      </p>

      {/* Contexto del criterio (read-only) */}
      <div className="rounded-lg bg-white border border-border p-3 space-y-1.5 text-xs">
        <p className="font-semibold text-foreground">Contexto del criterio:</p>
        <p><span className="font-medium text-muted-foreground">Evidencia esperada:</span> {(row as any).evidenciaEsperada}</p>
        <p><span className="font-medium text-muted-foreground">Evidencia contraria:</span> {(row as any).evidenciaContraria}</p>
        {(row as any).criterioInterpretacion && (
          <p><span className="font-medium text-muted-foreground">Criterio:</span> {(row as any).criterioInterpretacion}</p>
        )}
      </div>

      {/* Dirección */}
      <div>
        <label className="block text-xs font-medium text-foreground mb-2">
          Dirección <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {directions.map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => setForm((f) => ({ ...f, direction: dir }))}
              className={`px-3 py-2 text-xs rounded-lg border font-medium transition-all text-left ${
                form.direction === dir
                  ? EVIDENCE_DIRECTION_COLOR[dir] + " ring-2 ring-offset-1 ring-current"
                  : "border-border bg-white text-muted-foreground hover:border-primary/40"
              }`}
            >
              {EVIDENCE_DIRECTION_LABELS[dir]}
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex items-start gap-1 text-xs text-amber-600">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>"Apoya" no significa prueba definitiva. "Debilita" no significa refutación.</span>
        </div>
      </div>

      {/* Confianza */}
      <div>
        <label className="block text-xs font-medium text-foreground mb-2">
          Nivel de confianza <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          {confidences.map((conf) => (
            <button
              key={conf}
              type="button"
              onClick={() => setForm((f) => ({ ...f, confidence: conf }))}
              className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-all ${
                form.confidence === conf
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-white text-muted-foreground hover:border-primary/40"
              }`}
            >
              {EVIDENCE_CONFIDENCE_LABELS[conf]}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-amber-600">Confianza ≠ probabilidad estadística.</p>
      </div>

      {/* Justificación */}
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">
          Justificación <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.justification}
          onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
          rows={3}
          placeholder="Por qué la evidencia apunta en esta dirección..."
        />
      </div>

      {/* Limitaciones */}
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">
          Limitaciones metodológicas
        </label>
        <textarea
          value={form.limitations}
          onChange={(e) => setForm((f) => ({ ...f, limitations: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
          rows={2}
          placeholder="Sesgos, restricciones de la fuente, representatividad..."
        />
      </div>

      {/* Interpretaciones alternativas */}
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">
          Interpretaciones alternativas
        </label>
        <textarea
          value={form.alternativeInterpretations}
          onChange={(e) => setForm((f) => ({ ...f, alternativeInterpretations: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
          rows={2}
          placeholder="Otras lecturas posibles de la evidencia..."
        />
      </div>

      {/* Evidencia adicional */}
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">
          Evidencia adicional necesaria
        </label>
        <textarea
          value={form.additionalEvidenceNeeded}
          onChange={(e) => setForm((f) => ({ ...f, additionalEvidenceNeeded: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
          rows={2}
          placeholder="Qué información faltaría para mayor certeza..."
        />
      </div>

      {/* Revisada */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.reviewed}
          onChange={(e) => setForm((f) => ({ ...f, reviewed: e.target.checked }))}
          className="w-4 h-4 rounded border-border"
        />
        <span className="text-xs text-foreground">He revisado esta evaluación</span>
      </label>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave(form)}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          Guardar evaluación
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PantallaEvidenceEvaluation({
  hypothesis,
  conceptualModel,
  contrastationMatrix,
  evidenceMatrix: initialEvidenceMatrix,
  onUpdateMatrix,
  onConfirmar,
  onIrAConclusion,
  onVolver,
  onReiniciar,
}: Props) {
  // Initialize or reuse the matrix
  const [matrix, setMatrix] = useState<EvidenceEvaluationMatrix>(() => {
    if (initialEvidenceMatrix) return initialEvidenceMatrix;
    return createEvidenceEvaluationMatrix(hypothesis.id, contrastationMatrix.id);
  });

  // Sync if prop changes externally
  useEffect(() => {
    if (initialEvidenceMatrix && initialEvidenceMatrix.id !== matrix.id) {
      setMatrix(initialEvidenceMatrix);
    }
  }, [initialEvidenceMatrix?.id]);

  // Active form state
  type ActiveForm =
    | { type: "evidence-add"; ctRowId: string }
    | { type: "evidence-edit"; ctRowId: string; evidenceId: string }
    | { type: "assessment"; ctRowId: string; evidenceId: string }
    | null;
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);

  const updateAndNotify = useCallback(
    (updated: EvidenceEvaluationMatrix) => {
      setMatrix(updated);
      onUpdateMatrix(updated);
    },
    [onUpdateMatrix]
  );

  // ── Evidence actions ──────────────────────────────────────────────────────

  const handleAddEvidence = useCallback(
    (ctRowId: string, data: EvidenceFormData) => {
      const updated = createObservedEvidence(matrix, {
        contrastationRowId: ctRowId,
        indicatorId: contrastationMatrix.rows.find((r) => r.id === ctRowId)?.indicadorId ?? "",
        sourceId: contrastationMatrix.rows.find((r) => r.id === ctRowId)?.fuenteId ?? "",
        title: data.title,
        description: data.description,
        observedValue: data.observedValue || undefined,
        observedUnit: data.observedUnit || undefined,
        observationDate: data.observationDate || undefined,
        periodStart: data.periodStart || undefined,
        periodEnd: data.periodEnd || undefined,
        location: data.location || undefined,
        population: data.population || undefined,
        sourceReference: data.sourceReference || undefined,
        sourcePage: data.sourcePage || undefined,
        sourceSection: data.sourceSection || undefined,
        notes: data.notes || undefined,
      });
      updateAndNotify(updated);
      setActiveForm(null);
    },
    [matrix, contrastationMatrix, updateAndNotify]
  );

  const handleEditEvidence = useCallback(
    (evidenceId: string, data: EvidenceFormData) => {
      const updated = updateObservedEvidence(matrix, evidenceId, {
        title: data.title,
        description: data.description,
        observedValue: data.observedValue || undefined,
        observedUnit: data.observedUnit || undefined,
        observationDate: data.observationDate || undefined,
        periodStart: data.periodStart || undefined,
        periodEnd: data.periodEnd || undefined,
        location: data.location || undefined,
        population: data.population || undefined,
        sourceReference: data.sourceReference || undefined,
        sourcePage: data.sourcePage || undefined,
        sourceSection: data.sourceSection || undefined,
        notes: data.notes || undefined,
      });
      updateAndNotify(updated);
      setActiveForm(null);
    },
    [matrix, updateAndNotify]
  );

  const handleDeleteEvidence = useCallback(
    (evidenceId: string) => {
      const updated = removeObservedEvidence(matrix, evidenceId);
      updateAndNotify(updated);
      if (
        activeForm &&
        (activeForm.type === "evidence-edit" || activeForm.type === "assessment") &&
        activeForm.evidenceId === evidenceId
      ) {
        setActiveForm(null);
      }
    },
    [matrix, activeForm, updateAndNotify]
  );

  // ── Assessment actions ────────────────────────────────────────────────────

  const handleSaveAssessment = useCallback(
    (evidenceId: string, ctRowId: string, data: AssessmentFormData) => {
      if (!data.direction || !data.confidence) return;
      const existing = findAssessmentByEvidence(matrix, evidenceId);
      let updated: EvidenceEvaluationMatrix;
      if (existing) {
        updated = updateEvidenceAssessment(matrix, existing.id, {
          direction: data.direction as EvidenceDirection,
          confidence: data.confidence as EvidenceConfidenceLevel,
          justification: data.justification,
          limitations: data.limitations,
          alternativeInterpretations: data.alternativeInterpretations || undefined,
          additionalEvidenceNeeded: data.additionalEvidenceNeeded || undefined,
          reviewed: data.reviewed,
          status: "evaluated",
        });
      } else {
        updated = createEvidenceAssessment(matrix, {
          observedEvidenceId: evidenceId,
          contrastationRowId: ctRowId,
          hypothesisId: hypothesis.id,
          status: "evaluated",
          direction: data.direction as EvidenceDirection,
          confidence: data.confidence as EvidenceConfidenceLevel,
          justification: data.justification,
          limitations: data.limitations,
          alternativeInterpretations: data.alternativeInterpretations || undefined,
          additionalEvidenceNeeded: data.additionalEvidenceNeeded || undefined,
          reviewed: data.reviewed,
        });
      }
      updateAndNotify(updated);
      setActiveForm(null);
    },
    [matrix, hypothesis.id, updateAndNotify]
  );

  // ── Confirmation ──────────────────────────────────────────────────────────

  const validation = validateEvidenceEvaluation(matrix, contrastationMatrix);
  const summary = summarizeEvidenceEvaluation(matrix, contrastationMatrix);

  const handleConfirmar = useCallback(() => {
    if (!validation.canConfirm) return;
    const confirmed = confirmEvidenceEvaluationMatrix(matrix);
    updateAndNotify(confirmed);
    onConfirmar(confirmed);
  }, [matrix, validation, updateAndNotify, onConfirmar]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const isConfirmed = matrix.status === "confirmed";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs font-medium text-primary/70 uppercase tracking-widest mb-1">
            Registro de evidencia
          </p>
          <h1 className="text-2xl font-bold text-foreground">
            Evaluación de Evidencia
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hipótesis: <span className="font-medium text-foreground">{hypothesis.titulo}</span>
          </p>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Criterios", value: `${summary.criteriaWithEvidence}/${summary.totalCriteria}`, note: "cubiertos" },
            { label: "Evidencias", value: summary.totalObservedEvidence, note: "registradas" },
            { label: "Evaluadas", value: `${summary.assessedEvidence}/${summary.totalObservedEvidence}`, note: "con evaluación" },
            { label: "Estado", value: isConfirmed ? "Confirmada" : "Borrador", note: matrix.status },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border bg-white p-3 text-center"
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold text-foreground">{String(item.value)}</p>
              <p className="text-xs text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </div>

        {/* Validation panel */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="space-y-2" aria-live="polite">
            {validation.errors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Errores que deben resolverse
                </p>
                <ul className="space-y-1">
                  {validation.errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-700">• {e}</li>
                  ))}
                </ul>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Advertencias
                </p>
                <ul className="space-y-1">
                  {validation.warnings.slice(0, 5).map((w, i) => (
                    <li key={i} className="text-xs text-amber-700">• {w}</li>
                  ))}
                  {validation.warnings.length > 5 && (
                    <li className="text-xs text-amber-600 font-medium">
                      … y {validation.warnings.length - 5} advertencia(s) más
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Confirmed badge */}
        {isConfirmed && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <p className="text-sm text-emerald-700 font-medium">
              Matriz de evidencia confirmada — puede proceder a la conclusión.
            </p>
          </div>
        )}

        {/* Criteria rows */}
        <div className="space-y-6">
          {contrastationMatrix.rows.map((row, idx) => {
            const rowEvidence = findEvidenceByContrastationRow(matrix, row.id);
            const indicatorName = resolveIndicatorName(conceptualModel, row.indicadorId);
            const sourceName = resolveSourceName(conceptualModel, row.fuenteId);

            const isAddingEvidence =
              activeForm?.type === "evidence-add" && activeForm.ctRowId === row.id;

            return (
              <div
                key={row.id}
                className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden"
              >
                {/* Criterion header */}
                <div className="bg-muted/30 border-b border-border px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Criterio {idx + 1}
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                          (row as any).prioridad === "alta"
                            ? "bg-red-100 text-red-700"
                            : (row as any).prioridad === "media"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          Prioridad {(row as any).prioridad ?? "—"}
                        </span>
                      </p>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <p><span className="font-medium text-foreground">Indicador:</span> {indicatorName}</p>
                        <p><span className="font-medium text-foreground">Fuente:</span> {sourceName}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
                      rowEvidence.length > 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {rowEvidence.length === 0 ? "Sin evidencia" : `${rowEvidence.length} evidencia${rowEvidence.length !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                  {/* Expected / contrary evidence */}
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <p className="font-medium text-emerald-800 mb-0.5">Evidencia esperada</p>
                      <p className="text-emerald-700">{(row as any).evidenciaEsperada}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                      <p className="font-medium text-red-800 mb-0.5">Evidencia contraria</p>
                      <p className="text-red-700">{(row as any).evidenciaContraria}</p>
                    </div>
                  </div>
                </div>

                {/* Evidence list */}
                <div className="p-4 space-y-3">
                  {rowEvidence.length === 0 && !isAddingEvidence && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No hay evidencias registradas para este criterio.
                    </p>
                  )}

                  {rowEvidence.map((ev) => {
                    const assessment = findAssessmentByEvidence(matrix, ev.id);
                    const isEditingThis =
                      activeForm?.type === "evidence-edit" && activeForm.evidenceId === ev.id;
                    const isAssessingThis =
                      activeForm?.type === "assessment" && activeForm.evidenceId === ev.id;

                    if (isEditingThis) {
                      return (
                        <EvidenceForm
                          key={ev.id}
                          row={row}
                          initialData={{
                            title: ev.title,
                            description: ev.description,
                            observedValue: ev.observedValue ?? "",
                            observedUnit: ev.observedUnit ?? "",
                            observationDate: ev.observationDate ?? "",
                            periodStart: ev.periodStart ?? "",
                            periodEnd: ev.periodEnd ?? "",
                            location: ev.location ?? "",
                            population: ev.population ?? "",
                            sourceReference: ev.sourceReference ?? "",
                            sourcePage: ev.sourcePage ?? "",
                            sourceSection: ev.sourceSection ?? "",
                            notes: ev.notes ?? "",
                          }}
                          onSave={(data) => handleEditEvidence(ev.id, data)}
                          onCancel={() => setActiveForm(null)}
                        />
                      );
                    }

                    if (isAssessingThis) {
                      const existingAssessment = findAssessmentByEvidence(matrix, ev.id);
                      const initialAssessmentData = existingAssessment
                        ? {
                            direction: existingAssessment.direction,
                            confidence: existingAssessment.confidence,
                            justification: existingAssessment.justification,
                            limitations: existingAssessment.limitations,
                            alternativeInterpretations: existingAssessment.alternativeInterpretations ?? "",
                            additionalEvidenceNeeded: existingAssessment.additionalEvidenceNeeded ?? "",
                            reviewed: existingAssessment.reviewed,
                          }
                        : blankAssessmentForm();
                      return (
                        <AssessmentForm
                          key={ev.id}
                          evidence={ev}
                          row={row}
                          initialData={initialAssessmentData}
                          onSave={(data) => handleSaveAssessment(ev.id, row.id, data)}
                          onCancel={() => setActiveForm(null)}
                        />
                      );
                    }

                    return (
                      <EvidenceCard
                        key={ev.id}
                        ev={ev}
                        assessment={assessment}
                        onEdit={() =>
                          setActiveForm({
                            type: "evidence-edit",
                            ctRowId: row.id,
                            evidenceId: ev.id,
                          })
                        }
                        onDelete={() => handleDeleteEvidence(ev.id)}
                        onEvaluate={() =>
                          setActiveForm({
                            type: "assessment",
                            ctRowId: row.id,
                            evidenceId: ev.id,
                          })
                        }
                      />
                    );
                  })}

                  {/* Add evidence form or button */}
                  {isAddingEvidence ? (
                    <EvidenceForm
                      row={row}
                      initialData={blankEvidenceForm()}
                      onSave={(data) => handleAddEvidence(row.id, data)}
                      onCancel={() => setActiveForm(null)}
                    />
                  ) : (
                    !isConfirmed && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveForm({ type: "evidence-add", ctRowId: row.id });
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-primary/40 rounded-xl text-sm text-primary/70 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all duration-200"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar evidencia para este criterio
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap items-center gap-3 pt-4">
          {/* Confirm */}
          {!isConfirmed && (
            <button
              type="button"
              disabled={!validation.canConfirm || matrix.observedEvidence.length === 0}
              onClick={handleConfirmar}
              className="group flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold tracking-wide disabled:opacity-40 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar evaluación
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Ir a conclusión */}
          {isConfirmed && (
            <button
              type="button"
              onClick={onIrAConclusion}
              className="group flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold tracking-wide hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200"
            >
              Formular conclusión
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Volver */}
          <button
            type="button"
            onClick={onVolver}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-white text-sm font-medium text-foreground/70 hover:border-primary/40 hover:text-primary transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a contrastación
          </button>

          {/* Reiniciar */}
          <button
            type="button"
            onClick={onReiniciar}
            className="flex items-center gap-1.5 text-sm text-muted-foreground/50 hover:text-red-500 transition-colors duration-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar análisis
          </button>
        </div>
      </div>
    </div>
  );
}
