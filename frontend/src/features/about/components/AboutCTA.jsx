import React from 'react';
import Link from 'next/link';
import { FileText, ClipboardList, BarChart2 } from 'lucide-react';
import { aboutContent } from '../constants/aboutContent';

export default function AboutCTA() {
  const { cta } = aboutContent;

  return (
    <section className="py-24 bg-surface relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5"></div>
      
      {/* Decorative patterns */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl translate-y-1/2 translate-x-1/2"></div>
      
      <div className="max-w-[1000px] mx-auto px-6 relative z-10 text-center">
        <div className="animate-fade-in-up">
          <h2 className="font-h1 text-h1-sm md:text-h2 text-text-primary mb-6">
            {cta.title}
          </h2>
          <p className="font-body text-body-lg text-text-secondary mb-12 max-w-2xl mx-auto">
            {cta.description}
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/complaints/create"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25"
            >
              <FileText className="w-5 h-5" />
              Buat Pengaduan
            </Link>
            <Link
              href="/surveys/create"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-surface border border-border rounded-xl text-text-primary font-medium hover:bg-surface-hover transition-colors shadow-sm"
            >
              <ClipboardList className="w-5 h-5" />
              Isi Survei
            </Link>
            <Link
              href="/statistics"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-surface border border-border rounded-xl text-text-primary font-medium hover:bg-surface-hover transition-colors shadow-sm"
            >
              <BarChart2 className="w-5 h-5" />
              Lihat Statistik
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
