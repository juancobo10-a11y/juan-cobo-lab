import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen } from 'lucide-react';

const tags = [
  "Investigación aplicada",
  "Políticas públicas",
  "Ciencia de datos",
  "Inteligencia Artificial",
  "Innovación pública",
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0D1B2A]">
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* Copper radial glow */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 45%, rgba(193,122,60,0.07) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center py-32">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Eyebrow */}
          <p className="text-accent/90 font-light tracking-[0.15em] text-sm md:text-base mb-10 italic">
            Donde las preguntas se vuelven evidencia.
          </p>

          {/* Title */}
          <h1 className="text-[clamp(4rem,12vw,8.5rem)] font-serif text-white leading-[0.95] mb-8 tracking-tight">
            Juan Cobo{' '}
            <em className="text-accent not-italic">Lab</em>
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-xl text-white/55 font-light max-w-2xl mx-auto mb-12 leading-relaxed">
            Transformo preguntas complejas en investigación, análisis de
            políticas públicas e inteligencia artificial para ayudar a tomar
            mejores decisiones.
          </p>

          {/* Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-14">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-white/40 border border-white/10 px-3.5 py-1.5 rounded-full tracking-wider font-medium"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#about"
              className="group flex items-center gap-2 bg-white text-[#0D1B2A] px-8 py-4 rounded-full font-semibold text-sm hover:bg-accent hover:text-white transition-all duration-300 hover:-translate-y-0.5 shadow-xl shadow-black/30"
            >
              Explorar el laboratorio
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#publications"
              className="group flex items-center gap-2 border border-white/20 text-white/75 px-8 py-4 rounded-full font-semibold text-sm hover:border-accent hover:text-accent transition-all duration-300 hover:-translate-y-0.5"
            >
              <BookOpen className="w-4 h-4" />
              Conocer mis publicaciones
            </a>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
      >
        <div className="w-[22px] h-9 border border-white/15 rounded-full flex items-start justify-center pt-2">
          <motion.div
            className="w-1 h-2 bg-white/30 rounded-full"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </section>
  );
}
