'use client';

import { useEffect } from 'react';
import { sapuDrafKedaluwarsa } from '@/utils/drafLokal';

/**
 * Menghapus draf basi dari IndexedDB setiap kali aplikasi dimuat
 * (23 November 2026).
 *
 * IndexedDB tidak punya penghapusan otomatis. Tanpa sapuan ini, draf basi
 * hanya terhapus bila formulir yang sama dibuka lagi, sehingga draf batas
 * harian yang tak pernah dilanjutkan menetap di disk tanpa batas waktu.
 * Dipasang SEKALI di root layout, di sebelah PeringatanSesiBerakhir. Tidak
 * merender apa pun.
 */
export default function SapuDrafKedaluwarsa() {
  useEffect(() => {
    sapuDrafKedaluwarsa();
  }, []);
  return null;
}
