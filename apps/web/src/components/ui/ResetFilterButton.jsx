'use client';

import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

/**
 * Tombol "Reset Filter" untuk seluruh tabel data, dengan ikon yang BERPUTAR
 * SEKALI setiap ditekan (2 September 2026, permintaan pengguna).
 *
 * KENAPA JADI SATU KOMPONEN. Sebelum ini tiga halaman punya tombol reset
 * sendiri-sendiri dengan tiga gaya berbeda, dan tiga halaman lain tak punya
 * sama sekali. Yang paling menunjukkan mahalnya duplikasi itu: AuditFilterBar
 * dan ComplaintFilterBar sama-sama memakai `variant="outline"` pada Button.jsx
 * -- varian yang TIDAK ADA di sana, sehingga jatuh ke `variants.primary`, pil
 * terbesar di sistem desain, untuk sebuah tombol penyaring. Satu tempat
 * berarti satu perilaku dan satu penampilan.
 *
 * CARA PUTARANNYA DIULANG. Kelas animasi tidak dinyalakan-dimatikan lewat
 * timer; yang berubah adalah `key` ikonnya. Setiap tekan menaikkan pencacah,
 * React melepas lalu memasang ulang <svg>-nya, dan animasi CSS satu-putaran
 * itu mulai dari nol lagi. Ini penting karena menekan tombol dua kali cepat
 * dengan pendekatan `className` biasa TIDAK memulai ulang animasi (kelasnya
 * sudah ada di sana, dan peramban tak menganggapnya animasi baru) -- tekanan
 * kedua akan terasa tak berbalas. Bonusnya: tak ada `setTimeout` yang harus
 * dijaga tetap sama dengan durasi di CSS, dan tak ada timer yang perlu
 * dibersihkan saat komponen dilepas.
 *
 * `putaran > 0` sebagai syarat kelas: pada render pertama ikonnya HARUS diam.
 * Tanpa syarat itu, setiap tabel akan memutar ikonnya sendiri saat halaman
 * baru dibuka -- gerakan yang tak dipicu siapa pun.
 *
 * @param {() => void} onReset
 * @param {string} [label] tulisan tombol; juga jadi `aria-label` saat tulisannya
 *   disembunyikan di layar sempit.
 * @param {string} [labelClassName] mis. `hidden sm:inline` untuk bilah yang
 *   sempit di ponsel; beri `''` bila tulisannya harus selalu tampak.
 * @param {string} [className] pengganti gaya bakunya, bila bilahnya butuh
 *   penampilan lain.
 */
const GAYA_BAKU =
  'flex items-center gap-2 min-h-[44px] px-md rounded-lg text-white bg-slate-700 ' +
  'hover:bg-slate-800 transition-colors font-medium text-xs sm:text-body-md shrink-0';

export default function ResetFilterButton({
  onReset,
  label = 'Reset Filter',
  labelClassName = 'hidden sm:inline',
  className,
}) {
  const [putaran, setPutaran] = useState(0);

  return (
    <button
      type="button"
      onClick={() => {
        setPutaran((n) => n + 1);
        onReset?.();
      }}
      aria-label={label}
      title={label}
      className={className ?? GAYA_BAKU}
    >
      <RotateCcw
        key={putaran}
        size={16}
        className={putaran > 0 ? 'animate-spin-once' : undefined}
        aria-hidden="true"
      />
      <span className={labelClassName}>{label}</span>
    </button>
  );
}
