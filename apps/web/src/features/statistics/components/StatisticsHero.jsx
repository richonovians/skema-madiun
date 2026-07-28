import React from 'react';

export default function StatisticsHero() {
  return (
    <section className="bg-surface-container-low pt-16 pb-12 sm:pt-24 sm:pb-20 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-32 w-[800px] h-[600px] bg-gradient-to-b from-primary/15 via-blue-500/5 to-transparent blur-3xl rounded-full pointer-events-none"></div>
      
      <div className="w-full max-w-4xl mx-auto relative z-10">
        {/* Badge */}
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-outline-variant/30 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Data Diperbarui: Secara Berkala
            </span>
          </span>
        </div>
        
        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-text-primary leading-tight tracking-tight mb-6 text-center">
          Statistik Pelayanan Publik{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
            Kabupaten Madiun
          </span>
        </h1>
        
        {/* Description */}
        <p className="text-base md:text-lg text-text-secondary leading-relaxed text-center w-full">
          Wujud nyata transparansi dan akuntabilitas pemerintah daerah melalui pemaparan capaian kinerja pelayanan, hasil Survei Kepuasan Masyarakat (SKM), serta efektivitas penyelesaian aduan.
        </p>
      </div>
    </section>
  );
}
