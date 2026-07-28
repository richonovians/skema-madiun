import React from 'react';
import { TriangleAlert, ClipboardList, Sparkles } from 'lucide-react';

export default function ServiceSelector({ activeTab = 'pengaduan', onTabChange }) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/80 p-5 rounded-xl border border-slate-200/60 shadow-sm backdrop-blur-md mb-2">
        <div className="absolute -top-4 -right-4 p-4 opacity-5 text-slate-800">
          <Sparkles size={80} />
        </div>
        <h2 className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 relative z-10">
          Pilih Layanan
        </h2>
        <p className="text-sm text-slate-500 mt-1 relative z-10">Pilih jenis layanan yang ingin Anda akses</p>
      </div>

      <div className="flex flex-col gap-3">
        <button 
          onClick={() => onTabChange?.('pengaduan')}
          className={`group relative w-full min-h-[64px] p-3.5 sm:p-4 rounded-xl flex items-center gap-4 transition-all duration-300 text-left overflow-hidden border ${
            activeTab === 'pengaduan' 
              ? 'bg-slate-800 border-slate-700 text-white shadow-lg shadow-slate-800/20 scale-[1.02]' 
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
          }`}
        >
          {activeTab === 'pengaduan' && (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent opacity-50" />
          )}
          <div className={`p-2.5 rounded-lg transition-colors duration-300 relative z-10 ${
            activeTab === 'pengaduan' ? 'bg-white/10' : 'bg-slate-50 group-hover:bg-slate-100'
          }`}>
            <TriangleAlert size={22} className={activeTab === 'pengaduan' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-600'} />
          </div>
          <div className="flex flex-col relative z-10">
            <span className="font-semibold text-base">Pengaduan</span>
            <span className={`text-xs mt-0.5 transition-colors duration-300 ${
              activeTab === 'pengaduan' ? 'text-slate-300' : 'text-slate-500 group-hover:text-slate-600'
            }`}>
              Laporkan keluhan layanan
            </span>
          </div>
        </button>

        <button 
          onClick={() => onTabChange?.('skm')}
          className={`group relative w-full min-h-[64px] p-3.5 sm:p-4 rounded-xl flex items-center gap-4 transition-all duration-300 text-left overflow-hidden border ${
            activeTab === 'skm' 
              ? 'bg-slate-800 border-slate-700 text-white shadow-lg shadow-slate-800/20 scale-[1.02]' 
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
          }`}
        >
          {activeTab === 'skm' && (
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-transparent opacity-50" />
          )}
          <div className={`p-2.5 rounded-lg transition-colors duration-300 relative z-10 ${
            activeTab === 'skm' ? 'bg-white/10' : 'bg-slate-50 group-hover:bg-slate-100'
          }`}>
            <ClipboardList size={22} className={activeTab === 'skm' ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-600'} />
          </div>
          <div className="flex flex-col relative z-10">
            <span className="font-semibold text-base">Survei Kepuasan (SKM)</span>
            <span className={`text-xs mt-0.5 transition-colors duration-300 ${
              activeTab === 'skm' ? 'text-slate-300' : 'text-slate-500 group-hover:text-slate-600'
            }`}>
              Beri penilaian layanan kami
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
