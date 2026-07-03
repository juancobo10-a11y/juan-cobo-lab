import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { FaLinkedin, FaGraduationCap, FaEnvelope } from 'react-icons/fa';

const socials = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/juan-cobo-ph-d-9801672b',
    icon: <FaLinkedin size={15} />,
  },
  {
    label: 'Google Scholar',
    href: 'https://scholar.google.com/citations?user=USgdRhcAAAAJ&hl=es',
    icon: <FaGraduationCap size={15} />,
  },
  {
    label: 'ORCID',
    href: 'https://orcid.org/0000-0003-0138-7051',
    icon: <span className="text-[11px] font-bold tracking-wide">iD</span>,
  },
  {
    label: 'Correo',
    href: 'mailto:juan.cobo@contraloria.gov.co',
    icon: <FaEnvelope size={15} />,
  },
];

export function Footer() {
  return (
    <footer className="bg-[#0D1B2A] text-white">
      {/* Main CTA */}
      <div className="max-w-3xl mx-auto px-6 py-36 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.05] mb-6">
            ¿Llegaste hasta aquí?
          </h2>
          <p className="text-xl text-white/55 font-light max-w-lg mx-auto mb-3 leading-relaxed">
            Entonces probablemente también disfrutas hacer buenas preguntas.
          </p>
          <p className="text-lg text-white/30 italic mb-14 leading-relaxed">
            Tomemos un café.
            <br />
            (O al menos una buena conversación sobre datos.)
          </p>

          {/* Social buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target={s.href.startsWith('mailto') ? undefined : '_blank'}
                rel={s.href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                className="flex items-center gap-2.5 bg-white/5 hover:bg-accent border border-white/10 hover:border-accent text-white/65 hover:text-white px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:-translate-y-0.5"
              >
                {s.icon}
                {s.label}
              </a>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8 px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/25">
          <p className="font-serif italic text-white/35">Juan Cobo Lab</p>
          <p>© {new Date().getFullYear()} · Hecho con datos y café · Bogotá, Colombia</p>
          <nav className="flex gap-6" aria-label="Footer">
            <a href="#about" className="hover:text-white/50 transition-colors">Sobre mí</a>
            <a href="#publications" className="hover:text-white/50 transition-colors">Publicaciones</a>
            <a href="#tools" className="hover:text-white/50 transition-colors">Herramientas</a>
            <Link href="/constitucion" className="hover:text-white/50 transition-colors">La Constitución</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
