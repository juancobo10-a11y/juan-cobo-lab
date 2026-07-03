import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import {
  ArrowLeft,
  Play,
  FileText,
  ExternalLink,
  Search,
  X,
  Clock,
  Layers,
  Youtube,
  ArrowRight,
  Mail,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { conversations, type Conversacion, type ConversacionTipo } from '../data/conversations';

// ─── Type config ──────────────────────────────────────────────────────────────

const tipoConfig: Record<
  ConversacionTipo,
  { label: string; Icon: React.ElementType; badge: string; badgeDark: string }
> = {
  video: {
    label: 'Video',
    Icon: Youtube,
    badge: 'bg-rose-50 text-rose-600 border-rose-200',
    badgeDark: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  pdf: {
    label: 'Presentación',
    Icon: FileText,
    badge: 'bg-amber-50 text-amber-600 border-amber-200',
    badgeDark: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  articulo: {
    label: 'Artículo',
    Icon: ExternalLink,
    badge: 'bg-sky-50 text-sky-600 border-sky-200',
    badgeDark: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  },
};

const FILTERS: { label: string; value: ConversacionTipo | 'todos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Videos', value: 'video' },
  { label: 'Presentaciones', value: 'pdf' },
  { label: 'Artículos', value: 'articulo' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TipoBadge({
  tipo,
  variant = 'light',
}: {
  tipo: ConversacionTipo;
  variant?: 'light' | 'dark';
}) {
  const cfg = tipoConfig[tipo];
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${variant === 'dark' ? cfg.badgeDark : cfg.badge}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

// ── Video Card ────────────────────────────────────────────────────────────────
function VideoCard({ c }: { c: Conversacion }) {
  const hasVideo = Boolean(c.youtubeId);
  const thumbUrl = hasVideo
    ? `https://img.youtube.com/vi/${c.youtubeId}/maxresdefault.jpg`
    : null;
  const href = hasVideo ? `https://www.youtube.com/watch?v=${c.youtubeId}` : undefined;

  const inner = (
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
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-rose-500/80 group-hover:border-rose-500 group-hover:scale-110 transition-all duration-300">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
        {c.duracion && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/70 text-white text-[11px] font-medium px-2 py-0.5 rounded">
            <Clock className="w-3 h-3" />
            {c.duracion}
          </span>
        )}
      </div>
      <div className="flex flex-col flex-grow p-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
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

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
      {inner}
    </a>
  ) : (
    <div className="h-full">{inner}</div>
  );
}

// ── PDF Card ──────────────────────────────────────────────────────────────────
function PdfCard({ c }: { c: Conversacion }) {
  const hasPdf = Boolean(c.pdfUrl);

  const inner = (
    <div className="group flex flex-col h-full bg-white border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
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
        {hasPdf && (
          <div className="absolute inset-0 flex items-center justify-center bg-amber-500/0 group-hover:bg-amber-500/10 transition-colors duration-300">
            <span className="opacity-0 group-hover:opacity-100 text-amber-400 text-sm font-semibold flex items-center gap-1.5 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              Abrir presentación <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col flex-grow p-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
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

  return hasPdf ? (
    <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
      {inner}
    </a>
  ) : (
    <div className="h-full">{inner}</div>
  );
}

// ── Article Card ──────────────────────────────────────────────────────────────
function ArticuloCard({ c }: { c: Conversacion }) {
  const hasUrl = Boolean(c.articuloUrl);

  const inner = (
    <div className="group flex flex-col h-full bg-white border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="h-44 bg-[#F9F9F7] flex flex-col items-start justify-between p-6 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <TipoBadge tipo={c.tipo} />
          {c.fuente && (
            <span className="text-[11px] font-semibold text-primary/40 tracking-wide uppercase">
              {c.fuente}
            </span>
          )}
        </div>
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
      <div className="flex flex-col flex-grow p-6">
        <h3 className="font-serif text-[17px] text-primary leading-snug mb-3 flex-grow group-hover:text-sky-600 transition-colors duration-200">
          {c.titulo}
        </h3>
        <p className="text-[13px] text-primary/50 leading-relaxed line-clamp-3">
          {c.descripcion}
        </p>
        <div
          className={`flex items-center gap-1.5 text-[13px] font-semibold mt-4 group-hover:gap-2.5 transition-all duration-200 ${
            hasUrl ? 'text-sky-500' : 'text-primary/25'
          }`}
        >
          {hasUrl ? 'Leer artículo' : 'Próximamente'}
          {hasUrl && <ExternalLink className="w-3.5 h-3.5" />}
        </div>
      </div>
    </div>
  );

  return hasUrl ? (
    <a href={c.articuloUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
      {inner}
    </a>
  ) : (
    <div className="h-full">{inner}</div>
  );
}

function ConversacionCard({ c }: { c: Conversacion }) {
  if (c.tipo === 'video') return <VideoCard c={c} />;
  if (c.tipo === 'pdf') return <PdfCard c={c} />;
  return <ArticuloCard c={c} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06 },
  }),
};

export default function ConversacionesPage() {
  const [tipoActivo, setTipoActivo] = useState<ConversacionTipo | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');

  const filtradas = useMemo(() => {
    return conversations.filter((c) => {
      const coincideTipo = tipoActivo === 'todos' || c.tipo === tipoActivo;
      const termino = busqueda.toLowerCase().trim();
      const coincideBusqueda =
        !termino ||
        c.titulo.toLowerCase().includes(termino) ||
        c.descripcion.toLowerCase().includes(termino) ||
        c.categoria.toLowerCase().includes(termino) ||
        (c.canal ?? '').toLowerCase().includes(termino) ||
        (c.fuente ?? '').toLowerCase().includes(termino) ||
        (c.evento ?? '').toLowerCase().includes(termino) ||
        (c.etiquetas ?? []).some((t) => t.toLowerCase().includes(termino));
      return coincideTipo && coincideBusqueda;
    });
  }, [tipoActivo, busqueda]);

  // Counts per type
  const counts = useMemo(() => {
    const total = conversations.length;
    const videos = conversations.filter((c) => c.tipo === 'video').length;
    const pdfs = conversations.filter((c) => c.tipo === 'pdf').length;
    const articulos = conversations.filter((c) => c.tipo === 'articulo').length;
    return { todos: total, video: videos, pdf: pdfs, articulo: articulos };
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans text-foreground bg-background">
      <Navbar />

      <main className="flex-grow">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="bg-[#0D1B2A] pt-32 pb-24 px-6 relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
          <div className="relative max-w-4xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-10 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Volver al laboratorio
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
            >
              <span className="text-[11px] text-accent font-semibold tracking-[0.25em] uppercase mb-5 block">
                Conversaciones
              </span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.05] mb-6">
                Videos, presentaciones{' '}
                <span className="text-accent italic">y artículos</span>
              </h1>
              <p className="text-xl text-white/50 font-light max-w-2xl leading-relaxed mb-10">
                Las conversaciones que el laboratorio ha tenido fuera de aquí.
                Conferencias, entrevistas, columnas y materiales de difusión.
              </p>

              {/* Type counters */}
              <div className="flex flex-wrap gap-4 mt-8">
                {[
                  { tipo: 'video' as ConversacionTipo, n: counts.video },
                  { tipo: 'pdf' as ConversacionTipo, n: counts.pdf },
                  { tipo: 'articulo' as ConversacionTipo, n: counts.articulo },
                ].map(({ tipo, n }) => {
                  const cfg = tipoConfig[tipo];
                  const Icon = cfg.Icon;
                  return (
                    <div
                      key={tipo}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border ${cfg.badgeDark}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[13px] font-semibold tabular-nums">{n}</span>
                      <span className="text-[12px] opacity-75">{cfg.label}{n !== 1 ? 's' : ''}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Filtros ───────────────────────────────────────────────────────── */}
        <section className="bg-[#F9F9F7] border-b border-border px-6 py-6 sticky top-16 z-40">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search */}
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
                <input
                  type="text"
                  aria-label="Buscar conversaciones"
                  placeholder="Buscar por título, tema o fuente…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-border rounded-full text-primary placeholder:text-primary/35 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary/60 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Counter */}
              <p className="text-sm text-primary/45 shrink-0 font-medium tabular-nums">
                <span className="text-accent font-bold text-base">{filtradas.length}</span>{' '}
                {filtradas.length === 1 ? 'conversación' : 'conversaciones'}
                {filtradas.length !== conversations.length && (
                  <span className="text-primary/30"> de {conversations.length}</span>
                )}
              </p>
            </div>

            {/* Type filter pills */}
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const n = f.value === 'todos' ? counts.todos : counts[f.value];
                return (
                  <button
                    key={f.value}
                    onClick={() => setTipoActivo(f.value)}
                    className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-200 ${
                      tipoActivo === f.value
                        ? 'bg-accent text-white border-accent shadow-sm'
                        : 'bg-white text-primary/55 border-border hover:border-accent/40 hover:text-primary'
                    }`}
                  >
                    {f.label}
                    {n > 0 && (
                      <span className={`ml-1.5 tabular-nums ${tipoActivo === f.value ? 'text-white/70' : 'text-primary/30'}`}>
                        {n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Grid ─────────────────────────────────────────────────────────── */}
        <section className="py-16 px-6 bg-white min-h-[50vh]">
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="popLayout">
              {filtradas.length > 0 ? (
                <motion.div
                  key="grid"
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {filtradas.map((c, i) => (
                    <motion.div
                      key={c.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.35, delay: i * 0.04 }}
                      className="h-full"
                    >
                      <ConversacionCard c={c} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-24"
                >
                  <p className="text-5xl mb-4">🔍</p>
                  <p className="text-xl font-serif text-primary/50 mb-2">
                    Ninguna conversación coincide.
                  </p>
                  <p className="text-sm text-primary/35 mb-6">
                    Prueba con otro término o cambia el filtro.
                  </p>
                  <button
                    onClick={() => { setBusqueda(''); setTipoActivo('todos'); }}
                    className="text-sm font-semibold text-accent hover:underline"
                  >
                    Ver todas las conversaciones
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="py-28 px-6 bg-[#0D1B2A]">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <span className="text-[11px] text-accent font-semibold tracking-[0.25em] uppercase mb-6 block">
                ¿Hay algo que quieras conversar?
              </span>
              <h2 className="text-4xl md:text-5xl font-serif text-white mb-6 leading-tight">
                Invítame a tu evento<br />o publicación
              </h2>
              <p className="text-lg text-white/45 font-light leading-relaxed mb-10 max-w-lg mx-auto">
                Si tienes un espacio — conferencia, podcast, medio, seminario — donde
                valga la pena conversar sobre datos, sector TIC o política pública,
                escríbeme.
              </p>
              <a
                href="mailto:juan.cobo@contraloria.gov.co?subject=Invitación%20a%20conversar"
                className="inline-flex items-center gap-3 bg-accent hover:bg-accent/90 text-white font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25"
              >
                <Mail className="w-4 h-4" />
                Escríbeme
              </a>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Mini footer */}
      <div className="bg-[#0D1B2A] border-t border-white/8 px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/25">
          <p className="font-serif italic text-white/35">Juan Cobo Lab</p>
          <p>© {new Date().getFullYear()} · Hecho con datos y café · Bogotá, Colombia</p>
          <Link href="/" className="hover:text-white/50 transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
