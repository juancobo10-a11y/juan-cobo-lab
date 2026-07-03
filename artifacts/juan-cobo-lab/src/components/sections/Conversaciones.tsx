import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Play, FileText, ExternalLink, ArrowRight, Clock, Youtube } from 'lucide-react';
import { conversations, type Conversacion } from '../../data/conversations';

// ─── Fade variant ─────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.09 },
  }),
};

// ─── Thumbnail helper ─────────────────────────────────────────────────────────

function thumbUrl(id: string) {
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}
function thumbFallback(id: string) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

// ─── Action button (compact) ──────────────────────────────────────────────────

function ActionBtn({
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
  if (href) {
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
      title="Próximamente"
      className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-primary/[0.04] text-primary/25 border border-primary/[0.06] cursor-not-allowed select-none"
    >
      <Clock className="w-3 h-3 shrink-0" />
      Próximamente
    </span>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({ c, index }: { c: Conversacion; index: number }) {
  const [thumbStage, setThumbStage] = useState<0 | 1 | 2>(0);
  const handleThumbError = () => setThumbStage((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : 2));
  const currentSrc =
    c.youtubeId && thumbStage < 2
      ? thumbStage === 0
        ? thumbUrl(c.youtubeId)
        : thumbFallback(c.youtubeId)
      : null;

  return (
    <motion.article
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="flex flex-col h-full bg-white border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#0D1B2A] overflow-hidden">
        {currentSrc ? (
          <img
            src={currentSrc}
            alt={c.titulo}
            onError={handleThumbError}
            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
            <Youtube className="w-10 h-10 text-white/15" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* Play */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center group-hover:bg-rose-500/90 group-hover:border-rose-500 group-hover:scale-110 transition-all duration-300">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* Duration */}
        {c.duracion && (
          <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/75 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
            <Clock className="w-2.5 h-2.5" />
            {c.duracion}
          </span>
        )}

        {/* Category */}
        <span className="absolute top-2.5 left-2.5 text-[9px] font-bold tracking-[0.15em] uppercase text-accent/90 bg-black/50 backdrop-blur-sm border border-accent/30 px-2 py-0.5 rounded-full">
          {c.categoria}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-grow px-5 pt-4 pb-4">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Youtube className="w-3 h-3 text-rose-500 shrink-0" />
          <span className="text-[10.5px] text-primary/35 font-medium truncate">{c.tema}</span>
          <span className="text-primary/20 shrink-0">·</span>
          <span className="text-[10.5px] text-primary/30 shrink-0">{c.fecha}</span>
        </div>

        <h3 className="font-serif text-[15.5px] text-primary leading-snug mb-2 flex-grow group-hover:text-accent transition-colors duration-200 line-clamp-3">
          {c.titulo}
        </h3>

        <p className="text-[12px] text-primary/40 leading-relaxed line-clamp-2 mb-3">
          {c.descripcion}
        </p>

        {/* Buttons */}
        <div className="flex gap-1.5 pt-3 border-t border-border">
          <ActionBtn
            href={c.youtubeUrl}
            icon={Play}
            label="Ver en YouTube"
            activeClass="bg-rose-500 text-white border border-rose-600 hover:bg-rose-600 shadow-sm"
          />
          <ActionBtn
            href={c.articuloUrl}
            icon={ExternalLink}
            label="Artículo"
            activeClass="bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-500 hover:text-white hover:border-sky-500"
          />
          <ActionBtn
            href={c.pdfUrl}
            icon={FileText}
            label="PDF"
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
            Ver los {conversations.length} videos
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {preview.map((c, i) => (
            <VideoCard key={c.id} c={c} index={i} />
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
              Ver los {conversations.length} videos
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
