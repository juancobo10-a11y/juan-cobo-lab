import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Hero } from '../components/sections/Hero';
import { WhatIDo } from '../components/sections/WhatIDo';
import { Stats } from '../components/sections/Stats';
import { About } from '../components/sections/About';
import { Quote } from '../components/sections/Quote';
import { Articles } from '../components/sections/Articles';
import { Pereque } from '../components/sections/Pereque';
import { Publications } from '../components/sections/Publications';
import { Tools } from '../components/sections/Tools';
import { Blog } from '../components/sections/Blog';
import { Footer } from '../components/sections/Footer';

/**
 * Juan Cobo Lab — Home page
 *
 * Arquitectura preparada para crecer. Secciones futuras comentadas abajo:
 *   - Cursos         → src/components/sections/Courses.tsx
 *   - Herramientas IA → src/components/sections/AITools.tsx
 *   - Biblioteca     → src/components/sections/Library.tsx
 *   - Chatbot        → src/components/sections/Chatbot.tsx
 *
 * Para agregar una sección nueva:
 *   1. Crea el componente en src/components/sections/
 *   2. Impórtalo aquí
 *   3. Agrégalo en el orden deseado dentro de <main>
 *   4. Agrega el anchor link en Navbar.tsx
 */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-foreground bg-background selection:bg-accent/20 selection:text-primary">
      <Navbar />

      <main className="flex-grow">
        {/* ── Entrada ─────────────────────────────────── */}
        <Hero />
        <WhatIDo />
        <Stats />

        {/* ── Identidad ────────────────────────────────── */}
        <About />
        <Quote />

        {/* ── Contenido ────────────────────────────────── */}
        <Articles />
        <Pereque />
        <Publications />

        {/* ── Herramientas ─────────────────────────────── */}
        <Tools />

        {/* ── Blog ─────────────────────────────────────── */}
        <Blog />

        {/*
          ── SECCIONES FUTURAS ──────────────────────────
          Descomenta cuando estén listas:

          <Courses />     id="courses"   — Cursos y talleres
          <AITools />     id="ai-tools"  — Herramientas con IA
          <Library />     id="library"   — Biblioteca de recursos
          <Chatbot />     id="chatbot"   — Asistente de investigación
        */}
      </main>

      <Footer />
    </div>
  );
}
