import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Hero } from '../components/sections/Hero';
import { About } from '../components/sections/About';
import { Articles } from '../components/sections/Articles';
import { Publications } from '../components/sections/Publications';
import { Tools } from '../components/sections/Tools';
import { Blog } from '../components/sections/Blog';
import { Footer } from '../components/sections/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-foreground bg-background selection:bg-accent/20 selection:text-primary">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <About />
        <Articles />
        <Publications />
        <Tools />
        <Blog />
      </main>
      <Footer />
    </div>
  );
}
