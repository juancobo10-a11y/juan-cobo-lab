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
  Mail,
  Clock,
  Youtube,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { conversations, type Conversacion } from '../data/conversations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORIAS = ['Todos', ...Array.from(new Set(conversations.map((c) => c.categoria)))];

function thumbUrl(youtubeId: string) {
  return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
}

// ─── Action button ────────────────────────────────────────────────────────────

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
        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 ${activeClass}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        {label}
      </a>
    );
  }
  return (
    <span
      aria-disabled="true"
      title="Próximamente"
      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium bg-primary/[0.04] text-primary/25 border border-primary/[0.06] cursor-not-allowed select-none"
    >
      <Clock className="w-3.5 h-3.5 shrink-0" />
      Próximamente
    </span>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({ c, index }: { c: Conversacion; index: number }) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="flex flex-col h-full bg-white border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
    >
      {/* ── Thumbnail ───────────────────────────────────────────────────── */}
      <div className="relative aspect-video bg-[#0D1B2A] overflow-hidden">
        {c.youtubeId && !imgError ? (
          <img
            src={thumbUrl(c.youtubeId)}
            alt={c.titulo}
            onError={() => setImgError(true)}
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
            <Youtube className="w-12 h-12 text-white/15" />
          </div>
        )}

        {/* Dark gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center group-hover:bg-rose-500/90 group-hover:border-rose-500 group-hover:scale-110 transition-all duration-300 shadow-lg">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* Duration badge */}
        {c.duracion && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/75 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md backdrop-blur-sm">
            <Clock className="w-3 h-3" />
            {c.duracion}
          </span>
        )}

        {/* Category badge over thumbnail */}
        <span className="absolute top-3 left-3 text-[10px] font-bold tracking-[0.15em] uppercase text-accent/90 bg-black/50 backdrop-blur-sm border border-accent/30 px-2.5 py-1 rounded-full">
          {c.categoria}
        </span>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-grow px-5 pt-4 pb-5">
        {/* Meta */}
        <div className="flex items-center gap-2 mb-3">
          <Youtube className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span className="text-[11px] text-primary/40 font-medium truncate">{c.tema}</span>
          <span className="text-primary/20 shrink-0">·</span>
          <span className="text-[11px] text-primary/35 shrink-0">{c.fecha}</span>
        </div>

        {/* Title */}
        <h3 className="font-serif text-[17px] text-primary leading-snug mb-2 flex-grow group-hover:text-accent transition-colors duration-200 line-clamp-3">
          {c.titulo}
        </h3>

        {/* Description */}
        <p className="text-[12.5px] text-primary/45 leading-relaxed line-clamp-2 mb-4">
          {c.descripcion}
        </p>

        {/* ── Action buttons ───────────────────────────────────────────── */}
        <div className="flex gap-2 pt-4 border-t border-border">
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
            label="Presentación"
            activeClass="bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-500 hover:text-white hover:border-amber-500"
          />
        </div>
      </div>
    </motion.article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConversacionesPage() {
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');

  const filtradas = useMemo(() => {
    return conversations.filter((c) => {
      const coincideCategoria =
        categoriaActiva === 'Todos' || c.categoria === categoriaActiva;
      const termino = busqueda.toLowerCase().trim();
      const coincideBusqueda =
        !termino ||
        c.titulo.toLowerCase().includes(termino) ||
        c.tema.toLowerCase().includes(termino) ||
        c.descripcion.toLowerCase().includes(termino) ||
        c.categoria.toLowerCase().includes(termino) ||
        (c.fecha ?? '').toLowerCase().includes(termino);
      return coincideCategoria && coincideBusqueda;
    });
  }, [categoriaActiva, busqueda]);

  const totalVideos = conversations.filter((c) => c.youtubeUrl).length;

  return (
    <div className="min-h-screen flex flex-col font-sans text-foreground bg-background">
      <Navbar />

      <main className="flex-grow">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
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
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/3 w-[600px] h-[400px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, hsl(24 69% 53%) 0%, transparent 70%)' }}
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
                Juan Cobo Lab
              </span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.05] mb-6">
                Conversaciones
              </h1>
              <p className="text-xl text-white/50 font-light max-w-xl leading-relaxed">
                Algunas preguntas también necesitan ser habladas.
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 mt-10 pt-10 border-t border-white/8">
                <div>
                  <p className="font-serif text-4xl text-white tabular-nums">{conversations.length}</p>
                  <p className="text-[11px] text-white/35 mt-0.5">conversaciones</p>
                </div>
                <div>
                  <p className="font-serif text-4xl text-white tabular-nums">{totalVideos}</p>
                  <p className="text-[11px] text-white/35 mt-0.5">videos disponibles</p>
                </div>
                <div>
                  <p className="font-serif text-4xl text-white tabular-nums">
                    {conversations.filter((c) => c.pdfUrl).length}
                  </p>
                  <p className="text-[11px] text-white/35 mt-0.5">presentaciones</p>
                </div>
                <div>
                  <p className="font-serif text-4xl text-white tabular-nums">
                    {conversations.filter((c) => c.articuloUrl).length}
                  </p>
                  <p className="text-[11px] text-white/35 mt-0.5">artículos</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Filtros ───────────────────────────────────────────────────── */}
        <section className="bg-[#F9F9F7] border-b border-border px-6 py-5 sticky top-16 z-40">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search */}
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
                <input
                  type="text"
                  aria-label="Buscar conversaciones"
                  placeholder="Buscar por título, tema o categoría…"
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
                {filtradas.length === 1 ? 'video' : 'videos'}
                {filtradas.length !== conversations.length && (
                  <span className="text-primary/30"> de {conversations.length}</span>
                )}
              </p>
            </div>

            {/* Category pills */}
            {CATEGORIAS.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaActiva(cat)}
                    className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-200 ${
                      categoriaActiva === cat
                        ? 'bg-accent text-white border-accent shadow-sm'
                        : 'bg-white text-primary/55 border-border hover:border-accent/40 hover:text-primary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Grid ──────────────────────────────────────────────────────── */}
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
                    <VideoCard key={c.id} c={c} index={i} />
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
                    Ningún video coincide.
                  </p>
                  <p className="text-sm text-primary/35 mb-6">
                    Prueba con otro término o cambia la categoría.
                  </p>
                  <button
                    onClick={() => {
                      setBusqueda('');
                      setCategoriaActiva('Todos');
                    }}
                    className="text-sm font-semibold text-accent hover:underline"
                  >
                    Ver todos los videos
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
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
                Si tienes un espacio —conferencia, podcast, medio, seminario— donde
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
