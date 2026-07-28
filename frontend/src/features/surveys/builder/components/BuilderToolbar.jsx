import React from 'react';
import { ArrowLeft, CheckCircle2, Eye, UploadCloud } from 'lucide-react';
import Link from 'next/link';

export default function BuilderToolbar() {
  return (
    <header className="w-full h-auto min-h-[72px] bg-white border-b border-border flex flex-col md:flex-row items-start md:items-center py-3 md:py-0 px-4 md:px-lg z-50 justify-between shadow-sm shrink-0 gap-4 md:gap-0">
      <div className="flex items-center gap-3 md:gap-lg w-full md:w-auto overflow-hidden">
        <Link href="/admin-opd/surveys" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all active:scale-95 shrink-0" title="Kembali ke Daftar Survei">
          <ArrowLeft size={18} className="md:w-5 md:h-5" />
        </Link>
        <div className="h-6 md:h-8 w-px bg-slate-200 shrink-0 hidden md:block"></div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 md:gap-3">
            <h1 className="text-base md:text-xl font-bold text-slate-900 tracking-tight truncate">Survei Q3 Dinas Kesehatan</h1>
            <span className="px-1.5 py-0.5 md:px-2 md:py-0.5 rounded text-[10px] md:text-[11px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider shrink-0">Draf</span>
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 font-medium truncate">Buat dan atur pertanyaan untuk kuesioner ini</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:gap-md w-full md:w-auto justify-end">
        <div className="hidden lg:flex text-[12px] text-emerald-600 items-center gap-1.5 mr-sm bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full font-medium">
          <CheckCircle2 size={14} /> <span>Tersimpan Otomatis</span>
        </div>
        <button className="flex-1 md:flex-none justify-center px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5 md:gap-2 active:scale-95">
          <Eye size={16} className="md:w-[18px] md:h-[18px]" /> Pratinjau
        </button>
        <button className="flex-1 md:flex-none justify-center px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5 md:gap-2 active:scale-95">
          <UploadCloud size={16} className="md:w-[18px] md:h-[18px]" /> Publikasikan
        </button>
      </div>
    </header>
  );
}
