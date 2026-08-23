'use client';

import { useEffect } from 'react';

/**
 * Mengunci gulir halaman selagi sebuah lapisan (modal, laci, dropdown, lightbox)
 * terbuka. Tanpa ini, roda tetikus / usapan jari di atas latar ikut menggeser
 * halaman di belakangnya -- pengguna menutup lapisan lalu mendapati dirinya di
 * tempat yang sama sekali berbeda.
 *
 * SEBELUMNYA pola `document.body.style.overflow = 'hidden'` ini DISALIN identik
 * di empat berkas (ConfirmDialog, ShareSurveyModal, SurveyFormModal,
 * QuestionOptionsModal), sementara sembilan lapisan lain tak menguncinya sama
 * sekali. Disatukan di sini supaya lapisan baru tinggal memanggilnya.
 *
 * PENGHITUNG, bukan sekadar simpan-pulihkan: lapisan bisa bertumpuk (mis.
 * ImageViewer dibuka dari dalam halaman yang lacinya sedang terbuka). Kalau tiap
 * lapisan memulihkan nilai sebelumnya sendiri-sendiri, lapisan yang tutup lebih
 * dulu akan membuka kunci padahal yang di atasnya masih terbuka. Kunci baru
 * benar-benar dilepas saat pemakai TERAKHIR menutup.
 *
 * @param {boolean} isLocked `false` = tidak mengunci apa pun (untuk komponen
 *   yang tetap ter-mount saat tertutup dan baru `return null` setelah hook).
 */
let lockCount = 0;
let previousOverflow = '';

export function useBodyScrollLock(isLocked = true) {
  useEffect(() => {
    if (!isLocked) return undefined;

    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
