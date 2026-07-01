import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  {
    value: '30+',
    label: 'Publicaciones académicas',
  },
  {
    value: '13',
    label: 'Ponencias internacionales',
  },
  {
    value: '13+',
    label: 'Años en investigación y políticas públicas',
  },
  {
    value: '☕',
    label: 'Cafés consumidos investigando — la Contraloría no ha podido contarlos',
  },
];

export function Stats() {
  return (
    <section className="bg-[#0D1B2A] py-24 border-y border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center px-4"
            >
              <div className="text-5xl md:text-6xl font-serif text-accent mb-3 tracking-tight leading-none">
                {stat.value}
              </div>
              <div className="text-sm text-white/40 leading-snug max-w-[150px] mx-auto">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
