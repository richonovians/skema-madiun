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
export default function ShareSurveyButton({ survey, className = '', iconSize = 18, label = 'Bagikan' }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className} title="Bagikan QR & tautan survei">
        <Share2 size={iconSize} />
        {label}
      </button>

      {isOpen && <ShareSurveyModal survey={survey} onClose={() => setIsOpen(false)} />}
    </>
  );
}
