/**
 * S-022 — PantallaHypothesisEvidenceConclusion
 *
 * Pantalla de conclusión metodológica de la hipótesis.
 *
 * Muestra:
 *   1. Resumen descriptivo de la evaluación de evidencia (solo estadísticas — no recomienda)
 *   2. Formulario de conclusión: conclusionStatus, conclusionText, confidence,
 *      selección de evidencias, limitations, additionalEvidenceNeeded, reviewed
 *
 * HELIOS NO produce la conclusión automáticamente (ADR-0011).
 * El texto y el juicio son del investigador.
 */

import { useState, useCallback, useEffect } from "react";
import {
  ArrowLeft, ArrowRight, RotateCcw, CheckCircle2,
  AlertCircle, AlertTriangle, Info, TrendingUp, TrendingDown,
  HelpCircle, Minus,
} from "lucide-react";
import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ContrastationMatrix } from "@/contrastation/types";
import type {
  EvidenceEvaluationMatrix,
  HypothesisEvidenceConclusion,
  EvidenceConfidenceLevel,
} from "@/evidence-evaluation/types";
import {
  CONCLUSION_STATUS_LABELS,
  EVIDENCE_CONFIDENCE_LABELS,
} from "@/evidence-evaluation/types";
import {
  createConclusion,
  updateConclusion,
  validateConclusion,
  confirmConclusion,
  upsertHypothesisEvidenceConclusion,
} from "@/evidence-evaluation/HypothesisEvidenceConclusionService";
import {
  summarizeEvidenceEvaluation,
  groupEvidenceByDirection,
  findAssessmentByEvidence,
} from "@/evidence-evaluation/EvidenceEvaluationService";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  hypothesis: PolicyHypothesis;
  contrastationMatrix: ContrastationMatrix;
  evidenceMatrix: EvidenceEvaluationMatrix;
  conclusion: HypothesisEvidenceConclusion | null;
  onUpdateConclusion: (conclusion: HypothesisEvidenceConclusion) => void;
  onVolver: () => void;
  onIrARevisionFinal: () => void;
  onReiniciar: () => void;
}

// ─── Form state ───────────────────────────────────────────────────────────────

type ConclusionStatus = HypothesisEvidenceConclusion["conclusionStatus"];

interface ConclusionForm {
  conclusionStatus: ConclusionStatus;
  conclusionText: string;
  confidence: EvidenceConfidenceLevel | "";
  mainSupportingEvidenceIds: string[];
  mainWeakeningEvidenceIds: string[];
  limitations: string;
  additionalEvidenceNeeded: string;
  reviewed: boolean;
}

function initialForm(conclusion: HypothesisEvidenceConclusion | null): ConclusionForm {
  if (!conclusion) {
    return {
      conclusionStatus: "not-evaluated",
      conclusionText: "",
      confidence: "",
      mainSupportingEvidenceIds: [],
      mainWeakeningEvidenceIds: [],
      limitations: "",
      additionalEvidenceNeeded: "",
      reviewed: false,
    };
  }
  return {
    conclusionStatus: conclusion.conclusionStatus,
    conclusionText: conclusion.conclusionText,
    confidence: conclusion.confidence,
    mainSupportingEvidenceIds: conclusion.mainSupportingEvidenceIds,
    mainWeakeningEvidenceIds: conclusion.mainWeakeningEvidenceIds,
    limitations: conclusion.limitations,
    additionalEvidenceNeeded: conclusion.additionalEvidenceNeeded ?? "",
    reviewed: conclusion.reviewed,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ConclusionStatus; description: string }[] = [
  {
    value: "not-evaluated",
    description: "Aún no se ha formulado una conclusión.",
  },
  {
    value: "provisionally-supported",
    description: "La evidencia disponible apoya provisionalmente la hipótesis. No es prueba definitiva.",
  },
  {
    value: "provisionally-weakened",
    description: "La evidencia disponible debilita provisionalmente la hipótesis. No es refutación definitiva.",
  },
  {
    value: "mixed-evidence",
    description: "Hay evidencia en ambas direcciones — la hipótesis no puede evaluarse unilateralmente.",
  },
  {
    value: "inconclusive",
    description: "La evidencia es insuficiente o ambigua para formular una conclusión.",
  },
];

const DIRECTION_ICON: Record<string, React.ReactNode> = {
  supports: <TrendingUp className="w-4 h-4 text-emerald-600" />,
  weakens: <TrendingDown className="w-4 h-4 text-red-600" />,
  mixed: <Minus className="w-4 h-4 text-amber-600" />,
  inconclusive: <HelpCircle className="w-4 h-4 text-slate-400" />,
  "not-applicable": <Minus className="w-4 h-4 text-muted-foreground" />,
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function PantallaHypothesisEvidenceConclusion({
  hypothesis,
  contrastationMatrix,
  evidenceMatrix,
  conclusion: initialConclusion,
  onUpdateConclusion,
  onVolver,
  onIrARevisionFinal,
  onReiniciar,
}: Props) {
  const [form, setForm] = useState<ConclusionForm>(() => initialForm(initialConclusion));
  const [conclusion, setConclusion] = useState<HypothesisEvidenceConclusion | null>(initialConclusion);

  useEffect(() => {
    setForm(initialForm(initialConclusion));
    setConclusion(initialConclusion);
  }, [initialConclusion?.id]);

  // ── Descriptive summary ───────────────────────────────────────────────────

  const summary = summarizeEvidenceEvaluation(evidenceMatrix, contrastationMatrix);
  const byDirection = groupEvidenceByDirection(evidenceMatrix);

  // ── Form handlers ─────────────────────────────────────────────────────────

  function toggleSupportingEvidence(evId: string) {
    setForm((f) => ({
      ...f,
      mainSupportingEvidenceIds: f.mainSupportingEvidenceIds.includes(evId)
        ? f.mainSupportingEvidenceIds.filter((id) => id !== evId)
        : [...f.mainSupportingEvidenceIds, evId],
    }));
  }

  function toggleWeakeningEvidence(evId: string) {
    setForm((f) => ({
      ...f,
      mainWeakeningEvidenceIds: f.mainWeakeningEvidenceIds.includes(evId)
        ? f.mainWeakeningEvidenceIds.filter((id) => id !== evId)
        : [...f.mainWeakeningEvidenceIds, evId],
    }));
  }

  const handleSave = useCallback(() => {
    const data = {
      hypothesisId: hypothesis.id,
      evidenceEvaluationMatrixId: evidenceMatrix.id,
      conclusionStatus: form.conclusionStatus,
      conclusionText: form.conclusionText,
      confidence: form.confidence as EvidenceConfidenceLevel,
      mainSupportingEvidenceIds: form.mainSupportingEvidenceIds,
      mainWeakeningEvidenceIds: form.mainWeakeningEvidenceIds,
      limitations: form.limitations,
      additionalEvidenceNeeded: form.additionalEvidenceNeeded || undefined,
      reviewed: form.reviewed,
    };

    let updated: HypothesisEvidenceConclusion;
    if (conclusion) {
      updated = updateConclusion(conclusion, data);
    } else {
      updated = createConclusion(data);
    }

    setConclusion(updated);
    onUpdateConclusion(updated);
  }, [conclusion, form, hypothesis.id, evidenceMatrix.id, onUpdateConclusion]);

  const handleMarkReviewed = useCallback(() => {
    if (!conclusion) return;
    const confirmed = confirmConclusion(conclusion);
    setConclusion(confirmed);
    onUpdateConclusion(confirmed);
  }, [conclusion, onUpdateConclusion]);

  // ── Validation ────────────────────────────────────────────────────────────

  const currentConclusion = conclusion;
  const validation = currentConclusion
    ? validateConclusion(currentConclusion, evidenceMatrix)
    : null;

  const canSave = form.conclusionText.trim().length > 0 && form.confidence !== "";
  const isReviewed = conclusion?.reviewed ?? false;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs font-medium text-primary/70 uppercase tracking-widest mb-1">
            Conclusión metodológica
          </p>
          <h1 className="text-2xl font-bold text-foreground">
            Conclusión de la Hipótesis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{hypothesis.titulo}</span>
          </p>
          <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              HELIOS muestra un resumen descriptivo para orientar el juicio, pero{" "}
              <strong>la conclusión la formula usted</strong>. El sistema no determina
              causalidad ni produce conclusiones automáticas.
            </span>
          </div>
        </div>

        {/* ── RESUMEN DESCRIPTIVO ───────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="bg-muted/30 border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Resumen de la evaluación de evidencia
            </h2>
            <p className="text-xs text-muted-foreground">Solo estadísticas descriptivas — no implica recomendación.</p>
          </div>
          <div className="p-5">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{summary.totalObservedEvidence}</p>
                <p className="text-xs text-muted-foreground">Evidencias registradas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{summary.assessedEvidence}</p>
                <p className="text-xs text-muted-foreground">Con evaluación</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {summary.criteriaWithEvidence}/{summary.totalCriteria}
                </p>
                <p className="text-xs text-muted-foreground">Criterios cubiertos</p>
              </div>
            </div>

            {/* Direction distribution */}
            <p className="text-xs font-semibold text-foreground mb-2">Distribución por dirección</p>
            <div className="space-y-1.5">
              {([
                ["supports", "Apoya la hipótesis", "emerald"],
                ["weakens", "Debilita la hipótesis", "red"],
                ["mixed", "Mixta", "amber"],
                ["inconclusive", "Inconclusa", "slate"],
                ["not-applicable", "No aplica", "muted"],
              ] as const).map(([dir, label]) => {
                const count = byDirection.get(dir as any)?.length ?? 0;
                const pct = summary.assessedEvidence > 0 ? (count / summary.assessedEvidence) * 100 : 0;
                return (
                  <div key={dir} className="flex items-center gap-3">
                    <div className="w-5">{DIRECTION_ICON[dir]}</div>
                    <p className="text-xs text-muted-foreground w-40">{label}</p>
                    <div className="flex-1 bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full bg-${dir === "supports" ? "emerald" : dir === "weakens" ? "red" : dir === "mixed" ? "amber" : "slate"}-400`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs font-medium text-foreground w-6 text-right">{count}</p>
                  </div>
                );
              })}
            </div>

            {/* Confidence distribution */}
            <p className="text-xs font-semibold text-foreground mt-4 mb-2">Distribución por confianza</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["low", summary.lowConfidence, "text-red-600 bg-red-50 border-red-200"],
                ["medium", summary.mediumConfidence, "text-amber-700 bg-amber-50 border-amber-200"],
                ["high", summary.highConfidence, "text-emerald-700 bg-emerald-50 border-emerald-200"],
              ] as const).map(([level, count, cls]) => (
                <div key={level} className={`rounded-lg border px-3 py-2 text-center ${cls}`}>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-xs">{EVIDENCE_CONFIDENCE_LABELS[level]}</p>
                </div>
              ))}
            </div>

            {/* Uncovered criteria */}
            {summary.criteriaWithoutEvidence > 0 && (
              <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  {summary.criteriaWithoutEvidence} criterio(s) de contrastación no tienen evidencia registrada.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── FORMULARIO DE CONCLUSIÓN ──────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="bg-muted/30 border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Formulación de la conclusión
            </h2>
            <p className="text-xs text-muted-foreground">
              El texto y el juicio son del investigador. HELIOS no valida ni sugiere una conclusión específica.
            </p>
          </div>
          <div className="p-5 space-y-5">
            {/* Estado de conclusión */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                Estado de la conclusión <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 cursor-pointer rounded-xl border px-4 py-3 transition-all ${
                      form.conclusionStatus === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="conclusionStatus"
                      value={opt.value}
                      checked={form.conclusionStatus === opt.value}
                      onChange={() => setForm((f) => ({ ...f, conclusionStatus: opt.value }))}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {CONCLUSION_STATUS_LABELS[opt.value]}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Texto de conclusión */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Texto de la conclusión <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.conclusionText}
                onChange={(e) => setForm((f) => ({ ...f, conclusionText: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
                rows={4}
                placeholder="Formule la conclusión con sus propias palabras, basándose en la evidencia revisada..."
              />
            </div>

            {/* Confianza */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                Confianza en la conclusión <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as EvidenceConfidenceLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, confidence: level }))}
                    className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-all ${
                      form.confidence === level
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-white text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {EVIDENCE_CONFIDENCE_LABELS[level]}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-amber-600">Confianza ≠ probabilidad estadística.</p>
            </div>

            {/* Evidencias de apoyo */}
            {evidenceMatrix.observedEvidence.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">
                  Evidencias que sustentan la conclusión
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {evidenceMatrix.observedEvidence.map((ev) => {
                    const assessment = findAssessmentByEvidence(evidenceMatrix, ev.id);
                    const isSupporting = form.mainSupportingEvidenceIds.includes(ev.id);
                    const isWeakening = form.mainWeakeningEvidenceIds.includes(ev.id);
                    return (
                      <div
                        key={ev.id}
                        className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
                          isSupporting
                            ? "border-emerald-300 bg-emerald-50"
                            : isWeakening
                            ? "border-red-300 bg-red-50"
                            : "border-border bg-white"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{ev.title}</p>
                          {assessment && (
                            <p className="text-muted-foreground">
                              {CONCLUSION_STATUS_LABELS[
                                assessment.direction === "supports"
                                  ? "provisionally-supported"
                                  : assessment.direction === "weakens"
                                  ? "provisionally-weakened"
                                  : "mixed-evidence"
                              ] ?? assessment.direction}
                              {" · "}
                              {EVIDENCE_CONFIDENCE_LABELS[assessment.confidence]}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleSupportingEvidence(ev.id)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              isSupporting
                                ? "bg-emerald-600 text-white"
                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            }`}
                          >
                            {isSupporting ? "✓ Apoya" : "Apoya"}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleWeakeningEvidence(ev.id)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              isWeakening
                                ? "bg-red-600 text-white"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                          >
                            {isWeakening ? "✓ Debilita" : "Debilita"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Limitaciones */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Limitaciones metodológicas de la conclusión
              </label>
              <textarea
                value={form.limitations}
                onChange={(e) => setForm((f) => ({ ...f, limitations: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
                rows={3}
                placeholder="¿Qué restricciones tiene esta conclusión? ¿Qué no puede afirmarse con la evidencia disponible?"
              />
            </div>

            {/* Evidencia adicional necesaria */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Evidencia adicional que se necesitaría
              </label>
              <textarea
                value={form.additionalEvidenceNeeded}
                onChange={(e) => setForm((f) => ({ ...f, additionalEvidenceNeeded: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
                rows={2}
                placeholder="¿Qué datos o análisis adicionales fortalecerían o refutarían la conclusión?"
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
              <span className="text-sm text-foreground">He revisado la conclusión y es mi juicio metodológico</span>
            </label>

            {/* Guardado */}
            <button
              type="button"
              disabled={!canSave}
              onClick={handleSave}
              className="w-full py-3 text-sm font-semibold rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              Guardar conclusión
            </button>
          </div>
        </div>

        {/* Validation */}
        {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="space-y-2" aria-live="polite">
            {validation.errors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Errores
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
                  {validation.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-amber-700">• {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Conclusion status badge */}
        {conclusion && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
            isReviewed
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}>
            <CheckCircle2 className={`w-4 h-4 ${isReviewed ? "text-emerald-600" : "text-amber-600"}`} />
            <p className={`text-sm font-medium ${isReviewed ? "text-emerald-700" : "text-amber-700"}`}>
              {isReviewed
                ? `Conclusión revisada: ${CONCLUSION_STATUS_LABELS[conclusion.conclusionStatus]}`
                : "Conclusión guardada (pendiente de revisión)"}
            </p>
            {!isReviewed && (
              <button
                type="button"
                onClick={handleMarkReviewed}
                className="ml-auto text-xs text-amber-700 underline hover:text-amber-900"
              >
                Marcar como revisada
              </button>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Ir a revisión final */}
          {conclusion && (
            <button
              type="button"
              onClick={onIrARevisionFinal}
              className="group flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold tracking-wide hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200"
            >
              Ver cadena metodológica completa
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
            Volver a evaluación
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
