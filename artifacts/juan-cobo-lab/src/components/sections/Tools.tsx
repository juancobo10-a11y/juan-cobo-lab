import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, ClipboardCheck, LayoutGrid, GitBranch, BookOpen, MessageSquare } from 'lucide-react';

const tools = [
  {
    name: "Generador de preguntas de investigación",
    description: "Convierte un tema vago en una pregunta de investigación accionable.",
    icon: HelpCircle,
  },
  {
    name: "Checklist de política pública",
    description: "Verifica si tu propuesta cumple los estándares mínimos de viabilidad.",
    icon: ClipboardCheck,
  },
  {
    name: "Matriz PESTEL interactiva",
    description: "Analiza el entorno de tu política en 6 dimensiones clave.",
    icon: LayoutGrid,
  },
  {
    name: "Evaluador de teoría del cambio",
    description: "Valida la lógica causal de tu intervención.",
    icon: GitBranch,
  },
  {
    name: "Generador APA",
    description: "Genera citas en formato APA 7 sin sufrir.",
    icon: BookOpen,
  },
  {
    name: "Traductor a lenguaje ciudadano",
    description: "Porque los ciudadanos también merecen entender el informe técnico.",
    icon: MessageSquare,
  }
];

export function Tools() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: { opacity: 1, scale: 1, y: 0 }
  };

  return (
    <section id="tools" className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif text-primary mb-4">Herramientas del laboratorio</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pequeñas utilidades construidas para automatizar las tareas repetitivas de la investigación y el diseño de políticas.
          </p>
        </div>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
        >
          {tools.map((tool, i) => {
            const Icon = tool.icon;
            return (
              <motion.div 
                key={i}
                variants={itemVariants}
                className="relative bg-card border border-border p-8 rounded-2xl group hover:border-accent/50 hover:shadow-lg transition-all"
              >
                <div className="absolute top-6 right-6">
                  <span className="inline-block bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
                    Próximamente
                  </span>
                </div>
                
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary mb-6 group-hover:bg-accent group-hover:text-white transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                
                <h3 className="text-xl font-serif text-foreground font-semibold mb-3">
                  {tool.name}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {tool.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  );
}
