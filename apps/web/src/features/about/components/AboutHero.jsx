import React from 'react';
import Link from 'next/link';
import { BarChart2 } from 'lucide-react';
import { aboutContent } from '../constants/aboutContent';
import AboutHeroShowcase from './AboutHeroShowcase';

/**
 * Teks hero tetap dirender di server (konten editorial statis). Ilustrasi
 * bergaya dashboard di sebelahnya dipisah ke AboutHeroShowcase.jsx karena kini
 * mengambil angka nyata dari GET /statistics di klien -- lihat catatan di sana
 * soal angka-angka karangan yang dulu dipajang di situ.
 */
export default function AboutHero() {
  const { hero } = aboutContent;

  return (
    <section className="relative bg-surface py-16 sm:py-20 lg:py-32 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-8 animate-fade-in-up">
            <h1 className="font-h1 text-h1-sm md:text-h1 text-text-primary">{hero.title}</h1>
            <p className="font-body text-body-lg text-text-secondary">{hero.description}</p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mt-4">
              <Link
                href="/statistics"
                className="flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors shadow-md shadow-primary/20 w-full sm:w-auto"
              >
                <BarChart2 className="w-5 h-5" />
                Lihat Statistik Publik
              </Link>
            </div>
          </div>

          <div className="relative animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <AboutHeroShowcase />
          </div>
        </div>
      </div>
    </section>
  );
}
