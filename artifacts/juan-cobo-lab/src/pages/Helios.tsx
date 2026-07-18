import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { ArrowRight, ChevronRight, Sparkles, AlertCircle, FlaskConical } from "lucide-react";
import type { PolicyHypothesis, ReflectionAnswer } from "@/hypothesis/types";
import { markPatternChanged, getPrimaryHypothesis } from "@/hypothesis/HypothesisBuilderService";
import { PantallaHypothesisBuilder } from "@/components/PantallaHypothesisBuilder";
import { PantallaRevisionHipotesis } from "@/components/PantallaRevisionHipotesis";
import { PantallaConceptualModel } from "@/components/PantallaConceptualModel";
import type { ConceptualModel } from "@/conceptual/types";
import { findModelByHypothesisId, upsertModel } from "@/conceptual/ConceptualModelService";
import { PantallaOperationalizationMatrix } from "@/components/PantallaOperationalizationMatrix";
import type { OperationalizationMatrix } from "@/operationalization/types";
import {
  findMatrixByHypothesisId,
  upsertMatrix,
} from "@/operationalization/OperationalizationService";
import { PantallaContrastationMatrix } from "@/components/PantallaContrastationMatrix";
import { PantallaRevisionFinal } from "@/components/PantallaRevisionFinal";
import { PantallaKnowledgeGraph } from "@/components/PantallaKnowledgeGraph";
import { PantallaAuditoriaMetodologica } from "@/components/PantallaAuditoriaMetodologica";
// S-022: Evidence evaluation
import PantallaEvidenceEvaluation from "@/components/PantallaEvidenceEvaluation";
import PantallaHypothesisEvidenceConclusion from "@/components/PantallaHypothesisEvidenceConclusion";
import type { EvidenceEvaluationMatrix, HypothesisEvidenceConclusion as HypEvidConclusion } from "@/evidence-evaluation/types";
import {
  upsertEvidenceEvaluationMatrix,
  findEvidenceEvaluationMatrixByHypothesis,
} from "@/evidence-evaluation/EvidenceEvaluationService";
import {
  upsertHypothesisEvidenceConclusion,
  findHypothesisEvidenceConclusion,
} from "@/evidence-evaluation/HypothesisEvidenceConclusionService";
// S-023: Report Builder
import PantallaReportBuilder from "@/components/PantallaReportBuilder";
import type { ReportDefinition } from "@/report-builder/types";
import {
  upsertReportDefinition,
  findReportDefinitionByHypothesis,
} from "@/report-builder/ReportBuilderService";
// S-024: Project Versioning
import PantallaProjectVersions from "@/components/PantallaProjectVersions";
import PantallaVersionComparison from "@/components/PantallaVersionComparison";
import PantallaProjectImport from "@/components/PantallaProjectImport";
import {
  type ProjectSnapshot,
  type ProjectVersion,
  registerMigration,
  migration_0_9_0_to_1_0_0,
} from "@/project-versioning";
import type { ContrastationMatrix } from "@/contrastation/types";
import {
  findContrastationMatrixByHypothesisId,
  upsertContrastationMatrix,
} from "@/contrastation/ContrastationService";
import { heliosRouter } from "@/router/KnowledgeRouter";
import type {
  KnowledgePack,
  Hipotesis,
  NivelConfianza,
  PackCandidate,
  PackMetadata,
  RouterResult,
} from "@/router/types";
import { heliosThinkingEngine } from "@/thinking/ThinkingRouter";
import type {
  ThinkingPattern,
  ThinkingResult,
  ThinkingQuestion,
  ExplicacionSeleccion,
  ThinkingUserSelection,
  ThinkingRouterInput,
} from "@/thinking/types";
import { extractContextSummary } from "@/thinking/utils";
import {
  getRealCandidates,
  buildCandidateExplanations,
  getPreguntasCombinadas,
  buildExplicacionCombinada,
  buildEnfoquesTexto,
  findCandidate,
} from "@/thinking/SelectionService";
import { PantallaSeleccionThinkingPattern } from "@/components/PantallaSeleccionThinkingPattern";

// ─── Animation variants ─────────────────────────────────────────────────────
const screenEnter: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.35, ease: [0.55, 0, 1, 0.45] },
  },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

// ─── Style maps ─────────────────────────────────────────────────────────────
const confianzaStyle: Record<NivelConfianza, string> = {
  Alta: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  Media: "bg-amber-50 text-amber-700 ring-amber-200/60",
  Exploratoria: "bg-violet-50 text-violet-700 ring-violet-200/60",
};

const confianzaRouterStyle: Record<string, string> = {
  alta: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
  media: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
  baja: "bg-violet-50 text-violet-600 ring-1 ring-violet-200/60",
};

// ─── Pantalla 1: Entrada ────────────────────────────────────────────────────
function PantallaEntrada({
  onSubmit,
  initialValue = "",
}: {
  onSubmit: (problema: string) => void;
  /** Pre-fills the textarea — used when the user returns from pereque via "Volver" */
  initialValue?: string;
}) {
  const [valor, setValor] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = valor.trim();
    if (trimmed) onSubmit(trimmed);
  };

  // Use generic chips for the entrada screen (not pack-specific)
  const ejemplos = [
    "¿Por qué persiste la brecha digital donde ya existe cobertura?",
    "¿Por qué aumenta la deserción escolar?",
    "Habilidades digitales en adultos mayores",
    "Conectividad en escuelas rurales",
  ];

  const explorados = [
    "Índice de Brecha Digital",
    "Deserción escolar Colombia",
    "Conectividad significativa",
    "Cobertura educativa Chocó",
    "Apropiación digital rural",
    "Trabajo infantil",
    "Infraestructura TIC",
  ];

  return (
    <motion.div
      key="entrada"
      variants={screenEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-[calc(100vh-4rem)] flex flex-col justify-center"
    >
      <div className="max-w-2xl mx-auto px-6 py-20 w-full">
        <motion.p
          variants={fadeUp}
          className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-8"
        >
          HELIOS · Sistema de análisis de política pública
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className="font-serif text-4xl md:text-5xl leading-[1.15] text-primary mb-4"
        >
          ¿Qué problema público quieres comprender hoy?
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-base text-foreground/60 leading-relaxed mb-10"
        >
          HELIOS no comienza proponiendo soluciones. Comienza ayudándote a
          comprender mejor el problema.
        </motion.p>

        <motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-6">
          <textarea
            ref={textareaRef}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            rows={4}
            placeholder="Describe el fenómeno que observas..."
            className="w-full resize-none rounded-xl border border-border bg-white px-6 py-5 text-lg text-primary placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all duration-200 font-sans leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const trimmed = valor.trim();
                if (trimmed) onSubmit(trimmed);
              }
            }}
            aria-label="Describe el problema de política pública"
          />

          <div className="space-y-1.5">
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground/50 mb-3">
              Por ejemplo
            </p>
            <div className="flex flex-wrap gap-2">
              {ejemplos.map((ej) => (
                <button
                  key={ej}
                  type="button"
                  onClick={() => setValor(ej)}
                  className="text-sm px-4 py-1.5 rounded-full border border-border bg-white text-foreground/60 hover:border-accent/50 hover:text-primary hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
                >
                  {ej}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={!valor.trim()}
              className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-white text-sm font-medium tracking-wide hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all duration-200"
            >
              Démosle pereque
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
          </div>
        </motion.form>

        <motion.div variants={fadeUp} className="mt-14 pt-10 border-t border-border">
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/50 mb-5">
            Otros usuarios han explorado
          </p>
          <div className="flex flex-wrap gap-2">
            {explorados.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setValor(chip)}
                className="text-sm px-4 py-1.5 rounded-full border border-border bg-white text-foreground/55 hover:border-primary/30 hover:text-primary hover:bg-primary/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
              >
                {chip}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="mt-10 text-xs text-muted-foreground/40 leading-relaxed"
        >
          HELIOS no da respuestas. Abre preguntas mejores.
        </motion.p>
      </div>
    </motion.div>
  );
}

// ─── Pantalla: Enrutando ────────────────────────────────────────────────────
function PantallaEnrutando({ problema }: { problema: string }) {
  return (
    <motion.div
      key="enrutando"
      variants={screenEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-[calc(100vh-4rem)] flex flex-col justify-center"
    >
      <div className="max-w-2xl mx-auto px-6 py-20 w-full">
        <motion.div
          variants={fadeUp}
          className="flex flex-col items-center text-center gap-8"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 rounded-full border-2 border-border border-t-accent"
          />
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-4">
              HELIOS · Analizando
            </p>
            <p className="font-serif text-2xl text-primary/70 italic leading-snug">
              "{problema}"
            </p>
          </div>
          <p className="text-sm text-muted-foreground/50">
            Identificando el área de conocimiento más relevante…
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Pantalla: Confirmación de candidatos ───────────────────────────────────
function PantallaConfirmacion({
  problema,
  candidatos,
  motivo,
  onSeleccionar,
  onReiniciar,
}: {
  problema: string;
  candidatos: PackCandidate[];
  motivo: "empate" | "baja-confianza";
  onSeleccionar: (pack: KnowledgePack) => void;
  onReiniciar: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const titulo =
    motivo === "empate"
      ? "Tu consulta podría relacionarse con más de un área"
      : "Encontré una coincidencia aproximada";

  const subtitulo =
    motivo === "empate"
      ? "¿Cuál se acerca más a lo que quieres analizar?"
      : "La relevancia es baja. Confirma si quieres continuar o reformula tu consulta.";

  return (
    <motion.div
      key="confirmacion"
      variants={screenEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-[calc(100vh-4rem)]"
    >
      <div className="max-w-2xl mx-auto px-6 py-20 w-full">
        <motion.div variants={fadeUp} className="mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/60">
            <span className="text-accent" aria-hidden="true">◆</span>
            Analizando
          </span>
          <p className="mt-1.5 text-lg font-serif italic text-primary/70">
            "{problema}"
          </p>
        </motion.div>

        <motion.h2
          ref={headingRef}
          tabIndex={-1}
          variants={fadeUp}
          className="font-serif text-3xl md:text-4xl text-primary leading-[1.2] mb-3 focus:outline-none"
        >
          {titulo}
        </motion.h2>

        <motion.p variants={fadeUp} className="text-base text-foreground/60 mb-12">
          {subtitulo}
        </motion.p>

        <motion.div variants={stagger} initial="hidden" animate="visible">
          <div className="space-y-5" role="list">
            {candidatos.map((c) => (
              <motion.div key={c.pack.metadata.id} variants={fadeUp} role="listitem">
                <button
                  type="button"
                  onClick={() => onSeleccionar(c.pack)}
                  className="group w-full text-left rounded-2xl border border-border bg-white p-7 hover:border-accent/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-300"
                  aria-label={`Analizar usando ${c.pack.metadata.titulo}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-serif text-xl text-primary leading-snug">
                      {c.pack.metadata.titulo}
                    </h3>
                    <span
                      className={`shrink-0 text-[10px] font-semibold font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full ${confianzaRouterStyle[c.confianza]}`}
                    >
                      {c.confianza}
                    </span>
                  </div>

                  <p className="text-sm text-foreground/60 leading-[1.75] mb-4">
                    {c.pack.metadata.descripcion}
                  </p>

                  {c.terminosCoincidentes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {c.terminosCoincidentes
                        .filter((t) => t.campo === "keyword")
                        .slice(0, 5)
                        .map((t) => (
                          <span
                            key={t.termino}
                            className="text-[11px] px-2.5 py-0.5 rounded-full bg-accent/8 text-accent/80 font-mono"
                          >
                            {t.termino}
                          </span>
                        ))}
                    </div>
                  )}

                  <div
                    className="flex items-center gap-1.5 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-200"
                    aria-hidden="true"
                  >
                    Analizar desde esta perspectiva
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-10">
          <button
            onClick={onReiniciar}
            className="text-sm text-muted-foreground/60 hover:text-primary underline-offset-4 hover:underline transition-colors duration-200"
          >
            Reformular la consulta
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Pantalla: Sin pack ─────────────────────────────────────────────────────
function PantallaSinPack({
  problema,
  onReiniciar,
  packsActivos,
}: {
  problema: string;
  onReiniciar: () => void;
  /** Active pack metadata — built dynamically from the registry */
  packsActivos: PackMetadata[];
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <motion.div
      key="sin-pack"
      variants={screenEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-[calc(100vh-4rem)] flex flex-col justify-center"
    >
      <div className="max-w-2xl mx-auto px-6 py-20 w-full">
        <motion.div
          variants={fadeUp}
          className="flex items-center gap-3 mb-10"
        >
          <AlertCircle className="w-5 h-5 text-muted-foreground/40" />
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/50">
            Área no reconocida
          </span>
        </motion.div>

        <motion.h2
          ref={headingRef}
          tabIndex={-1}
          variants={fadeUp}
          className="font-serif text-3xl md:text-4xl text-primary leading-[1.2] mb-4 focus:outline-none"
        >
          Esta consulta va más allá de nuestras áreas de especialidad actuales
        </motion.h2>

        <motion.div
          variants={fadeUp}
          className="mb-4 p-5 rounded-xl bg-muted/30 border border-border"
        >
          <p className="text-sm text-muted-foreground/60 mb-1">Tu consulta</p>
          <p className="font-serif italic text-primary/70">"{problema}"</p>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="text-base text-foreground/60 leading-relaxed mb-4"
        >
          HELIOS trabaja con Knowledge Packs especializados. Actualmente cubre:
        </motion.p>

        {packsActivos.length > 0 && (
          <motion.ul
            variants={fadeUp}
            className="mb-8 space-y-1.5 pl-1"
            aria-label="Áreas de conocimiento disponibles"
          >
            {packsActivos.map((p) => (
              <li key={p.id} className="flex items-center gap-2.5 text-base text-primary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0" aria-hidden="true" />
                {p.titulo}
              </li>
            ))}
          </motion.ul>
        )}

        <motion.p
          variants={fadeUp}
          className="text-sm text-foreground/50 leading-relaxed mb-12"
        >
          Pronto habrá más áreas disponibles.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
          <button
            onClick={onReiniciar}
            className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-white text-sm font-medium tracking-wide hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all duration-200"
          >
            <Sparkles className="w-4 h-4" />
            Reformular la consulta
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Pantalla: Démosle pereque (Thinking Engine) ───────────────────────────

// Colores por categoría — cubre Socrático y Sistémico.
// Cualquier categoría no listada recibe el fallback en PantallaPereque.
const categoriaStyle: Record<string, string> = {
  // ── Socrático ─────────────────────────────────────────────────────────────
  clarificacion: "bg-slate-50  text-slate-600  ring-slate-200/60",
  supuestos:     "bg-amber-50  text-amber-700  ring-amber-200/60",
  evidencia:     "bg-blue-50   text-blue-700   ring-blue-200/60",
  perspectivas:  "bg-violet-50 text-violet-700 ring-violet-200/60",
  implicaciones: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  // ── Sistémico ─────────────────────────────────────────────────────────────
  elementos:         "bg-cyan-50    text-cyan-700    ring-cyan-200/60",
  relaciones:        "bg-indigo-50  text-indigo-700  ring-indigo-200/60",
  retroalimentacion: "bg-orange-50  text-orange-700  ring-orange-200/60",
  efectos:           "bg-rose-50    text-rose-700    ring-rose-200/60",
  dinamica:          "bg-teal-50    text-teal-700    ring-teal-200/60",
  // ── Economía Política ─────────────────────────────────────────────────────
  incentivos:    "bg-yellow-50  text-yellow-700  ring-yellow-200/60",
  distribucion:  "bg-lime-50    text-lime-700    ring-lime-200/60",
  poder:         "bg-red-50     text-red-700     ring-red-200/60",
  coaliciones:   "bg-purple-50  text-purple-700  ring-purple-200/60",
  implementacion:"bg-sky-50     text-sky-700     ring-sky-200/60",
  captura:       "bg-rose-50    text-rose-800    ring-rose-200/60",
  "statu-quo":   "bg-stone-50   text-stone-600   ring-stone-200/60",
  negociacion:   "bg-teal-50    text-teal-700    ring-teal-200/60",
};

/**
 * Sustituye {{problema}} por el texto real del usuario en guillemets.
 * Facilita lectura fluida sin signos de interrogación anidados.
 */
function interpolarProblema(pregunta: string, problema: string): string {
  return pregunta.replace("{{problema}}", `«${problema}»`);
}

// ─── PerequeMode — computed in Helios, consumed by PantallaPereque ───────────
//
// A discriminated union that encodes all data PantallaPereque needs
// without letting it re-run any router logic. Computed once by
// computePerequeMode() and passed as a single prop.

export type PerequeMode =
  | {
      mode: "single";
      pattern: ThinkingPattern;
      /** Explanation from ExplanationService. null only in defensive cases. */
      explicacion: ExplicacionSeleccion | null;
    }
  | {
      mode: "combined";
      primaryPattern: ThinkingPattern;
      primaryExplicacion: ExplicacionSeleccion | null;
      secondaryPattern: ThinkingPattern;
      secondaryExplicacion: ExplicacionSeleccion | null;
      /** Limited to MAX_PREGUNTAS_PRINCIPAL, in preguntas.json order. */
      preguntasPrincipal: ThinkingQuestion[];
      /** Deduplicated against principal, limited to MAX_PREGUNTAS_COMPLEMENTARIO. */
      preguntasComplementario: ThinkingQuestion[];
      /** Generated by buildExplicacionCombinada() — no hardcoded pair text. */
      explicacionCombinada: string;
      /** Generated by buildEnfoquesTexto() from enfoqueBreve metadata. */
      enfoquesTexto: string;
    };

/**
 * Derives the PerequeMode from current session state.
 * Pure function — called during render, result never stored in state.
 *
 * Priority:
 *   1. thinkingUserSelection set + router returned "candidatos"
 *      → user chose from the selection screen
 *   2. router returned "seleccionado" (clear winner)
 *   3. Otherwise null → pereque screen is not shown
 */
function computePerequeMode(
  thinkingResult: ThinkingResult | null,
  thinkingUserSelection: ThinkingUserSelection | null,
  candidateExplanations: Map<string, ExplicacionSeleccion>
): PerequeMode | null {
  // Path 1 — user made a selection from candidates
  if (thinkingUserSelection && thinkingResult?.decision === "candidatos") {
    if (thinkingUserSelection.mode === "single") {
      const candidate = findCandidate(
        thinkingResult.candidatos,
        thinkingUserSelection.primaryPatternId
      );
      if (!candidate) return null;
      return {
        mode: "single",
        pattern: candidate.pattern,
        explicacion:
          candidateExplanations.get(candidate.pattern.metadata.id) ?? null,
      };
    } else {
      const primary = findCandidate(
        thinkingResult.candidatos,
        thinkingUserSelection.primaryPatternId
      );
      const secondary = findCandidate(
        thinkingResult.candidatos,
        thinkingUserSelection.secondaryPatternId
      );
      if (!primary || !secondary) return null;
      const { principal, complementario } = getPreguntasCombinadas(
        primary.pattern,
        secondary.pattern
      );
      return {
        mode: "combined",
        primaryPattern: primary.pattern,
        primaryExplicacion:
          candidateExplanations.get(primary.pattern.metadata.id) ?? null,
        secondaryPattern: secondary.pattern,
        secondaryExplicacion:
          candidateExplanations.get(secondary.pattern.metadata.id) ?? null,
        preguntasPrincipal: principal,
        preguntasComplementario: complementario,
        explicacionCombinada: buildExplicacionCombinada(
          primary.pattern,
          secondary.pattern
        ),
        enfoquesTexto: buildEnfoquesTexto(primary.pattern, secondary.pattern),
      };
    }
  }
  // Path 2 — clear winner from Router
  if (thinkingResult?.decision === "seleccionado") {
    return {
      mode: "single",
      pattern: thinkingResult.seleccionado.pattern,
      explicacion: thinkingResult.explicacionSeleccion,
    };
  }
  return null;
}

// ─── Shared accordion item ────────────────────────────────────────────────────

function PreguntaItem({
  pregunta,
  problema,
  abierta,
  onToggle,
  keyPrefix = "",
  answer,
  onAnswerChange,
}: {
  pregunta: ThinkingQuestion;
  problema: string;
  abierta: string | null;
  onToggle: (key: string) => void;
  keyPrefix?: string;
  /** Current answer text — empty string when unanswered */
  answer?: string;
  /** Called when the user types in the reflection textarea (S-015) */
  onAnswerChange?: (value: string) => void;
}) {
  const key = `${keyPrefix}${pregunta.numero}`;
  const isOpen = abierta === key;
  const estiloCategoria =
    categoriaStyle[pregunta.categoria] ??
    "bg-muted/30 text-muted-foreground ring-border";
  const answerId = `reflection-${key}`;

  return (
    <motion.div variants={fadeUp} role="listitem">
      {/* ── Toggle button (header only) ── accessible interactive element */}
      <button
        type="button"
        onClick={() => onToggle(key)}
        aria-expanded={isOpen}
        aria-controls={isOpen ? `panel-${key}` : undefined}
        aria-label={`Pregunta ${pregunta.numero}: ${pregunta.categoria}. ${isOpen ? "Cerrar" : "Expandir"}`}
        className={`group w-full text-left rounded-2xl border bg-white px-6 py-5 hover:border-accent/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-300 ${
          isOpen ? "rounded-b-none border-b-0 border-accent/20" : "border-border"
        }`}
      >
        <div className="flex items-start gap-4">
          <span
            className="shrink-0 font-mono text-xs text-muted-foreground/30 mt-0.5 w-4 select-none"
            aria-hidden="true"
          >
            {pregunta.numero}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span
                className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full ring-1 ${estiloCategoria}`}
              >
                {pregunta.categoria}
              </span>
              <ChevronRight
                className={`shrink-0 w-4 h-4 text-muted-foreground/35 transition-transform duration-300 ${
                  isOpen ? "rotate-90" : ""
                }`}
                aria-hidden="true"
              />
            </div>
            <p className="text-base text-primary leading-[1.7]">
              {interpolarProblema(pregunta.pregunta, problema)}
            </p>
          </div>
        </div>
      </button>

      {/* ── Expanded panel — outside the button (textarea is invalid inside button) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={`panel-${key}`}
            role="region"
            aria-label={`Detalle de pregunta ${pregunta.numero}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-b-2xl border border-t-0 border-accent/20 bg-white px-6 pb-5">
              <div className="pt-5 space-y-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/45 mb-1.5">
                    Propósito
                  </p>
                  <p className="text-sm text-foreground/65 leading-[1.8]">
                    {pregunta.proposito}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/45 mb-1.5">
                    Orientación
                  </p>
                  <p className="text-sm text-foreground/65 leading-[1.8]">
                    {pregunta.orientacion}
                  </p>
                </div>

                {/* ── S-015: Reflection answer field ──────────────────── */}
                {onAnswerChange !== undefined && (
                  <div className="border-t border-border pt-4">
                    <label
                      htmlFor={answerId}
                      className="block text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/45 mb-2"
                    >
                      Tu reflexión <span className="font-normal normal-case">(opcional)</span>
                    </label>
                    <textarea
                      id={answerId}
                      value={answer ?? ""}
                      onChange={(e) => onAnswerChange(e.target.value)}
                      placeholder="¿Qué observas sobre este aspecto del problema?"
                      rows={3}
                      className="w-full rounded-xl border border-border bg-muted/10 px-4 py-3 text-sm text-primary leading-[1.75] placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 resize-none transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── PantallaPereque ──────────────────────────────────────────────────────────

function PantallaPereque({
  problema,
  perequeMode,
  reflectionAnswers,
  onAnswerChange,
  onConstruirHipotesis,
  onContinuar,
  onVolver,
}: {
  problema: string;
  perequeMode: PerequeMode;
  /** S-015: Answers captured so far in this session. */
  reflectionAnswers: ReflectionAnswer[];
  /** S-015: Called when the user types in a reflection textarea. */
  onAnswerChange: (
    questionKey: string,
    questionText: string,
    answerText: string,
    patternId: string,
    patternTitulo: string,
    categoria: string
  ) => void;
  /** S-015: Primary CTA — navigate to hypothesis-builder. */
  onConstruirHipotesis: () => void;
  /** Legacy CTA — navigate directly to hipotesis (old flow). */
  onContinuar: () => void;
  onVolver: () => void;
}) {
  // Accordion state: string key = "${prefix}${numero}" to avoid collisions
  // between primary and secondary blocks in combined mode.
  const [abierta, setAbierta] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const toggle = (key: string) =>
    setAbierta((prev) => (prev === key ? null : key));

  const isCombined = perequeMode.mode === "combined";
  const hasAnswers = reflectionAnswers.some((r) => r.answerText.trim() !== "");

  return (
    <motion.div
      key="pereque"
      variants={screenEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-[calc(100vh-4rem)]"
    >
      <div className="max-w-2xl mx-auto px-6 py-20 w-full">

        {/* ── Contexto del problema ─────────────────────────────────── */}
        <motion.div variants={fadeUp} className="mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/60">
            <span className="text-accent" aria-hidden="true">◆</span>
            Analizando
          </span>
          <p className="mt-1.5 text-lg font-serif italic text-primary/70">
            "{problema}"
          </p>
        </motion.div>

        {/* ── Título ────────────────────────────────────────────────── */}
        <motion.h2
          ref={headingRef}
          tabIndex={-1}
          variants={fadeUp}
          className="font-serif text-4xl md:text-5xl text-primary leading-[1.15] mb-4 focus:outline-none"
        >
          Démosle pereque
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="text-base text-foreground/60 leading-relaxed mb-10"
        >
          Antes de construir hipótesis vale la pena cuestionar la primera
          interpretación del problema. HELIOS recomienda detenernos unos
          segundos para ampliar la comprensión.
        </motion.p>

        {/* ── Modo SINGLE: badge del patrón ────────────────────────── */}
        {perequeMode.mode === "single" && (
          <>
            <motion.div
              variants={fadeUp}
              className="mb-10 flex flex-col gap-1.5 px-5 py-4 rounded-xl border border-border bg-white w-fit max-w-full"
            >
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/50">
                Patrón recomendado
              </span>
              <span className="font-serif text-base text-primary">
                {perequeMode.pattern.metadata.titulo}
              </span>
              <span className="text-sm text-foreground/55 leading-snug">
                {perequeMode.pattern.metadata.descripcion}
              </span>
            </motion.div>

            {/* ── ¿Por qué este patrón? ────────────────────────────── */}
            {perequeMode.explicacion && (
              <motion.div
                variants={fadeUp}
                className="mb-10 rounded-xl border border-border bg-amber-50/40 px-5 py-4"
              >
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/50 mb-2">
                  ¿Por qué este patrón?
                </p>
                <p className="text-sm text-foreground/68 leading-[1.85]">
                  {perequeMode.explicacion.resumen}
                </p>
                {perequeMode.explicacion.dimensionesDetectadas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {perequeMode.explicacion.dimensionesDetectadas.map((d) => (
                      <span
                        key={d}
                        className="text-[10px] px-2.5 py-0.5 rounded-full bg-accent/10 text-accent/80 ring-1 ring-accent/20 font-medium tracking-wide"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Preguntas — modo single ──────────────────────────── */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="space-y-3"
              role="list"
              aria-label="Preguntas de reflexión"
            >
              {perequeMode.pattern.preguntas.map((p) => (
                <PreguntaItem
                  key={p.numero}
                  pregunta={p}
                  problema={problema}
                  abierta={abierta}
                  onToggle={toggle}
                  keyPrefix="single:"
                  answer={
                    reflectionAnswers.find(
                      (r) => r.questionKey === `single:${p.numero}`
                    )?.answerText
                  }
                  onAnswerChange={(value) =>
                    onAnswerChange(
                      `single:${p.numero}`,
                      interpolarProblema(p.pregunta, problema),
                      value,
                      perequeMode.pattern.metadata.id,
                      perequeMode.pattern.metadata.titulo,
                      p.categoria
                    )
                  }
                />
              ))}
            </motion.div>
          </>
        )}

        {/* ── Modo COMBINED ─────────────────────────────────────────── */}
        {perequeMode.mode === "combined" && (
          <>
            {/* Badges de ambos patrones */}
            <motion.div
              variants={fadeUp}
              className="mb-8 flex flex-wrap gap-3"
            >
              <div className="flex flex-col gap-1 px-4 py-3 rounded-xl border border-accent/30 bg-white">
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-accent/60">
                  1 · Enfoque principal
                </span>
                <span className="font-serif text-sm text-primary">
                  {perequeMode.primaryPattern.metadata.titulo}
                </span>
              </div>
              <div className="flex flex-col gap-1 px-4 py-3 rounded-xl border border-border bg-white">
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/50">
                  2 · Enfoque complementario
                </span>
                <span className="font-serif text-sm text-primary">
                  {perequeMode.secondaryPattern.metadata.titulo}
                </span>
              </div>
            </motion.div>

            {/* Explicación de la combinación */}
            <motion.div
              variants={fadeUp}
              className="mb-10 rounded-xl border border-border bg-amber-50/40 px-5 py-4"
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/50 mb-2">
                Cómo se abordará el problema
              </p>
              <p className="text-sm text-foreground/68 leading-[1.85] mb-1.5">
                {perequeMode.explicacionCombinada}
              </p>
              {perequeMode.enfoquesTexto && (
                <p className="text-sm text-foreground/55 leading-[1.85] italic">
                  {perequeMode.enfoquesTexto}
                </p>
              )}
            </motion.div>

            {/* Bloque 1: Enfoque principal */}
            <motion.div variants={fadeUp} className="mb-8">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-accent text-white">
                  1
                </span>
                <h3 className="font-serif text-lg text-primary">
                  {perequeMode.primaryPattern.metadata.titulo}
                </h3>
              </div>
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="space-y-3"
                role="list"
                aria-label={`Preguntas de ${perequeMode.primaryPattern.metadata.titulo}`}
              >
                {perequeMode.preguntasPrincipal.map((p) => (
                  <PreguntaItem
                    key={p.numero}
                    pregunta={p}
                    problema={problema}
                    abierta={abierta}
                    onToggle={toggle}
                    keyPrefix="primary:"
                    answer={
                      reflectionAnswers.find(
                        (r) => r.questionKey === `primary:${p.numero}`
                      )?.answerText
                    }
                    onAnswerChange={(value) =>
                      onAnswerChange(
                        `primary:${p.numero}`,
                        interpolarProblema(p.pregunta, problema),
                        value,
                        perequeMode.primaryPattern.metadata.id,
                        perequeMode.primaryPattern.metadata.titulo,
                        p.categoria
                      )
                    }
                  />
                ))}
              </motion.div>
            </motion.div>

            {/* Separator */}
            <motion.div
              variants={fadeUp}
              className="border-t border-border mb-8"
            />

            {/* Bloque 2: Enfoque complementario */}
            <motion.div variants={fadeUp} className="mb-4">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/70 text-white">
                  2
                </span>
                <h3 className="font-serif text-lg text-primary">
                  {perequeMode.secondaryPattern.metadata.titulo}
                </h3>
              </div>
              {perequeMode.preguntasComplementario.length > 0 ? (
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                  role="list"
                  aria-label={`Preguntas de ${perequeMode.secondaryPattern.metadata.titulo}`}
                >
                  {perequeMode.preguntasComplementario.map((p) => (
                    <PreguntaItem
                      key={p.numero}
                      pregunta={p}
                      problema={problema}
                      abierta={abierta}
                      onToggle={toggle}
                      keyPrefix="secondary:"
                      answer={
                        reflectionAnswers.find(
                          (r) => r.questionKey === `secondary:${p.numero}`
                        )?.answerText
                      }
                      onAnswerChange={(value) =>
                        onAnswerChange(
                          `secondary:${p.numero}`,
                          interpolarProblema(p.pregunta, problema),
                          value,
                          perequeMode.secondaryPattern.metadata.id,
                          perequeMode.secondaryPattern.metadata.titulo,
                          p.categoria
                        )
                      }
                    />
                  ))}
                </motion.div>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">
                  Las preguntas del enfoque complementario se solapan con las del principal y fueron omitidas.
                </p>
              )}
            </motion.div>
          </>
        )}

        {/* ── Botones ───────────────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          className={`${isCombined ? "mt-10" : "mt-12"} space-y-4`}
        >
          {/* Non-blocking amber advisory when no answers typed yet */}
          {!hasAnswers && (
            <div
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-5 py-4"
              role="status"
              aria-live="polite"
            >
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-sm text-amber-700/85 leading-relaxed">
                Puedes continuar sin reflexiones escritas, pero aportar algunas notas enriquece las hipótesis que construirás a continuación.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-5">
            {/* S-015: Primary CTA → Hypothesis Builder */}
            <button
              onClick={onConstruirHipotesis}
              className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-white text-sm font-medium tracking-wide hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all duration-200"
            >
              <FlaskConical className="w-4 h-4" aria-hidden="true" />
              Construir hipótesis
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" aria-hidden="true" />
            </button>
            {/* Legacy secondary CTA → old hipotesis flow */}
            <button
              onClick={onContinuar}
              className="group flex items-center gap-1.5 text-sm text-muted-foreground/60 hover:text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
            >
              Continuar con las hipótesis
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              onClick={onVolver}
              className="text-sm text-muted-foreground/50 hover:text-primary underline-offset-4 hover:underline transition-colors duration-200"
            >
              Volver
            </button>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}

// ─── Pantalla 2: Hipótesis ──────────────────────────────────────────────────
function PantallaHipotesis({
  problema,
  pack,
  onSeleccionar,
}: {
  problema: string;
  pack: KnowledgePack;
  onSeleccionar: (h: Hipotesis) => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <motion.div
      key="hipotesis"
      variants={screenEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-[calc(100vh-4rem)]"
    >
      <div className="max-w-2xl mx-auto px-6 py-20 w-full">
        <motion.div variants={fadeUp} className="mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/60">
            <span className="text-accent" aria-hidden="true">◆</span>
            Analizando
          </span>
          <p className="mt-1.5 text-lg font-serif italic text-primary/70">
            "{problema}"
          </p>
        </motion.div>

        <motion.h2
          ref={headingRef}
          tabIndex={-1}
          variants={fadeUp}
          className="font-serif text-3xl md:text-4xl text-primary leading-[1.2] mb-8 focus:outline-none"
        >
          Antes de proponer soluciones, comprendamos el problema.
        </motion.h2>

        <motion.div variants={fadeUp} className="mb-12">
          <p className="text-base text-foreground/70 leading-[1.85]">
            {pack.contexto.texto}
          </p>
        </motion.div>

        <motion.div variants={fadeUp} className="border-t border-border mb-10" />

        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.p
            variants={fadeUp}
            className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-8"
          >
            Hipótesis de trabajo
          </motion.p>

          <div className="space-y-5" role="list">
            {pack.hipotesis.map((h) => (
              <motion.div key={h.numero} variants={fadeUp} role="listitem">
                <button
                  type="button"
                  onClick={() => onSeleccionar(h)}
                  className="group w-full text-left rounded-2xl border border-border bg-white p-7 hover:border-accent/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-300"
                  aria-label={`Explorar hipótesis: ${h.titulo}`}
                >
                  <div className="flex items-start gap-5">
                    <span
                      className="shrink-0 font-mono text-xs text-muted-foreground/30 mt-1 w-5"
                      aria-hidden="true"
                    >
                      {h.numero}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-serif text-lg text-primary leading-snug">
                          {h.titulo}
                        </h3>
                        <span
                          className={`shrink-0 mt-0.5 text-[10px] font-semibold font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full ring-1 ${confianzaStyle[h.confianza]}`}
                        >
                          {h.confianza}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/65 leading-[1.75] mb-3">
                        {h.texto}
                      </p>
                      <p className="text-xs text-muted-foreground/45 italic mb-4">
                        Basada en evidencia y literatura internacional.
                      </p>
                      <div
                        className="flex items-center gap-1.5 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 translate-x-0 group-hover:translate-x-0.5 transition-all duration-200"
                        aria-hidden="true"
                      >
                        Explorar esta hipótesis
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Pantalla 3: PESTEL ─────────────────────────────────────────────────────
function PantallaPestel({
  pack,
  hipotesisSeleccionada,
  onContinuar,
}: {
  pack: KnowledgePack;
  hipotesisSeleccionada: Hipotesis;
  onContinuar: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <motion.div
      key="pestel"
      variants={screenEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-[calc(100vh-4rem)]"
    >
      <div className="max-w-2xl mx-auto px-6 py-20 w-full">
        <motion.div variants={fadeUp} className="mb-10">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/50">
            Hipótesis seleccionada
          </span>
          <p className="mt-1.5 font-serif text-lg italic text-primary/70 leading-snug">
            {hipotesisSeleccionada.titulo}
          </p>
        </motion.div>

        <motion.h2
          ref={headingRef}
          tabIndex={-1}
          variants={fadeUp}
          className="font-serif text-4xl md:text-5xl text-primary leading-[1.15] mb-5 focus:outline-none"
        >
          Construyamos el panorama
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="text-base text-foreground/60 leading-relaxed mb-12"
        >
          No todos los problemas públicos deben analizarse de la misma manera.
          En este caso comenzaremos utilizando {pack.metadata.herramienta} para
          ampliar la mirada antes de profundizar.
        </motion.p>

        <motion.div variants={fadeUp} className="border-t border-border mb-10" />

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {pack.pestel.map((item) => (
            <motion.div
              key={item.letra + item.dimension}
              variants={fadeUp}
              className="rounded-2xl border border-border bg-white p-7 hover:border-accent/25 hover:shadow-sm transition-all duration-300"
            >
              <div className="flex items-start gap-5">
                <div
                  className="shrink-0 w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <span className="font-mono text-sm font-semibold text-primary/50">
                    {item.letra}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-base font-medium text-primary mb-2">
                    {item.dimension}
                  </h3>
                  <p className="text-sm text-foreground/65 leading-[1.75] mb-4">
                    {item.explicacion}
                  </p>
                  <div className="pl-4 border-l-2 border-accent/30">
                    <p className="text-sm italic text-primary/65 leading-relaxed">
                      {item.pregunta}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={fadeUp} className="mt-14 flex justify-end">
          <button
            onClick={onContinuar}
            className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-white text-sm font-medium tracking-wide hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all duration-200"
          >
            Continuar
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Pantalla 4: Descubrimiento ─────────────────────────────────────────────
function PantallaDescubrimiento({
  problema,
  pack,
  hipotesisSeleccionada,
  onReiniciar,
  onOtraHipotesis,
}: {
  problema: string;
  pack: KnowledgePack;
  hipotesisSeleccionada: Hipotesis;
  onReiniciar: () => void;
  onOtraHipotesis: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const pasos = [
    { label: "Problema analizado", valor: problema },
    { label: "Hipótesis seleccionada", valor: hipotesisSeleccionada.titulo },
    { label: "Herramienta utilizada", valor: `Análisis ${pack.metadata.herramienta}` },
    {
      label: "Próximo paso recomendado",
      valor: hipotesisSeleccionada.nextStep,
    },
  ];

  return (
    <motion.div
      key="descubrimiento"
      variants={screenEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-[calc(100vh-4rem)]"
    >
      <div className="max-w-2xl mx-auto px-6 py-20 w-full">
        <motion.p
          variants={fadeUp}
          className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-8"
        >
          HELIOS · Síntesis
        </motion.p>

        <motion.h2
          ref={headingRef}
          tabIndex={-1}
          variants={fadeUp}
          className="font-serif text-4xl md:text-5xl text-primary leading-[1.15] mb-12 focus:outline-none"
        >
          Lo que descubrimos juntos
        </motion.h2>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-0"
        >
          {pasos.map((paso, i) => (
            <motion.div
              key={paso.label}
              variants={fadeUp}
              className="relative flex gap-5"
            >
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-accent mt-1.5 shrink-0" />
                {i < pasos.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1 mb-1 min-h-[2.5rem]" />
                )}
              </div>
              <div className={`pb-8 ${i === pasos.length - 1 ? "pb-0" : ""}`}>
                <p className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground/50 mb-1">
                  {paso.label}
                </p>
                <p className="text-base text-primary leading-relaxed">
                  {paso.valor}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={fadeUp} className="border-t border-border mt-12 mb-10" />

        <motion.p
          variants={fadeUp}
          className="text-base text-foreground/70 leading-[1.85] mb-12"
        >
          En pocos minutos pasaste de describir un fenómeno a construir una
          hipótesis de trabajo respaldada por un método de análisis. Ese es el
          propósito de HELIOS.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
          <button
            onClick={onReiniciar}
            className="px-6 py-3 rounded-xl bg-primary text-white text-sm font-medium tracking-wide hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all duration-200"
          >
            Analizar otro problema
          </button>
          <button
            onClick={onOtraHipotesis}
            className="px-6 py-3 rounded-xl border border-border bg-white text-sm font-medium text-primary hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
          >
            Explorar otra hipótesis
          </button>
          <a
            href="#helios-info"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
            }}
            className="px-6 py-3 rounded-xl border border-border bg-white text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
          >
            Conocer HELIOS
          </a>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-16 pt-10 border-t border-border"
        >
          <blockquote id="helios-info" className="text-center">
            <p className="font-serif text-xl italic text-primary/60 leading-relaxed">
              "Las respuestas cambian. Las buenas preguntas permanecen."
            </p>
          </blockquote>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────
type Pantalla =
  | "entrada"
  | "enrutando"
  | "confirmacion-candidatos"
  | "sin-pack"
  | "seleccion-thinking-pattern" // S-014: user chooses from multiple candidates
  | "pereque"                    // Thinking Engine — reflexión antes de hipótesis
  | "hypothesis-builder"         // S-015: structured hypothesis formulation
  | "revision-hipotesis"         // S-015: final session review before confirming
  | "conceptual-model"           // S-017: operacionalización de hipótesis
  | "operationalization-matrix"  // S-018: matriz de operacionalización
  | "contrastation-matrix"       // S-019: matriz de contrastación
  | "revision-final"             // S-019: cadena metodológica completa
  | "knowledge-graph"            // S-020: knowledge graph navegable
  | "auditoria"                  // S-021: auditoría de consistencia metodológica
  | "evidence-evaluation"        // S-022: registro y evaluación de evidencia observada
  | "hypothesis-conclusion"      // S-022: conclusión metodológica de la hipótesis
  | "report-builder"             // S-023: generador de informes trazables
  | "project-versions"          // S-024: gestión de snapshots y versiones
  | "version-comparison"        // S-024: comparación de dos snapshots
  | "project-import"            // S-024: importar paquete .helios.json
  | "hipotesis"
  | "pestel"
  | "descubrimiento";

// Register S-024 schema migration once at module load (synchronous, idempotent)
registerMigration(migration_0_9_0_to_1_0_0);

export default function Helios() {
  const [pantalla, setPantalla] = useState<Pantalla>("entrada");
  const [problema, setProblema] = useState("");
  const [packActivo, setPackActivo] = useState<KnowledgePack | null>(null);
  const [routerResult, setRouterResult] = useState<RouterResult | null>(null);
  const [hipotesisActiva, setHipotesisActiva] = useState<Hipotesis | null>(null);
  /**
   * Full ThinkingResult preserved in state — includes score, confianza,
   * motivo and esFallback flag for future transparency UI.
   * null before the Thinking Router has run for the current session.
   */
  const [thinkingResult, setThinkingResult] = useState<ThinkingResult | null>(null);

  /**
   * S-014: The user's ThinkingPattern selection after the Router identified
   * multiple candidates. null when the Router returned a clear winner or before
   * the selection screen has been shown. Session-only (not persisted).
   */
  const [thinkingUserSelection, setThinkingUserSelection] =
    useState<ThinkingUserSelection | null>(null);

  /**
   * S-014: Pre-built explanations for each candidate, keyed by patternId.
   * Computed once when the Router returns "candidatos" and stored here so
   * PantallaSeleccionThinkingPattern receives them without re-running any logic.
   */
  const [candidateExplanations, setCandidateExplanations] =
    useState<Map<string, ExplicacionSeleccion>>(new Map());

  /**
   * Tracks which screen the user was on immediately before "pereque" so that
   * "Volver" can return there without resetting the session.
   * - "entrada"                      → reached pereque via automatic routing (seleccionado)
   * - "confirmacion-candidatos"      → reached pereque after manual pack selection
   * - "seleccion-thinking-pattern"   → reached pereque after selecting from candidates
   */
  const [pantallaVolverDesdePereque, setPantallaVolverDesdePereque] =
    useState<Pantalla>("entrada");

  /**
   * S-014: Tracks which screen preceded "seleccion-thinking-pattern" so that
   * "Volver" from selection goes back correctly.
   * - "entrada"                 → arrived via automatic pack routing
   * - "confirmacion-candidatos" → arrived via manual pack selection
   */
  const [pantallaVolverDesdeSeleccion, setPantallaVolverDesdeSeleccion] =
    useState<Pantalla>("entrada");

  /**
   * S-015: Reflection answers captured from the pereque accordion.
   * Keyed by "${prefix}:${numero}" (e.g. "single:3", "primary:1").
   * Session-only — not persisted to DB or localStorage.
   */
  const [reflectionAnswers, setReflectionAnswers] = useState<ReflectionAnswer[]>([]);

  /**
   * S-015: Hypotheses formulated by the analyst. Session-only.
   */
  const [hypotheses, setHypotheses] = useState<PolicyHypothesis[]>([]);
  const [primaryHypothesisId, setPrimaryHypothesisId] = useState<string | undefined>(undefined);
  const [hypothesesReviewed, setHypothesesReviewed] = useState(false);
  /** S-017: conceptual models — one per hypothesis, session-only */
  const [conceptualModels, setConceptualModels] = useState<ConceptualModel[]>([]);
  // S-018: Operationalization matrices (session-only)
  const [operationalizationMatrices, setOperationalizationMatrices] = useState<
    OperationalizationMatrix[]
  >([]);
  // S-019: Contrastation matrices (session-only)
  const [contrastationMatrices, setContrastationMatrices] = useState<
    ContrastationMatrix[]
  >([]);
  // S-022: Evidence evaluation matrices and hypothesis conclusions (session-only)
  const [evidenceEvaluationMatrices, setEvidenceEvaluationMatrices] = useState<
    EvidenceEvaluationMatrix[]
  >([]);
  const [hypothesisEvidenceConclusions, setHypothesisEvidenceConclusions] = useState<
    HypEvidConclusion[]
  >([]);
  // S-023: Report definitions (session-only)
  const [reportDefinitions, setReportDefinitions] = useState<ReportDefinition[]>([]);
  // S-024: Project versioning state
  const [projectSnapshots, setProjectSnapshots] = useState<ProjectSnapshot[]>([]);
  const [projectVersions, setProjectVersions] = useState<ProjectVersion[]>([]);
  const [compareBaseId, setCompareBaseId] = useState<string | null>(null);
  const [compareTargetId, setCompareTargetId] = useState<string | null>(null);

  const handleSubmitProblema = async (p: string) => {
    setProblema(p);
    setPantalla("enrutando");

    try {
      // Step 1: Knowledge Router determines the disciplinary context.
      const knowledgeResult = await heliosRouter.route({ texto: p });
      setRouterResult(knowledgeResult);

      if (knowledgeResult.decision === "seleccionado") {
        const pack = knowledgeResult.seleccionado.pack;
        setPackActivo(pack);

        // Step 2: Thinking Router runs after the pack is known — enriched with
        // pack context so scoring surface includes domain-specific vocabulary.
        const tr = await heliosThinkingEngine.route({
          texto: p,
          packId: pack.metadata.id,
          packNombre: pack.metadata.tema,
          packContextoResumido: extractContextSummary(pack.contexto.texto),
        });
        setThinkingResult(tr);
        setPantallaVolverDesdePereque("entrada");

        // ADR-0004: reasoning precedes methodology
        if (tr.decision === "seleccionado") {
          setThinkingUserSelection(null);
          setPantalla("pereque");
        } else if (tr.decision === "candidatos") {
          // S-014: multiple candidates — go to selection screen.
          // Build explanations eagerly while router input is available.
          const routerInput: ThinkingRouterInput = {
            texto: p,
            packId: pack.metadata.id,
            packNombre: pack.metadata.tema,
            packContextoResumido: extractContextSummary(pack.contexto.texto),
          };
          const realCandidates = getRealCandidates(tr.candidatos);
          setCandidateExplanations(
            buildCandidateExplanations(realCandidates, routerInput)
          );
          setThinkingUserSelection(null);
          setPantallaVolverDesdeSeleccion("entrada");
          setPantalla("seleccion-thinking-pattern");
        } else {
          setPantalla("hipotesis");
        }
      } else if (knowledgeResult.decision === "candidatos") {
        // ThinkingRouter deferred until user selects a pack — see handleSeleccionarPack
        setPantalla("confirmacion-candidatos");
      } else {
        setPantalla("sin-pack");
      }
    } catch {
      setPantalla("entrada");
    }
  };

  const handleSeleccionarPack = async (pack: KnowledgePack) => {
    setPackActivo(pack);

    // ThinkingRouter runs here — now we know the definitively chosen pack.
    const tr = await heliosThinkingEngine.route({
      texto: problema,
      packId: pack.metadata.id,
      packNombre: pack.metadata.tema,
      packContextoResumido: extractContextSummary(pack.contexto.texto),
    });
    setThinkingResult(tr);
    setPantallaVolverDesdePereque("confirmacion-candidatos");

    if (tr.decision === "seleccionado") {
      setThinkingUserSelection(null);
      setPantalla("pereque");
    } else if (tr.decision === "candidatos") {
      // S-014: multiple candidates — go to selection screen.
      const routerInput: ThinkingRouterInput = {
        texto: problema,
        packId: pack.metadata.id,
        packNombre: pack.metadata.tema,
        packContextoResumido: extractContextSummary(pack.contexto.texto),
      };
      const realCandidates = getRealCandidates(tr.candidatos);
      setCandidateExplanations(
        buildCandidateExplanations(realCandidates, routerInput)
      );
      setThinkingUserSelection(null);
      setPantallaVolverDesdeSeleccion("confirmacion-candidatos");
      setPantalla("seleccion-thinking-pattern");
    } else {
      setPantalla("hipotesis");
    }
  };

  const handleContinuarDesdePereque = () => setPantalla("hipotesis");

  /**
   * Returns to the screen that preceded pereque, preserving the problem text.
   * - "entrada" path: textarea is pre-filled via initialValue prop.
   * - "confirmacion-candidatos" path: all pack candidates are still in state.
   * - "seleccion-thinking-pattern" path: selection screen preserves candidates
   *   and the user's previous selection (via seleccionPrevia prop).
   */
  const handleVolverDesdePereque = () => setPantalla(pantallaVolverDesdePereque);

  /**
   * S-014: Called when the user picks a pattern (or combination) from the
   * selection screen. Stores the selection, sets pantallaVolver correctly,
   * and advances to pereque.
   */
  const handleUserSelectPattern = (selection: ThinkingUserSelection) => {
    setThinkingUserSelection(selection);
    // §S-016: mark existing hypotheses as potentially misaligned when the
    // analyst changes their pattern selection after building hypotheses.
    setHypotheses((prev) =>
      prev.length > 0 ? markPatternChanged(prev) : prev
    );
    setPantallaVolverDesdePereque("seleccion-thinking-pattern");
    setPantalla("pereque");
  };

  /**
   * S-014: "Volver" from the selection screen goes back to whatever preceded it
   * (entrada or confirmacion-candidatos) without re-running the Router.
   */
  const handleVolverDesdeSeleccion = () =>
    setPantalla(pantallaVolverDesdeSeleccion);

  const handleSeleccionarHipotesis = (h: Hipotesis) => {
    setHipotesisActiva(h);
    setPantalla("pestel");
  };

  const handleContinuar = () => setPantalla("descubrimiento");

  // ── S-017: Conceptual model handlers ──────────────────────────────────────

  const handleConstruirModelo = useCallback(() => {
    setPantalla("conceptual-model");
  }, []);

  const handleUpdateConceptualModel = useCallback((model: ConceptualModel) => {
    setConceptualModels((prev) => upsertModel(prev, model));
  }, []);

  const handleConfirmarConceptualModel = useCallback((model: ConceptualModel) => {
    setConceptualModels((prev) => upsertModel(prev, model));
    // Stay on conceptual-model screen — model is now confirmed
  }, []);

  const handleVolverDesdeConceptualModel = useCallback(() => {
    setPantalla("revision-hipotesis");
  }, []);

  // ── S-018: Operationalization matrix handlers ───────────────────────────────

  const handleConstruirMatriz = useCallback(() => {
    setPantalla("operationalization-matrix");
  }, []);

  const handleUpdateOperationalizationMatrix = useCallback(
    (matrix: OperationalizationMatrix) => {
      setOperationalizationMatrices((prev) => upsertMatrix(prev, matrix));
    },
    []
  );

  const handleConfirmarOperationalizationMatrix = useCallback(
    (matrix: OperationalizationMatrix) => {
      setOperationalizationMatrices((prev) => upsertMatrix(prev, matrix));
      // Stay on matrix screen — matrix is now confirmed
    },
    []
  );

  const handleVolverDesdeMatriz = useCallback(() => {
    setPantalla("conceptual-model");
  }, []);

  // ── S-019: Contrastation matrix handlers ────────────────────────────────────

  const handleConstruirContrastation = useCallback(() => {
    setPantalla("contrastation-matrix");
  }, []);

  const handleUpdateContrastationMatrix = useCallback(
    (matrix: ContrastationMatrix) => {
      setContrastationMatrices((prev) => upsertContrastationMatrix(prev, matrix));
    },
    []
  );

  const handleConfirmarContrastationMatrix = useCallback(
    (matrix: ContrastationMatrix) => {
      setContrastationMatrices((prev) => upsertContrastationMatrix(prev, matrix));
      // Stay on contrastation screen — matrix is now confirmed
    },
    []
  );

  const handleVolverDesdeContrastation = useCallback(() => {
    setPantalla("operationalization-matrix");
  }, []);

  const handleVerCadenaMetodologica = useCallback(() => {
    setPantalla("revision-final");
  }, []);

  const handleVerKnowledgeGraph = useCallback(() => {
    setPantalla("knowledge-graph");
  }, []);

  const handleEjecutarAuditoria = useCallback(() => {
    setPantalla("auditoria");
  }, []);

  // ── S-022: Evidence evaluation handlers ──────────────────────────────────

  const handleIrAEvidenceEvaluation = useCallback(() => {
    setPantalla("evidence-evaluation");
  }, []);

  const handleUpdateEvidenceEvaluationMatrix = useCallback(
    (matrix: EvidenceEvaluationMatrix) => {
      setEvidenceEvaluationMatrices((prev) => upsertEvidenceEvaluationMatrix(prev, matrix));
    },
    []
  );

  const handleConfirmarEvidenceEvaluationMatrix = useCallback(
    (matrix: EvidenceEvaluationMatrix) => {
      setEvidenceEvaluationMatrices((prev) => upsertEvidenceEvaluationMatrix(prev, matrix));
    },
    []
  );

  const handleIrAHypothesisConclusion = useCallback(() => {
    setPantalla("hypothesis-conclusion");
  }, []);

  const handleUpdateHypothesisEvidenceConclusion = useCallback(
    (conclusion: HypEvidConclusion) => {
      setHypothesisEvidenceConclusions((prev) =>
        upsertHypothesisEvidenceConclusion(prev, conclusion)
      );
    },
    []
  );

  // ── S-023: Report Builder handlers ───────────────────────────────────────────

  const handleIrAReportBuilder = useCallback(() => {
    setPantalla("report-builder");
  }, []);

  // ── S-024: Project Versioning handlers ────────────────────────────────────────

  const handleIrAProjectVersions = useCallback(() => {
    setPantalla("project-versions");
  }, []);

  const handleUpdateSnapshots = useCallback((snaps: ProjectSnapshot[]) => {
    setProjectSnapshots(snaps);
  }, []);

  const handleUpdateVersions = useCallback((vers: ProjectVersion[]) => {
    setProjectVersions(vers);
  }, []);

  const handleCompareVersions = useCallback((baseId: string, targetId: string) => {
    setCompareBaseId(baseId);
    setCompareTargetId(targetId);
    setPantalla("version-comparison");
  }, []);

  const handleIrAProjectImport = useCallback(() => {
    setPantalla("project-import");
  }, []);

  const handleImportComplete = useCallback(
    (snaps: ProjectSnapshot[], vers: ProjectVersion[], _result: unknown) => {
      setProjectSnapshots(snaps);
      setProjectVersions(vers);
      setPantalla("project-versions");
    },
    []
  );

  const handleUpdateReportDefinition = useCallback(
    (def: ReportDefinition) => {
      setReportDefinitions((prev) => upsertReportDefinition(prev, def));
    },
    []
  );

  const handleReiniciar = () => {
    setProblema("");
    setPackActivo(null);
    setRouterResult(null);
    setHipotesisActiva(null);
    setThinkingResult(null);
    setThinkingUserSelection(null);
    setCandidateExplanations(new Map());
    setPantallaVolverDesdePereque("entrada");
    setPantallaVolverDesdeSeleccion("entrada");
    // S-015: reset hypothesis session
    setReflectionAnswers([]);
    setHypotheses([]);
    setPrimaryHypothesisId(undefined);
    setHypothesesReviewed(false);
    setConceptualModels([]);
    setOperationalizationMatrices([]);
    setContrastationMatrices([]);
    // S-022
    setEvidenceEvaluationMatrices([]);
    setHypothesisEvidenceConclusions([]);
    // S-023
    setReportDefinitions([]);
    // S-024
    setProjectSnapshots([]);
    setProjectVersions([]);
    setCompareBaseId(null);
    setCompareTargetId(null);
    setPantalla("entrada");
  };

  const handleOtraHipotesis = () => setPantalla("hipotesis");

  // ── S-015: Hypothesis Builder handlers ───────────────────────────────────

  const handleAnswerChange = useCallback(
    (
      questionKey: string,
      questionText: string,
      answerText: string,
      patternId: string,
      patternTitulo: string,
      categoria: string
    ) => {
      setReflectionAnswers((prev) => {
        const idx = prev.findIndex((r) => r.questionKey === questionKey);
        if (!answerText.trim()) {
          // Remove empty answers — keep list clean
          return idx >= 0 ? prev.filter((_, i) => i !== idx) : prev;
        }
        const entry: ReflectionAnswer = {
          questionKey,
          questionText,
          answerText,
          patternId,
          patternTitulo,
          categoria,
        };
        return idx >= 0
          ? prev.map((r, i) => (i === idx ? entry : r))
          : [...prev, entry];
      });
    },
    []
  );

  const handleConstruirHipotesis = useCallback(() => {
    setPantalla("hypothesis-builder");
  }, []);

  const handleUpdateHypotheses = useCallback(
    (updated: PolicyHypothesis[]) => {
      setHypotheses(updated);
      // §S-016 state rules:
      // 1. Any mutation of the hypothesis list invalidates the reviewed flag.
      // 2. If the referenced primary hypothesis was removed, clear the pointer.
      setHypothesesReviewed(false);
      setPrimaryHypothesisId((prev) =>
        prev !== undefined && updated.some((h) => h.id === prev)
          ? prev
          : undefined
      );
    },
    []
  );

  const handleUpdatePrimaryId = useCallback(
    (id: string | undefined) => setPrimaryHypothesisId(id),
    []
  );

  const handleContinuarDesdeBuilder = useCallback(() => {
    setPantalla("revision-hipotesis");
  }, []);

  const handleVolverDesdeBuilder = useCallback(() => {
    setPantalla("pereque");
  }, []);

  const handleConfirmarRevision = useCallback(() => {
    setHypothesesReviewed(true);
  }, []);

  const handleVolverDesdeRevision = useCallback(() => {
    setPantalla("hypothesis-builder");
  }, []);

  const handleVolverRevisionAPereque = useCallback(() => {
    setPantalla("pereque");
  }, []);

  // ── S-014: Derived values computed before render ──────────────────────────
  // computePerequeMode is a pure function — safe to call in render.
  const perequeMode = computePerequeMode(
    thinkingResult,
    thinkingUserSelection,
    candidateExplanations
  );

  // Real (non-fallback) candidates for PantallaSeleccionThinkingPattern.
  const realCandidates =
    thinkingResult?.decision === "candidatos"
      ? getRealCandidates(thinkingResult.candidatos)
      : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="helios-main">
        <AnimatePresence mode="wait">
          {pantalla === "entrada" && (
            <PantallaEntrada
              key="entrada"
              onSubmit={handleSubmitProblema}
              initialValue={problema}
            />
          )}
          {pantalla === "enrutando" && (
            <PantallaEnrutando key="enrutando" problema={problema} />
          )}
          {pantalla === "confirmacion-candidatos" &&
            routerResult?.decision === "candidatos" && (
              <PantallaConfirmacion
                key="confirmacion"
                problema={problema}
                candidatos={routerResult.candidatos}
                motivo={routerResult.motivo}
                onSeleccionar={handleSeleccionarPack}
                onReiniciar={handleReiniciar}
              />
            )}
          {pantalla === "sin-pack" && (
            <PantallaSinPack
              key="sin-pack"
              problema={problema}
              onReiniciar={handleReiniciar}
              packsActivos={heliosRouter.getActivePacks()}
            />
          )}
          {/* S-014: Selection screen — shown when Router returns candidatos */}
          {pantalla === "seleccion-thinking-pattern" &&
            thinkingResult?.decision === "candidatos" &&
            realCandidates.length > 0 && (
              <PantallaSeleccionThinkingPattern
                key="seleccion-thinking"
                problema={problema}
                candidatos={realCandidates}
                explicaciones={candidateExplanations}
                seleccionPrevia={thinkingUserSelection}
                onSeleccion={handleUserSelectPattern}
                onVolver={handleVolverDesdeSeleccion}
              />
            )}
          {/* Pereque: single winner (router) or user selection from candidates */}
          {pantalla === "pereque" && perequeMode && (
            <PantallaPereque
              key="pereque"
              problema={problema}
              perequeMode={perequeMode}
              reflectionAnswers={reflectionAnswers}
              onAnswerChange={handleAnswerChange}
              onConstruirHipotesis={handleConstruirHipotesis}
              onContinuar={handleContinuarDesdePereque}
              onVolver={handleVolverDesdePereque}
            />
          )}
          {/* S-015: Hypothesis Builder */}
          {pantalla === "hypothesis-builder" && perequeMode && (
            <PantallaHypothesisBuilder
              key="hypothesis-builder"
              problema={problema}
              perequeMode={perequeMode}
              reflectionAnswers={reflectionAnswers}
              hypotheses={hypotheses}
              primaryHypothesisId={primaryHypothesisId}
              onUpdateHypotheses={handleUpdateHypotheses}
              onUpdatePrimaryId={handleUpdatePrimaryId}
              onContinuar={handleContinuarDesdeBuilder}
              onVolver={handleVolverDesdeBuilder}
            />
          )}
          {/* S-015: Revision */}
          {pantalla === "revision-hipotesis" && perequeMode && thinkingResult && (
            <PantallaRevisionHipotesis
              key="revision-hipotesis"
              problema={problema}
              packActivo={packActivo}
              thinkingResult={thinkingResult}
              thinkingUserSelection={thinkingUserSelection}
              perequeMode={perequeMode}
              reflectionAnswers={reflectionAnswers}
              hypotheses={hypotheses}
              primaryHypothesisId={primaryHypothesisId}
              hypothesesReviewed={hypothesesReviewed}
              onEditar={handleVolverDesdeRevision}
              onConfirmar={handleConfirmarRevision}
              onConstruirModelo={handleConstruirModelo}
              onVolverPereque={handleVolverRevisionAPereque}
              onReiniciar={handleReiniciar}
            />
          )}
          {/* S-017: Conceptual Model */}
          {pantalla === "conceptual-model" && hypotheses.length > 0 && (
            <PantallaConceptualModel
              key="conceptual-model"
              problema={problema}
              hypothesis={
                (primaryHypothesisId
                  ? hypotheses.find((h) => h.id === primaryHypothesisId)
                  : undefined) ?? hypotheses[0]
              }
              model={findModelByHypothesisId(
                conceptualModels,
                (primaryHypothesisId
                  ? hypotheses.find((h) => h.id === primaryHypothesisId)?.id
                  : undefined) ?? hypotheses[0]?.id ?? ""
              )}
              onUpdateModel={handleUpdateConceptualModel}
              onConfirmar={handleConfirmarConceptualModel}
              onConstruirMatriz={handleConstruirMatriz}
              onVolver={handleVolverDesdeConceptualModel}
              onReiniciar={handleReiniciar}
            />
          )}
          {/* S-018: Operationalization Matrix */}
          {pantalla === "operationalization-matrix" && hypotheses.length > 0 && (() => {
            const activeHyp =
              (primaryHypothesisId
                ? hypotheses.find((h) => h.id === primaryHypothesisId)
                : undefined) ?? hypotheses[0];
            const activeModel = findModelByHypothesisId(
              conceptualModels,
              activeHyp?.id ?? ""
            );
            if (!activeHyp || !activeModel) return null;
            return (
              <PantallaOperationalizationMatrix
                key="operationalization-matrix"
                problema={problema}
                hypothesis={activeHyp}
                conceptualModel={activeModel}
                matrix={findMatrixByHypothesisId(
                  operationalizationMatrices,
                  activeHyp.id
                )}
                onUpdateMatrix={handleUpdateOperationalizationMatrix}
                onConfirmar={handleConfirmarOperationalizationMatrix}
                onConstruirContrastation={handleConstruirContrastation}
                onVolver={handleVolverDesdeMatriz}
                onReiniciar={handleReiniciar}
              />
            );
          })()}
          {/* S-019: Contrastation Matrix */}
          {pantalla === "contrastation-matrix" && hypotheses.length > 0 && (() => {
            const activeHyp =
              (primaryHypothesisId
                ? hypotheses.find((h) => h.id === primaryHypothesisId)
                : undefined) ?? hypotheses[0];
            const activeModel = findModelByHypothesisId(
              conceptualModels,
              activeHyp?.id ?? ""
            );
            if (!activeHyp || !activeModel) return null;
            return (
              <PantallaContrastationMatrix
                key="contrastation-matrix"
                problema={problema}
                hypothesis={activeHyp}
                conceptualModel={activeModel}
                matrix={findContrastationMatrixByHypothesisId(
                  contrastationMatrices,
                  activeHyp.id
                )}
                onUpdateMatrix={handleUpdateContrastationMatrix}
                onConfirmar={handleConfirmarContrastationMatrix}
                onVerCadena={handleVerCadenaMetodologica}
                onIrAEvidenceEvaluation={handleIrAEvidenceEvaluation}
                onVolver={handleVolverDesdeContrastation}
                onReiniciar={handleReiniciar}
              />
            );
          })()}
          {/* S-020: Knowledge Graph navegable */}
          {pantalla === "knowledge-graph" && (
            <PantallaKnowledgeGraph
              key="knowledge-graph"
              problema={problema}
              hypotheses={hypotheses}
              conceptualModels={conceptualModels}
              operationalizationMatrices={operationalizationMatrices}
              contrastationMatrices={contrastationMatrices}
              onVolver={() => setPantalla("revision-final")}
              onReiniciar={handleReiniciar}
              onEjecutarAuditoria={handleEjecutarAuditoria}
            />
          )}
          {/* S-021: Auditoría de Consistencia Metodológica */}
          {pantalla === "auditoria" && hypotheses.length > 0 && (
            <PantallaAuditoriaMetodologica
              key="auditoria"
              problema={problema}
              hypotheses={hypotheses}
              conceptualModels={conceptualModels}
              operationalizationMatrices={operationalizationMatrices}
              contrastationMatrices={contrastationMatrices}
              evidenceEvaluationMatrices={evidenceEvaluationMatrices}
              hypothesisEvidenceConclusions={hypothesisEvidenceConclusions}
              onVolver={() => setPantalla("revision-final")}
              onReiniciar={handleReiniciar}
              onIrAHipotesis={() => setPantalla("revision-hipotesis")}
              onIrAModelo={() => setPantalla("conceptual-model")}
              onIrAOperacionalizacion={() => setPantalla("operationalization-matrix")}
              onIrAContrastation={() => setPantalla("contrastation-matrix")}
              onVerKnowledgeGraph={handleVerKnowledgeGraph}
              onIrAReportBuilder={handleIrAReportBuilder}
              onIrAProjectVersions={handleIrAProjectVersions}
            />
          )}
          {/* S-022: Evaluación de Evidencia */}
          {pantalla === "evidence-evaluation" && hypotheses.length > 0 && (() => {
            const activeHyp =
              (primaryHypothesisId
                ? hypotheses.find((h) => h.id === primaryHypothesisId)
                : undefined) ?? hypotheses[0];
            const activeModel = activeHyp
              ? findModelByHypothesisId(conceptualModels, activeHyp.id)
              : null;
            const activeCtMatrix = activeHyp
              ? findContrastationMatrixByHypothesisId(contrastationMatrices, activeHyp.id)
              : null;
            if (!activeHyp || !activeModel || !activeCtMatrix) return null;
            return (
              <PantallaEvidenceEvaluation
                key="evidence-evaluation"
                hypothesis={activeHyp}
                conceptualModel={activeModel}
                contrastationMatrix={activeCtMatrix}
                evidenceMatrix={findEvidenceEvaluationMatrixByHypothesis(
                  evidenceEvaluationMatrices,
                  activeHyp.id
                )}
                onUpdateMatrix={handleUpdateEvidenceEvaluationMatrix}
                onConfirmar={handleConfirmarEvidenceEvaluationMatrix}
                onIrAConclusion={handleIrAHypothesisConclusion}
                onVolver={() => setPantalla("contrastation-matrix")}
                onReiniciar={handleReiniciar}
              />
            );
          })()}
          {/* S-022: Conclusión de Hipótesis */}
          {pantalla === "hypothesis-conclusion" && hypotheses.length > 0 && (() => {
            const activeHyp =
              (primaryHypothesisId
                ? hypotheses.find((h) => h.id === primaryHypothesisId)
                : undefined) ?? hypotheses[0];
            const activeCtMatrix = activeHyp
              ? findContrastationMatrixByHypothesisId(contrastationMatrices, activeHyp.id)
              : null;
            const activeEEM = activeHyp
              ? findEvidenceEvaluationMatrixByHypothesis(evidenceEvaluationMatrices, activeHyp.id)
              : null;
            if (!activeHyp || !activeCtMatrix || !activeEEM) return null;
            return (
              <PantallaHypothesisEvidenceConclusion
                key="hypothesis-conclusion"
                hypothesis={activeHyp}
                contrastationMatrix={activeCtMatrix}
                evidenceMatrix={activeEEM}
                conclusion={findHypothesisEvidenceConclusion(
                  hypothesisEvidenceConclusions,
                  activeHyp.id
                )}
                onUpdateConclusion={handleUpdateHypothesisEvidenceConclusion}
                onVolver={() => setPantalla("evidence-evaluation")}
                onIrARevisionFinal={() => setPantalla("revision-final")}
                onReiniciar={handleReiniciar}
              />
            );
          })()}
          {/* S-019: Revisión Final — cadena metodológica completa */}
          {pantalla === "revision-final" && hypotheses.length > 0 && (() => {
            const activeHyp =
              (primaryHypothesisId
                ? hypotheses.find((h) => h.id === primaryHypothesisId)
                : undefined) ?? hypotheses[0];
            const activeModel = findModelByHypothesisId(
              conceptualModels,
              activeHyp?.id ?? ""
            );
            const activeOpMatrix = activeHyp
              ? findMatrixByHypothesisId(operationalizationMatrices, activeHyp.id)
              : null;
            const activeCtMatrix = activeHyp
              ? findContrastationMatrixByHypothesisId(contrastationMatrices, activeHyp.id)
              : null;
            const patternTitulo =
              perequeMode?.mode === "single"
                ? perequeMode.pattern.metadata.titulo
                : perequeMode?.mode === "combined"
                ? `${perequeMode.primaryPattern.metadata.titulo} + ${perequeMode.secondaryPattern.metadata.titulo}`
                : null;
            if (!activeHyp) return null;
            return (
              <PantallaRevisionFinal
                key="revision-final"
                problema={problema}
                patternTitulo={patternTitulo}
                hypothesis={activeHyp}
                conceptualModel={activeModel}
                operationalizationMatrix={activeOpMatrix}
                contrastationMatrix={activeCtMatrix}
                onIrAProblema={() => setPantalla("entrada")}
                onIrAHipotesis={() => setPantalla("revision-hipotesis")}
                onIrAModelo={() => setPantalla("conceptual-model")}
                onIrAOperacionalizacion={() => setPantalla("operationalization-matrix")}
                onIrAContrastation={() => setPantalla("contrastation-matrix")}
                onIrAEvidenceEvaluation={handleIrAEvidenceEvaluation}
                onIrAReportBuilder={handleIrAReportBuilder}
                onIrAProjectVersions={handleIrAProjectVersions}
                onVerKnowledgeGraph={handleVerKnowledgeGraph}
                onEjecutarAuditoria={handleEjecutarAuditoria}
                onReiniciar={handleReiniciar}
              />
            );
          })()}
          {/* S-023: Report Builder */}
          {pantalla === "report-builder" && hypotheses.length > 0 && (() => {
            const activeHyp =
              (primaryHypothesisId
                ? hypotheses.find((h) => h.id === primaryHypothesisId)
                : undefined) ?? hypotheses[0];
            if (!activeHyp) return null;
            const activeModel = findModelByHypothesisId(conceptualModels, activeHyp.id);
            const activeOpMatrix = findMatrixByHypothesisId(operationalizationMatrices, activeHyp.id);
            const activeCtMatrix = findContrastationMatrixByHypothesisId(contrastationMatrices, activeHyp.id);
            const activeEEM = findEvidenceEvaluationMatrixByHypothesis(evidenceEvaluationMatrices, activeHyp.id);
            const activeConclusion = findHypothesisEvidenceConclusion(hypothesisEvidenceConclusions, activeHyp.id);
            const activeReport = findReportDefinitionByHypothesis(reportDefinitions, activeHyp.id);
            const patternTitulo =
              perequeMode?.mode === "single"
                ? perequeMode.pattern.metadata.titulo
                : perequeMode?.mode === "combined"
                ? `${perequeMode.primaryPattern.metadata.titulo} + ${perequeMode.secondaryPattern.metadata.titulo}`
                : null;
            return (
              <PantallaReportBuilder
                key="report-builder"
                problema={problema}
                perequePatternTitulo={patternTitulo}
                hypothesis={activeHyp}
                conceptualModel={activeModel}
                operationalizationMatrix={activeOpMatrix}
                contrastationMatrix={activeCtMatrix}
                evidenceEvaluationMatrix={activeEEM}
                hypothesisEvidenceConclusion={activeConclusion}
                reportDefinition={activeReport}
                onUpdateDefinition={handleUpdateReportDefinition}
                onIrAProjectVersions={handleIrAProjectVersions}
                onVolver={() => setPantalla("revision-final")}
                onReiniciar={handleReiniciar}
              />
            );
          })()}
          {/* S-024: Project Versions */}
          {pantalla === "project-versions" && (() => {
            const currentPayload = {
              problema,
              packActivo,
              thinkingUserSelection,
              reflectionAnswers,
              hypotheses,
              primaryHypothesisId,
              conceptualModels,
              operationalizationMatrices,
              contrastationMatrices,
              evidenceEvaluationMatrices,
              hypothesisEvidenceConclusions,
              reportDefinitions,
            };
            return (
              <PantallaProjectVersions
                key="project-versions"
                projectId="helios-session"
                projectName={packActivo?.metadata.titulo ?? "Proyecto HELIOS"}
                currentPayload={currentPayload}
                snapshots={projectSnapshots}
                versions={projectVersions}
                onUpdateSnapshots={handleUpdateSnapshots}
                onUpdateVersions={handleUpdateVersions}
                onCompareVersions={handleCompareVersions}
                onImport={handleIrAProjectImport}
                onVolver={() => setPantalla("revision-final")}
                onReiniciar={handleReiniciar}
              />
            );
          })()}
          {/* S-024: Version Comparison */}
          {pantalla === "version-comparison" && compareBaseId && compareTargetId && (() => {
            const baseSnap = projectSnapshots.find((s) => s.id === compareBaseId) ?? null;
            const targetSnap = projectSnapshots.find((s) => s.id === compareTargetId) ?? null;
            if (!baseSnap || !targetSnap) return null;
            return (
              <PantallaVersionComparison
                key="version-comparison"
                baseSnapshot={baseSnap}
                targetSnapshot={targetSnap}
                onVolver={() => setPantalla("project-versions")}
              />
            );
          })()}
          {/* S-024: Project Import */}
          {pantalla === "project-import" && (
            <PantallaProjectImport
              key="project-import"
              currentSnapshots={projectSnapshots}
              currentVersions={projectVersions}
              onImportComplete={handleImportComplete}
              onVolver={() => setPantalla("project-versions")}
            />
          )}
          {pantalla === "hipotesis" && packActivo && (
            <PantallaHipotesis
              key="hipotesis"
              problema={problema}
              pack={packActivo}
              onSeleccionar={handleSeleccionarHipotesis}
            />
          )}
          {pantalla === "pestel" && packActivo && hipotesisActiva && (
            <PantallaPestel
              key="pestel"
              pack={packActivo}
              hipotesisSeleccionada={hipotesisActiva}
              onContinuar={handleContinuar}
            />
          )}
          {pantalla === "descubrimiento" && packActivo && hipotesisActiva && (
            <PantallaDescubrimiento
              key="descubrimiento"
              problema={problema}
              pack={packActivo}
              hipotesisSeleccionada={hipotesisActiva}
              onReiniciar={handleReiniciar}
              onOtraHipotesis={handleOtraHipotesis}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
