import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { ArrowRight, ChevronRight } from "lucide-react";

// ─── Animation variants ────────────────────────────────────────────────────
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

// ─── Static content (MVP 0.2 — hardcoded) ─────────────────────────────────
const contexto =
  "Tener cobertura de internet no significa estar conectado de verdad. En Colombia, millones de personas viven en zonas donde hay señal pero no pueden pagar un plan, no saben usar los servicios disponibles o simplemente no encuentran contenidos relevantes para su vida cotidiana. La brecha digital ya no es solo un problema de infraestructura: es una brecha de calidad, de asequibilidad, de habilidades y de apropiación. Y esa brecha no se distribuye igual: el Chocó no tiene el mismo problema que Medellín, aunque en ambos exista conectividad. Entender esto cambia completamente la política pública. No alcanza con tender cables. La pregunta ya no es cuántos cables instalamos. La pregunta es qué capacidades desarrollan las personas gracias a esa conectividad.";

type NivelConfianza = "Alta" | "Media" | "Exploratoria";

const hipotesis: {
  numero: string;
  titulo: string;
  texto: string;
  confianza: NivelConfianza;
}[] = [
  {
    numero: "01",
    titulo: "El problema es de demanda, no de oferta",
    texto:
      "Las familias enfrentan costos de oportunidad que hacen más racional salir del sistema que permanecer en él: el ingreso inmediato del trabajo pesa más que la promesa de largo plazo de la educación.",
    confianza: "Alta",
  },
  {
    numero: "02",
    titulo: "La alerta temprana puede cambiar el resultado",
    texto:
      "Los sistemas de seguimiento basados en asistencia y rendimiento podrían prevenir una porción significativa de los casos si se activan en el primer trimestre de rezago.",
    confianza: "Media",
  },
  {
    numero: "03",
    titulo: "El currículo no habla al territorio",
    texto:
      "La percepción de irrelevancia del contenido escolar impulsa el abandono, especialmente en zonas rurales y comunidades indígenas.",
    confianza: "Exploratoria",
  },
];

const confianzaStyle: Record<NivelConfianza, string> = {
  Alta: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  Media: "bg-amber-50 text-amber-700 ring-amber-200/60",
  Exploratoria: "bg-violet-50 text-violet-700 ring-violet-200/60",
};

const pestel: {
  letra: string;
  dimension: string;
  explicacion: string;
  pregunta: string;
}[] = [
  {
    letra: "P",
    dimension: "Política",
    explicacion:
      "Las decisiones legislativas, las políticas de gratuidad y la voluntad institucional de los gobiernos locales determinan si el sistema escolar puede retener a sus estudiantes.",
    pregunta:
      "¿Qué decisiones políticas han moldeado este problema en los últimos diez años?",
  },
  {
    letra: "E",
    dimension: "Economía",
    explicacion:
      "La pobreza, el trabajo infantil y los costos indirectos —transporte, uniformes, materiales— hacen que para muchas familias el abandono escolar sea la opción financieramente lógica.",
    pregunta:
      "¿Cómo incide el ingreso familiar en la decisión de permanecer o salir del sistema?",
  },
  {
    letra: "S",
    dimension: "Sociedad",
    explicacion:
      "Las normas culturales sobre el rol de los jóvenes, las dinámicas de género, la violencia comunitaria y la presión del entorno peer influyen directamente en si un estudiante llega o no al colegio.",
    pregunta:
      "¿Qué dinámicas sociales o comunitarias alimentan el abandono escolar?",
  },
  {
    letra: "T",
    dimension: "Tecnología",
    explicacion:
      "El acceso a internet y herramientas digitales puede reducir barreras de distancia, pero también genera nuevas formas de exclusión cuando la infraestructura no llega o no hay habilidades para usarla.",
    pregunta:
      "¿La tecnología disponible acorta o amplía las brechas en este problema?",
  },
  {
    letra: "E",
    dimension: "Ambiente",
    explicacion:
      "La ruralidad, las distancias, los riesgos climáticos y el entorno físico determinan si un estudiante puede llegar regularmente a la escuela, especialmente en territorios dispersos.",
    pregunta:
      "¿Cómo afectan el territorio y el entorno físico la asistencia regular?",
  },
  {
    letra: "L",
    dimension: "Marco Legal",
    explicacion:
      "El marco normativo establece la obligatoriedad de la educación, los derechos de los estudiantes y las responsabilidades del Estado. Sus vacíos o débil implementación tienen efectos directos sobre la retención.",
    pregunta:
      "¿Qué garantías legales existen y qué vacíos deben cerrarse para proteger la permanencia?",
  },
];

const exploradoChips = [
  "Conectividad rural",
  "Educación",
  "Ciencia, Tecnología e Innovación",
  "Cambio climático",
  "Salud pública",
  "Innovación pública",
  "Gestión del agua",
];

// ─── Pantalla 1: Entrada ───────────────────────────────────────────────────
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
        {/* Etiqueta */}
        <motion.p
          variants={fadeUp}
          className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-8"
        >
          HELIOS · Sistema de análisis de política pública
        </motion.p>

        {/* Pregunta principal */}
        <motion.h1
          variants={fadeUp}
          className="font-serif text-4xl md:text-5xl leading-[1.15] text-primary mb-4"
        >
          ¿Qué problema público quieres comprender hoy?
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          variants={fadeUp}
          className="text-base text-foreground/60 leading-relaxed mb-10"
        >
          HELIOS no comienza proponiendo soluciones. Comienza ayudándote a
          comprender mejor el problema.
        </motion.p>

        {/* Formulario */}
        <motion.form
          variants={fadeUp}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
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

          {/* Ejemplos */}
          <div className="space-y-1.5">
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground/50 mb-3">
              Por ejemplo
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "Deserción escolar rural",
                "Baja ejecución presupuestal",
                "Conectividad significativa",
                "Violencia intrafamiliar",
              ].map((ej) => (
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

        {/* Chips "Otros usuarios han explorado" */}
        <motion.div
          variants={fadeUp}
          className="mt-14 pt-10 border-t border-border"
        >
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/50 mb-5">
            Otros usuarios han explorado
          </p>
          <div className="flex flex-wrap gap-2">
            {exploradoChips.map((chip) => (
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

        {/* Nota al pie */}
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

// ─── Pantalla 2: Hipótesis ─────────────────────────────────────────────────
function PantallaHipotesis({
  problema,
  onSeleccionar,
}: {
  problema: string;
  onSeleccionar: (h: (typeof hipotesis)[0]) => void;
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
        {/* Etiqueta del problema */}
        <motion.div variants={fadeUp} className="mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/60">
            <span className="text-accent" aria-hidden="true">
              ◆
            </span>
            Analizando
          </span>
          <p className="mt-1.5 text-lg font-serif italic text-primary/70">
            "{problema}"
          </p>
        </motion.div>

        {/* Título */}
        <motion.h2
          ref={headingRef}
          tabIndex={-1}
          variants={fadeUp}
          className="font-serif text-3xl md:text-4xl text-primary leading-[1.2] mb-8 focus:outline-none"
        >
          Antes de proponer soluciones, comprendamos el problema.
        </motion.h2>

        {/* Contextualización */}
        <motion.div variants={fadeUp} className="mb-12">
          <p className="text-base text-foreground/70 leading-[1.85]">
            {contexto}
          </p>
        </motion.div>

        {/* Divisor */}
        <motion.div
          variants={fadeUp}
          className="border-t border-border mb-10"
        />

        {/* Hipótesis */}
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.p
            variants={fadeUp}
            className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-8"
          >
            Hipótesis de trabajo
          </motion.p>

          <div className="space-y-5" role="list">
            {hipotesis.map((h) => (
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
                      {/* Nombre + badge de confianza */}
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

// ─── Pantalla 3: PESTEL ────────────────────────────────────────────────────
function PantallaPestel({
  hipotesisSeleccionada,
  onContinuar,
}: {
  hipotesisSeleccionada: (typeof hipotesis)[0];
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
        {/* Hipótesis seleccionada */}
        <motion.div variants={fadeUp} className="mb-10">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/50">
            Hipótesis seleccionada
          </span>
          <p className="mt-1.5 font-serif text-lg italic text-primary/70 leading-snug">
            {hipotesisSeleccionada.titulo}
          </p>
        </motion.div>

        {/* Título */}
        <motion.h2
          ref={headingRef}
          tabIndex={-1}
          variants={fadeUp}
          className="font-serif text-4xl md:text-5xl text-primary leading-[1.15] mb-5 focus:outline-none"
        >
          Construyamos el panorama
        </motion.h2>

        {/* Intro PESTEL */}
        <motion.p
          variants={fadeUp}
          className="text-base text-foreground/60 leading-relaxed mb-12"
        >
          No todos los problemas públicos deben analizarse de la misma manera.
          En este caso comenzaremos utilizando PESTEL para ampliar la mirada
          antes de profundizar.
        </motion.p>

        {/* Divisor */}
        <motion.div
          variants={fadeUp}
          className="border-t border-border mb-10"
        />

        {/* PESTEL cards */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {pestel.map((item) => (
            <motion.div
              key={item.letra + item.dimension}
              variants={fadeUp}
              className="rounded-2xl border border-border bg-white p-7 hover:border-accent/25 hover:shadow-sm transition-all duration-300"
            >
              <div className="flex items-start gap-5">
                {/* Letra */}
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

        {/* Botón continuar */}
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

// ─── Pantalla 4: Descubrimiento ────────────────────────────────────────────
function PantallaDescubrimiento({
  problema,
  hipotesisSeleccionada,
  onReiniciar,
  onOtraHipotesis,
}: {
  problema: string;
  hipotesisSeleccionada: (typeof hipotesis)[0];
  onReiniciar: () => void;
  onOtraHipotesis: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const pasos = [
    { label: "Problema inicial", valor: problema },
    { label: "Hipótesis seleccionada", valor: hipotesisSeleccionada.titulo },
    { label: "Herramienta utilizada", valor: "Análisis PESTEL" },
    {
      label: "Lo aprendido",
      valor:
        "Un problema público tiene múltiples dimensiones. Antes de proponer soluciones, es necesario comprender el sistema.",
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
        {/* Etiqueta */}
        <motion.p
          variants={fadeUp}
          className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-8"
        >
          HELIOS · Síntesis
        </motion.p>

        {/* Título */}
        <motion.h2
          ref={headingRef}
          tabIndex={-1}
          variants={fadeUp}
          className="font-serif text-4xl md:text-5xl text-primary leading-[1.15] mb-12 focus:outline-none"
        >
          Lo que descubrimos juntos
        </motion.h2>

        {/* Journey */}
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
              {/* Línea vertical */}
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-accent mt-1.5 shrink-0" />
                {i < pasos.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1 mb-1 min-h-[2.5rem]" />
                )}
              </div>
              {/* Contenido */}
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

        {/* Divisor */}
        <motion.div
          variants={fadeUp}
          className="border-t border-border mt-12 mb-10"
        />

        {/* Texto HELIOS */}
        <motion.p
          variants={fadeUp}
          className="text-base text-foreground/70 leading-[1.85] mb-12"
        >
          En pocos minutos pasaste de describir un fenómeno a construir una
          hipótesis de trabajo respaldada por un método de análisis. Ese es el
          propósito de HELIOS.
        </motion.p>

        {/* Botones */}
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
              window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "smooth",
              });
            }}
            className="px-6 py-3 rounded-xl border border-border bg-white text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
          >
            Conocer HELIOS
          </a>
        </motion.div>

        {/* Cita */}
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

// ─── Página principal ──────────────────────────────────────────────────────
type Pantalla = "entrada" | "hipotesis" | "pestel" | "descubrimiento";

export default function Helios() {
  const [pantalla, setPantalla] = useState<Pantalla>("entrada");
  const [problema, setProblema] = useState("");
  const [hipotesisActiva, setHipotesisActiva] = useState<
    (typeof hipotesis)[0] | null
  >(null);

  const handleSubmitProblema = (p: string) => {
    setProblema(p);
    setPantalla("hipotesis");
  };

  const handleSeleccionarHipotesis = (h: (typeof hipotesis)[0]) => {
    setHipotesisActiva(h);
    setPantalla("pestel");
  };

  const handleContinuar = () => setPantalla("descubrimiento");

  const handleReiniciar = () => {
    setProblema("");
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
          {pantalla === "hipotesis" && (
            <PantallaHipotesis
              key="hipotesis"
              problema={problema}
              onSeleccionar={handleSeleccionarHipotesis}
            />
          )}
          {pantalla === "pestel" && hipotesisActiva && (
            <PantallaPestel
              key="pestel"
              hipotesisSeleccionada={hipotesisActiva}
              onContinuar={handleContinuar}
            />
          )}
          {pantalla === "descubrimiento" && hipotesisActiva && (
            <PantallaDescubrimiento
              key="descubrimiento"
              problema={problema}
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
