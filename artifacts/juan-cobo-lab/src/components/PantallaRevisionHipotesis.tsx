/**
 * S-015 — PantallaRevisionHipotesis
 *
 * Final review screen showing the complete analysis session:
 * problem → pack → router result → user selection → reflection → hypotheses.
 *
 * The "Confirmar" action only marks the session as reviewed in memory (§20).
 * No data is sent to any server.
 */

import { useRef, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Star, CheckCircle2, AlertCircle, Info, RotateCcw } from "lucide-react";

import type { KnowledgePack } from "@/router/types";
import type { ThinkingResult, ThinkingUserSelection } from "@/thinking/types";
import type { PerequeMode } from "@/pages/Helios";
import type { PolicyHypothesis, ReflectionAnswer } from "@/hypothesis/types";
import {
  validateHypothesis,
  computeHypothesisStatus,
  getAnsweredReflections,
  getPrimaryHypothesis,
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
const stagger: Variants = { visible: { transition: { staggerChildren: 0.06 } } };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusLabel: Record<string, string> = {
  "borrador": "Borrador",
  "incompleta": "Incompleta",
  "lista-para-contrastar": "Lista para contrastar",
};
const statusStyle: Record<string, string> = {
  "borrador": "bg-stone-100 text-stone-600 ring-stone-200",
  "incompleta": "bg-amber-50 text-amber-700 ring-amber-200",
  "lista-para-contrastar": "bg-emerald-50 text-emerald-700 ring-emerald-200",
};
const confidenceLabel: Record<string, string> = {
  "exploratoria": "Exploratoria",
  "plausible": "Plausible",
  "bien-sustentada": "Bien sustentada",
};

function RouterDecisionBadge({ result }: { result: ThinkingResult }) {
  if (result.decision === "seleccionado") {
    return (
      <span className="text-[10px] font-mono uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
        Ganador claro · {result.seleccionado.pattern.metadata.titulo}
      </span>
    );
  }
  if (result.decision === "candidatos") {
    return (
      <span className="text-[10px] font-mono uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
        Candidatos ({result.candidatos.length}) · {result.motivo}
      </span>
    );
  }
  return (
    <span className="text-[10px] font-mono uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 ring-1 ring-stone-200">
      Sin patrón identificado
    </span>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-8">
      <div className="flex-1 border-t border-border" />
      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/40">
        {label}
      </span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

// ─── HypothesisReview ─────────────────────────────────────────────────────────

function HypothesisReview({
  hypothesis,
  reflectionAnswers,
}: {
  hypothesis: PolicyHypothesis;
  reflectionAnswers: ReflectionAnswer[];
}) {
  const status = computeHypothesisStatus(hypothesis);
  const validation = validateHypothesis(hypothesis);
  const linkedAnswers = reflectionAnswers.filter((r) =>
    hypothesis.sourceQuestionIds.includes(r.questionKey) && r.answerText.trim()
  );

  const roleLabel: Record<string, string> = {
    causa: "Causa",
    resultado: "Resultado",
    mediadora: "Mediadora",
    moderadora: "Moderadora",
    control: "Control",
  };

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-start gap-3 flex-wrap mb-2">
          {hypothesis.isPrimary && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-accent text-white">
              <Star className="w-2.5 h-2.5" aria-hidden="true" />
              Principal
            </span>
          )}
          <span className={`text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${statusStyle[status]}`}>
            {statusLabel[status]}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 bg-muted/30 text-muted-foreground ring-border">
            {confidenceLabel[hypothesis.confianza]}
          </span>
          {hypothesis.patternChangedWarning && (
            <span className="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200">
              Enfoque cambió después de formular
            </span>
          )}
        </div>
        <h3 className="font-serif text-lg text-primary">
          {hypothesis.titulo || <span className="italic text-muted-foreground/40">Sin título</span>}
        </h3>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Formulación */}
        {hypothesis.formulacion && (
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/45 mb-1.5">
              Formulación
            </p>
            <p className="text-sm text-primary leading-[1.8] italic">
              {hypothesis.formulacion}
            </p>
          </div>
        )}

        {/* Core fields */}
        {[
          { label: "Causa", value: hypothesis.causa },
          { label: "Mecanismo", value: hypothesis.mecanismo },
          { label: "Resultado esperado", value: hypothesis.resultadoEsperado },
          { label: "Condiciones", value: hypothesis.condiciones },
          { label: "Límites", value: hypothesis.limites },
          { label: "Evidencia necesaria", value: hypothesis.evidenciaNecesaria },
        ]
          .filter((f) => f.value?.trim())
          .map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/45 mb-1">
                {label}
              </p>
              <p className="text-sm text-foreground/70 leading-[1.75]">{value}</p>
            </div>
          ))}

        {/* Variables */}
        {hypothesis.variables.length > 0 && (
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/45 mb-2">
              Variables ({hypothesis.variables.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {hypothesis.variables.map((v) => (
                <span
                  key={v.id}
                  className="text-xs px-2.5 py-1 rounded-lg border border-border bg-muted/20 text-foreground/70"
                >
                  {v.nombre}
                  <span className="ml-1.5 text-muted-foreground/40 font-mono text-[10px]">
                    {roleLabel[v.rol]}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Linked reflections */}
        {linkedAnswers.length > 0 && (
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/45 mb-2">
              Reflexiones vinculadas ({linkedAnswers.length})
            </p>
            <div className="space-y-2">
              {linkedAnswers.map((ans) => (
                <div key={ans.questionKey} className="rounded-lg border border-border bg-muted/10 px-3 py-2">
                  <p className="text-[10px] font-mono text-muted-foreground/40 mb-0.5">
                    {ans.patternTitulo} · {ans.categoria}
                  </p>
                  <p className="text-xs text-foreground/60 italic mb-1">{ans.questionText}</p>
                  <p className="text-xs text-primary">{ans.answerText}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Methodological alerts */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 space-y-1.5">
            {validation.errors.map((e) => (
              <div key={e} className="flex items-start gap-2 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{e}</span>
              </div>
            ))}
            {validation.warnings.map((w) => (
              <div key={w} className="flex items-start gap-2 text-xs text-amber-700/80">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {validation.isComplete && validation.warnings.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-emerald-700/80">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Hipótesis metodológicamente completa.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PantallaRevisionHipotesis ────────────────────────────────────────────────

export function PantallaRevisionHipotesis({
  problema,
  packActivo,
  thinkingResult,
  thinkingUserSelection,
  perequeMode,
  reflectionAnswers,
  hypotheses,
  primaryHypothesisId,
  hypothesesReviewed,
  onEditar,
  onConfirmar,
  onVolverPereque,
  onReiniciar,
}: {
  problema: string;
  packActivo: KnowledgePack | null;
  thinkingResult: ThinkingResult;
  thinkingUserSelection: ThinkingUserSelection | null;
  perequeMode: PerequeMode;
  reflectionAnswers: ReflectionAnswer[];
  hypotheses: PolicyHypothesis[];
  primaryHypothesisId: string | undefined;
  hypothesesReviewed: boolean;
  onEditar: () => void;
  onConfirmar: () => void;
  onVolverPereque: () => void;
  onReiniciar: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const answeredReflections = getAnsweredReflections(reflectionAnswers);
  const primary = hypotheses.find((h) => h.id === primaryHypothesisId) ?? getPrimaryHypothesis(hypotheses);
  const secondaries = hypotheses.filter((h) => h.id !== primary?.id);

  // Blocking errors: any hypothesis has errors
  const hasBlockingErrors = hypotheses.some((h) => !validateHypothesis(h).isComplete);

  return (
    <motion.div
      key="revision-hipotesis"
      variants={screenEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-[calc(100vh-4rem)]"
    >
      <div className="max-w-2xl mx-auto px-6 py-20 w-full">

        {/* ── Contexto ─────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/60">
            <span className="text-accent" aria-hidden="true">◆</span>
            Revisión del análisis
          </span>
          <p className="mt-1.5 text-lg font-serif italic text-primary/70">
            "{problema}"
          </p>
        </motion.div>

        {/* ── Título ───────────────────────────────────────────── */}
        <motion.h2
          ref={headingRef}
          tabIndex={-1}
          variants={fadeUp}
          className="font-serif text-4xl md:text-5xl text-primary leading-[1.15] mb-4 focus:outline-none"
        >
          {hypothesesReviewed ? "Análisis completado" : "Revisemos el análisis"}
        </motion.h2>

        {hypothesesReviewed ? (
          <motion.div
            variants={fadeUp}
            className="mb-10 rounded-xl border border-emerald-200 bg-emerald-50/50 px-6 py-5"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-emerald-800 mb-1">
                  Conjunto de hipótesis confirmado
                </p>
                <p className="text-sm text-emerald-700/70 leading-relaxed">
                  Las hipótesis quedaron registradas en esta sesión. Puedes volver a editarlas o reiniciar el análisis.
                </p>
                <p className="text-xs text-emerald-600/60 italic mt-2">
                  Nota: las hipótesis no se persisten fuera de esta sesión de navegador y se perderán al recargar la página.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.p
            variants={fadeUp}
            className="text-base text-foreground/60 leading-relaxed mb-10"
          >
            Antes de confirmar, revisa que el conjunto de hipótesis representa adecuadamente tu análisis del problema.
          </motion.p>
        )}

        {/* ── Cadena de trazabilidad ───────────────────────────── */}
        <SectionDivider label="Cadena analítica" />

        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4 mb-4">
          {/* Pack activo */}
          <motion.div variants={fadeUp} className="flex items-start gap-4">
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground/30 uppercase tracking-wide mt-1 w-20">
              Pack
            </span>
            <div>
              <p className="text-sm text-primary font-medium">
                {packActivo?.metadata.tema ?? "No identificado"}
              </p>
              {packActivo && (
                <p className="text-xs text-muted-foreground/50 mt-0.5">
                  {packActivo.metadata.id}
                </p>
              )}
            </div>
          </motion.div>

          {/* Router result */}
          <motion.div variants={fadeUp} className="flex items-start gap-4">
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground/30 uppercase tracking-wide mt-1 w-20">
              Router
            </span>
            <RouterDecisionBadge result={thinkingResult} />
          </motion.div>

          {/* User selection */}
          {thinkingUserSelection && (
            <motion.div variants={fadeUp} className="flex items-start gap-4">
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground/30 uppercase tracking-wide mt-1 w-20">
                Selección
              </span>
              <div className="text-xs text-muted-foreground/60">
                {thinkingUserSelection.mode === "single" ? (
                  <span>Patrón único: {thinkingUserSelection.primaryPatternId}</span>
                ) : (
                  <span>
                    Combinación: {thinkingUserSelection.primaryPatternId} +{" "}
                    {thinkingUserSelection.secondaryPatternId}
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* Patterns */}
          <motion.div variants={fadeUp} className="flex items-start gap-4">
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground/30 uppercase tracking-wide mt-1 w-20">
              {perequeMode.mode === "combined" ? "Patrones" : "Patrón"}
            </span>
            <div className="space-y-1">
              {perequeMode.mode === "single" ? (
                <p className="text-sm text-primary">{perequeMode.pattern.metadata.titulo}</p>
              ) : (
                <>
                  <p className="text-sm text-primary">
                    <span className="text-[10px] font-mono text-accent/60 mr-1.5">Principal</span>
                    {perequeMode.primaryPattern.metadata.titulo}
                  </p>
                  <p className="text-sm text-primary">
                    <span className="text-[10px] font-mono text-muted-foreground/50 mr-1.5">Complementario</span>
                    {perequeMode.secondaryPattern.metadata.titulo}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* ── Reflexiones respondidas ──────────────────────────── */}
        {answeredReflections.length > 0 && (
          <>
            <SectionDivider label={`Reflexiones (${answeredReflections.length})`} />
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="space-y-3 mb-4"
            >
              {answeredReflections.map((ans) => (
                <motion.div
                  key={ans.questionKey}
                  variants={fadeUp}
                  className="rounded-xl border border-border bg-muted/10 px-4 py-3"
                >
                  <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/40 mb-1">
                    {ans.patternTitulo} · {ans.categoria}
                  </p>
                  <p className="text-xs text-foreground/55 italic mb-1.5">{ans.questionText}</p>
                  <p className="text-sm text-primary leading-[1.7]">{ans.answerText}</p>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* ── Hipótesis ────────────────────────────────────────── */}
        <SectionDivider label={`Hipótesis (${hypotheses.length})`} />

        {hypotheses.length === 0 ? (
          <motion.div variants={fadeUp} className="text-center py-8">
            <p className="text-sm text-muted-foreground/50 italic">
              No hay hipótesis registradas. Vuelve al builder para crear al menos una.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="space-y-4 mb-4"
            role="list"
            aria-label="Hipótesis del análisis"
          >
            {/* Primary first */}
            {primary && (
              <motion.div key={primary.id} variants={fadeUp} role="listitem">
                <HypothesisReview
                  hypothesis={primary}
                  reflectionAnswers={reflectionAnswers}
                />
              </motion.div>
            )}
            {secondaries.map((h) => (
              <motion.div key={h.id} variants={fadeUp} role="listitem">
                <HypothesisReview
                  hypothesis={h}
                  reflectionAnswers={reflectionAnswers}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Alertas globales ─────────────────────────────────── */}
        {hasBlockingErrors && !hypothesesReviewed && (
          <motion.div
            variants={fadeUp}
            className="mb-8 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/60 px-5 py-4"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-sm text-red-700/90 leading-relaxed">
              Una o más hipótesis tienen errores metodológicos que deben resolverse antes de confirmar.
              Vuelve al editor para completarlas.
            </p>
          </motion.div>
        )}

        {/* ── Botones ───────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
          {!hypothesesReviewed ? (
            <>
              <button
                type="button"
                onClick={onConfirmar}
                disabled={hypotheses.length === 0 || hasBlockingErrors}
                className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-white text-sm font-medium tracking-wide hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all duration-200"
              >
                Confirmar hipótesis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onEditar}
                className="px-5 py-3 rounded-xl border border-border bg-white text-sm font-medium text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
              >
                Volver a editar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onEditar}
              className="px-5 py-3 rounded-xl border border-border bg-white text-sm font-medium text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
            >
              Volver al editor
            </button>
          )}
          <button
            type="button"
            onClick={onVolverPereque}
            className="text-sm text-muted-foreground/60 hover:text-primary underline-offset-4 hover:underline transition-colors duration-200"
          >
            Volver al pereque
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
