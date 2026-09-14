import React from 'react';

export default function HeroSection() {
  return (
    <section className="relative min-h-[85vh] lg:min-h-[90vh] flex items-center overflow-hidden bg-white">
      {/* Konten */}
      <div className="relative z-20 max-w-[1280px] mx-auto px-4 sm:px-6 w-full pt-8 pb-24 sm:pb-32">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-sm font-medium shadow-sm animate-fade-in-up"
          style={{
            background: 'rgba(0, 74, 198, 0.08)',
            border: '1px solid rgba(0, 74, 198, 0.15)',
            color: '#004ac6',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Layanan Publik Terpadu Kabupaten Madiun
        </div>

        <h1
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-4 max-w-[48rem] leading-tight font-bold text-balance animate-fade-in-up"
          style={{ animationDelay: '100ms', color: '#0F172A' }}
        >
          Satu{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(135deg, #004ac6 0%, #6366f1 100%)',
            }}
          >
            SKEMA
          </span>{' '}
          untuk Madiun Lebih Baik
        </h1>

        <p
          className="max-w-[42rem] text-sm md:text-base leading-relaxed text-pretty mb-12 animate-fade-in-up"
          style={{ animationDelay: '200ms', color: '#475569' }}
        >
          Sistem Keluhan, Evaluasi, dan Manajemen Aspirasi. Sampaikan aspirasi
          Anda dengan mudah demi mewujudkan pelayanan yang transparan dan
          responsif.
        </p>
      </div>
    </section>
  );
}
