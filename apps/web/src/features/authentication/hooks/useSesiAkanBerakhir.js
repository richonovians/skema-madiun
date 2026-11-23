'use client';

import { useSyncExternalStore } from 'react';
import {
  MASA_SESI_BERUBAH_EVENT,
  SESSION_CHANGED_EVENT,
  waktuBerakhirSesiMs,
} from '../services/authStorage';

/**
 * Peringatan sebelum sesi berakhir (23 November 2026).
 *
 * Lencana notifikasi memanggil API tiap 60 detik selama tabnya terlihat, dan
 * setiap panggilan memperpanjang jendela menganggur. Jadi selama tab terbuka di
 * layar, sesi praktis tak pernah habis karena menganggur. Peringatan ini
 * terutama melayani dua keadaan lain: pagu mutlak 12 jam yang tak dapat
 * diperpanjang, dan tab yang lama ditinggal di latar lalu dibuka lagi.
 */
export const AMBANG_PERINGATAN_MS = 5 * 60 * 1000;

// Batas `setTimeout` (2^31 - 1 ms, sekitar 24,8 hari). Tunda yang lebih panjang
// langsung jalan seketika; dipotong lalu dijadwalkan ulang saat jatuh tempo.
const TUNDA_MAKS_MS = 2 ** 31 - 1;

/**
 * Waktu berakhir (ms epoch) bila sudah di dalam ambang, `null` selain itu.
 * Nilainya primitif, jadi React menganggapnya tak berubah selama keadaannya
 * sama -- syarat `getSnapshot` milik `useSyncExternalStore`.
 */
function bacaPetikan() {
  const berakhir = waktuBerakhirSesiMs();
  if (berakhir == null) return null;
  return Date.now() >= berakhir - AMBANG_PERINGATAN_MS ? berakhir : null;
}

const petikanServer = () => null;

function berlangganan(beriTahu) {
  let pewaktu = null;

  // Satu pewaktu ke saat ambang tercapai. Dijadwal ulang setiap kali sesinya
  // berubah, sebab waktu berakhirnya bisa maju di tengah jalan.
  const jadwalkan = () => {
    clearTimeout(pewaktu);
    pewaktu = null;
    const berakhir = waktuBerakhirSesiMs();
    if (berakhir == null) return;
    const tunda = berakhir - AMBANG_PERINGATAN_MS - Date.now();
    if (tunda <= 0) return;
    pewaktu = setTimeout(
      () => {
        beriTahu();
        jadwalkan();
      },
      Math.min(tunda, TUNDA_MAKS_MS),
    );
  };

  const segarkan = () => {
    beriTahu();
    jadwalkan();
  };

  // Peramban menahan pewaktu tab latar, jadi jatuh temponya bisa terlewat.
  // Begitu tabnya terlihat lagi, keadaannya dihitung ulang dari jam sungguhan.
  const padaTerlihat = () => {
    if (document.visibilityState !== 'hidden') segarkan();
  };

  window.addEventListener(SESSION_CHANGED_EVENT, segarkan);
  window.addEventListener(MASA_SESI_BERUBAH_EVENT, segarkan);
  // `sso_expires_at` dipakai bersama semua tab; perpanjangan di tab lain tiba
  // sebagai event `storage`.
  window.addEventListener('storage', segarkan);
  document.addEventListener('visibilitychange', padaTerlihat);
  jadwalkan();

  return () => {
    clearTimeout(pewaktu);
    window.removeEventListener(SESSION_CHANGED_EVENT, segarkan);
    window.removeEventListener(MASA_SESI_BERUBAH_EVENT, segarkan);
    window.removeEventListener('storage', segarkan);
    document.removeEventListener('visibilitychange', padaTerlihat);
  };
}

/**
 * @returns {number|null} waktu berakhir sesi (ms epoch) bila sisanya sudah di
 *   bawah `AMBANG_PERINGATAN_MS`; `null` bila belum, atau tak ada sesi.
 */
export function useSesiAkanBerakhir() {
  return useSyncExternalStore(berlangganan, bacaPetikan, petikanServer);
}
