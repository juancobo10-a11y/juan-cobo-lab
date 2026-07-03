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
  MessageCircle,
  Clock,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { conversations, type Conversacion } from '../data/conversations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORIAS = ['Todos', ...Array.from(new Set(conversations.map((c) => c.categoria)))];

// ─── Unified Card ─────────────────────────────────────────────────────────────

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
      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium bg-primary/[0.04] text-primary/25 border border-primary/[0.06] select-none cursor-not-allowed"
    >
      <Clock className="w-3.5 h-3.5 shrink-0" />
      Próximamente
    </span>
  );
}

function ConversacionCard({ c, index }: { c: Conversacion; index: number }) {
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, delay: index * 0.055 } },
  };

  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.97 }}
      className="flex flex-col h-full bg-white border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
    >
      {/* ── Header: tema + meta ─────────────────────────────────────────── */}
      <div className="relative bg-[#0D1B2A] px-6 pt-7 pb-6 overflow-hidden">
        {/* Subtle grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Copper accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent opacity-70" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-accent/80 bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full">
              {c.categoria}
            </span>
            <span className="text-[11px] text-white/30">{c.fecha}</span>
          </div>
          <p className="font-serif text-white/70 text-[14px] leading-snug italic line-clamp-2">
            {c.tema}
          </p>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-grow px-6 pt-5 pb-6">
        <h3 className="font-serif text-[18px] text-primary leading-snug mb-3 group-hover:text-accent transition-colors duration-200">
          {c.titulo}
        </h3>
        <p className="text-[13px] text-primary/50 leading-relaxed line-clamp-3 flex-grow">
          {c.descripcion}
        </p>

        {/* ── Action buttons ───────────────────────────────────────────── */}
        <div className="flex gap-2 mt-5 pt-5 border-t border-border">
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
        c.categoria.toLowerCase().includes(termino);
      return coincideCategoria && coincideBusqueda;
    });
  }, [categoriaActiva, busqueda]);

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
          {/* Copper glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/3 w-[600px] h-[400px] rounded-full opacity-[0.07]"
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

              {/* Stats row */}
              <div className="flex flex-wrap gap-6 mt-10 pt-10 border-t border-white/8">
                {[
                  { n: conversations.length, label: 'conversaciones' },
                  {
                    n: conversations.filter((c) => c.youtubeUrl).length,
                    label: 'videos disponibles',
                  },
                  {
                    n: conversations.filter((c) => c.pdfUrl).length,
                    label: 'presentaciones',
                  },
                  {
                    n: conversations.filter((c) => c.articuloUrl).length,
                    label: 'artículos',
                  },
                ].map(({ n, label }) => (
                  <div key={label} className="text-center">
                    <p className="font-serif text-3xl text-white tabular-nums">{n}</p>
                    <p className="text-[11px] text-white/35 mt-0.5">{label}</p>
                  </div>
                ))}
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
                {filtradas.length === 1 ? 'conversación' : 'conversaciones'}
                {filtradas.length !== conversations.length && (
                  <span className="text-primary/30"> de {conversations.length}</span>
                )}
              </p>
            </div>

            {/* Category pills */}
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
                    <ConversacionCard key={c.id} c={c} index={i} />
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
                    Prueba con otro término o cambia la categoría.
                  </p>
                  <button
                    onClick={() => {
                      setBusqueda('');
                      setCategoriaActiva('Todos');
                    }}
                    className="text-sm font-semibold text-accent hover:underline"
                  >
                    Ver todas las conversaciones
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
