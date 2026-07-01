import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, Wrench } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-24">
      {/* Decorative dots background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, hsl(var(--primary)) 1px, transparent 0)', backgroundSize: '48px 48px' }}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span className="inline-block py-1 px-3 rounded-full bg-secondary/50 text-secondary-foreground text-xs font-semibold tracking-wider uppercase mb-6">
            Laboratorio de ideas
          </span>
          <h1 className="text-6xl md:text-8xl font-serif text-primary leading-tight mb-6">
            Juan Cobo <span className="italic text-accent">Lab</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto mb-10 leading-relaxed">
            Datos, políticas públicas, IA y café para entender mejor las decisiones públicas.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#articles"
              className="group flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-all hover:-translate-y-0.5"
            >
              Leer artículos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#publications"
              className="group flex items-center gap-2 bg-card text-foreground border border-border px-6 py-3 rounded-full font-medium hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all hover:-translate-y-0.5"
            >
              <FileText className="w-4 h-4" /> Ver publicaciones
            </a>
            <a
              href="#tools"
              className="group flex items-center gap-2 bg-transparent text-foreground px-6 py-3 rounded-full font-medium hover:text-accent transition-colors"
            >
              <Wrench className="w-4 h-4" /> Explorar herramientas
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
