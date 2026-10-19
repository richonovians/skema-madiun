'use client';

import React from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { JENIS_SURVEI } from '@/features/surveys/constants/jenisSurvei';

/**
 * Penyaring JENIS survei di Statistik & Laporan (8 Oktober 2026, permintaan
 * pengguna: "tambah filter untuk statistic khusus survei custom dan skm").
 *
 * Tiga pilihan: "Semua jenis" (nilai `semua`, tanpa saringan), SKM, dan Custom --
 * dua terakhir bernilai enum backend apa adanya. Label SKM/Custom dari
 * `constants/jenisSurvei.js`, supaya sama persis dengan kolom "Jenis Survei" di
 * tabel survei Admin Kabupaten.
 *
 * Label dibuat `sr-only` (`labelTersembunyi`), bukan dibuang: kontrol ini berdiri
 * sebaris dengan dropdown Survei di slot kanan tab, yang juga tak berlabel
 * tampak, dan label blok di atasnya membuatnya tak sejajar. Namanya satu-satunya
 * nama aksesibel kontrol ini.
 */
const OPSI = [{ value: 'semua', label: 'Semua jenis' }].concat(
  JENIS_SURVEI.map((j) => ({ value: j.nilai, label: j.label })),
);

export default function PenyaringJenisSurvei({
  nilai = 'semua',
  onChange,
  id = 'penyaring-jenis-survei',
  className = '',
}) {
  return (
    <Dropdown
      className={className}
      label="Jenis survei"
      id={id}
      options={OPSI}
      value={nilai}
      onChange={onChange}
      labelTersembunyi
    />
  );
}
