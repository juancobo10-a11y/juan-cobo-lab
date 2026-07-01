import React from 'react';
import { motion } from 'framer-motion';

export function Quote() {
  return (
    <section className="py-36 bg-[#F7F6F4]">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Opening mark */}
          <div
            className="text-7xl font-serif leading-none mb-6 select-none"
            style={{ color: 'hsl(24 69% 53% / 0.2)' }}
            aria-hidden="true"
          >
            "
          </div>

          <blockquote className="text-3xl md:text-4xl lg:text-5xl font-serif text-primary leading-[1.25] italic mb-10">
            No me interesa tener la razón.{' '}
            <br className="hidden md:block" />
            Me interesa que la evidencia nos ayude{' '}
            <br className="hidden md:block" />
            a tomar mejores decisiones.
          </blockquote>

          {/* Divider */}
          <div className="w-12 h-px bg-accent/40 mx-auto mb-6" />

          <p className="text-sm text-muted-foreground tracking-[0.2em] uppercase font-medium">
            Juan Carlos Cobo Gómez
          </p>
        </motion.div>
      </div>
    </section>
  );
}
