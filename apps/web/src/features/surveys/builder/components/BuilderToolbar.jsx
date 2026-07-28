import React from 'react';
import { ArrowLeft, CheckCircle2, Eye, UploadCloud } from 'lucide-react';
import Link from 'next/link';

export default function BuilderToolbar() {
  return (
    <header className="absolute top-0 left-0 w-full h-[72px] bg-white border-b border-border flex items-center px-lg z-50 justify-between shadow-sm">
      <div className="flex items-center gap-lg flex-1">
        <Link href="/admin-opd/surveys" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all active:scale-95 shrink-0" title="Kembali ke Daftar Survei">
          <ArrowLeft size={20} />
        </Link>
        <div className="h-8 w-px bg-slate-200 shrink-0"></div>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Survei Q3 Dinas Kesehatan</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">Draf</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">Buat dan atur pertanyaan untuk kuesioner ini</p>
        </div>
      </div>
      <div className="flex items-center gap-md">
        <div className="hidden lg:flex text-[12px] text-emerald-600 items-center gap-1.5 mr-sm bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full font-medium">
          <CheckCircle2 size={14} /> <span>Tersimpan Otomatis</span>
        </div>
        <button className="px-4 py-2.5 rounded-xl font-bold text-sm text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 active:scale-95">
          <Eye size={18} /> Pratinjau
        </button>
        <button className="px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 active:scale-95">
          <UploadCloud size={18} /> Publikasikan
        </button>
      </div>
    </header>
  );
}
