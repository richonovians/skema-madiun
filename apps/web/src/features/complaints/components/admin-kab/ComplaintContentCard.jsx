import React from 'react';
import { AlignLeft } from 'lucide-react';

/** Blok "Kronologi Kejadian" DIHAPUS -- backend tak punya konsep ini sama sekali (cuma judul+uraian). */
export default function ComplaintContentCard({ complaint }) {
  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center gap-2">
        <AlignLeft size={18} className="text-slate-500" />
        <h2 className="text-title-md font-bold text-slate-800">Isi Pengaduan</h2>
      </div>

      <div className="p-lg">
        <h3 className="text-sm font-bold text-slate-800 mb-2">Deskripsi Laporan</h3>
        <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
          {complaint.description || 'Tidak ada deskripsi yang diberikan oleh pelapor.'}
        </div>
      </div>
    </div>
  );
}
