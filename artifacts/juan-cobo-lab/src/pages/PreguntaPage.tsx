import React from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'wouter';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { getArticle, getQuestion } from '../data/questionArticles';
import PreguntaTemplate from '../templates/PreguntaTemplate';

export default function PreguntaPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? '', 10);

  const question = getQuestion(id);
  const article = getArticle(id);

  // ── Unknown question (not in questions.ts at all) ─────────────────────────
  if (!question || isNaN(id)) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0D1B2A]">
        <Navbar />
        <div className="flex-grow flex items-center justify-center px-6 py-32 text-center">
          <div>
            <FlaskConical className="w-10 h-10 text-accent/40 mx-auto mb-6" />
            <h1 className="text-4xl font-serif text-white mb-4">Pregunta no encontrada</h1>
            <p className="text-white/40 mb-10">
              Esta pregunta no existe en el laboratorio todavía.
            </p>
            <Link
              href="/preguntas"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white/70 hover:border-white/40 hover:text-white transition-all text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Ver todas las preguntas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Article not yet written ───────────────────────────────────────────────
  if (!article) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0D1B2A]">
        <Navbar />

        <main className="flex-grow">
          {/* Hero stub */}
          <section className="relative overflow-hidden pt-36 pb-28 px-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
            <div className="relative max-w-3xl mx-auto">
              <Link
                href="/preguntas"
                className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-14 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Volver a las preguntas
              </Link>

              <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
              >
                <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-accent block mb-4">
                  {question.categoria}
                </span>
                <h1 className="text-4xl md:text-6xl font-serif text-white leading-[1.1] mb-8">
                  {question.pregunta}
                </h1>
                <p className="text-lg text-white/45 font-light leading-relaxed mb-14">
                  {question.importancia}
                </p>

                {/* Coming soon state */}
                <div className="border border-dashed border-white/15 rounded-2xl p-10 text-center">
                  <FlaskConical className="w-8 h-8 text-accent/40 mx-auto mb-5" />
                  <p className="text-white/50 text-lg font-serif mb-2">
                    Análisis en preparación
                  </p>
                  <p className="text-white/25 text-sm leading-relaxed max-w-md mx-auto">
                    Todavía no he terminado de pensar en voz alta sobre esta pregunta.
                    Vuelve pronto o escríbeme si quieres discutirla antes.
                  </p>
                  <a
                    href="mailto:juan.cobo@contraloria.gov.co?subject=Quiero%20discutir%20esta%20pregunta"
                    className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl bg-accent/10 border border-accent/30 text-accent text-sm font-medium hover:bg-accent/20 transition-all"
                  >
                    Escríbeme sobre esto
                  </a>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        {/* Mini footer */}
        <div className="border-t border-white/8 px-6 py-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/25">
            <p className="font-serif italic text-white/35">Juan Cobo Lab</p>
            <p>© {new Date().getFullYear()} · Bogotá, Colombia</p>
            <Link href="/" className="hover:text-white/50 transition-colors">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Full article ──────────────────────────────────────────────────────────
  return <PreguntaTemplate article={article} />;
}
