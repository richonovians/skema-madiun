import React from 'react';

export default function HeroSection() {
  return (
    <section className="relative min-h-[500px] md:h-[600px] flex items-center overflow-hidden py-16 sm:py-20">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center" 
        style={{ backgroundImage: "url('/images/landing/hero-bg2.png')" }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0F172A] to-transparent/30" />
      <div className="relative z-20 max-w-[1280px] mx-auto px-4 sm:px-6 w-full pb-20 sm:pb-32">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-6 text-white text-sm font-medium animate-fade-in-up shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Layanan Publik Terpadu Kabupaten Madiun
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-4 max-w-[48rem] leading-tight font-bold text-balance animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          Satu <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-md">SKEMA</span> untuk Madiun Lebih Baik
        </h1>
        <p className="text-white/90 max-w-[48rem] text-sm md:text-base leading-relaxed text-pretty mb-12 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          Sistem Keluhan, Evaluasi, dan Manajemen Aspirasi. Sampaikan aspirasi Anda dengan mudah demi mewujudkan pelayanan yang transparan dan responsif.
        </p>
      </div>
    </section>
  );
}
