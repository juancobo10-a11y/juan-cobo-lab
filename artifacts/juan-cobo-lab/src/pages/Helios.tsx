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
  nextStep: string;
}[] = [
  {
    numero: "01",
    titulo: "La infraestructura dejó de ser el cuello de botella principal",
    texto:
      "En los territorios donde ya existe cobertura, las brechas más críticas están en el uso y la apropiación: asequibilidad de los planes, habilidades digitales y relevancia de los servicios. Ampliar la red sin atender estas dimensiones solo profundiza la desigualdad.",
    confianza: "Alta",
    nextStep:
      "Revisar los datos de uso efectivo del Ministerio TIC: ¿qué porcentaje de usuarios con acceso no utiliza activamente los servicios digitales disponibles?",
  },
  {
    numero: "02",
    titulo: "Las soluciones uniformes no funcionan en territorios tan diversos",
    texto:
      "El problema de Quibdó no es el mismo que el de Bogotá, aunque en ambos haya internet. Las políticas nacionales tienden a homogeneizar respuestas que requieren diferenciación según las condiciones económicas, culturales y geográficas de cada territorio.",
    confianza: "Alta",
    nextStep:
      "Construir una tipología de municipios según su perfil de brecha: ¿qué clusters emergen al cruzar cobertura, uso, asequibilidad y habilidades digitales?",
  },
  {
    numero: "03",
    titulo: "Los indicadores actuales miden cobertura, no transformación",
    texto:
      "Las métricas tradicionales —penetración, velocidad, cobertura— no capturan si la conectividad genera cambios reales en educación, economía o participación ciudadana. Sin mejores indicadores, es imposible saber si las políticas están funcionando.",
    confianza: "Media",
    nextStep:
      "Explorar el marco de conectividad significativa de la UIT y proponer indicadores complementarios al Índice de Brecha Digital del Ministerio TIC.",
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
      "Las decisiones sobre el Fondo Único de Tecnologías, el Plan Nacional de Conectividad y las prioridades del Ministerio TIC determinan qué territorios reciben inversión y bajo qué condiciones.",
    pregunta:
      "¿Qué decisiones políticas recientes han ampliado o reducido la brecha digital en los territorios más vulnerables?",
  },
  {
    letra: "E",
    dimension: "Economía",
    explicacion:
      "El costo de los planes de datos sigue siendo una barrera crítica. Para muchas familias colombianas, la conectividad compite directamente con la alimentación, el transporte o la educación.",
    pregunta:
      "¿La asequibilidad de los planes de datos es el principal factor de exclusión, o existen barreras más determinantes?",
  },
  {
    letra: "S",
    dimension: "Sociedad",
    explicacion:
      "Las habilidades digitales, la confianza en los servicios en línea y la percepción de utilidad de internet varían enormemente entre generaciones, géneros y comunidades rurales o étnicas.",
    pregunta:
      "¿Qué grupos poblacionales enfrentan las barreras de apropiación más profundas y por qué?",
  },
  {
    letra: "T",
    dimension: "Tecnología",
    explicacion:
      "La calidad de la conexión —velocidad, latencia, estabilidad— determina qué se puede hacer con internet. Una conexión lenta excluye del trabajo remoto y la educación virtual, aunque técnicamente exista cobertura.",
    pregunta:
      "¿La calidad de la conectividad disponible permite a los territorios participar realmente en la economía digital?",
  },
  {
    letra: "E",
    dimension: "Ambiente",
    explicacion:
      "La geografía colombiana —montañas, selva, ríos— encarece el despliegue de infraestructura en zonas rurales y dispersas. Los desastres naturales y el conflicto armado también interrumpen las redes existentes.",
    pregunta:
      "¿Cómo afectan las condiciones territoriales y ambientales la provisión y calidad de la conectividad?",
  },
  {
    letra: "L",
    dimension: "Marco Legal",
    explicacion:
      "La regulación del espectro radioeléctrico, las obligaciones de cobertura de los operadores y el marco de protección de datos configuran el ecosistema en que se despliega la conectividad.",
    pregunta:
      "¿El marco regulatorio incentiva a los operadores a llegar a los territorios más difíciles, o solo a los rentables?",
  },
];

const exploradoChips = [
  "Índice de Brecha Digital",
  "Conectividad significativa",
  "Transformación digital territorial",
  "Apropiación digital rural",
  "Habilidades digitales",
  "Infraestructura TIC",
  "Brecha urbano-rural",
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
                "¿Por qué persiste la brecha digital donde ya existe cobertura?",
                "Asequibilidad de planes de datos",
                "Habilidades digitales en adultos mayores",
                "Calidad de conectividad en municipios rurales",
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
    { label: "Problema analizado", valor: problema },
    { label: "Hipótesis seleccionada", valor: hipotesisSeleccionada.titulo },
    { label: "Herramienta utilizada", valor: "Análisis PESTEL" },
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
