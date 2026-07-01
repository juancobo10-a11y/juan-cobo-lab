import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const categories = [
  "Todos",
  "Artículos científicos",
  "Columnas de opinión",
  "Estudios técnicos",
  "Ponencias",
  "Capítulos de libro"
];

const publicationsData = [
  {
    title: "Evaluación de impacto de programas sociales en Colombia: una revisión de la última década",
    category: "Artículos científicos",
    venue: "Revista de Economía del Rosario",
    year: "2023"
  },
  {
    title: "¿Para qué sirven los indicadores si nadie los lee?",
    category: "Columnas de opinión",
    venue: "El Espectador",
    year: "2022"
  },
  {
    title: "Análisis territorial del gasto público en salud post-pandemia",
    category: "Estudios técnicos",
    venue: "DNP",
    year: "2021"
  },
  {
    title: "Inteligencia artificial en la política pública: oportunidades y riesgos reales",
    category: "Ponencias",
    venue: "CLAD",
    year: "2023"
  },
  {
    title: "Innovación pública en América Latina: de la teoría al escritorio",
    category: "Capítulos de libro",
    venue: "Universidad Externado de Colombia",
    year: "2020"
  },
  {
    title: "Desigualdad urbana y acceso a bienes públicos: el caso de Bogotá",
    category: "Artículos científicos",
    venue: "Desarrollo y Sociedad",
    year: "2019"
  },
  {
    title: "Manual práctico para estructurar proyectos de inversión local",
    category: "Estudios técnicos",
    venue: "ESAP",
    year: "2022"
  },
  {
    title: "El fin del Excel: por qué el sector público necesita mejores bases de datos",
    category: "Columnas de opinión",
    venue: "La Silla Vacía",
    year: "2023"
  }
];

export function Publications() {
  const [activeFilter, setActiveFilter] = useState("Todos");

  const filteredPubs = activeFilter === "Todos" 
    ? publicationsData 
    : publicationsData.filter(p => p.category === activeFilter);

  return (
    <section id="publications" className="py-24 bg-card">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-serif text-primary mb-10 text-center">Publicaciones destacadas</h2>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeFilter === cat 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'bg-background text-muted-foreground hover:bg-secondary hover:text-foreground border border-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredPubs.map((pub, i) => (
              <motion.div
                key={pub.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="group relative bg-background border border-border rounded-xl p-6 hover:shadow-md transition-shadow pl-6 overflow-hidden"
              >
                {/* Left Accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary group-hover:bg-accent transition-colors" />
                
                <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-accent tracking-wider uppercase">
                        {pub.category}
                      </span>
                      <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                        {pub.year}
                      </span>
                    </div>
                    <h3 className="text-xl font-serif text-primary leading-tight group-hover:text-accent transition-colors">
                      {pub.title}
                    </h3>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground md:text-right shrink-0">
                    {pub.venue}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredPubs.length === 0 && (
             <div className="text-center py-10 text-muted-foreground">
               No hay publicaciones en esta categoría.
             </div>
          )}
        </div>
      </div>
    </section>
  );
}
