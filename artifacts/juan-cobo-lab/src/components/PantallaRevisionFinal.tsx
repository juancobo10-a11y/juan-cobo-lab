/**
 * PantallaRevisionFinal — S-019 §16
 *
 * Consolidated view of the full methodological chain:
 *   Problema → Thinking Pattern → Hipótesis → Modelo Conceptual
 *   → Variables → Indicadores → Fuentes
 *   → Operacionalización → Contrastación
 *
 * Each stage is navigable (button to jump back to that screen).
 * No direct editing from this view.
 */

import { motion, type Variants } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ChevronRight,
  FileText,
  GitCompareArrows,
  Table2,
  BarChart2,
  BookOpen,
  Brain,
  HelpCircle,
  RotateCcw,
} from "lucide-react";

import type { PolicyHypothesis } from "@/hypothesis/types";
import type { ConceptualModel } from "@/conceptual/types";
import type { OperationalizationMatrix } from "@/operationalization/types";
import type { ContrastationMatrix } from "@/contrastation/types";
import { PRIORIDAD_LABELS } from "@/contrastation/types";

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
  patternTitulo: string | null;
  hypothesis: PolicyHypothesis;
  conceptualModel: ConceptualModel | null;
  operationalizationMatrix: OperationalizationMatrix | null;
  contrastationMatrix: ContrastationMatrix | null;
  onIrAProblema: () => void;
  onIrAHipotesis: () => void;
  onIrAModelo: () => void;
  onIrAOperacionalizacion: () => void;
  onIrAContrastation: () => void;
  /** S-020: navigate to Knowledge Graph screen */
  onVerKnowledgeGraph?: () => void;
  /** S-021: navigate to Auditoría de Consistencia Metodológica screen */
  onEjecutarAuditoria?: () => void;
  /** S-022: navigate to evidence evaluation screen */
  onIrAEvidenceEvaluation?: () => void;
  onReiniciar: () => void;
}

// ─── Stage badge ──────────────────────────────────────────────────────────────

function StageBadge({ done }: { done: boolean }) {
  return done
    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-label="Completo" />
    : <Circle className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" aria-label="Pendiente" />;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode;
  label: string;
  done: boolean;
  onNavigate: () => void;
  children: React.ReactNode;
}

function Section({ icon, label, done, onNavigate, children }: SectionProps) {
  return (
    <div className="rounded-xl border border-border bg-white/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <span className="text-primary/60">{icon}</span>
          <span className="text-xs font-mono font-semibold text-foreground/80 uppercase tracking-widest">
            {label}
          </span>
          <StageBadge done={done} />
        </div>
        <button
          type="button"
          onClick={onNavigate}
          aria-label={`Ir a ${label}`}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded transition-colors"
        >
          Ir a esta etapa
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PantallaRevisionFinal({
  problema,
  patternTitulo,
  hypothesis,
  conceptualModel,
  operationalizationMatrix,
  contrastationMatrix,
  onIrAProblema,
  onIrAHipotesis,
  onIrAModelo,
  onIrAOperacionalizacion,
  onIrAContrastation,
  onVerKnowledgeGraph,
  onEjecutarAuditoria,
  onReiniciar,
}: Props) {

  const chainComplete =
    !!conceptualModel?.confirmed &&
    !!operationalizationMatrix?.confirmed &&
    !!contrastationMatrix?.confirmed;

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
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cadena metodológica</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground leading-snug">
            Revisión metodológica completa
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Vista consolidada de toda la cadena de análisis: desde el problema hasta los
            criterios de contrastación. Navega a cualquier etapa para revisar o modificar.
          </p>
          {chainComplete && (
            <div className="flex items-center gap-2 mt-1 text-emerald-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              Cadena metodológica completa
            </div>
          )}
        </motion.div>

        {/* ── Flow diagram ─────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground/60 font-mono">
          {[
            "Problema",
            "Patrón",
            "Hipótesis",
            "Modelo conceptual",
            "Operacionalización",
            "Contrastación",
          ].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-1.5">
              <span>{step}</span>
              {i < arr.length - 1 && (
                <ChevronRight className="w-3 h-3 opacity-40" aria-hidden="true" />
              )}
            </span>
          ))}
        </motion.div>

        {/* ── 1. Problema ───────────────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <Section
            icon={<HelpCircle className="w-4 h-4" />}
            label="Problema"
            done={!!problema}
            onNavigate={onIrAProblema}
          >
            <p className="text-sm text-foreground/90 leading-relaxed">
              {problema || <span className="italic text-muted-foreground/50">Sin problema definido.</span>}
            </p>
          </Section>
        </motion.div>

        {/* ── 2. Thinking Pattern ───────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <Section
            icon={<Brain className="w-4 h-4" />}
            label="Thinking Pattern"
            done={!!patternTitulo}
            onNavigate={onIrAHipotesis}
          >
            {patternTitulo
              ? <p className="text-sm text-foreground/90">{patternTitulo}</p>
              : <p className="text-sm italic text-muted-foreground/50">Sin patrón seleccionado.</p>}
          </Section>
        </motion.div>

        {/* ── 3. Hipótesis ──────────────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <Section
            icon={<FileText className="w-4 h-4" />}
            label="Hipótesis"
            done={!!hypothesis.formulacion}
            onNavigate={onIrAHipotesis}
          >
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground/90">{hypothesis.titulo}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{hypothesis.formulacion}</p>
            </div>
          </Section>
        </motion.div>

        {/* ── 4. Modelo Conceptual ──────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <Section
            icon={<BarChart2 className="w-4 h-4" />}
            label="Modelo Conceptual"
            done={!!conceptualModel?.confirmed}
            onNavigate={onIrAModelo}
          >
            {conceptualModel ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-semibold text-foreground/70 mb-1">
                    Variables ({conceptualModel.variables.length})
                  </p>
                  <ul className="space-y-0.5">
                    {conceptualModel.variables.map((v) => (
                      <li key={v.id} className="text-xs text-muted-foreground">
                        • {v.nombre}
                        <span className="ml-1 text-muted-foreground/50">({v.rol})</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground/70 mb-1">
                    Indicadores ({conceptualModel.indicators.length})
                  </p>
                  <ul className="space-y-0.5">
                    {conceptualModel.indicators.map((i) => (
                      <li key={i.id} className="text-xs text-muted-foreground">
                        • {i.nombre}
                        {i.unidad && <span className="ml-1 text-muted-foreground/50">({i.unidad})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground/70 mb-1">
                    Fuentes ({conceptualModel.evidenceSources.length})
                  </p>
                  <ul className="space-y-0.5">
                    {conceptualModel.evidenceSources.map((s) => (
                      <li key={s.id} className="text-xs text-muted-foreground">
                        • {s.nombre}
                        <span className="ml-1 text-muted-foreground/50">({s.tipo})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground/50">
                Sin modelo conceptual construido.
              </p>
            )}
          </Section>
        </motion.div>

        {/* ── 5. Operacionalización ─────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <Section
            icon={<Table2 className="w-4 h-4" />}
            label="Operacionalización"
            done={!!operationalizationMatrix?.confirmed}
            onNavigate={onIrAOperacionalizacion}
          >
            {operationalizationMatrix && operationalizationMatrix.rows.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground/70">
                  {operationalizationMatrix.rows.length} fila
                  {operationalizationMatrix.rows.length > 1 ? "s" : ""} en la matriz
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse" aria-label="Matriz de operacionalización">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="text-left p-2 font-semibold text-foreground/70 border border-border/40">Dimensión</th>
                        <th className="text-left p-2 font-semibold text-foreground/70 border border-border/40">Indicador</th>
                        <th className="text-left p-2 font-semibold text-foreground/70 border border-border/40">Escala</th>
                        <th className="text-left p-2 font-semibold text-foreground/70 border border-border/40">Fuente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operationalizationMatrix.rows.map((row) => {
                        const ind = conceptualModel?.indicators.find((i) => i.id === row.indicatorId);
                        const src = conceptualModel?.evidenceSources.find((s) => s.id === row.sourceId);
                        return (
                          <tr key={row.id} className="hover:bg-muted/20">
                            <td className="p-2 border border-border/40 text-foreground/80">
                              {row.dimension.nombre}
                            </td>
                            <td className="p-2 border border-border/40 text-muted-foreground">
                              {ind?.nombre ?? <span className="italic text-red-400">Sin indicador</span>}
                            </td>
                            <td className="p-2 border border-border/40 text-muted-foreground">
                              {row.escala || <span className="italic text-muted-foreground/40">—</span>}
                            </td>
                            <td className="p-2 border border-border/40 text-muted-foreground">
                              {src?.nombre ?? <span className="italic text-red-400">Sin fuente</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground/50">
                Sin matriz de operacionalización construida.
              </p>
            )}
          </Section>
        </motion.div>

        {/* ── 6. Contrastación ──────────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <Section
            icon={<GitCompareArrows className="w-4 h-4" />}
            label="Contrastación"
            done={!!contrastationMatrix?.confirmed}
            onNavigate={onIrAContrastation}
          >
            {contrastationMatrix && contrastationMatrix.rows.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground/70">
                  {contrastationMatrix.rows.length} criterio
                  {contrastationMatrix.rows.length > 1 ? "s" : ""} de contrastación
                </p>
                <div className="space-y-3">
                  {contrastationMatrix.rows.map((row, idx) => {
                    const ind = conceptualModel?.indicators.find((i) => i.id === row.indicadorId);
                    const src = conceptualModel?.evidenceSources.find((s) => s.id === row.fuenteId);
                    const prioColors: Record<string, string> = {
                      alta: "text-red-600 bg-red-50",
                      media: "text-amber-600 bg-amber-50",
                      baja: "text-emerald-600 bg-emerald-50",
                      "": "text-muted-foreground bg-muted/30",
                    };
                    return (
                      <div key={row.id} className="rounded-lg border border-border/50 bg-white/50 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground/70">
                            Criterio {idx + 1}
                            {ind && <span className="ml-1 font-normal text-muted-foreground">— {ind.nombre}</span>}
                          </span>
                          {row.prioridad && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${prioColors[row.prioridad]}`}>
                              {PRIORIDAD_LABELS[row.prioridad]}
                            </span>
                          )}
                        </div>
                        {src && (
                          <p className="text-xs text-muted-foreground/70">Fuente: {src.nombre}</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-emerald-700">Evidencia esperada</p>
                            <p className="text-xs text-foreground/80 leading-relaxed">{row.evidenciaEsperada || "—"}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-red-700">Evidencia contraria</p>
                            <p className="text-xs text-foreground/80 leading-relaxed">{row.evidenciaContraria || "—"}</p>
                          </div>
                        </div>
                        {row.criterioInterpretacion && (
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-foreground/60">Criterio de interpretación</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{row.criterioInterpretacion}</p>
                          </div>
                        )}
                        {row.limitaciones && (
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-foreground/60">Limitaciones</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{row.limitaciones}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground/50">
                Sin criterios de contrastación definidos.
              </p>
            )}
          </Section>
        </motion.div>

        {/* ── Navigation ────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
          {onEjecutarAuditoria && (
            <button
              type="button"
              onClick={onEjecutarAuditoria}
              className="group flex items-center gap-2.5 px-6 py-3.5 rounded-xl border border-accent/40 bg-accent/5 text-accent-foreground text-sm font-medium tracking-wide hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
            >
              Ejecutar auditoría metodológica
            </button>
          )}
          {onVerKnowledgeGraph && (
            <button
              type="button"
              onClick={onVerKnowledgeGraph}
              className="group flex items-center gap-2.5 px-6 py-3.5 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-medium tracking-wide hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200"
            >
              Ver Knowledge Graph
            </button>
          )}
          <button
            type="button"
            onClick={onIrAContrastation}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-white text-sm font-medium text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver a contrastación
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
