import React from 'react';
import { AlignLeft, Clock3 } from 'lucide-react';

export default function ComplaintContentCard({ complaint }) {
  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center gap-2">
        <AlignLeft size={18} className="text-slate-500" />
        <h2 className="text-title-md font-bold text-slate-800">Isi Pengaduan</h2>
      </div>
      
      <div className="p-lg space-y-lg">
        {/* Deskripsi Utama */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-2">Deskripsi Laporan</h3>
          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
            {complaint.description || "Tidak ada deskripsi yang diberikan oleh pelapor."}
          </div>
        </div>

        {/* Kronologi */}
        {complaint.chronology && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Clock3 size={16} className="text-slate-500" />
              Kronologi Kejadian
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed font-mono text-sm">
                {complaint.chronology}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
