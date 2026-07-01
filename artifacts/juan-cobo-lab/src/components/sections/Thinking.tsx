import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Lightbulb } from 'lucide-react';

const thoughts = [
  {
    question: '¿Por qué seguimos confundiendo conectividad con inclusión digital?',
    tag: 'Política TIC',
  },
  {
    question: '¿Puede la inteligencia artificial evaluar políticas públicas?',
    tag: 'IA & Gobierno',
  },
  {
    question: '¿Cómo medir innovación social sin reducirla a un número?',
    tag: 'Medición',
  },
  {
    question: '¿Qué hace realmente un buen investigador?',
    tag: 'Investigación',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

export function Thinking() {
  return (
    <section id="thinking" className="py-36 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <span className="text-[11px] text-accent font-semibold tracking-[0.2em] uppercase mb-4 block">
              Ideas en curso
            </span>
            <h2 className="text-4xl md:text-5xl font-serif text-primary leading-[1.1]">
              En qué estoy pensando{' '}
              <span className="italic text-muted-foreground">esta semana</span>
            </h2>
          </div>
          <a
            href="#blog"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-primary/60 hover:text-accent transition-colors shrink-0"
          >
            Ver todas las ideas
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {thoughts.map((thought, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="group relative bg-[#F9F9F7] border border-transparent hover:border-accent/25 rounded-2xl p-8 transition-all duration-300 hover:shadow-md"
            >
              <div className="flex items-start gap-5">
                {/* Icon */}
                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-accent/20 transition-colors">
                  <Lightbulb className="w-4 h-4 text-accent" />
                </div>

                <div>
                  <span className="text-[10px] text-accent font-bold tracking-[0.2em] uppercase mb-3 block">
                    {thought.tag}
                  </span>
                  <h3 className="text-xl md:text-2xl font-serif text-primary leading-snug">
                    {thought.question}
                  </h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
