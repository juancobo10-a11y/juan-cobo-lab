import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock } from 'lucide-react';
import { articles } from '@/data/articles';

export function Articles() {

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Ocultar la sección cuando no hay artículos publicados con URL real
  const published = articles.filter((a) => a.url);
  if (published.length === 0) return null;

  return (
    <section id="articles" className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-end mb-12">
          <h2 className="text-4xl md:text-5xl font-serif text-primary">Últimos artículos</h2>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {published.map((article, i) => (
            <motion.article
              key={i}
              variants={itemVariants}
              className={`bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-full ${i === 0 ? 'md:col-span-2 lg:col-span-2 bg-primary text-primary-foreground border-transparent' : ''}`}
            >
              <div className="mb-4">
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${i === 0 ? 'bg-white/20 text-white' : 'bg-secondary text-secondary-foreground'}`}>
                  {article.tag}
                </span>
              </div>
              <h3 className={`text-2xl font-serif mb-3 leading-tight ${i === 0 ? 'text-white' : 'text-primary'}`}>
                {article.title}
              </h3>
              <p className={`flex-grow leading-relaxed ${i === 0 ? 'text-white/80' : 'text-muted-foreground'}`}>
                {article.teaser}
              </p>
              <div className={`mt-6 pt-6 border-t flex items-center justify-between ${i === 0 ? 'border-white/20' : 'border-border'}`}>
                <div className={`flex items-center gap-1.5 text-sm ${i === 0 ? 'text-white/60' : 'text-muted-foreground'}`}>
                  <Clock className="w-4 h-4" /> {article.readTime}
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-medium text-sm flex items-center gap-1 group ${i === 0 ? 'text-white hover:text-accent' : 'text-accent hover:text-primary'}`}
                >
                  Leer <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
