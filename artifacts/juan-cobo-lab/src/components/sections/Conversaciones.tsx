import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Play, FileText, ExternalLink, ArrowRight, Clock } from 'lucide-react';
import { conversations, type Conversacion } from '../../data/conversations';

// ─── Shared fade variant ──────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.09 },
  }),
};

// ─── Link button (mini version for home cards) ────────────────────────────────

function LinkBtn({
  href,
  icon: Icon,
  label,
  activeClass,
}: {
  href?: string;
  icon: React.ElementType;
  label: string;
  activeClass: string;
}) {
  const available = Boolean(href);
  if (available) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${activeClass}`}
      >
        <Icon className="w-3 h-3 shrink-0" />
        {label}
      </a>
    );
  }
  return (
    <span
      aria-disabled="true"
      className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-primary/[0.04] text-primary/25 border border-primary/[0.06] cursor-not-allowed select-none"
    >
      <Clock className="w-3 h-3 shrink-0" />
      Próximamente
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ConversacionCard({ c, index }: { c: Conversacion; index: number }) {
  return (
    <motion.article
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="flex flex-col h-full bg-white border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
    >
      {/* Header: tema */}
      <div className="relative bg-[#0D1B2A] px-6 pt-6 pb-5 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent opacity-70" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-accent/80 bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
              {c.categoria}
            </span>
            <span className="text-[10px] text-white/30">{c.fecha}</span>
          </div>
          <p className="font-serif text-white/65 text-[13px] leading-snug italic line-clamp-2">
            {c.tema}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-grow px-6 pt-5 pb-5">
        <h3 className="font-serif text-[16px] text-primary leading-snug mb-2.5 flex-grow group-hover:text-accent transition-colors duration-200">
          {c.titulo}
        </h3>
        <p className="text-[12.5px] text-primary/45 leading-relaxed line-clamp-2">
          {c.descripcion}
        </p>

        {/* Buttons */}
        <div className="flex gap-1.5 mt-4 pt-4 border-t border-border">
          <LinkBtn
            href={c.youtubeUrl || undefined}
            icon={Play}
            label="Ver video"
            activeClass="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-500 hover:text-white hover:border-rose-500"
          />
          <LinkBtn
            href={c.articuloUrl || undefined}
            icon={ExternalLink}
            label="Leer artículo"
            activeClass="bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-500 hover:text-white hover:border-sky-500"
          />
          <LinkBtn
            href={c.pdfUrl || undefined}
            icon={FileText}
            label="Presentación"
            activeClass="bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-500 hover:text-white hover:border-amber-500"
          />
        </div>
      </div>
    </motion.article>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function Conversaciones() {
  const preview = [
    ...conversations.filter((c) => c.destacado),
    ...conversations.filter((c) => !c.destacado),
  ].slice(0, 3);

  if (conversations.length === 0) return null;

  return (
    <section id="conversaciones" className="py-28 px-6 bg-[#F9F9F7]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16"
        >
          <div>
            <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-accent block mb-4">
              Conversaciones
            </span>
            <h2 className="text-4xl md:text-5xl font-serif text-primary leading-tight">
              Algunas preguntas también{' '}
              <span className="text-primary/40">necesitan ser habladas.</span>
            </h2>
          </div>
          <Link
            href="/conversaciones"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/70 transition-colors shrink-0"
          >
            Ver todas las conversaciones
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {preview.map((c, i) => (
            <ConversacionCard key={c.id} c={c} index={i} />
          ))}
        </div>

        {conversations.length > 3 && (
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mt-12"
          >
            <Link
              href="/conversaciones"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-accent/30 text-accent font-medium text-sm hover:bg-accent hover:text-white hover:border-accent transition-all duration-300"
            >
              Ver las {conversations.length} conversaciones
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
