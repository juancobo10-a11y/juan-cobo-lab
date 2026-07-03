import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import {
  Play,
  FileText,
  ExternalLink,
  ArrowRight,
  Clock,
  Layers,
  Youtube,
} from 'lucide-react';
import { conversations, type Conversacion, type ConversacionTipo } from '../../data/conversations';

// ─── Type config ──────────────────────────────────────────────────────────────

const tipoConfig: Record<
  ConversacionTipo,
  { label: string; Icon: React.ElementType; badge: string; accent: string }
> = {
  video: {
    label: 'Video',
    Icon: Youtube,
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    accent: '#f43f5e',
  },
  pdf: {
    label: 'Presentación',
    Icon: FileText,
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    accent: '#f59e0b',
  },
  articulo: {
    label: 'Artículo',
    Icon: ExternalLink,
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    accent: '#38bdf8',
  },
};

// ─── Sub-cards ────────────────────────────────────────────────────────────────

function VideoCard({ c }: { c: Conversacion }) {
  const hasVideo = Boolean(c.youtubeId);
  const thumbUrl = hasVideo
    ? `https://img.youtube.com/vi/${c.youtubeId}/maxresdefault.jpg`
    : null;

  return (
    <div className="group flex flex-col h-full bg-white border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#0D1B2A] overflow-hidden">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={c.titulo}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500"
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
            <Youtube className="w-12 h-12 text-white/15" />
          </div>
        )}
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-rose-500/80 group-hover:border-rose-500 group-hover:scale-110 transition-all duration-300">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
        {/* Duration badge */}
        {c.duracion && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/70 text-white text-[11px] font-medium px-2 py-0.5 rounded">
            <Clock className="w-3 h-3" />
            {c.duracion}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-grow p-6">
        <div className="flex items-center gap-2 mb-4">
          <TipoBadge tipo={c.tipo} />
          <span className="text-[11px] text-primary/30">{c.fecha}</span>
        </div>
        <h3 className="font-serif text-[17px] text-primary leading-snug mb-2 flex-grow group-hover:text-rose-600 transition-colors duration-200">
          {c.titulo}
        </h3>
        <p className="text-[13px] text-primary/50 leading-relaxed mt-2 line-clamp-2">
          {c.descripcion}
        </p>
        {c.canal && (
          <p className="text-[12px] text-primary/30 mt-3 font-medium">{c.canal}</p>
        )}
      </div>
    </div>
  );
}

function PdfCard({ c }: { c: Conversacion }) {
  const hasPdf = Boolean(c.pdfUrl);

  return (
    <div className="group flex flex-col h-full bg-white border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      {/* Header block */}
      <div className="relative h-44 bg-gradient-to-br from-[#0D1B2A] to-[#162840] flex items-center justify-center overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Slide count visual */}
        <div className="relative text-center">
          {c.totalSlides ? (
            <>
              <span className="font-serif text-6xl text-white/10 tabular-nums leading-none block">
                {c.totalSlides}
              </span>
              <div className="flex items-center gap-1.5 justify-center mt-1">
                <Layers className="w-3.5 h-3.5 text-amber-400/60" />
                <span className="text-[11px] text-amber-400/60 font-semibold tracking-wide">
                  diapositivas
                </span>
              </div>
            </>
          ) : (
            <FileText className="w-12 h-12 text-white/15" />
          )}
        </div>
        {/* Hover CTA overlay */}
        {hasPdf && (
          <div className="absolute inset-0 flex items-center justify-center bg-amber-500/0 group-hover:bg-amber-500/10 transition-colors duration-300">
            <span className="opacity-0 group-hover:opacity-100 text-amber-400 text-sm font-semibold flex items-center gap-1.5 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              Abrir presentación <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-grow p-6">
        <div className="flex items-center gap-2 mb-4">
          <TipoBadge tipo={c.tipo} />
          <span className="text-[11px] text-primary/30">{c.fecha}</span>
        </div>
        <h3 className="font-serif text-[17px] text-primary leading-snug mb-2 flex-grow group-hover:text-amber-600 transition-colors duration-200">
          {c.titulo}
        </h3>
        <p className="text-[13px] text-primary/50 leading-relaxed mt-2 line-clamp-2">
          {c.descripcion}
        </p>
        {c.evento && (
          <p className="text-[12px] text-primary/30 mt-3 font-medium">{c.evento}</p>
        )}
      </div>
    </div>
  );
}

function ArticuloCard({ c }: { c: Conversacion }) {
  return (
    <div className="group flex flex-col h-full bg-white border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      {/* Header block */}
      <div className="h-44 bg-[#F9F9F7] flex flex-col items-start justify-between p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <TipoBadge tipo={c.tipo} />
          {c.fuente && (
            <span className="text-[11px] font-semibold text-primary/40 tracking-wide uppercase">
              {c.fuente}
            </span>
          )}
        </div>
        {/* Tags */}
        {c.etiquetas && c.etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {c.etiquetas.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium text-primary/35 bg-primary/5 px-2.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <span className="text-[11px] text-primary/25">{c.fecha}</span>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-grow p-6">
        <h3 className="font-serif text-[17px] text-primary leading-snug mb-3 flex-grow group-hover:text-sky-600 transition-colors duration-200">
          {c.titulo}
        </h3>
        <p className="text-[13px] text-primary/50 leading-relaxed line-clamp-3">
          {c.descripcion}
        </p>
        <div className="flex items-center gap-1.5 text-sky-500 text-[13px] font-semibold mt-4 group-hover:gap-2.5 transition-all duration-200">
          Leer artículo
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: ConversacionTipo }) {
  const cfg = tipoConfig[tipo];
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${cfg.badge}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function ConversacionCard({ c }: { c: Conversacion }) {
  const href =
    c.tipo === 'video'
      ? c.youtubeId
        ? `https://www.youtube.com/watch?v=${c.youtubeId}`
        : undefined
      : c.tipo === 'pdf'
      ? c.pdfUrl || undefined
      : c.articuloUrl || undefined;

  const inner =
    c.tipo === 'video' ? (
      <VideoCard c={c} />
    ) : c.tipo === 'pdf' ? (
      <PdfCard c={c} />
    ) : (
      <ArticuloCard c={c} />
    );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {inner}
      </a>
    );
  }
  return <div className="h-full">{inner}</div>;
}

// ─── Main section ─────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.09 },
  }),
};

export function Conversaciones() {
  // Show destacados first, then fill up to 3 items
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
              Videos, presentaciones<br />
              <span className="text-primary/40">y artículos relacionados</span>
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

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {preview.map((c, i) => (
            <motion.div
              key={c.id}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="h-full"
            >
              <ConversacionCard c={c} />
            </motion.div>
          ))}
        </div>

        {/* Show more link if there are more items */}
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
