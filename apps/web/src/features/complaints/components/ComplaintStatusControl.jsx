'use client';
import React from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { Info } from 'lucide-react';

/**
 * Transisi status yang diizinkan backend (ComplaintsService.ALLOWED_TRANSITIONS,
 * FR-CMP-03): Diterima -> Diproses/Ditolak, Diproses -> Selesai/Ditolak,
 * Selesai/Ditolak permanen (terminal). Dropdown HANYA menawarkan target valid
 * dari status saat ini -- pilihan lain akan gagal 400 di backend, jadi jangan
 * ditawarkan sama sekali (bukan dibiarkan gagal, pola sama INT-19 status survei).
 */
const ALLOWED_NEXT_STATUS = {
  Diterima: ['Diproses', 'Ditolak'],
  Diproses: ['Selesai', 'Ditolak'],
  Selesai: [],
  Ditolak: [],
};

export default function ComplaintStatusControl({ currentStatus, onStatusChangeRequest }) {
  const isTerminal = (ALLOWED_NEXT_STATUS[currentStatus] ?? []).length === 0;
  const statusOptions = [currentStatus, ...(ALLOWED_NEXT_STATUS[currentStatus] ?? [])].map(
    (value) => ({ value, label: value }),
  );

  const handleDropdownChange = (newStatus) => {
    if (newStatus === currentStatus) return;
    onStatusChangeRequest(newStatus);
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-border">
        <div className="bg-slate-50/80 p-lg border-b border-border/50 rounded-t-2xl">
          <h3 className="font-h3 text-h3 text-slate-800 font-bold mb-1">Kontrol Status</h3>
          <p className="text-xs text-slate-500">Ubah status penanganan tiket ini</p>
        </div>

        <div className="p-lg space-y-4">
          <div className="relative w-full z-20">
            <Dropdown
              options={statusOptions}
              value={currentStatus}
              onChange={handleDropdownChange}
            />
          </div>

          <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl flex items-start gap-3">
            <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] font-medium text-blue-800 leading-relaxed">
              {isTerminal
                ? 'Status tiket ini sudah final dan tidak dapat diubah lagi.'
                : 'Perubahan status akan diberitahukan kepada pelapor via aplikasi & notifikasi.'}
            </p>
          </div>
        </div>
    </section>
  );
}
