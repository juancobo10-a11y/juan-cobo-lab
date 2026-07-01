import React from 'react';
import { motion } from 'framer-motion';

export function About() {
  const stats = [
    { label: "PhD en Ciencias Sociales" },
    { label: "Papá de Martina" },
    { label: "Consumidor compulsivo de bases de datos" },
    { label: "Servidor público" }
  ];

  return (
    <section id="about" className="py-24 bg-card">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-serif text-primary mb-8">Quién soy</h2>
            <div className="prose prose-lg text-muted-foreground leading-relaxed">
              <p className="mb-6">
                Soy Juan Cobo: economista, doctor en Ciencias Sociales, servidor público, investigador, profesor, papá de Martina y consumidor compulsivo de bases de datos. 
              </p>
              <p>
                Este espacio nace para compartir cómo convierto preguntas difíciles en análisis útiles, publicaciones, recomendaciones y herramientas para la toma de decisiones.
              </p>
            </div>
            
            <blockquote className="mt-10 border-l-4 border-accent pl-6 py-2">
              <p className="text-2xl font-serif text-primary italic leading-snug">
                "No me cuadran los datos… entonces empieza la historia."
              </p>
            </blockquote>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {stats.map((stat, i) => (
              <div 
                key={i} 
                className="bg-background border border-border p-6 rounded-2xl flex items-center justify-center text-center shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
              >
                <span className="font-medium text-foreground text-lg leading-tight">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
