import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/sections/Footer';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const metodologias = [
  {
    title: 'Evaluación de políticas públicas',
    desc: 'Marcos para diseñar, implementar y valorar el impacto de intervenciones gubernamentales con rigor metodológico y evidencia sólida.',
  },
  {
    title: 'Teoría del cambio',
    desc: 'Herramienta para articular cómo y por qué una iniciativa puede generar transformaciones sostenibles en un contexto determinado.',
  },
  {
    title: 'Innovación social transformativa',
    desc: 'Enfoques para identificar y escalar soluciones que reconfiguran relaciones de poder y promueven cambios estructurales en la sociedad.',
  },
  {
    title: 'Diagnóstico de problemas públicos',
    desc: 'Metodologías para comprender la naturaleza, causas y dimensiones de los problemas que afectan el bienestar colectivo antes de proponer soluciones.',
  },
  {
    title: 'Apropiación social del conocimiento',
    desc: 'Estrategias para que la investigación y el conocimiento técnico se conviertan en herramientas útiles para comunidades, tomadores de decisión y ciudadanos.',
  },
  {
    title: 'Indicadores y medición de impacto',
    desc: 'Diseño de sistemas de medición que permiten valorar avances, detectar desviaciones y aprender a lo largo de la implementación de políticas y programas.',
  },
  {
    title: 'Conectividad significativa',
    desc: 'Marco de análisis para evaluar no solo el acceso a internet, sino la calidad, relevancia y capacidad de uso de la conectividad en contextos de desarrollo.',
  },
  {
    title: 'Educación, CTeI y transformación territorial',
    desc: 'Enfoques integrados para articular la educación y la ciencia, tecnología e innovación como motores del desarrollo regional y la equidad territorial.',
  },
];

export default function Metodologias() {
  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      <Navbar />

      <main id="main-content">

        {/* ── HERO ──────────────────────────────────────────────── */}
        <section className="bg-[#0D1B2A] pt-28 pb-32 px-6 relative overflow-hidden">
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
                Metodologías
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="text-xl md:text-2xl text-white/55 font-light leading-relaxed max-w-2xl mx-auto"
              >
                Marcos, herramientas y formas de trabajo para diagnosticar mejor, evaluar con evidencia y construir propuestas públicas junto con otros.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* ── INTRODUCCIÓN ──────────────────────────────────────── */}
        <section className="bg-[#F9F9F7] py-20 px-6">
          <motion.div
            className="max-w-2xl mx-auto text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="text-xl text-[#0D1B2A]/65 font-light leading-relaxed">
              Juan Cobo Lab no se limita a publicar ideas. Busca convertir preguntas complejas en metodologías útiles para investigadores, servidores públicos, estudiantes, consultores y tomadores de decisión.
            </p>
          </motion.div>
        </section>

        {/* ── TARJETAS ──────────────────────────────────────────── */}
        <section className="bg-[#F9F9F7] pb-32 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            >
              {metodologias.map((m) => (
                <motion.article
                  key={m.title}
                  variants={fadeUp}
                  className="group bg-white border border-[#0D1B2A]/8 rounded-2xl p-8 flex flex-col gap-5 shadow-sm hover:shadow-md hover:border-[#0D1B2A]/16 transition-all duration-300"
                >
                  {/* Estado */}
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent opacity-70" />
                    <span className="text-xs font-medium text-accent/80 tracking-wide uppercase">
                      En desarrollo
                    </span>
                  </div>

                  {/* Título */}
                  <div>
                    <div className="w-8 h-0.5 bg-accent mb-4 rounded-full" />
                    <h2 className="text-xl font-serif text-[#0D1B2A] leading-snug">
                      {m.title}
                    </h2>
                  </div>

                  {/* Descripción */}
                  <p className="text-sm text-[#0D1B2A]/55 font-light leading-relaxed flex-1">
                    {m.desc}
                  </p>

                  {/* Botón desactivado */}
                  <button
                    disabled
                    aria-disabled="true"
                    className="self-start mt-1 px-5 py-2.5 rounded-full text-xs font-medium border border-[#0D1B2A]/15 text-[#0D1B2A]/30 bg-transparent cursor-not-allowed select-none"
                  >
                    Próximamente
                  </button>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <section className="bg-[#0D1B2A] py-28 px-6">
          <motion.div
            className="max-w-2xl mx-auto text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ visible: { transition: { staggerChildren: 0.14 } } }}
          >
            <motion.p
              variants={fadeUp}
              className="text-sm font-medium tracking-widest uppercase text-accent mb-6 opacity-70"
            >
              En construcción permanente
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-4xl md:text-5xl font-serif text-white leading-tight mb-8"
            >
              Las metodologías crecen con las preguntas.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-lg text-white/45 font-light leading-relaxed"
            >
              Cada nueva pregunta que da pereque es una oportunidad para refinar, probar y mejorar las herramientas con las que trabajamos.
            </motion.p>
          </motion.div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
