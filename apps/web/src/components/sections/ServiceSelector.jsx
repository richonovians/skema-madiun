import React from 'react';
import { TriangleAlert, ClipboardList, Sparkles, Layers, ArrowRight } from 'lucide-react';

export default function ServiceSelector({ activeTab = 'pengaduan', onTabChange }) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-slate-900 border border-slate-800 shadow-2xl group">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 group-hover:bg-emerald-500/20 transition-all duration-700" />
        
        {/* Floating Icons Background */}
        <div className="absolute top-6 right-8 opacity-20 text-primary-fixed-dim animate-pulse duration-[3000ms]">
          <Layers size={48} strokeWidth={1.5} />
        </div>
        <div className="absolute bottom-6 right-24 opacity-10 text-emerald-300 animate-bounce duration-[4000ms]">
          <Sparkles size={32} strokeWidth={1.5} />
        </div>

        <div className="relative z-10">
          <h2 className="font-h2 text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-2 drop-shadow-sm">
            Pilih Layanan
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium w-full pr-4">
            Akses cepat ke berbagai layanan publik untuk menyampaikan aspirasi dan penilaian Anda secara transparan.
          </p>
        </div>
      </div>

      {/* Interactive Selector Buttons */}
      <div className="flex flex-col gap-4">
        {/* Pengaduan Button */}
        <button 
          onClick={() => onTabChange?.('pengaduan')}
          className={`group relative w-full p-1 rounded-3xl transition-all duration-500 text-left overflow-hidden ${
            activeTab === 'pengaduan' 
              ? 'bg-gradient-to-r from-primary to-blue-600 shadow-[0_8px_30px_rgb(0,74,198,0.3)] scale-[1.02] -translate-y-1' 
              : 'bg-white border border-slate-200 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1'
          }`}
        >
          <div className={`relative flex items-center gap-5 p-4 sm:p-5 rounded-[22px] h-full transition-colors duration-500 ${
            activeTab === 'pengaduan' 
              ? 'bg-white/10 backdrop-blur-sm border border-white/20' 
              : 'bg-white'
          }`}>
            <div className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${
              activeTab === 'pengaduan' 
                ? 'bg-white text-primary shadow-[inset_0_-4px_4px_rgba(0,0,0,0.05)]' 
                : 'bg-blue-50/80 text-primary group-hover:bg-blue-100 group-hover:text-primary-hover'
            }`}>
              <TriangleAlert size={30} strokeWidth={2} />
            </div>
            
            <div className="flex flex-col flex-grow">
              <h3 className={`font-bold text-base sm:text-lg transition-colors duration-300 ${
                activeTab === 'pengaduan' ? 'text-white drop-shadow-sm' : 'text-slate-800 group-hover:text-primary'
              }`}>
                Layanan Pengaduan
              </h3>
              <p className={`text-xs sm:text-sm mt-1 font-medium transition-colors duration-300 ${
                activeTab === 'pengaduan' ? 'text-blue-100' : 'text-slate-500'
              }`}>
                Sampaikan laporan, keluhan, atau aspirasi Anda
              </p>
            </div>

            <div className={`shrink-0 transition-all duration-500 ease-out ${
              activeTab === 'pengaduan' 
                ? 'opacity-100 translate-x-0 text-white' 
                : 'opacity-0 -translate-x-4 text-primary group-hover:opacity-100 group-hover:translate-x-0'
            }`}>
              <ArrowRight size={24} strokeWidth={2.5} />
            </div>
          </div>
        </button>

        {/* SKM Button */}
        <button 
          onClick={() => onTabChange?.('skm')}
          className={`group relative w-full p-1 rounded-3xl transition-all duration-500 text-left overflow-hidden ${
            activeTab === 'skm' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-[0_8px_30px_rgb(16,185,129,0.3)] scale-[1.02] -translate-y-1' 
              : 'bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1'
          }`}
        >
          <div className={`relative flex items-center gap-5 p-4 sm:p-5 rounded-[22px] h-full transition-colors duration-500 ${
            activeTab === 'skm' 
              ? 'bg-white/10 backdrop-blur-sm border border-white/20' 
              : 'bg-white'
          }`}>
            <div className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${
              activeTab === 'skm' 
                ? 'bg-white text-emerald-600 shadow-[inset_0_-4px_4px_rgba(0,0,0,0.05)]' 
                : 'bg-emerald-50/80 text-emerald-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'
            }`}>
              <ClipboardList size={30} strokeWidth={2} />
            </div>
            
            <div className="flex flex-col flex-grow">
              <h3 className={`font-bold text-base sm:text-lg transition-colors duration-300 ${
                activeTab === 'skm' ? 'text-white drop-shadow-sm' : 'text-slate-800 group-hover:text-emerald-700'
              }`}>
                Survei Kepuasan
              </h3>
              <p className={`text-xs sm:text-sm mt-1 font-medium transition-colors duration-300 ${
                activeTab === 'skm' ? 'text-emerald-100' : 'text-slate-500'
              }`}>
                Beri penilaian untuk pelayanan instansi publik
              </p>
            </div>

            <div className={`shrink-0 transition-all duration-500 ease-out ${
              activeTab === 'skm' 
                ? 'opacity-100 translate-x-0 text-white' 
                : 'opacity-0 -translate-x-4 text-emerald-500 group-hover:opacity-100 group-hover:translate-x-0'
            }`}>
              <ArrowRight size={24} strokeWidth={2.5} />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
