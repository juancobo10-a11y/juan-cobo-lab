import React, { useState } from 'react';
import { Link } from 'wouter';
import { FlaskConical, Menu, X } from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: '#about', label: 'Sobre mí' },
    { href: '#articles', label: 'Artículos' },
    { href: '#publications', label: 'Publicaciones' },
    { href: '#tools', label: 'Herramientas' },
    { href: '#blog', label: 'Blog' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/50 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 group text-foreground hover:text-accent transition-colors">
          <FlaskConical className="w-5 h-5 text-accent" />
          <span className="font-serif text-xl font-bold italic tracking-wide">Juan Cobo Lab</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/80 hover:text-accent transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Menu"
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div id="mobile-nav" className="md:hidden absolute top-16 left-0 w-full bg-background border-b border-border p-4 flex flex-col gap-4 shadow-lg">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-lg font-medium text-foreground/80 hover:text-accent transition-colors p-2 rounded-md hover:bg-muted"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
