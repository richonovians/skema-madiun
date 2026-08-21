import React from 'react';
import { Info, User, Layout, Clock } from 'lucide-react';

/**
 * Role/OPD pelaku & status Sukses/Gagal DIHAPUS -- AuditLogEntity tak punya
 * field ini sama sekali (cuma actorId/aksi/entitas/detail/timestamp), dan
 * AuditInterceptor HANYA mencatat setelah handler sukses (tak pernah ada
 * baris "gagal" tersimpan, jadi badge status tak pernah bermakna variatif).
 */
export default function AuditInformation({ log }) {
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
    <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden shrink-0">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center gap-2">
        <Info size={18} className="text-slate-500" />
        <h2 className="text-title-md font-bold text-slate-800">Informasi Aktivitas</h2>
      </div>

      <div className="p-lg space-y-4">
        {/* Satu kolom di ponsel: nilainya berisi tanggal panjang ("20 Agustus
            2026, 14.30") & nama pengguna, yang di dua kolom sempit terpecah
            jadi tiga-empat baris dan sulit dibaca. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Clock size={12} /> Waktu
            </span>
            <p className="text-sm font-semibold text-slate-800">{formatDate(log.createdAt)}</p>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <User size={12} /> Pengguna
            </span>
            <p className="text-sm font-semibold text-slate-800">{log.user}</p>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Layout size={12} /> Modul
            </span>
            <p className="text-sm font-semibold text-slate-800">{log.module}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
            Ringkasan Aktivitas
          </span>
          {/* Kalimat DIDERIVASI dari aksi+entitas (lihat auditLog.adapter.js) --
              backend tak simpan kalimat deskripsi siap pakai. */}
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
            {log.summary}
          </p>
        </div>
      </div>
    </div>
  );
}
