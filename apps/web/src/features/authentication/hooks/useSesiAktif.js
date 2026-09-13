'use client';

import { useState, useSyncExternalStore } from 'react';
import { isAuthenticated, SESSION_CHANGED_EVENT } from '../services/authStorage';

/**
 * Ada-tidaknya sesi HANYA diketahui peramban: token disimpan di localStorage,
 * dan server merender tanpa aksesnya.
 *
 * Membacanya lewat inisialisasi `useState` tampak aman karena `isAuthenticated()`
 * mengembalikan false di server, tetapi justru itu sumber cacatnya: inisialisasi
 * berjalan LAGI saat hidrasi, kali ini mengembalikan true, sehingga render
 * pertama di klien berbeda dari HTML server dan React membangun ulang pohonnya
 * (hydration failed, dilaporkan 12 September 2026 dan tereproduksi di
 * app/__tests__/hidrasiSesi.test.jsx).
 *
 * `useSyncExternalStore` menyelesaikannya lewat `getServerSnapshot`: React
 * memakai petikan server saat hidrasi, lalu berpindah ke petikan klien pada
 * render berikutnya. Tidak ada setState di dalam efek, jadi aturan
 * react-hooks/set-state-in-effect yang dulu dihindari tetap tidak dilanggar.
 */

/** Sebelum hidrasi selesai, sesi selalu dianggap belum ada. */
const petikanServer = () => false;

function berlangganan(beriTahu) {
  window.addEventListener(SESSION_CHANGED_EVENT, beriTahu);
  return () => window.removeEventListener(SESSION_CHANGED_EVENT, beriTahu);
}

const tanpaLangganan = () => () => {};

/**
 * Sesi yang terus disimak. Dipakai layar yang harus menyusul ketika sesi
 * dinyatakan tak sah di tengah jalan, misalnya sesudah interseptor 401 di
 * services/api.js membuang artefak sesi.
 */
export function useSesiAktif() {
  return useSyncExternalStore(berlangganan, isAuthenticated, petikanServer);
}

/**
 * Nilai peramban yang dibaca SEKALI sesudah hidrasi lalu dibekukan.
 *
 * Perlu untuk layar yang keputusannya tak boleh berubah di tengah pemakaian.
 * Pada pengisian survei, ada-tidaknya sesi menentukan endpoint mana yang
 * dipanggil; membiarkannya berubah saat sesi kedaluwarsa akan memuat ulang
 * kuesioner yang sedang diisi.
 *
 * `baca` diambil dari render pertama saja, sebab nilainya memang tak dimaksudkan
 * mengikuti perubahan apa pun.
 */
export function usePetikanPerambanSekali(baca) {
  const [ambil] = useState(() => {
    let tersimpan;
    return () => {
      if (tersimpan === undefined) tersimpan = baca();
      return tersimpan;
    };
  });
  return useSyncExternalStore(tanpaLangganan, ambil, petikanServer);
}
