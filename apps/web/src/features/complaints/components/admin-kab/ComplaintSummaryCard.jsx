import React from 'react';
import { Calendar, Building2, User, Tag } from 'lucide-react';

/** Field "Lokasi" (kecamatan) DIHAPUS -- backend tak punya data kecamatan (D13, belum dijawab Helpdesk). */
export default function ComplaintSummaryCard({ complaint }) {
  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return (
      date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
    );
  };

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50">
        <h2 className="text-title-md font-bold text-slate-800">Ringkasan Pengaduan</h2>
      </div>

      <div className="p-lg grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
        <div className="space-y-1">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Tag size={14} /> Kategori
          </span>
          <p className="font-semibold text-slate-900">{complaint.categoryLabel || '-'}</p>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 size={14} /> OPD Tujuan
          </span>
          <p className="font-semibold text-slate-900">{complaint.target || '-'}</p>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} /> Tanggal Dibuat
          </span>
          <p className="font-semibold text-slate-900">{formatDate(complaint.createdAt)}</p>
        </div>

        <div className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <User size={14} /> Nama Pelapor
          </span>
          <p className="font-semibold text-slate-900">{complaint.reporter?.name || '-'}</p>
        </div>
      </div>
    </div>
  );
}
