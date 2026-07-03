import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';

const preguntas = [
  {
    pregunta: '¿Por qué seguimos midiendo conectividad y llamando eso inclusión digital?',
    tag: 'Política TIC',
  },
  {
    pregunta: '¿Puede la Contraloría construir conocimiento, o solo está condenada a verificar gasto?',
    tag: 'Control fiscal',
  },
  {
    pregunta: '¿Qué necesita saber un tomador de decisiones que no te enseñan en el doctorado?',
    tag: 'Investigación aplicada',
  },
  {
    pregunta: '¿La IA me va a quitar las preguntas buenas, o solo el trabajo tedioso?',
    tag: 'IA & Gobierno',
  },
  {
    pregunta: '¿Por qué los datos del sector TIC mejoran cada año y la brecha digital no cierra?',
    tag: 'Evidencia',
  },
  {
    pregunta: '¿Cuánto rigor metodológico cabe en un informe que nadie va a leer completo?',
    tag: 'Comunicación de ciencia',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08 },
  }),
};

export function Pereque() {
  return (
    <section id="thinking" className="py-36 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <span className="text-[11px] text-accent font-semibold tracking-[0.2em] uppercase mb-4 block">
              En qué estoy pensando
            </span>
            <h2 className="text-4xl md:text-5xl font-serif text-primary leading-[1.1] mb-5">
              Las preguntas que{' '}
              <span className="italic text-accent">me dan pereque</span>
            </h2>
            <p className="text-lg text-primary/55 leading-relaxed font-light">
              No son las preguntas que tengo resueltas. Son las que no me dejan dormir
              bien y que probablemente van a terminar en un artículo — o en una
              conversación que vale la pena tener.
            </p>
          </div>
          <Link
            href="/preguntas"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-primary/50 hover:text-accent transition-colors shrink-0"
          >
            Ver las 16 preguntas
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {preguntas.map((item, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="group relative bg-[#F9F9F7] border border-transparent hover:border-accent/25 rounded-2xl p-8 transition-all duration-300 hover:shadow-md flex flex-col gap-5"
            >
              {/* Tag */}
              <span className="inline-block self-start text-[9px] text-accent font-bold tracking-[0.22em] uppercase bg-accent/8 px-2.5 py-1 rounded-full">
                {item.tag}
              </span>

              {/* Question */}
              <p className="text-xl md:text-2xl font-serif text-primary leading-snug">
                {item.pregunta}
              </p>

              {/* Decorative mark */}
              <span className="text-4xl font-serif text-accent/20 leading-none select-none mt-auto">
                ?
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
