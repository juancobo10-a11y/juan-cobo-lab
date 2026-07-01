import React from 'react';
import { FaLinkedin, FaGraduationCap, FaEnvelope } from 'react-icons/fa';
import { FlaskConical } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#121f33] text-white py-16 border-t-4 border-accent">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-accent" />
              <span className="font-serif text-2xl font-bold italic tracking-wide">Juan Cobo Lab</span>
            </div>
            <p className="text-white/60 font-light max-w-xs">
              Evidencia, método y café. Un espacio para pensar y diseñar mejores políticas públicas.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col space-y-3">
            <h4 className="font-semibold text-white/90 uppercase tracking-wider text-sm mb-2">Navegación</h4>
            <a href="#about" className="text-white/60 hover:text-accent transition-colors">Sobre mí</a>
            <a href="#articles" className="text-white/60 hover:text-accent transition-colors">Artículos</a>
            <a href="#publications" className="text-white/60 hover:text-accent transition-colors">Publicaciones</a>
            <a href="#tools" className="text-white/60 hover:text-accent transition-colors">Herramientas</a>
          </div>

          {/* Social */}
          <div className="flex flex-col space-y-3 md:items-end">
            <h4 className="font-semibold text-white/90 uppercase tracking-wider text-sm mb-2">Contacto</h4>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/80 hover:bg-accent hover:text-white transition-all" aria-label="LinkedIn">
                <FaLinkedin size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/80 hover:bg-accent hover:text-white transition-all" aria-label="Google Scholar">
                <FaGraduationCap size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/80 hover:bg-accent hover:text-white transition-all font-bold font-serif" aria-label="ORCID">
                iD
              </a>
              <a href="mailto:juan@juancobolab.co" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/80 hover:bg-accent hover:text-white transition-all" aria-label="Email">
                <FaEnvelope size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-white/40">
          <p>© {new Date().getFullYear()} Juan Cobo Lab. Hecho con datos y algo de café.</p>
        </div>
      </div>
    </footer>
  );
}
