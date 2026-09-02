import React from 'react';
import Dropdown from '@/components/ui/Dropdown';
import ResetFilterButton from '@/components/ui/ResetFilterButton';

/**
 * HANYA filter "Modul" (entitas) -- satu-satunya yg didukung backend
 * (ListAuditLogQueryDto cuma entitas+actorId, lihat auditLogs.api.js).
 * Search bebas teks, rentang tanggal, filter aksi/role/OPD DIHAPUS
 * (bukan disembunyikan) krn tak ada dukungan backend sama sekali --
 * membiarkannya tampil berarti berpura-pura menyaring padahal tidak.
 */
const MODULE_OPTIONS = [
  { value: '', label: 'Semua Modul' },
  { value: 'complaint', label: 'Pengaduan' },
  { value: 'opd', label: 'OPD' },
  { value: 'question', label: 'Pertanyaan' },
  { value: 'survey', label: 'Survei' },
  { value: 'user', label: 'Pengguna' },
];

export default function AuditFilterBar({ entitas, onEntitasChange, onReset }) {
  return (
    <div className="bg-surface p-lg rounded-2xl border border-outline-variant shadow-sm mb-lg">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <Dropdown value={entitas} onChange={onEntitasChange} options={MODULE_OPTIONS} />
        </div>
        {/* Dulu memakai `Button variant="outline"` -- varian yang tak pernah
            ada di Button.jsx, sehingga jatuh ke `variants.primary`: pil
            terbesar di sistem desain (py-md px-lg text-lg font-bold) untuk
            sebuah tombol penyaring. Kini seragam dengan tombol reset di
            halaman lain, lengkap dengan putaran ikonnya. Tulisannya sengaja
            selalu tampak di sini: bilah ini hanya berisi satu dropdown, jadi
            ruangnya cukup bahkan di ponsel. */}
        <ResetFilterButton onReset={onReset} labelClassName="" />
      </div>
    </div>
  );
}
