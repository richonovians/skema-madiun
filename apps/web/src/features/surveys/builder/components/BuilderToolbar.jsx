'use client';

import React from 'react';
import { ArrowLeft, CheckCircle2, UploadCloud, Loader2 } from 'lucide-react';
import Link from 'next/link';

const STATUS_BADGE = {
  DRAF: { label: 'Draf', className: 'bg-amber-100 text-amber-700' },
  AKTIF: { label: 'Aktif', className: 'bg-emerald-100 text-emerald-700' },
  DITUTUP: { label: 'Ditutup', className: 'bg-slate-200 text-slate-600' },
};

/**
 * Murni presentasional -- seluruh state (title/periode) & orkestrasi API
 * dipegang page.jsx (INT-19). Sebelumnya `title` py state lokal SENDIRI di
 * sini yang terputus total dari state `questions` di page.jsx (bug nyata:
 * apa pun yang diketik di judul tak pernah tersambung ke data survei yang
 * sebenarnya dibuat/disimpan).
 */
export default function BuilderToolbar({
  title,
  onTitleChange,
  onTitleBlur,
  periode,
  onPeriodeChange,
  onPeriodeBlur,
  status = 'DRAF',
  isSaving = false,
  onPublish,
  isPublishing = false,
}) {
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.DRAF;

  return (
    <header className="absolute top-0 left-0 w-full h-16 md:h-[72px] bg-white border-b border-border flex items-center px-4 md:px-lg z-50 justify-between shadow-sm">
      <div className="flex items-center gap-2 md:gap-lg flex-1 min-w-0">
        <Link
          href="/admin-opd/surveys"
          className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all active:scale-95 shrink-0"
          title="Kembali ke Daftar Survei"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="hidden md:block h-8 w-px bg-slate-200 shrink-0"></div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={onTitleBlur}
              disabled={status !== 'DRAF'}
              className="text-base md:text-xl font-bold text-slate-900 tracking-tight truncate bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none transition-colors px-1 py-0.5 w-full max-w-[300px] disabled:opacity-70"
              placeholder="Judul Survei"
            />
            <input
              type="text"
              value={periode}
              onChange={(e) => onPeriodeChange(e.target.value)}
              onBlur={onPeriodeBlur}
              disabled={status !== 'DRAF'}
              className="text-xs md:text-sm font-semibold text-slate-500 truncate bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none transition-colors px-1 py-0.5 w-full max-w-[140px] disabled:opacity-70"
              placeholder="Periode (mis. 2026)"
            />
            <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] md:text-[11px] font-bold uppercase tracking-wider ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 font-medium truncate">Buat dan atur pertanyaan untuk kuesioner ini</p>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-md shrink-0 ml-2">
        {isSaving ? (
          <div className="hidden xl:flex text-[12px] text-slate-500 items-center gap-1.5 mr-sm bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full font-medium">
            <Loader2 size={14} className="animate-spin" /> <span>Menyimpan...</span>
          </div>
        ) : (
          <div className="hidden xl:flex text-[12px] text-emerald-600 items-center gap-1.5 mr-sm bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full font-medium">
            <CheckCircle2 size={14} /> <span>Tersimpan</span>
          </div>
        )}
        {status === 'DRAF' && (
          <button
            onClick={onPublish}
            disabled={isPublishing}
            className="px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5 md:gap-2 active:scale-95 disabled:opacity-60"
          >
            {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            <span className="hidden sm:inline">{isPublishing ? 'Memublikasikan...' : 'Publikasikan'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
