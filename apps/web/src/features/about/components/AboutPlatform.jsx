import React from 'react';
import { aboutContent } from '../constants/aboutContent';
import { Target, Lightbulb, Sparkles } from 'lucide-react';

export default function AboutPlatform() {
  const { platform } = aboutContent;

  return (
    <section className="py-16 sm:py-24 bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-6 text-primary">
            <Sparkles size={28} />
          </div>
          <h2 className="font-h2 text-h2-sm md:text-h2 text-text-primary mb-6">
            {platform.title}
          </h2>
          <div className="w-20 h-1.5 bg-gradient-to-r from-primary to-blue-400 mx-auto rounded-full mb-12 shadow-sm shadow-primary/20"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-stretch animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {/* Background Card */}
          <div className="group relative p-6 sm:p-8 md:p-10 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-start">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -z-0 transition-transform group-hover:scale-110 duration-500"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 mb-6 shadow-sm border border-slate-200/50 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                <Lightbulb size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Latar Belakang</h3>
              <p className="font-body text-body-lg text-text-secondary leading-relaxed">
                {platform.background}
              </p>
            </div>
          </div>

          {/* Purpose Card */}
          <div className="group relative p-6 sm:p-8 md:p-10 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/20 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-start">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -z-0 transition-transform group-hover:scale-110 duration-500"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-blue-300 mb-6 backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-colors duration-300">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Tujuan Utama</h3>
              <p className="font-body text-body-lg text-slate-300 leading-relaxed">
                {platform.purpose}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
