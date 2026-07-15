import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { ArrowRight, ChevronRight, Sparkles, AlertCircle } from "lucide-react";
import { heliosRouter } from "@/router/KnowledgeRouter";
import type {
  KnowledgePack,
  Hipotesis,
  NivelConfianza,
  PackCandidate,
  PackMetadata,
  RouterResult,
} from "@/router/types";

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
}: {
  onSubmit: (problema: string) => void;
}) {
  const [valor, setValor] = useState("");
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
  | "hipotesis"
  | "pestel"
  | "descubrimiento";

export default function Helios() {
  const [pantalla, setPantalla] = useState<Pantalla>("entrada");
  const [problema, setProblema] = useState("");
  const [packActivo, setPackActivo] = useState<KnowledgePack | null>(null);
  const [routerResult, setRouterResult] = useState<RouterResult | null>(null);
  const [hipotesisActiva, setHipotesisActiva] = useState<Hipotesis | null>(null);

  const handleSubmitProblema = async (p: string) => {
    setProblema(p);
    setPantalla("enrutando");

    try {
      const result = await heliosRouter.route({ texto: p });
      setRouterResult(result);

      if (result.decision === "seleccionado") {
        setPackActivo(result.seleccionado.pack);
        setPantalla("hipotesis");
      } else if (result.decision === "candidatos") {
        setPantalla("confirmacion-candidatos");
      } else {
        setPantalla("sin-pack");
      }
    } catch {
      // Fallback: go back to entrada on unexpected error
      setPantalla("entrada");
    }
  };

  const handleSeleccionarPack = (pack: KnowledgePack) => {
    setPackActivo(pack);
    setPantalla("hipotesis");
  };

  const handleSeleccionarHipotesis = (h: Hipotesis) => {
    setHipotesisActiva(h);
    setPantalla("pestel");
  };

  const handleContinuar = () => setPantalla("descubrimiento");

  const handleReiniciar = () => {
    setProblema("");
    setPackActivo(null);
    setRouterResult(null);
    setHipotesisActiva(null);
    setPantalla("entrada");
  };

  const handleOtraHipotesis = () => setPantalla("hipotesis");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="helios-main">
        <AnimatePresence mode="wait">
          {pantalla === "entrada" && (
            <PantallaEntrada key="entrada" onSubmit={handleSubmitProblema} />
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
