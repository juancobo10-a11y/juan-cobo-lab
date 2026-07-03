import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { blogPosts as posts } from '@/data/blog';

export function Blog() {
  // Ocultar la sección cuando no hay entradas publicadas con URL real
  const published = posts.filter((p) => p.url);
  if (published.length === 0) return null;

  return (
    <section id="blog" className="py-36 bg-[#F7F6F4]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16 max-w-3xl">
          <span className="text-[11px] text-accent font-semibold tracking-[0.2em] uppercase mb-4 block">
            El blog
          </span>
          <h2 className="text-4xl md:text-6xl font-serif text-primary italic mb-6 leading-tight">
            "No me cuadran los datos"
          </h2>
          <p className="text-lg md:text-xl text-primary/65 leading-relaxed font-light max-w-2xl">
            Aquí escribo sobre esas preguntas que aparecen cuando uno abre Excel
            un sábado, revisa una base de datos o encuentra que la evidencia
            contradice el discurso.
            <br />
            <br />
            No es un blog de noticias.
            <br />
            Es un espacio para pensar.
          </p>
        </div>

        {/* Posts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {published.map((post, i) => (
            <motion.article
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col group"
            >
              <div className="text-[11px] font-bold text-accent mb-3 tracking-[0.18em] uppercase">
                {post.date}
              </div>
              <h3 className="text-2xl font-serif text-primary mb-4 leading-snug">
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent transition-colors focus:outline-none focus-visible:underline"
                >
                  {post.title}
                </a>
              </h3>
              <p className="text-primary/60 mb-6 flex-grow leading-relaxed">
                {post.teaser}
              </p>
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sm text-primary/50 flex items-center gap-1.5 group/link w-max hover:text-accent transition-colors"
              >
                Leer entrada{' '}
                <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </a>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
