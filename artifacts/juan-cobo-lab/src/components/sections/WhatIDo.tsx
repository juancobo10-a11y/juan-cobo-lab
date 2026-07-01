import React from 'react';
import { motion } from 'framer-motion';

const questions = [
  "¿Esta política pública realmente funciona?",
  "¿Estamos midiendo lo correcto?",
  "¿Los datos cuentan la misma historia que el discurso?",
  "¿Cómo puede ayudar la inteligencia artificial a investigar mejor?",
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5 } },
};

export function WhatIDo() {
  return (
    <section id="what-i-do" className="py-36 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-20 items-start">
          {/* Left column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-[11px] text-accent font-semibold tracking-[0.2em] uppercase mb-5 block">
              Por qué existe este sitio
            </span>
            <h2 className="text-5xl md:text-6xl font-serif text-primary leading-[1.05] mb-10">
              ¿Qué hago aquí?
            </h2>
            <div className="space-y-5 text-muted-foreground text-lg leading-relaxed">
              <p>No vendo recetas mágicas.</p>
              <p>No prometo soluciones fáciles.</p>
              <p>
                Me dedico a hacer preguntas que muchas veces nadie hace
                y a buscar respuestas con datos, evidencia y pensamiento crítico.
              </p>
            </div>
          </motion.div>

          {/* Right column */}
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-muted-foreground text-lg mb-8 leading-relaxed"
            >
              Si alguna vez te has preguntado:
            </motion.p>

            <motion.ul
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="space-y-5 mb-10"
            >
              {questions.map((q) => (
                <motion.li
                  key={q}
                  variants={itemVariants}
                  className="flex items-start gap-4"
                >
                  <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  <span className="text-primary font-medium leading-snug text-lg">{q}</span>
                </motion.li>
              ))}
            </motion.ul>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-muted-foreground text-lg leading-relaxed"
            >
              Entonces este espacio también es para ti.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}
