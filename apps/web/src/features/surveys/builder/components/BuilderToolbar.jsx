'use client';

import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, UploadCloud, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BuilderToolbar() {
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePublish = () => {
    setShowSuccess(true);
    setTimeout(() => {
      router.push('/admin-opd/surveys');
    }, 1500);
  };

  return (
    <>
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm transition-all">
          <div className="bg-white px-xl py-lg rounded-2xl shadow-2xl flex flex-col items-center gap-md transform animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <Check size={32} strokeWidth={3} />
            </div>
            <div className="text-center">
              <h3 className="font-h3 text-slate-900 mb-1">Berhasil Dipublikasikan!</h3>
              <p className="text-slate-500 font-body-sm">Mengarahkan ke daftar survei...</p>
            </div>
          </div>
        </div>
      )}
      <header className="absolute top-0 left-0 w-full h-16 md:h-[72px] bg-white border-b border-border flex items-center px-4 md:px-lg z-50 justify-between shadow-sm">
      <div className="flex items-center gap-2 md:gap-lg flex-1 min-w-0">
        <Link href="/admin-opd/surveys" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all active:scale-95 shrink-0" title="Kembali ke Daftar Survei">
          <ArrowLeft size={18} />
        </Link>
        <div className="hidden md:block h-8 w-px bg-slate-200 shrink-0"></div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <h1 className="text-base md:text-xl font-bold text-slate-900 tracking-tight truncate">Survei Q3 Dinas Kesehatan</h1>
            <span className="shrink-0 px-2 py-0.5 rounded text-[10px] md:text-[11px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">Draf</span>
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 font-medium truncate">Buat dan atur pertanyaan untuk kuesioner ini</p>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-md shrink-0 ml-2">
        <div className="hidden xl:flex text-[12px] text-emerald-600 items-center gap-1.5 mr-sm bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full font-medium">
          <CheckCircle2 size={14} /> <span>Tersimpan Otomatis</span>
        </div>
        <button 
          onClick={handlePublish}
          className="px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5 md:gap-2 active:scale-95"
        >
          <UploadCloud size={16} /> <span className="hidden sm:inline">Publikasikan</span>
        </button>
      </div>
      </header>
    </>
  );
}
