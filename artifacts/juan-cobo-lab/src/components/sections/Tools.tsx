import React from 'react';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  ClipboardCheck,
  LayoutGrid,
  GitBranch,
  BookOpen,
  MessageSquare,
} from 'lucide-react';

const tools = [
  {
    name: 'Generador de preguntas de investigación',
    description: 'Convierte un tema vago en una pregunta de investigación accionable y bien formulada.',
    icon: HelpCircle,
  },
  {
    name: 'Checklist para evaluar políticas públicas',
    description: 'Verifica si tu propuesta cumple los estándares mínimos de rigor y viabilidad.',
    icon: ClipboardCheck,
  },
  {
    name: 'Matriz PESTEL interactiva',
    description: 'Analiza el entorno de tu política o programa en seis dimensiones clave.',
    icon: LayoutGrid,
  },
  {
    name: 'Generador APA',
    description: 'Genera citas en formato APA 7 sin sufrir — ni abrir el manual.',
    icon: BookOpen,
  },
  {
    name: 'Constructor de teoría del cambio',
    description: 'Valida la lógica causal de tu intervención y detecta supuestos débiles.',
    icon: GitBranch,
  },
  {
    name: 'Traductor de lenguaje técnico',
    description: 'Porque los ciudadanos también merecen entender el informe técnico.',
    icon: MessageSquare,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45 } },
};

export function Tools() {
  return (
    <section id="tools" className="py-36 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16 max-w-2xl">
          <span className="text-[11px] text-accent font-semibold tracking-[0.2em] uppercase mb-4 block">
            En construcción
          </span>
          <h2 className="text-4xl md:text-5xl font-serif text-primary mb-5 leading-tight">
            Mi caja de herramientas
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Pequeñas utilidades construidas para hacer más eficiente la
            investigación y el diseño de políticas. Cada herramienta nace de
            una necesidad real — generalmente de un sábado con Excel abierto.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
        >
          {tools.map((tool, i) => {
            const Icon = tool.icon;
            return (
              <motion.div
                key={i}
                variants={itemVariants}
                className="relative bg-[#F9F9F7] border border-transparent hover:border-accent/20 p-8 rounded-2xl group transition-all duration-300 hover:shadow-md"
              >
                {/* Badge */}
                <div className="absolute top-6 right-6">
                  <span className="inline-block bg-muted text-muted-foreground text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full">
                    Próximamente
                  </span>
                </div>

                {/* Icon */}
                <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-6 group-hover:bg-accent group-hover:text-white transition-all duration-300">
                  <Icon className="w-5 h-5" />
                </div>

                <h3 className="text-lg font-serif text-foreground font-semibold mb-3 leading-snug pr-16">
                  {tool.name}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {tool.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
