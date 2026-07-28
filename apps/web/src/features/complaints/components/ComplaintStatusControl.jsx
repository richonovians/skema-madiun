'use client';
import React from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { Info } from 'lucide-react';

export default function ComplaintStatusControl({ currentStatus, onStatusChange }) {
  const statusOptions = [
    { value: 'Diproses', label: 'Diproses' },
    { value: 'Selesai', label: 'Selesai' },
    { value: 'Ditolak', label: 'Ditolak' },
    { value: 'Diterima', label: 'Diterima' }
  ];

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
            onChange={onStatusChange}
          />
        </div>

        <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl flex items-start gap-3">
          <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] font-medium text-blue-800 leading-relaxed">
            Perubahan status akan diberitahukan kepada pelapor via aplikasi & notifikasi.
          </p>
        </div>
      </div>
    </section>
  );
}
