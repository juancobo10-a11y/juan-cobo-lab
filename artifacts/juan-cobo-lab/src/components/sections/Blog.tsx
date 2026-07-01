import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { blogPosts as posts } from '@/data/blog';

export function Blog() {
  return (
    <section id="blog" className="py-24 bg-[#EAEBE9]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-16 max-w-3xl">
          <h2 className="text-4xl md:text-6xl font-serif text-primary italic mb-6">
            "No me cuadran los datos"
          </h2>
          <p className="text-lg md:text-xl text-primary/80 leading-relaxed font-light">
            Un espacio para pensar en voz alta sobre políticas públicas, investigación, inteligencia artificial, evaluación, innovación pública y esas preguntas que aparecen cuando uno abre Excel un sábado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post, i) => (
            <motion.article 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col"
            >
              <div className="text-sm font-semibold text-accent mb-3 tracking-wider uppercase">
                {post.date}
              </div>
              <h3 className="text-2xl font-serif text-primary mb-4 leading-tight">
                <a href="#" className="hover:text-accent transition-colors focus:outline-none focus-visible:underline">
                  {post.title}
                </a>
              </h3>
              <p className="text-primary/70 mb-6 flex-grow">
                {post.teaser}
              </p>
              <a href="#" className="font-medium text-primary flex items-center gap-1 group w-max">
                Leer entrada <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
