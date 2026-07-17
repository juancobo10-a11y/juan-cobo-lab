/**
 * PantallaSeleccionThinkingPattern — S-014
 *
 * Shown when the ThinkingRouter identifies two or more reasonably pertinent
 * patterns. Allows the user to:
 *   1. Select a single pattern as the analytical lens, or
 *   2. Combine two patterns in an explicit, ordered sequence.
 *
 * Architectural constraints:
 *   - Does not recalculate or reorder scores (Router result is authoritative).
 *   - Does not invent explanations — receives them pre-built by SelectionService.
 *   - Does not expose scores, weights, thresholds, or internal constants.
 *   - Shows at most MAX_CANDIDATOS_UI candidates in Router order.
 *   - Fallback universal is excluded from the list (handled by caller).
 *   - "¿En qué se diferencian?" shown only when there are exactly 2 candidates.
 *   - Combination available only when there are ≥2 candidates.
 *   - No drag-and-drop; explicit buttons for all selection actions.
 *   - Fully accessible: keyboard navigation, focus management, aria-pressed.
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ThinkingCandidate, ExplicacionSeleccion, ThinkingUserSelection } from "@/thinking/types";
import { buildComparacion, hasCombinableOptions } from "@/thinking/SelectionService";

// ─── Animation helpers ────────────────────────────────────────────────────────

const screenEnter = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.35, ease: [0.55, 0, 1, 0.45] as const } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

// ─── Fuente label ─────────────────────────────────────────────────────────────

function fuenteLabel(fuente: ExplicacionSeleccion["fuentePrincipal"]): string {
  switch (fuente) {
    case "problema":      return "Señal del problema";
    case "contexto-pack": return "Señal del contexto";
    case "mixta":         return "Señal mixta";
    case "fallback":      return "Patrón universal";
  }
}

// ─── Combine state ────────────────────────────────────────────────────────────

type CombineStep =
  | "picking-primary"
  | "picking-secondary"
  | "confirming";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PantallaSeleccionThinkingPatternProps {
  problema: string;
  /** Real, non-fallback candidates — already limited to MAX_CANDIDATOS_UI, in Router order. */
  candidatos: ThinkingCandidate[];
  /** Pre-built explanations keyed by patternId (from SelectionService.buildCandidateExplanations). */
  explicaciones: Map<string, ExplicacionSeleccion>;
  /** The user's previous selection, if they navigated back from pereque. */
  seleccionPrevia: ThinkingUserSelection | null;
  onSeleccion: (selection: ThinkingUserSelection) => void;
  onVolver: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PantallaSeleccionThinkingPattern({
  problema,
  candidatos,
  explicaciones,
  seleccionPrevia,
  onSeleccion,
  onVolver,
}: PantallaSeleccionThinkingPatternProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Combine sub-flow state
  const [combineStep, setCombineStep] = useState<CombineStep | null>(null);
  const [primaryId, setPrimaryId] = useState<string | null>(
    seleccionPrevia?.primaryPatternId ?? null
  );
  const [secondaryId, setSecondaryId] = useState<string | null>(
    seleccionPrevia?.mode === "combined" ? seleccionPrevia.secondaryPatternId : null
  );

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Restore combine step if user came back from pereque with a combined selection
  useEffect(() => {
    if (seleccionPrevia?.mode === "combined") {
      setCombineStep("confirming");
    }
  }, [seleccionPrevia]);

  const canCombine = hasCombinableOptions(candidatos);
  const isInCombineMode = combineStep !== null;

  // ── Comparison (exactly 2 candidates, not in combine mode) ─────────────────
  const comparacion =
    !isInCombineMode && candidatos.length === 2
      ? buildComparacion(candidatos[0], candidatos[1])
      : null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectSingle = (patternId: string) => {
    onSeleccion({ mode: "single", primaryPatternId: patternId });
  };

  const handleStartCombine = () => {
    setPrimaryId(null);
    setSecondaryId(null);
    setCombineStep("picking-primary");
  };

  const handlePickPrimary = (patternId: string) => {
    setPrimaryId(patternId);
    setSecondaryId(null);
    setCombineStep("picking-secondary");
  };

  const handlePickSecondary = (patternId: string) => {
    setSecondaryId(patternId);
    setCombineStep("confirming");
  };

  const handleSwap = () => {
    if (primaryId && secondaryId) {
      setPrimaryId(secondaryId);
      setSecondaryId(primaryId);
    }
  };

  const handleConfirmCombine = () => {
    if (primaryId && secondaryId) {
      onSeleccion({
        mode: "combined",
        primaryPatternId: primaryId,
        secondaryPatternId: secondaryId,
      });
    }
  };

  const handleCancelCombine = () => {
    setCombineStep(null);
    setPrimaryId(null);
    setSecondaryId(null);
  };

  // ── Combine step label ─────────────────────────────────────────────────────
  const combineInstruction =
    combineStep === "picking-primary"
      ? "Selecciona el enfoque principal"
      : combineStep === "picking-secondary"
      ? "Ahora selecciona el enfoque complementario"
      : combineStep === "confirming"
      ? "Confirma la combinación"
      : null;

  // ── Candidates resolved by id ───────────────────────────────────────────────
  const primaryCandidate = primaryId
    ? candidatos.find((c) => c.pattern.metadata.id === primaryId) ?? null
    : null;
  const secondaryCandidate = secondaryId
    ? candidatos.find((c) => c.pattern.metadata.id === secondaryId) ?? null
    : null;

  return (
    <motion.div
      key="seleccion-thinking"
      variants={screenEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-[calc(100vh-4rem)]"
    >
      <div className="max-w-2xl mx-auto px-6 py-20 w-full">

        {/* ── Problema context ──────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/60">
            <span className="text-accent" aria-hidden="true">◆</span>
            Analizando
          </span>
          <p className="mt-1.5 text-lg font-serif italic text-primary/70">
            "{problema}"
          </p>
        </motion.div>

        {/* ── Heading ───────────────────────────────────────────────── */}
        <motion.h2
          ref={headingRef}
          tabIndex={-1}
          variants={fadeUp}
          className="font-serif text-3xl md:text-4xl text-primary leading-[1.2] mb-4 focus:outline-none"
        >
          HELIOS identificó más de una forma pertinente de abordar el problema
        </motion.h2>

        <motion.p variants={fadeUp} className="text-base text-foreground/60 leading-relaxed mb-12">
          Estas perspectivas no son equivalentes. Cada una pone el foco en un aspecto distinto
          del problema. Puedes priorizar una o combinar dos de manera ordenada.
        </motion.p>

        {/* ── Combine step instruction ──────────────────────────────── */}
        <AnimatePresence>
          {combineInstruction && (
            <motion.div
              key="combine-instruction"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 px-5 py-3.5 rounded-xl bg-accent/8 border border-accent/20"
            >
              <p className="text-sm font-medium text-accent">
                {combineInstruction}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Candidate cards ───────────────────────────────────────── */}
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <div className="space-y-5" role="list">
            {candidatos.map((c) => {
              const id = c.pattern.metadata.id;
              const expl = explicaciones.get(id);
              const isPrimary = primaryId === id;
              const isSecondary = secondaryId === id;
              const isSelected = isPrimary || isSecondary;

              // Determine which buttons to show
              const showSelectSingle = !isInCombineMode;
              const showUsarPrimario = combineStep === "picking-primary";
              const showUsarComplementario =
                combineStep === "picking-secondary" && !isPrimary;
              const isConfirming = combineStep === "confirming";

              return (
                <motion.div key={id} variants={fadeUp} role="listitem">
                  <div
                    className={`rounded-2xl border bg-white p-7 transition-all duration-300 ${
                      isSelected
                        ? "border-accent/50 shadow-md ring-1 ring-accent/20"
                        : "border-border"
                    }`}
                  >
                    {/* ── Card header ─────────────────────────────────── */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="font-serif text-xl text-primary leading-snug">
                        {c.pattern.metadata.titulo}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        {isPrimary && (
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-accent text-white">
                            Principal
                          </span>
                        )}
                        {isSecondary && (
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/80 text-white">
                            Complementario
                          </span>
                        )}
                        {expl && !isSelected && (
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground/70">
                            {fuenteLabel(expl.fuentePrincipal)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── EnfoqueBreve ─────────────────────────────────── */}
                    {c.pattern.metadata.enfoqueBreve && (
                      <p className="text-sm text-foreground/60 leading-[1.75] mb-4 italic">
                        Ayuda a {c.pattern.metadata.enfoqueBreve}.
                      </p>
                    )}

                    {/* ── ¿Por qué aparece? ────────────────────────────── */}
                    {expl && (
                      <div className="mb-4">
                        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/45 mb-1.5">
                          ¿Por qué aparece?
                        </p>
                        <p className="text-sm text-foreground/65 leading-[1.8]">
                          {expl.resumen}
                        </p>
                      </div>
                    )}

                    {/* ── Dimensiones detectadas ───────────────────────── */}
                    {expl && expl.dimensionesDetectadas.length > 0 && (
                      <div className="mb-5">
                        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/45 mb-1.5">
                          Dimensiones detectadas
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {expl.dimensionesDetectadas.map((d) => (
                            <span
                              key={d}
                              className="text-[10px] px-2.5 py-0.5 rounded-full bg-accent/10 text-accent/80 ring-1 ring-accent/20 font-medium tracking-wide"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Action buttons ───────────────────────────────── */}
                    <div className="flex flex-wrap gap-2.5 pt-2 border-t border-border">
                      {/* Single mode: "Usar como enfoque principal" */}
                      {showSelectSingle && (
                        <button
                          type="button"
                          onClick={() => handleSelectSingle(id)}
                          aria-pressed={false}
                          className="text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all duration-200"
                        >
                          Usar como enfoque principal
                        </button>
                      )}

                      {/* Combine picking-primary */}
                      {showUsarPrimario && (
                        <button
                          type="button"
                          onClick={() => handlePickPrimary(id)}
                          aria-pressed={isPrimary}
                          className="text-sm px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all duration-200"
                        >
                          Usar como principal
                        </button>
                      )}

                      {/* Combine picking-secondary */}
                      {showUsarComplementario && (
                        <button
                          type="button"
                          onClick={() => handlePickSecondary(id)}
                          aria-pressed={isSecondary}
                          className="text-sm px-4 py-2 rounded-lg border border-primary/40 bg-white text-primary hover:bg-primary/5 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all duration-200"
                        >
                          Agregar como complementario
                        </button>
                      )}

                      {/* Confirming: already-selected display, no extra buttons */}
                      {isConfirming && !isSelected && (
                        <span className="text-xs text-muted-foreground/40 self-center">
                          No seleccionado
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── ¿En qué se diferencian? (exactly 2 candidates, not combining) ── */}
        <AnimatePresence>
          {comparacion && (
            <motion.div
              key="comparacion"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-8 rounded-xl border border-border bg-muted/20 p-6"
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/50 mb-4">
                ¿En qué se diferencian?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-primary mb-1">
                    {comparacion.a.titulo}
                  </p>
                  <p className="text-sm text-foreground/60 leading-[1.75] mb-2">
                    Centra la atención en {comparacion.a.foco}.
                  </p>
                  {comparacion.a.topConceptos.length > 0 && (
                    <p className="text-xs text-muted-foreground/50 italic">
                      {comparacion.a.topConceptos.join(", ")}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary mb-1">
                    {comparacion.b.titulo}
                  </p>
                  <p className="text-sm text-foreground/60 leading-[1.75] mb-2">
                    Centra la atención en {comparacion.b.foco}.
                  </p>
                  {comparacion.b.topConceptos.length > 0 && (
                    <p className="text-xs text-muted-foreground/50 italic">
                      {comparacion.b.topConceptos.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Combine confirmation ─────────────────────────────────────── */}
        <AnimatePresence>
          {combineStep === "confirming" && primaryCandidate && secondaryCandidate && (
            <motion.div
              key="combine-confirm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-6"
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-accent/60 mb-3">
                Combinación seleccionada
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent text-white">1</span>
                  <span className="text-sm font-medium text-primary">
                    {primaryCandidate.pattern.metadata.titulo}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/70 text-white">2</span>
                  <span className="text-sm font-medium text-primary">
                    {secondaryCandidate.pattern.metadata.titulo}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleConfirmCombine}
                  className="text-sm px-5 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all duration-200"
                >
                  Confirmar combinación
                </button>
                <button
                  type="button"
                  onClick={handleSwap}
                  className="text-sm px-4 py-2.5 rounded-lg border border-border bg-white text-primary hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
                >
                  Intercambiar orden
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer actions ──────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-5">
          {/* "Combinar dos enfoques" — only shown when not already in combine mode */}
          {!isInCombineMode && canCombine && (
            <button
              type="button"
              onClick={handleStartCombine}
              className="text-sm px-5 py-2.5 rounded-lg border border-border bg-white text-primary hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
            >
              Combinar dos enfoques
            </button>
          )}

          {/* Cancel combine */}
          {isInCombineMode && (
            <button
              type="button"
              onClick={handleCancelCombine}
              className="text-sm text-muted-foreground/60 hover:text-primary underline-offset-4 hover:underline transition-colors duration-200"
            >
              Cancelar combinación
            </button>
          )}

          {/* Volver */}
          <button
            type="button"
            onClick={onVolver}
            className="text-sm text-muted-foreground/60 hover:text-primary underline-offset-4 hover:underline transition-colors duration-200"
          >
            Volver
          </button>
        </motion.div>

      </div>
    </motion.div>
  );
}
