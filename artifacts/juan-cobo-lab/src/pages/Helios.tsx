import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { ArrowRight, ChevronRight } from 'lucide-react';

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
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

// ─── Static content (MVP 0.1 — hardcoded for "deserción escolar") ──────────
const contexto = `La deserción escolar en Colombia afecta aproximadamente al 7,2% de los estudiantes de básica y media cada año. No se trata de un problema uniforme: se concentra en zonas rurales, poblaciones en condición de pobreza, y comunidades donde el trabajo temprano compite directamente con la asistencia al colegio. Las causas son múltiples y se retroalimentan —económicas, culturales, institucionales, territoriales— lo que convierte este fenómeno en un reto de política pública de alta complejidad. Comprenderlo bien exige ir más allá de las tasas: exige leer el contexto, mapear actores y tensiones, y formular hipótesis que abran caminos de intervención con evidencia.`;

const hipotesis = [
  {
    numero: '01',
    titulo: 'El problema es de demanda, no de oferta',
    texto:
      'La deserción no ocurre porque falten colegios o maestros. Las familias enfrentan costos de oportunidad que hacen más racional salir del sistema que permanecer en él: el ingreso inmediato del trabajo pesa más que la promesa de largo plazo de la educación.',
  },
  {
    numero: '02',
    titulo: 'La alerta temprana puede cambiar el resultado',
    texto:
      'Los sistemas de seguimiento basados en asistencia y rendimiento podrían prevenir una porción significativa de los casos si se activan en el primer trimestre de rezago. El problema no es la salida: es que nadie detiene la caída a tiempo.',
  },
  {
    numero: '03',
    titulo: 'El currículo no habla al territorio',
    texto:
      'La percepción de irrelevancia del contenido escolar impulsa el abandono, especialmente en zonas rurales y comunidades indígenas. Cuando el colegio no conecta con la realidad del estudiante, la deserción es una respuesta racional a una experiencia alienante.',
  },
];

const pestel = [
  {
    letra: 'P',
    dimension: 'Político',
    explicacion:
      'Las políticas de gratuidad, los presupuestos de educación y la voluntad institucional de los gobiernos locales determinan si el sistema escolar puede retener a sus estudiantes.',
    pregunta: '¿Qué decisiones políticas han moldeado este problema en los últimos diez años?',
  },
  {
    letra: 'E',
    dimension: 'Económico',
    explicacion:
      'La pobreza, el trabajo infantil y los costos indirectos —transporte, uniformes, materiales— hacen que para muchas familias el abandono escolar sea la opción financieramente lógica.',
    pregunta: '¿Cómo incide el ingreso familiar en la decisión de permanecer o salir del sistema?',
  },
  {
    letra: 'S',
    dimension: 'Social',
    explicacion:
      'Las normas culturales sobre el rol de los jóvenes, las dinámicas de género, la violencia comunitaria y la presión del entorno peer influyen directamente en si un estudiante llega o no al colegio.',
    pregunta: '¿Qué dinámicas sociales o comunitarias alimentan el abandono escolar?',
  },
  {
    letra: 'T',
    dimension: 'Tecnológico',
    explicacion:
      'El acceso a internet y herramientas digitales puede reducir barreras de distancia, pero también genera nuevas formas de exclusión cuando la infraestructura no llega o no hay habilidades para usarla.',
    pregunta: '¿La tecnología disponible acorta o amplía las brechas en este problema?',
  },
  {
    letra: 'E',
    dimension: 'Ambiental',
    explicacion:
      'La ruralidad, las distancias, los riesgos climáticos y las condiciones del entorno físico determinan si un estudiante puede llegar regularmente a la escuela, especialmente en territorios dispersos.',
    pregunta: '¿Cómo afecta el territorio y el entorno físico a la asistencia regular?',
  },
  {
    letra: 'L',
    dimension: 'Legal',
    explicacion:
      'El marco normativo establece la obligatoriedad de la educación, los derechos de los estudiantes y las responsabilidades del Estado. Sus vacíos o su débil implementación tienen efectos directos sobre la retención.',
    pregunta: '¿Qué garantías legales existen y qué vacíos deben cerrarse para proteger la permanencia?',
  },
];

// ─── Pantalla 1: Entrada ───────────────────────────────────────────────────
function PantallaEntrada({
  onSubmit,
}: {
  onSubmit: (problema: string) => void;
}) {
  const [valor, setValor] = useState('');

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
      <div className="max-w-2xl mx-auto px-6 py-24 w-full">
        {/* Etiqueta */}
        <motion.p
          variants={fadeUp}
          className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-10"
        >
          HELIOS · Sistema de análisis de política pública
        </motion.p>

        {/* Pregunta principal */}
        <motion.h1
          variants={fadeUp}
          className="font-serif text-4xl md:text-5xl leading-[1.15] text-primary mb-12"
        >
          ¿Qué problema de política pública quieres comprender hoy?
        </motion.h1>

        {/* Formulario */}
        <motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <textarea
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              rows={4}
              placeholder={`Deserción escolar\nConectividad rural\nBaja ejecución presupuestal`}
              className="w-full resize-none rounded-xl border border-border bg-white px-6 py-5 text-lg text-primary placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all duration-200 font-sans leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const trimmed = valor.trim();
                  if (trimmed) onSubmit(trimmed);
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Escribe con tus propias palabras. Sin tecnicismos.
            </p>
            <button
              type="submit"
              disabled={!valor.trim()}
              className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-white text-sm font-medium tracking-wide hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              Démosle pereque
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
          </div>
        </motion.form>

        {/* Nota al pie */}
        <motion.p
          variants={fadeUp}
          className="mt-16 text-xs text-muted-foreground/60 leading-relaxed max-w-sm"
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
  const headingRef = useRef<HTMLParagraphElement>(null);

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
          <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70">
            <span className="text-accent" aria-hidden="true">◆</span>
            Analizando
          </span>
          <p
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 text-xl font-serif italic text-primary focus:outline-none"
          >
            "{problema}"
          </p>
        </motion.div>

        {/* Contextualización */}
        <motion.div variants={fadeUp} className="mb-14">
          <p className="text-base text-foreground/75 leading-[1.8]">{contexto}</p>
        </motion.div>

        {/* Divisor */}
        <motion.div variants={fadeUp} className="border-t border-border mb-10" />

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
                    <span className="shrink-0 font-mono text-xs text-muted-foreground/40 mt-1 w-5" aria-hidden="true">
                      {h.numero}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-lg text-primary mb-2 leading-snug">
                        {h.titulo}
                      </h3>
                      <p className="text-sm text-foreground/65 leading-[1.75]">{h.texto}</p>
                      <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 translate-x-0 group-hover:translate-x-0.5 transition-all duration-200" aria-hidden="true">
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
  useEffect(() => { headingRef.current?.focus(); }, []);

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
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/60">
            Hipótesis seleccionada
          </span>
          <p className="mt-2 font-serif text-xl italic text-primary leading-snug">
            {hipotesisSeleccionada.titulo}
          </p>
        </motion.div>

        {/* Título */}
        <motion.h2
          ref={headingRef}
          tabIndex={-1}
          variants={fadeUp}
          className="font-serif text-4xl md:text-5xl text-primary leading-[1.15] mb-4 focus:outline-none"
        >
          Construyamos el panorama
        </motion.h2>
        <motion.p variants={fadeUp} className="text-base text-foreground/60 mb-14 leading-relaxed">
          Antes de proponer soluciones, necesitamos leer el contexto desde seis dimensiones. Cada una
          revela fuerzas que pueden bloquear o impulsar cualquier intervención.
        </motion.p>

        {/* Divisor */}
        <motion.div variants={fadeUp} className="border-t border-border mb-10" />

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
              className="rounded-2xl border border-border bg-white p-7 hover:border-accent/30 hover:shadow-sm transition-all duration-300"
            >
              <div className="flex items-start gap-5">
                {/* Letra */}
                <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center">
                  <span className="font-mono text-sm font-semibold text-primary/60">
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
                  {/* Pregunta orientadora */}
                  <div className="pl-4 border-l-2 border-accent/30">
                    <p className="text-sm italic text-primary/70 leading-relaxed">
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
            className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-white text-sm font-medium tracking-wide hover:bg-primary/90 transition-all duration-200"
          >
            Continuar
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </button>
        </motion.div>

        {/* Nota final */}
        <motion.p
          variants={fadeUp}
          className="mt-8 text-xs text-muted-foreground/50 text-right"
        >
          Próximamente: síntesis sistémica, actores clave y rutas de intervención.
        </motion.p>
      </div>
    </motion.div>
  );
}

// ─── Pantalla 4: Cierre (provisional) ─────────────────────────────────────
function PantallaFin({ onReiniciar }: { onReiniciar: () => void }) {
  return (
    <motion.div
      key="fin"
      variants={screenEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-[calc(100vh-4rem)] flex flex-col justify-center"
    >
      <div className="max-w-2xl mx-auto px-6 py-24 w-full">
        <motion.p variants={fadeUp} className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-10">
          HELIOS · MVP 0.1
        </motion.p>
        <motion.h2
          variants={fadeUp}
          className="font-serif text-4xl md:text-5xl text-primary leading-[1.15] mb-6"
        >
          Esto es solo el comienzo.
        </motion.h2>
        <motion.p variants={fadeUp} className="text-base text-foreground/65 leading-relaxed mb-12 max-w-lg">
          El panorama PESTEL es el primer paso. En las próximas versiones, HELIOS te ayudará a mapear actores, construir una teoría del cambio y diseñar rutas de intervención basadas en evidencia.
        </motion.p>
        <motion.div variants={fadeUp}>
          <button
            onClick={onReiniciar}
            className="text-sm font-medium text-accent hover:text-accent/70 underline underline-offset-4 transition-colors duration-200"
          >
            Analizar otro problema
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────
type Pantalla = 'entrada' | 'hipotesis' | 'pestel' | 'fin';

export default function Helios() {
  const [pantalla, setPantalla] = useState<Pantalla>('entrada');
  const [problema, setProblema] = useState('');
  const [hipotesisActiva, setHipotesisActiva] = useState<(typeof hipotesis)[0] | null>(null);

  const handleSubmitProblema = (p: string) => {
    setProblema(p);
    setPantalla('hipotesis');
  };

  const handleSeleccionarHipotesis = (h: (typeof hipotesis)[0]) => {
    setHipotesisActiva(h);
    setPantalla('pestel');
  };

  const handleContinuar = () => setPantalla('fin');
  const handleReiniciar = () => {
    setProblema('');
    setHipotesisActiva(null);
    setPantalla('entrada');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <AnimatePresence mode="wait">
          {pantalla === 'entrada' && (
            <PantallaEntrada key="entrada" onSubmit={handleSubmitProblema} />
          )}
          {pantalla === 'hipotesis' && (
            <PantallaHipotesis
              key="hipotesis"
              problema={problema}
              onSeleccionar={handleSeleccionarHipotesis}
            />
          )}
          {pantalla === 'pestel' && hipotesisActiva && (
            <PantallaPestel
              key="pestel"
              hipotesisSeleccionada={hipotesisActiva}
              onContinuar={handleContinuar}
            />
          )}
          {pantalla === 'fin' && (
            <PantallaFin key="fin" onReiniciar={handleReiniciar} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
