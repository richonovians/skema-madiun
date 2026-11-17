import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Pesan galat di bawah sebuah medan, dipakai `Input` dan `Textarea`
 * (17 November 2026, BUG-083).
 *
 * Warnanya token `error` (#ba1a1a, 6,46:1 di atas putih), bukan `red-500`
 * milik `Dropdown` yang tak mencapai 4,5:1 untuk teks sekecil ini. Ikon dan
 * kalimatnya membuat pesan ini tak bergantung pada warna saja.
 */
export default function PesanGalatMedan({ id, children }) {
  return (
    <p id={id} className="text-sm text-error mt-1.5 flex items-center gap-1.5">
      <AlertCircle size={14} aria-hidden="true" className="shrink-0" />
      {children}
    </p>
  );
}

/** Id pesan galat untuk medan ber-id `idMedan`. */
export const idGalatMedan = (idMedan) => `${idMedan}-galat`;

/**
 * Menggabungkan `aria-describedby` milik pemanggil dengan id pesan galat,
 * supaya keterangan yang sudah ada tidak tertimpa. Mengembalikan `undefined`
 * bila keduanya kosong, sehingga atributnya tidak dirender sama sekali.
 */
export const gabungDescribedBy = (milikPemanggil, idGalat) =>
  [milikPemanggil, idGalat].filter(Boolean).join(' ') || undefined;
