import React from 'react';
import { Activity } from 'lucide-react';

/**
 * SEBELUMNYA 4 kartu (Total Aktivitas Hari Ini/Total Login/Perubahan Data/
 * Aktivitas Gagal) -- SEMUA angka karangan. Backend tak bisa menyediakan
 * salah satu pun secara jujur: tak ada filter rentang tanggal di
 * ListAuditLogQueryDto (jadi "Hari Ini" mustahil), endpoint auth/login
 * TIDAK bertanda `@Audit()` (jadi "Total Login" nol data), dan
 * AuditInterceptor HANYA mencatat SETELAH handler sukses -- tak pernah ada
 * baris "gagal" tersimpan sama sekali (jadi "Aktivitas Gagal" selalu
 * karangan). Disederhanakan jadi satu angka yg benar-benar nyata: total
 * seluruh log tercatat (dari meta.pagination.total, terfilter modul aktif).
 */
export default function AuditSummaryCards({ total = 0 }) {
  return (
    <div className="bg-surface p-lg rounded-2xl border border-outline-variant shadow-sm flex items-center gap-4 mb-lg">
      <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
        <Activity size={20} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-500">Total Aktivitas Tercatat</h3>
        <p className="text-3xl font-bold text-slate-900">{total.toLocaleString('id-ID')}</p>
      </div>
    </div>
  );
}
