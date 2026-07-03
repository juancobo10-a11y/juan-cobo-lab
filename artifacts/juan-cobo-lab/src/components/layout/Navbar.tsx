import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { FlaskConical, Menu, X } from 'lucide-react';

const sectionLinks = [
  { hash: 'about', label: 'Sobre mí' },
  { hash: 'thinking', label: 'Ideas' },
  { hash: 'publications', label: 'Publicaciones' },
  { hash: 'tools', label: 'Herramientas' },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();

  const isHome = location === '/';

  // When on home, use #hash (smooth scroll). When on another page, use /#hash (navigate + scroll).
  const anchorHref = (hash: string) => (isHome ? `#${hash}` : `/#${hash}`);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? 'bg-[#0D1B2A]/95 backdrop-blur-md border-b border-white/8 shadow-xl shadow-black/20'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand — siempre navega a / */}
        <Link
          href="/"
          className="flex items-center gap-2 group"
          aria-label="Juan Cobo Lab — inicio"
        >
          <FlaskConical className="w-5 h-5 text-accent" />
          <span className="font-serif text-xl font-bold italic tracking-wide text-white">
            Juan Cobo Lab
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {sectionLinks.map((link) => (
            <a
              key={link.hash}
              href={anchorHref(link.hash)}
              className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/constitucion"
            className="text-sm font-medium text-white/60 hover:text-accent transition-colors duration-200"
          >
            La Constitución
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir menú"
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile nav */}
      {isOpen && (
        <div
          id="mobile-nav"
          className="md:hidden absolute top-16 left-0 w-full bg-[#0D1B2A] border-b border-white/10 p-4 flex flex-col gap-1 shadow-2xl"
        >
          {sectionLinks.map((link) => (
            <a
              key={link.hash}
              href={anchorHref(link.hash)}
              className="text-base font-medium text-white/65 hover:text-white hover:bg-white/5 transition-all p-3 rounded-xl"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/constitucion"
            className="text-base font-medium text-white/65 hover:text-accent hover:bg-white/5 transition-all p-3 rounded-xl"
            onClick={() => setIsOpen(false)}
          >
            La Constitución
          </Link>
        </div>
      )}
    </nav>
  );
}
