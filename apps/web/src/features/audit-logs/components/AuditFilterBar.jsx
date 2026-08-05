import React from 'react';
import { RotateCcw } from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';

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
        <Button
          variant="outline"
          onClick={onReset}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <RotateCcw size={16} /> Reset Filter
        </Button>
      </div>
    </div>
  );
}
