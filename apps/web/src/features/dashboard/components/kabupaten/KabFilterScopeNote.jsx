'use client';
import React from 'react';
import { Info } from 'lucide-react';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';

/**
 * Menjelaskan PERSIS bagian mana yang mengikuti penyaring navbar.
 *
 * Bukan hiasan: cakupan kedua penyaring memang tidak seragam, dan itu ditentukan
 * backend (IkmService.getDashboard), bukan pilihan tampilan.
 * - `periode` menyaring baris IkmResult/Survey -> rata-rata IKM, responden,
 *   jumlah OPD, dan peringkat.
 * - `jenisLayanan` menyaring itu semua DITAMBAH hitungan pengaduan
 *   (complaintWhere memakai jenisLayanan, tapi TIDAK memakai periode).
 * - `systemActivityPercent` (Keaktifan Sistem) tak pernah disaring keduanya.
 * - Bagian statistik, distribusi nilai, 9 unsur, dan donut pengaduan berasal
 *   dari `GET /statistics` yang sama sekali tak menerima parameter -- selalu
 *   seluruh data.
 *
 * Tanpa keterangan ini, angka yang berubah dan yang tidak berubah saat
 * berganti periode akan terbaca seperti kekeliruan.
 */
export default function KabFilterScopeNote({ periode, jenisLayanan }) {
  // Kosong = tak menyaring (nilai awal), bukan periode/layanan bernama kosong.
  const periodeLabel = periode ? formatPeriodeLabel(periode) : 'semua periode';
  const layananLabel = jenisLayanan || 'semua jenis layanan';

  return (
    <div className="flex items-start gap-2.5 p-md rounded-xl bg-blue-50 border border-blue-100">
      <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
      <div className="text-xs text-blue-800 leading-relaxed space-y-1">
        <p>
          Penyaring navbar aktif: <strong>{periodeLabel}</strong> ·{' '}
          <strong>{layananLabel}</strong>.
        </p>
        <p className="text-blue-700">
          Mengikuti penyaring: Rata-Rata IKM, Partisipasi Responden, dan Peringkat IKM per OPD.
          Hitungan pengaduan hanya mengikuti jenis layanan (bukan periode). Keaktifan Sistem serta
          seluruh bagian statistik, distribusi nilai, dan 9 unsur pelayanan selalu menampilkan
          data lengkap seluruh periode.
        </p>
      </div>
    </div>
  );
}
