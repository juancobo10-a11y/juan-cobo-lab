import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/sections/Footer';
import { ArrowRight } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const cycleSteps = [
  'Pereque',
  'Preguntas',
  'Evidencia',
  'Cocreación',
  'Documento mártir',
  'Producto mínimo viable',
  'Prueba',
  'Aprendizaje',
];

const pillars = [
  {
    title: 'Curiosidad',
    desc: 'Todo empieza con algo que da pereque. Una pregunta incómoda, un dato que no cuadra, una realidad que merece entenderse mejor.',
  },
  {
    title: 'Evidencia',
    desc: 'Las opiniones son puntos de partida, no destinos. Las decisiones mejoran cuando están ancladas en datos rigurosos y bien interpretados.',
  },
  {
    title: 'Cocreación',
    desc: 'El conocimiento que se construye solo tiene límites claros. El que se construye con otros tiene posibilidades casi ilimitadas.',
  },
  {
    title: 'Acción',
    desc: 'Investigar sin actuar es coleccionar ideas. El propósito final siempre es transformar algo: una política, una decisión, una conversación.',
  },
];

export default function JuanCobo() {
  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      <Navbar />

      {/* ── 1. HERO ─────────────────────────────────────────────── */}
      <section className="bg-[#0D1B2A] pt-28 pb-32 px-6 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="max-w-3xl mx-auto relative text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
          >
            <motion.p
              variants={fadeUp}
              className="text-sm font-medium tracking-widest uppercase text-accent mb-6 opacity-80"
            >
              Juan Cobo Lab
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-5xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.05] mb-8"
            >
              ¿Quién es Juan Cobo?
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-xl md:text-2xl text-white/65 font-light leading-relaxed max-w-2xl mx-auto mb-6 italic font-serif"
            >
              No me dedico a encontrar respuestas. Me dedico a hacer mejores preguntas para construir mejores propuestas junto con otros.
            </motion.p>
            <motion.p
              variants={fadeUp}
              className="text-base text-white/40 leading-relaxed"
            >
              Economista, doctor en Ciencias Sociales, investigador,<br className="hidden sm:block" /> servidor público, profesor y aprendiz permanente.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── 2. TEXTO PRINCIPAL ──────────────────────────────────── */}
      <section className="bg-[#F9F9F7] py-28 px-6">
        <motion.div
          className="max-w-2xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
        >
          {[
            'Hola, soy Juan Cobo.',
            'Durante muchos años pensé que mi trabajo consistía en evaluar políticas públicas, construir indicadores, escribir investigaciones y presentar resultados.',
            'Con el tiempo entendí que mi verdadero trabajo era otro: ayudar a comprender mejor los problemas antes de intentar solucionarlos.',
            'Esa idea ha guiado mi vida como economista, investigador, profesor y servidor público. He tenido el privilegio de estudiar en Colombia, Francia y España, y de trabajar en la academia, el sector financiero y la Contraloría General de la República.',
            'Pero los títulos y los cargos nunca han sido el destino. Han sido herramientas para cumplir un propósito más grande: hacer mejores preguntas para construir mejores propuestas junto con otros.',
            'Disfruto enseñar. No porque crea que tengo todas las respuestas, sino porque me entusiasma ver cómo una conversación, una buena pregunta o una metodología ayudan a otra persona a encontrar su propio camino.',
            'Creo profundamente en la apropiación social del conocimiento: el conocimiento solo cobra verdadero valor cuando deja de ser de uno y se convierte en una herramienta para que otros comprendan, decidan y transformen su realidad.',
            'Por eso, cuando alguien me pregunta algo y no conozco la respuesta, rara vez digo "no sé". Mi respuesta suele ser otra:',
          ].map((para, i) => (
            <motion.p
              key={i}
              variants={fadeUp}
              className={`leading-relaxed mb-7 text-[#0D1B2A]/80 ${
                i === 0
                  ? 'text-2xl font-serif font-semibold text-[#0D1B2A]'
                  : 'text-lg font-light'
              }`}
            >
              {para}
            </motion.p>
          ))}

          {/* Quote destacada */}
          <motion.blockquote
            variants={fadeUp}
            className="border-l-4 border-accent pl-6 my-12"
          >
            <p className="text-2xl md:text-3xl font-serif italic text-[#0D1B2A] leading-snug">
              "No lo sé todavía... pero averigüémoslo juntos."
            </p>
          </motion.blockquote>

          {[
            'Esa frase ha guiado buena parte de mi vida profesional.',
            'Porque investigar no consiste en demostrar que uno sabe mucho. Consiste en tener la humildad suficiente para seguir aprendiendo.',
          ].map((para, i) => (
            <motion.p
              key={`end-${i}`}
              variants={fadeUp}
              className="text-lg font-light leading-relaxed mb-7 text-[#0D1B2A]/80"
            >
              {para}
            </motion.p>
          ))}
        </motion.div>
      </section>

      {/* ── 3. BLOQUE MARTINA ───────────────────────────────────── */}
      <section className="bg-[#0D1B2A] py-28 px-6">
        <motion.div
          className="max-w-2xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
        >
          <motion.p
            variants={fadeUp}
            className="text-sm font-medium tracking-widest uppercase text-accent mb-10 opacity-70"
          >
            Lo que importa de verdad
          </motion.p>
          <motion.p
            variants={fadeUp}
            className="text-xl md:text-2xl text-white/80 font-light leading-relaxed mb-7"
          >
            Si hay una persona que cambió definitivamente mi forma de entender el liderazgo, el servicio y el futuro, esa es mi hija Martina.
          </motion.p>
          <motion.p
            variants={fadeUp}
            className="text-xl md:text-2xl text-white/80 font-light leading-relaxed mb-7"
          >
            Ella me recuerda todos los días que las decisiones que tomamos hoy son el mundo que heredarán quienes vienen detrás de nosotros.
          </motion.p>
          <motion.p
            variants={fadeUp}
            className="text-xl md:text-2xl text-white/80 font-light leading-relaxed"
          >
            Por eso intento que mi trabajo no se limite a producir informes o investigaciones. Aspiro a dejar herramientas, conversaciones e ideas que ayuden a construir un país donde las decisiones públicas sean más humanas, más rigurosas y más útiles para las próximas generaciones.
          </motion.p>
        </motion.div>
      </section>

      {/* ── 4. BLOQUE MÉTODO ────────────────────────────────────── */}
      <section className="bg-[#F9F9F7] py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          >
            <motion.p
              variants={fadeUp}
              className="text-sm font-medium tracking-widest uppercase text-accent mb-4 opacity-70"
            >
              Cómo trabajo
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-4xl md:text-5xl font-serif text-[#0D1B2A] mb-8 leading-tight"
            >
              Mi forma de trabajar
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-lg text-[#0D1B2A]/65 font-light leading-relaxed mb-16 max-w-2xl"
            >
              Algo me da pereque. Hago mejores preguntas. Busco evidencia. Converso. Cocreo. Rayo un documento mártir. Construyo un producto mínimo viable. Lo pongo a prueba. Aprendo. Y vuelvo a empezar.
            </motion.p>

            {/* Ciclo visual */}
            <motion.div variants={fadeUp} className="relative">
              {/* Desktop: arco horizontal */}
              <div className="hidden md:flex items-start gap-0">
                {cycleSteps.map((step, i) => (
                  <div key={step} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#0D1B2A] border-2 border-accent flex items-center justify-center mb-3 flex-shrink-0">
                        <span className="text-[10px] font-bold text-accent">{i + 1}</span>
                      </div>
                      <p className="text-xs font-medium text-[#0D1B2A]/70 text-center leading-tight px-1">
                        {step}
                      </p>
                    </div>
                    {i < cycleSteps.length - 1 && (
                      <div className="flex-shrink-0 mb-6">
                        <ArrowRight className="w-4 h-4 text-accent/40" />
                      </div>
                    )}
                  </div>
                ))}
                {/* Flecha de vuelta */}
                <div className="flex-shrink-0 ml-2 mb-6">
                  <ArrowRight className="w-4 h-4 text-accent/30 rotate-180" />
                </div>
              </div>

              {/* Mobile: lista vertical */}
              <div className="md:hidden flex flex-col gap-3">
                {cycleSteps.map((step, i) => (
                  <div key={step} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#0D1B2A] border-2 border-accent flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-accent">{i + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-[#0D1B2A]/75">{step}</span>
                    {i < cycleSteps.length - 1 && (
                      <div className="ml-auto">
                        <ArrowRight className="w-3.5 h-3.5 text-accent/30 rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── 5. PILARES ──────────────────────────────────────────── */}
      <section className="bg-[#0D1B2A] py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          >
            <motion.p
              variants={fadeUp}
              className="text-sm font-medium tracking-widest uppercase text-accent mb-4 opacity-70"
            >
              Fundamentos
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-4xl md:text-5xl font-serif text-white mb-16 leading-tight"
            >
              Los pilares de Juan Cobo Lab
            </motion.h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {pillars.map((p, i) => (
                <motion.div
                  key={p.title}
                  variants={fadeUp}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-accent/40 hover:bg-white/[0.07] transition-all duration-300"
                >
                  <div className="w-8 h-0.5 bg-accent mb-6 rounded-full" />
                  <h3 className="text-xl font-serif text-white mb-3">{p.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed font-light">{p.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 6. CTA FINAL ────────────────────────────────────────── */}
      <section className="bg-[#F9F9F7] py-36 px-6">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ visible: { transition: { staggerChildren: 0.14 } } }}
        >
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-serif text-[#0D1B2A] leading-tight mb-8"
          >
            Si llegaste hasta aquí, bienvenido.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-xl text-[#0D1B2A]/55 font-light leading-relaxed mb-3"
          >
            Aquí venimos a dar pereque.
          </motion.p>
          <motion.p
            variants={fadeUp}
            className="text-xl text-[#0D1B2A]/55 font-light leading-relaxed mb-16"
          >
            No para tener la razón.
            <br />
            Sino para construir mejores preguntas, mejores ideas y mejores decisiones.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link
              href="/preguntas"
              className="inline-flex items-center gap-2.5 bg-[#0D1B2A] hover:bg-[#0D1B2A]/85 text-white px-8 py-4 rounded-full text-base font-medium transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-[#0D1B2A]/20"
            >
              Explorar preguntas
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
