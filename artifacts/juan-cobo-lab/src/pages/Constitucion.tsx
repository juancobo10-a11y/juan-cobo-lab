import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';

const principios = [
  {
    numero: '01',
    titulo: 'Las preguntas primero, los métodos después.',
    cuerpo:
      'Un buen método al servicio de una mala pregunta sigue siendo una pérdida de tiempo. Aquí la curiosidad viene antes que la econometría.',
  },
  {
    numero: '02',
    titulo: 'La evidencia no habla sola.',
    cuerpo:
      'Los datos necesitan intérpretes que sepan escucharlos — y que tengan el valor de decir lo que no está en el titular del informe.',
  },
  {
    numero: '03',
    titulo: 'El rigor no está reñido con la claridad.',
    cuerpo:
      'Si solo le entiendo a los que ya saben, no estoy comunicando: estoy confirmando. Lo complejo puede explicarse sin mentir.',
  },
  {
    numero: '04',
    titulo: 'El sector público puede aprender más rápido, si quiere.',
    cuerpo:
      'La burocracia no es excusa para la ignorancia institucional. Hay formas de hacer que la evidencia llegue a tiempo a las decisiones.',
  },
  {
    numero: '05',
    titulo: 'No todo dato necesita un modelo. Pero todo modelo necesita datos honestos.',
    cuerpo:
      'La transparencia metodológica no es un lujo académico. Es una condición de la confianza.',
  },
  {
    numero: '06',
    titulo: 'Publicar sin comunicar es archivar.',
    cuerpo:
      'Un artículo en un repositorio que nadie lee tiene el mismo impacto que uno que nunca se escribió. El conocimiento que no circula no transforma.',
  },
];

const noEs = [
  'Un blog de noticias del sector TIC.',
  'Una plataforma de consultoría.',
  'Un espacio para tener siempre la razón.',
  'Un repositorio de papers sin contexto.',
  'Una vitrina de certificados.',
];

const es = [
  'Un laboratorio de preguntas incómodas.',
  'Un espacio donde el error también se documenta.',
  'Una apuesta por la investigación aplicada con impacto real.',
  'Un lugar para pensar en voz alta sobre datos, política y evidencia.',
  'Un proyecto en permanente construcción.',
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.07 },
  }),
};

export default function Constitucion() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-foreground bg-background">
      <Navbar />

      <main className="flex-grow">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="bg-[#0D1B2A] pt-36 pb-28 px-6">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-12 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Volver al laboratorio
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <span className="text-[11px] text-accent font-semibold tracking-[0.25em] uppercase mb-6 block">
                Documento fundacional
              </span>
              <h1 className="text-5xl md:text-7xl font-serif text-white leading-[1.05] mb-8">
                La Constitución<br />
                <span className="text-accent italic">del Laboratorio</span>
              </h1>
              <p className="text-xl text-white/50 font-light max-w-2xl leading-relaxed">
                Todo espacio de pensamiento necesita saber qué es y qué no es.
                Este documento define los principios bajo los que opera Juan Cobo Lab.
                No es un reglamento. Es una promesa.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Es / No es ───────────────────────────────────── */}
        <section className="py-24 px-6 bg-[#F9F9F7]">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Es */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl font-serif text-primary mb-6 flex items-center gap-3">
                <span className="w-8 h-0.5 bg-accent inline-block" />
                Este espacio es
              </h2>
              <ul className="space-y-4">
                {es.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-primary/75 leading-relaxed">
                    <span className="text-accent font-bold mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* No es */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h2 className="text-2xl font-serif text-primary mb-6 flex items-center gap-3">
                <span className="w-8 h-0.5 bg-primary/25 inline-block" />
                Este espacio no es
              </h2>
              <ul className="space-y-4">
                {noEs.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-primary/45 leading-relaxed">
                    <span className="font-bold mt-0.5 shrink-0 text-primary/30">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        {/* ── Principios ───────────────────────────────────── */}
        <section className="py-28 px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="mb-16">
              <span className="text-[11px] text-accent font-semibold tracking-[0.2em] uppercase mb-4 block">
                Los principios
              </span>
              <h2 className="text-4xl md:text-5xl font-serif text-primary leading-tight">
                Bajo qué valores<br />opera este laboratorio
              </h2>
            </div>

            <div className="space-y-0 divide-y divide-border">
              {principios.map((p, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  className="py-10 grid grid-cols-1 md:grid-cols-[80px_1fr] gap-6 md:gap-12"
                >
                  <span className="font-serif text-4xl text-accent/30 leading-none tabular-nums">
                    {p.numero}
                  </span>
                  <div>
                    <h3 className="text-xl md:text-2xl font-serif text-primary mb-3 leading-snug">
                      {p.titulo}
                    </h3>
                    <p className="text-primary/55 leading-relaxed text-[17px]">
                      {p.cuerpo}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Promesa ──────────────────────────────────────── */}
        <section className="py-28 px-6 bg-[#0D1B2A]">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-4xl md:text-5xl font-serif text-white mb-8 leading-tight">
                La promesa
              </h2>
              <p className="text-xl text-white/55 font-light leading-relaxed mb-6">
                No me interesa tener la razón antes que la evidencia.
                Me interesa hacer mejores preguntas, construir mejores respuestas
                y compartirlas de forma que alguien más pueda usarlas.
              </p>
              <p className="text-lg text-white/30 italic leading-relaxed">
                Si en algún momento este espacio contradice estos principios,
                es bienvenida la crítica.
              </p>
              <div className="mt-14 pt-10 border-t border-white/10">
                <p className="text-sm text-white/30 tracking-wide">
                  Juan Carlos Cobo Gómez · Bogotá, 2025
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Mini footer */}
      <div className="bg-[#0D1B2A] border-t border-white/8 px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/25">
          <p className="font-serif italic text-white/35">Juan Cobo Lab</p>
          <p>© {new Date().getFullYear()} · Hecho con datos y café · Bogotá, Colombia</p>
          <Link href="/" className="hover:text-white/50 transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
