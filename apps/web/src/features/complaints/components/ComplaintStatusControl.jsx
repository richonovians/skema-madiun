'use client';
import React from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { Info } from 'lucide-react';
import { COMPLAINT_STATUS_LABEL } from '@/utils/enumLabels';

/**
 * Transisi yang diizinkan backend (`TRANSISI_DIIZINKAN` di
 * `apps/api/src/modules/complaints/alur-status.util.ts`). Dropdown HANYA
 * menawarkan target yang sah dari status saat ini -- pilihan lain akan gagal
 * 400, jadi jangan ditawarkan sama sekali (pola sama INT-19 status survei).
 *
 * DIPERBARUI 4 November 2026 ke alur lima tahap. `Terkirim` tak ada di sini
 * sebagai kunci MAUPUN sebagai target: ia tak pernah menjadi status berjalan,
 * hanya baris pertama riwayat.
 *
 * `Perlu Perbaikan` BUKAN status akhir -- Admin mengembalikannya ke antrean
 * verifikasi sesudah pelapor melengkapi.
 */
const ALLOWED_NEXT_STATUS = {
  'Menunggu Verifikasi': ['Diverifikasi', 'Perlu Perbaikan', 'Ditolak'],
  Diverifikasi: ['Sedang Ditindaklanjuti', 'Perlu Perbaikan', 'Ditolak'],
  'Sedang Ditindaklanjuti': ['Selesai', 'Perlu Perbaikan', 'Ditolak'],
  'Perlu Perbaikan': ['Menunggu Verifikasi', 'Ditolak'],
  // Pengalihan antar-instansi (5 November 2026). Keluarnya sama persis dengan
  // 'Menunggu Verifikasi': bagi OPD tujuan, tiket yang baru dialihkan adalah
  // tiket yang baru masuk.
  //
  // 'Dialihkan' TIDAK pernah muncul sebagai NILAI pada kunci mana pun, dan itu
  // disengaja: dropdown status tak boleh menawarkannya, sebab pengalihan juga
  // memindahkan kepemilikan, kategori, dan tingkat. Tombol "Alihkan" yang
  // melakukannya, lewat PATCH /complaints/:id/alihkan.
  Dialihkan: ['Diverifikasi', 'Perlu Perbaikan', 'Ditolak'],
  Selesai: [],
  Ditolak: [],
};

/**
 * Status yang MENUNTUT catatan di backend (`STATUS_WAJIB_CATATAN`). Dipakai
 * layar pemanggil untuk mewajibkan isian sebelum mengirim, alih-alih
 * membiarkan 400 datang sesudah petugas menekan tombol.
 */
export const STATUS_WAJIB_CATATAN = ['Ditolak', 'Perlu Perbaikan'];

export default function ComplaintStatusControl({ currentStatus, onStatusChangeRequest }) {
  const isTerminal = (ALLOWED_NEXT_STATUS[currentStatus] ?? []).length === 0;
  const statusOptions = [currentStatus, ...(ALLOWED_NEXT_STATUS[currentStatus] ?? [])].map(
    (value) => ({ value, label: COMPLAINT_STATUS_LABEL[value] ?? value }),
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
