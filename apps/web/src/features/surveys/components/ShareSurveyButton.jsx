'use client';

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import ShareSurveyModal from './ShareSurveyModal';

/**
 * Tombol "Bagikan" + modal QR/tautan survei. State modal dipegang di sini
 * (bukan di halaman pemanggil) karena tak ada panggilan API sama sekali --
 * seluruh isinya diturunkan dari `survey` + origin browser. Dengan begitu Admin
 * OPD maupun Admin Kabupaten cukup menempelkan satu komponen ini tanpa
 * menambah orkestrasi state di halamannya masing-masing.
 *
 * `className` & `iconSize` dibiarkan diatur pemanggil karena kedua area punya
 * ukuran tombol aksi yang berbeda (kartu di Admin OPD vs baris tabel ringkas di
 * Admin Kabupaten).
 */
export default function ShareSurveyButton({
  survey,
  className = '',
  iconSize = 18,
  label = 'Bagikan',
  namaInstansi,
}) {
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Nama instansi dicetak pada poster QR. Diturunkan dari `survey.opdName`
   * supaya pemanggil yang sudah menyandingkan nama OPD ke tiap survei -- tabel
   * monitoring Admin Kabupaten -- tak perlu meneruskan prop tambahan sama
   * sekali. `namaInstansi` tetap dapat diisi pemanggil bila namanya berasal
   * dari tempat lain.
   *
   * Kosong bukan galat: poster tetap tersusun, hanya tanpa baris instansi.
   * Memaksa prop ini berarti satu daftar survei yang lupa menyandingkan nama
   * akan mematikan seluruh unduhan QR-nya.
   */
  const instansi = namaInstansi ?? survey?.opdName ?? '';

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className} title="Bagikan QR & tautan survei">
        <Share2 size={iconSize} />
        {label}
      </button>

      {isOpen && (
        <ShareSurveyModal
          survey={survey}
          namaInstansi={instansi}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
