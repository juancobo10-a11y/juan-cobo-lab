import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import {
  ArrowLeft,
  Clock,
  Calendar,
  Share2,
  Zap,
  TrendingUp,
  Flame,
  CheckCircle2,
  HelpCircle,
  MessageSquareQuote,
  FlaskConical,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { type QuestionArticle, type NivelImpacto, getQuestion } from '../data/questionArticles';
import { questions } from '../data/questions';

// ─── Constants ────────────────────────────────────────────────────────────────

const impactoConfig: Record<
  NivelImpacto,
  { label: string; Icon: React.ElementType; className: string; dark: string }
> = {
  medio: {
    label: 'Impacto medio',
    Icon: TrendingUp,
    className: 'bg-blue-50 text-blue-600 border-blue-200',
    dark: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  },
  alto: {
    label: 'Impacto alto',
    Icon: Zap,
    className: 'bg-amber-50 text-amber-600 border-amber-200',
    dark: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  },
  transformador: {
    label: 'Impacto transformador',
    Icon: Flame,
    className: 'bg-rose-50 text-rose-600 border-rose-200',
    dark: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  },
};

const categoriaColorDark: Record<string, string> = {
  Sentido: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  'Política pública': 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  Método: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  Investigación: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  Vida: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  Liderazgo: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  TIC: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  Educación: 'bg-lime-500/10 text-lime-300 border-lime-500/20',
  Productividad: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
  'TIC y Paz': 'bg-teal-500/10 text-teal-300 border-teal-500/20',
};

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

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08 },
  }),
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide border ${className}`}
    >
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-accent block mb-4">
      {children}
    </span>
  );
}

function Prose({ text, className = '' }: { text: string; className?: string }) {
  return (
    <>
      {text.split('\n\n').map((para, i) => (
        <p key={i} className={`leading-[1.85] text-[17px] ${className} ${i > 0 ? 'mt-5' : ''}`}>
          {para}
        </p>
      ))}
    </>
  );
}

// ─── Main template ────────────────────────────────────────────────────────────

interface PreguntaTemplateProps {
  article: QuestionArticle;
}

export default function PreguntaTemplate({ article }: PreguntaTemplateProps) {
  const question = getQuestion(article.id);
  const impacto = impactoConfig[article.nivelImpacto];
  const ImpactoIcon = impacto.Icon;

  // Web Share API with clipboard fallback
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const text = question ? `"${question.pregunta}" — Juan Cobo Lab` : 'Juan Cobo Lab';
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch {
        // user cancelled — no-op
      }
    } else {
      await navigator.clipboard.writeText(url);
      // Brief visual feedback handled by the button state (could enhance later)
    }
  }, [question]);

  // Related questions
  const relacionadas = article.preguntasRelacionadas
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean);

  if (!question) return null;

  const catColorDark = categoriaColorDark[question.categoria] ?? 'bg-white/10 text-white/70 border-white/20';
  const catColorLight = categoriaColorLight[question.categoria] ?? 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <div className="min-h-screen flex flex-col font-sans text-foreground bg-background">
      <Navbar />

      <main className="flex-grow">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative bg-[#0D1B2A] overflow-hidden">
          {/* Subtle grid texture */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
          {/* Copper glow top-right */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, hsl(24 69% 53%) 0%, transparent 70%)' }}
          />

          <div className="relative max-w-4xl mx-auto px-6 pt-36 pb-28">
            {/* Back link */}
            <Link
              href="/preguntas"
              className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-14 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Volver a las preguntas
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75 }}
            >
              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-2.5 mb-10">
                <Badge className={catColorDark}>{question.categoria}</Badge>
                <Badge className={impacto.dark}>
                  <ImpactoIcon className="w-3 h-3" />
                  {impacto.label}
                </Badge>
                <span className="flex items-center gap-1.5 text-white/35 text-[12px]">
                  <Clock className="w-3.5 h-3.5" />
                  {article.tiempoLectura} min de lectura
                </span>
                <span className="flex items-center gap-1.5 text-white/35 text-[12px]">
                  <Calendar className="w-3.5 h-3.5" />
                  {article.fechaActualizacion}
                </span>
              </div>

              {/* Question number */}
              <span className="font-serif text-8xl text-white/[0.04] select-none leading-none block mb-2 tabular-nums">
                {String(article.id).padStart(2, '0')}
              </span>

              {/* Title */}
              <h1 className="text-4xl md:text-6xl font-serif text-white leading-[1.1] mb-10 -mt-6">
                {question.pregunta}
              </h1>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-gradient-to-r from-accent/60 via-accent/20 to-transparent" />
                <FlaskConical className="w-4 h-4 text-accent/60 shrink-0" />
              </div>

              {/* Standfirst */}
              <p className="text-lg text-white/45 font-light leading-relaxed max-w-2xl">
                {question.importancia}
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── ¿Por qué me da pereque? ──────────────────────────────────────── */}
        <section className="py-24 px-6 bg-[#F9F9F7]">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <SectionLabel>¿Por qué me da pereque?</SectionLabel>
              <h2 className="text-3xl md:text-4xl font-serif text-primary leading-snug mb-10">
                De dónde viene esta pregunta
              </h2>
              {/* Copper left-border prose block */}
              <div className="border-l-[3px] border-accent pl-7">
                <Prose text={article.porQuePereque} className="text-primary/70 italic" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── ¿Por qué debería importarte? ─────────────────────────────────── */}
        <section className="py-24 px-6 bg-white">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <SectionLabel>¿Por qué debería importarte?</SectionLabel>
              <h2 className="text-3xl md:text-4xl font-serif text-primary leading-snug mb-10">
                El argumento para el lector
              </h2>
              {/* Callout box */}
              <div className="bg-[#0D1B2A] rounded-2xl p-8 mb-8">
                <MessageSquareQuote className="w-6 h-6 text-accent mb-4" />
                <Prose
                  text={article.porQueImporta}
                  className="text-white/70"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Lo que sabemos ───────────────────────────────────────────────── */}
        <section className="py-28 px-6 bg-[#0D1B2A]">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              className="mb-16"
            >
              <SectionLabel>Lo que sabemos</SectionLabel>
              <h2 className="text-3xl md:text-5xl font-serif text-white leading-snug">
                La evidencia disponible
              </h2>
            </motion.div>

            <div className="space-y-0 divide-y divide-white/8">
              {article.loQueSabemos.map((point, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  className="py-10 grid grid-cols-1 md:grid-cols-[72px_1fr] gap-6 md:gap-10"
                >
                  <div className="flex items-start gap-3 md:block">
                    <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 md:mb-3 shrink-0" />
                    <span className="font-serif text-4xl text-accent/20 leading-none tabular-nums hidden md:block">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-white mb-3 leading-snug">
                      {point.titulo}
                    </h3>
                    <p className="text-white/50 leading-relaxed text-[16px]">
                      {point.descripcion}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Lo que todavía no sabemos ─────────────────────────────────────── */}
        <section className="py-28 px-6 bg-[#F9F9F7]">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              className="mb-16"
            >
              <SectionLabel>Lo que todavía no sabemos</SectionLabel>
              <h2 className="text-3xl md:text-5xl font-serif text-primary leading-snug">
                Las preguntas abiertas
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {article.loQueNoSabemos.map((point, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  className="border-2 border-dashed border-primary/15 rounded-2xl p-8 hover:border-accent/40 transition-colors duration-300"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <HelpCircle className="w-5 h-5 text-accent/60 shrink-0 mt-0.5" />
                    <span className="font-serif text-2xl text-primary/15 leading-none tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="text-[18px] font-serif text-primary mb-3 leading-snug">
                    {point.titulo}
                  </h3>
                  <p className="text-primary/55 leading-relaxed text-[15px]">
                    {point.descripcion}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Mi posición hoy ───────────────────────────────────────────────── */}
        <section className="py-28 px-6 bg-[#060E18]">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              {/* OPINIÓN badge */}
              <div className="flex items-center gap-3 mb-10">
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-accent border border-accent/40 rounded px-3 py-1.5">
                  Opinión
                </span>
                <span className="text-white/20 text-xs">
                  Esta es la posición personal del autor — no de ninguna institución
                </span>
              </div>

              <SectionLabel>Mi posición hoy</SectionLabel>
              <h2 className="text-3xl md:text-4xl font-serif text-white leading-snug mb-10">
                Lo que pienso, con la evidencia que tengo
              </h2>

              <div className="space-y-6">
                <Prose text={article.miPosicion} className="text-white/65" />
              </div>

              {/* Disclaimer */}
              <div className="mt-14 pt-8 border-t border-white/8">
                <p className="text-white/25 text-sm italic leading-relaxed">
                  Las posiciones evolucionan. Esta fue escrita en{' '}
                  {article.fechaActualizacion}. Si la evidencia cambia, esta
                  posición también.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Sigamos dando pereque ─────────────────────────────────────────── */}
        {relacionadas.length > 0 && (
          <section className="py-28 px-6 bg-white">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                className="mb-16"
              >
                <SectionLabel>Sigamos dando pereque</SectionLabel>
                <h2 className="text-3xl md:text-4xl font-serif text-primary leading-snug">
                  Tres preguntas relacionadas
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relacionadas.map((q, i) =>
                  q ? (
                    <motion.div
                      key={q.id}
                      custom={i}
                      variants={fadeUp}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true }}
                    >
                      <Link href={`/preguntas/${q.id}`}>
                        <div className="group h-full border border-border rounded-2xl p-7 hover:border-accent/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col">
                          {/* Number + category */}
                          <div className="flex items-center justify-between mb-5">
                            <span className="font-serif text-3xl text-primary/10 tabular-nums">
                              {String(q.id).padStart(2, '0')}
                            </span>
                            <Badge
                              className={
                                catColorLight
                                  ? (categoriaColorLight[q.categoria] ??
                                    'bg-gray-50 text-gray-600 border-gray-200')
                                  : 'bg-gray-50 text-gray-600 border-gray-200'
                              }
                            >
                              {q.categoria}
                            </Badge>
                          </div>

                          {/* Question */}
                          <p className="font-serif text-[16px] text-primary leading-snug mb-4 flex-grow group-hover:text-accent transition-colors duration-300">
                            {q.pregunta}
                          </p>

                          <div className="flex items-center gap-2 text-accent text-[13px] font-medium mt-2">
                            <span>Explorar</span>
                            <ArrowLeft className="w-3.5 h-3.5 rotate-180 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ) : null
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── CTA final ────────────────────────────────────────────────────── */}
        <section className="py-24 px-6 bg-[#0D1B2A]">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <FlaskConical className="w-8 h-8 text-accent mx-auto mb-6 opacity-60" />
              <h2 className="text-3xl md:text-4xl font-serif text-white mb-4 leading-snug">
                ¿Esta pregunta también te da pereque?
              </h2>
              <p className="text-white/40 text-[16px] leading-relaxed mb-12">
                Escríbeme. Me interesa saber qué parte de este análisis
                te convence, qué te genera dudas, o qué yo no estoy viendo.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/preguntas">
                  <button className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl border border-white/20 text-white/80 text-[15px] font-medium hover:border-white/40 hover:text-white hover:bg-white/5 transition-all duration-200 group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Volver a las preguntas
                  </button>
                </Link>

                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-accent text-white text-[15px] font-medium hover:bg-accent/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-accent/20"
                >
                  <Share2 className="w-4 h-4" />
                  Compartir esta conversación
                </button>
              </div>
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
