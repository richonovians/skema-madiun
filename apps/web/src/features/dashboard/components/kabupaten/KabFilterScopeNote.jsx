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
 * - Hitungan pengaduan tak mengikuti apa pun lagi. Ia dulu mengikuti
 *   `jenisLayanan` (complaintWhere memakainya, tapi TIDAK memakai periode);
 *   sejak penyaring itu dibuang dari layar (15 September 2026), angkanya selalu
 *   utuh. Backend tetap menerima parameternya -- yang hilang kendalinya.
 * - `systemActivityPercent` (Keaktifan Sistem) tak pernah disaring.
 * - Jumlah akun aktif (kartu Akun Aktif, 15 September 2026) juga tidak: asalnya
 *   `GET /statistics`, yang tak menerima parameter periode maupun jenis layanan.
 * - Bagian statistik, distribusi nilai, 9 unsur, dan donut pengaduan berasal
 *   dari `GET /statistics` yang sama sekali tak menerima parameter -- selalu
 *   seluruh data.
 *
 * Tanpa keterangan ini, angka yang berubah dan yang tidak berubah saat
 * berganti periode akan terbaca seperti kekeliruan.
 */
export default function KabFilterScopeNote({ periode }) {
  // Kosong = tak menyaring (nilai awal), bukan periode bernama kosong.
  const periodeLabel = periode ? formatPeriodeLabel(periode) : 'semua periode';

  return (
    <div className="flex items-start gap-2.5 p-md rounded-xl bg-blue-50 border border-blue-100">
      <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
      <div className="text-xs text-blue-800 leading-relaxed space-y-1">
        <p>
          Penyaring navbar aktif: <strong>{periodeLabel}</strong>.
        </p>
        <p className="text-blue-700">
          Mengikuti penyaring: Rata-Rata IKM, Partisipasi Responden, dan Peringkat IKM per OPD.
          Hitungan pengaduan, Keaktifan Sistem, Akun Aktif, serta seluruh bagian statistik,
          distribusi nilai, dan 9 unsur pelayanan selalu menampilkan data lengkap seluruh
          periode.
        </p>
      </div>
    </div>
  );
}
