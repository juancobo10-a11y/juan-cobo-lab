import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { ArrowLeft, Search, X, Mail, BookOpen } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { questions, CATEGORIAS } from '../data/questions';
import { questionArticles } from '../data/questionArticles';

// IDs que ya tienen artículo publicado
const publishedIds = new Set(questionArticles.map((a) => a.id));

const ALL = 'Todas';

// Color map por categoría para el badge
const categoriaColor: Record<string, string> = {
  Sentido: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'Política pública': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Método: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Investigación: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Vida: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Liderazgo: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  TIC: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Educación: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
  Productividad: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'TIC y Paz': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

// Mismos colores pero para la versión clara (sección blanca de cards)
const categoriaColorLight: Record<string, string> = {
  Sentido: 'bg-violet-50 text-violet-600 border-violet-200',
  'Política pública': 'bg-blue-50 text-blue-600 border-blue-200',
  Método: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  Investigación: 'bg-amber-50 text-amber-600 border-amber-200',
  Vida: 'bg-rose-50 text-rose-600 border-rose-200',
  Liderazgo: 'bg-orange-50 text-orange-600 border-orange-200',
  TIC: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  Educación: 'bg-lime-50 text-lime-700 border-lime-200',
  Productividad: 'bg-pink-50 text-pink-600 border-pink-200',
  'TIC y Paz': 'bg-teal-50 text-teal-600 border-teal-200',
};

export default function Preguntas() {
  const [categoriaActiva, setCategoriaActiva] = useState<string>(ALL);
  const [busqueda, setBusqueda] = useState('');

  const filtradas = useMemo(() => {
    return questions.filter((q) => {
      const coincideCategoria =
        categoriaActiva === ALL || q.categoria === categoriaActiva;
      const termino = busqueda.toLowerCase().trim();
      const coincideBusqueda =
        !termino ||
        q.pregunta.toLowerCase().includes(termino) ||
        q.pereque.toLowerCase().includes(termino) ||
        q.importancia.toLowerCase().includes(termino) ||
        q.categoria.toLowerCase().includes(termino);
      return coincideCategoria && coincideBusqueda;
    });
  }, [categoriaActiva, busqueda]);

  const categorias = [ALL, ...CATEGORIAS];

  return (
    <div className="min-h-screen flex flex-col font-sans text-foreground bg-background">
      <Navbar />

      <main className="flex-grow">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="bg-[#0D1B2A] pt-32 pb-24 px-6">
          <div className="max-w-4xl mx-auto">
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
                Preguntas abiertas
              </span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.05] mb-6">
                Las preguntas que{' '}
                <span className="text-accent italic">me dan pereque</span>
              </h1>
              <p className="text-xl text-white/50 font-light max-w-2xl leading-relaxed mb-10">
                No porque tenga todas las respuestas, sino porque creo que vale la pena
                seguir haciendo mejores preguntas.
              </p>

              {/* Intro */}
              <div className="border-l-2 border-accent/40 pl-6 max-w-xl">
                <p className="text-white/45 leading-relaxed text-[17px]">
                  "Dar pereque" no es quejarse. Es esa incomodidad productiva que te
                  persigue cuando sabes que la pregunta importa y todavía no tienes
                  una respuesta honesta. Este es mi registro de las que no me dejan
                  en paz.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Controles ────────────────────────────────────── */}
        <section className="bg-[#F9F9F7] border-b border-border px-6 py-8 sticky top-16 z-40">
          <div className="max-w-6xl mx-auto space-y-5">
            {/* Buscador + contador */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Buscador */}
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
                <input
                  type="text"
                  placeholder="Buscar pregunta, categoría o tema…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-border rounded-full text-primary placeholder:text-primary/35 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary/60 transition-colors"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Contador */}
              <p className="text-sm text-primary/45 shrink-0 font-medium tabular-nums">
                <span className="text-accent font-bold text-base">{filtradas.length}</span>{' '}
                {filtradas.length === 1 ? 'pregunta abierta' : 'preguntas abiertas'}
                {filtradas.length !== questions.length && (
                  <span className="text-primary/30"> de {questions.length}</span>
                )}
              </p>
            </div>

            {/* Filtros por categoría */}
            <div className="flex flex-wrap gap-2">
              {categorias.map((cat) => (
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

        {/* ── Cards ────────────────────────────────────────── */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="popLayout">
              {filtradas.length > 0 ? (
                <motion.div
                  key="grid"
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  {filtradas.map((q, i) => {
                    const hasArticle = publishedIds.has(q.id);
                    const card = (
                      <motion.div
                        key={q.id}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.35, delay: i * 0.04 }}
                        className={`group flex flex-col bg-[#F9F9F7] border rounded-2xl p-7 transition-all duration-300 hover:shadow-md h-full ${
                          hasArticle
                            ? 'border-accent/20 hover:border-accent/50 cursor-pointer hover:-translate-y-1'
                            : 'border-transparent hover:border-accent/15'
                        }`}
                      >
                        {/* Numero + Categoría */}
                        <div className="flex items-center justify-between mb-5">
                          <span className="text-3xl font-serif text-primary/10 tabular-nums leading-none font-bold">
                            {String(q.id).padStart(2, '0')}
                          </span>
                          <span
                            className={`text-[10px] font-bold tracking-[0.18em] uppercase px-2.5 py-1 rounded-full border ${categoriaColorLight[q.categoria] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}
                          >
                            {q.categoria}
                          </span>
                        </div>

                        {/* Pregunta */}
                        <h2 className={`text-lg md:text-xl font-serif leading-snug mb-5 flex-grow transition-colors duration-200 ${hasArticle ? 'text-primary group-hover:text-accent' : 'text-primary'}`}>
                          {q.pregunta}
                        </h2>

                        {/* Divider */}
                        <div className="border-t border-border/60 pt-5 space-y-3">
                          {/* Pereque */}
                          <div>
                            <span className="text-[10px] font-bold text-accent/70 tracking-[0.15em] uppercase block mb-1">
                              ¿Por qué da pereque?
                            </span>
                            <p className="text-sm text-primary/55 leading-relaxed">
                              {q.pereque}
                            </p>
                          </div>
                          {/* Importancia */}
                          <div>
                            <span className="text-[10px] font-bold text-primary/30 tracking-[0.15em] uppercase block mb-1">
                              Por qué importa
                            </span>
                            <p className="text-sm text-primary/45 leading-relaxed">
                              {q.importancia}
                            </p>
                          </div>
                          {/* Published indicator */}
                          {hasArticle && (
                            <div className="flex items-center gap-1.5 pt-1 text-accent text-[12px] font-semibold">
                              <BookOpen className="w-3.5 h-3.5" />
                              Leer análisis →
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );

                    return hasArticle ? (
                      <Link key={q.id} href={`/preguntas/${q.id}`}>
                        {card}
                      </Link>
                    ) : (
                      <div key={q.id}>{card}</div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-24"
                >
                  <p className="text-5xl mb-4">🤔</p>
                  <p className="text-xl font-serif text-primary/50 mb-2">
                    Ninguna pregunta coincide.
                  </p>
                  <p className="text-sm text-primary/35">
                    Prueba con otro término o cambia la categoría.
                  </p>
                  <button
                    onClick={() => {
                      setBusqueda('');
                      setCategoriaActiva(ALL);
                    }}
                    className="mt-6 text-sm font-semibold text-accent hover:underline"
                  >
                    Ver todas las preguntas
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── CTA final ────────────────────────────────────── */}
        <section className="py-28 px-6 bg-[#0D1B2A]">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <span className="text-[11px] text-accent font-semibold tracking-[0.25em] uppercase mb-6 block">
                ¿Y tú qué pregunta tienes?
              </span>
              <h2 className="text-4xl md:text-5xl font-serif text-white mb-6 leading-tight">
                ¿Tienes una pregunta que te da pereque?
              </h2>
              <p className="text-lg text-white/45 font-light leading-relaxed mb-10 max-w-lg mx-auto">
                Las mejores conversaciones empiezan con una buena pregunta, no con una
                respuesta ya preparada. Escríbeme.
              </p>
              <a
                href="mailto:juan.cobo@contraloria.gov.co?subject=Una%20pregunta%20que%20me%20da%20pereque"
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
