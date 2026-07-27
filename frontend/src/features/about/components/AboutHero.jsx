import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart2, MessageSquare, BarChart3, CheckCircle2, Star } from 'lucide-react';
import { aboutContent } from '../constants/aboutContent';

export default function AboutHero() {
  const { hero } = aboutContent;

  return (
    <section className="relative bg-surface py-20 lg:py-32 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-8 animate-fade-in-up">
            <h1 className="font-h1 text-h1-sm md:text-h1 text-text-primary">
              {hero.title}
            </h1>
            <p className="font-body text-body-lg text-text-secondary">
              {hero.description}
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <Link
                href="/"
                className="flex items-center gap-2 px-6 py-3 bg-surface border border-border rounded-xl text-text-primary font-medium hover:bg-surface-hover transition-colors shadow-sm"
              >
                <ArrowLeft className="w-5 h-5" />
                Kembali ke Beranda
              </Link>
              <Link
                href="/statistics"
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors shadow-md shadow-primary/20"
              >
                <BarChart2 className="w-5 h-5" />
                Lihat Statistik Publik
              </Link>
            </div>
          </div>
          
          <div className="relative animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <div className="relative w-full aspect-square lg:aspect-[4/3] rounded-[2rem] overflow-hidden flex items-center justify-center bg-slate-50/50 border border-slate-100">
              {/* Abstract Gradient Background */}
              <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
              <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
              <div className="absolute top-[20%] left-[20%] w-72 h-72 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>

              {/* Dotted Pattern Overlay */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

              {/* Center Main Card */}
              <div className="relative z-10 w-[260px] md:w-[280px] bg-white/90 backdrop-blur-xl border border-white p-6 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-transform duration-700 hover:-translate-y-2">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg shadow-blue-500/30">
                  <MessageSquare size={24} />
                </div>
                <h3 className="font-bold text-slate-800 mb-2 text-lg">Total Pengaduan</h3>
                <div className="flex items-end gap-3 mb-5">
                  <span className="text-4xl font-black text-slate-900 tracking-tight">1,248</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full mb-1">+12%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
                  <div className="bg-blue-500 h-2.5 rounded-full w-[78%]"></div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-slate-500 font-medium">Terselesaikan</span>
                  <span className="text-xs text-slate-700 font-bold">78%</span>
                </div>
              </div>

              {/* Floating Card 1 - Right Top */}
              <div className="absolute top-[10%] right-[2%] md:right-[5%] z-20 w-40 md:w-48 bg-white/95 backdrop-blur-xl border border-white p-3 md:p-4 rounded-2xl shadow-[0_15px_30px_-10px_rgba(0,0,0,0.08)] transition-transform duration-700 hover:-translate-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] md:text-[11px] text-slate-500 font-medium uppercase tracking-wider">Indeks IKM</p>
                    <p className="font-black text-slate-800 text-base md:text-lg">89.5</p>
                  </div>
                </div>
              </div>

              {/* Floating Card 2 - Left Bottom */}
              <div className="absolute bottom-[10%] left-[2%] md:left-[5%] z-20 w-44 md:w-[220px] bg-white/95 backdrop-blur-xl border border-white p-3 md:p-4 rounded-2xl shadow-[0_15px_30px_-10px_rgba(0,0,0,0.08)] transition-transform duration-700 hover:-translate-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] md:text-[11px] text-slate-500 font-medium uppercase tracking-wider">Respons</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
