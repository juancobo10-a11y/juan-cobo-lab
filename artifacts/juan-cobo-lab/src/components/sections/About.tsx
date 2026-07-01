import React from 'react';
import { motion } from 'framer-motion';

const identity = [
  "PhD en Ciencias Sociales — Javeriana",
  "Economista — Uniandes",
  "Director de Estudios TIC — Contraloría",
  "Papá de Martina",
  "Consumidor compulsivo de bases de datos",
  "Servidor público por convicción",
];

export function About() {
  return (
    <section id="about" className="py-36 bg-[#F7F6F4]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-20 items-start">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-[11px] text-accent font-semibold tracking-[0.2em] uppercase mb-4 block">
              Quién soy
            </span>
            <h2 className="text-4xl md:text-5xl font-serif text-primary mb-8 leading-tight">
              El que abre Excel un sábado
              <br />
              <span className="italic text-muted-foreground">por gusto propio.</span>
            </h2>

            <div className="space-y-5 text-muted-foreground text-lg leading-relaxed mb-10">
              <p>
                Soy Juan Carlos Cobo: economista, doctor en Ciencias Sociales,
                servidor público, investigador, profesor y papá de Martina.
              </p>
              <p>
                Trabajo en la intersección entre los datos, las políticas
                públicas y la inteligencia artificial. Mi obsesión: que la
                evidencia llegue a quienes toman decisiones — y que llegue bien
                explicada.
              </p>
              <p>
                Este espacio es donde comparto ese proceso: los análisis, las
                preguntas que no me dan respuesta fácil y las herramientas que
                construyo para no responder dos veces la misma pregunta.
              </p>
            </div>

            {/* Brand quote */}
            <blockquote className="border-l-2 border-accent pl-6 py-1">
              <p className="text-2xl font-serif text-primary italic leading-snug">
                "No me cuadran los datos…<br />entonces empieza la historia."
              </p>
            </blockquote>
          </motion.div>

          {/* Right — identity cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <p className="text-sm text-muted-foreground tracking-[0.12em] uppercase font-semibold mb-6">
              En resumen
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {identity.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.07 }}
                  className="bg-white border border-border/60 px-5 py-4 rounded-xl text-sm font-medium text-foreground leading-snug hover:border-accent/30 hover:shadow-sm transition-all"
                >
                  {item}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
