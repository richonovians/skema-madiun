'use client';

import { useEffect } from 'react';

/**
 * Memindahkan fokus ke dalam sebuah dialog saat ia terbuka, mengurungnya di
 * sana selama terbuka, lalu memulihkannya ke pemicu saat ditutup.
 *
 * LAHIR DARI BUG-015 BAGIAN 2. Kelima dialog ber-`role="dialog"` di aplikasi ini
 * memasang `aria-modal="true"` -- yang menyuruh pembaca layar menyembunyikan
 * seluruh isi halaman di luar dialog -- sementara tak satu pun memindahkan
 * fokusnya ke dalam. Pemakai pembaca layar karena itu mendarat di ruang kosong:
 * dialognya terbuka, tetapi fokusnya tertinggal di tombol pemicu yang kini
 * berada di wilayah yang disembunyikan itu, dan dua kali Tab membawanya keluar
 * sama sekali. Atribut yang lengkap TANPA pengelolaan fokus lebih merugikan
 * daripada tidak beratribut, sebab `aria-modal` itulah yang menyembunyikan
 * jalan pulangnya.
 *
 * Disatukan di sini, bukan disalin ke lima berkas, dengan alasan yang sama yang
 * melahirkan `useBodyScrollLock`: polanya identik di tiap pemakai, dan lapisan
 * baru tinggal memanggilnya.
 *
 * MENGURUNG DI TEPIAN SAJA, bukan mengambil alih seluruh urutan Tab.
 * Berpindah antar elemen di dalam dialog tetap pekerjaan peramban; yang dicegat
 * hanya Tab yang hendak MELEWATI tepi, lalu dilingkarkan ke ujung lain. Ini
 * sengaja: mengambil alih setiap Tab berarti mengabaikan `tabindex` positif dan
 * urutan baca yang mungkin dipasang kelak.
 *
 * KENAPA BUKAN `inert` PADA SISA HALAMAN, yang sebetulnya lebih kuat: jsdom
 * tidak mendukungnya, sehingga pagarnya tak akan dapat membuktikan apa pun, dan
 * tiga dari lima dialog mem-portal dirinya ke `document.body` sehingga "sisa
 * halaman" bukan satu subpohon yang kita miliki. Batas yang dibayar: pengurungan
 * lewat keydown tidak menahan fokus mencapai kendali peramban (bilah URL,
 * bilah tab). Itu batas yang sama dimiliki hampir semua pengurungan fokus, dan
 * bukan yang dikeluhkan BUG-015.
 *
 * @param {{current: HTMLElement|null}} refDialog elemen ber-`role="dialog"`.
 *   Ia WAJIB ber-`tabIndex={-1}` supaya dapat menerima fokus.
 * @param {boolean} aktif biasanya `isOpen`. `false` = tidak mengurung apa pun,
 *   untuk komponen yang tetap ter-mount saat tertutup.
 * @param {{current: HTMLElement|null}} [refFokusAwal] sasaran fokus pertama bila
 *   wadah dialognya bukan tempat yang paling berguna. Bawaannya wadah itu
 *   sendiri, supaya pembaca layar mengumumkan nama dialognya lebih dulu dan tak
 *   ada tombol destruktif yang terkokang -- Enter nyasar tidak melakukan apa pun.
 */
const TERFOKUS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(refDialog, aktif = true, refFokusAwal = null) {
  useEffect(() => {
    if (!aktif) return undefined;

    const dialog = refDialog?.current;
    if (!dialog) return undefined;

    // Dibaca SEBELUM fokus dipindahkan, dan disimpan di closure: saat pembersih
    // berjalan, dialognya sudah lepas dari dokumen dan tak ada lagi yang dapat
    // ditanyai tentang asal fokusnya.
    const pemicu = document.activeElement;

    (refFokusAwal?.current ?? dialog).focus();

    const padaKeydown = (e) => {
      if (e.key !== 'Tab') return;

      // DIHITUNG ULANG pada tiap Tab, tidak disinggahkan saat dialog terbuka:
      // himpunannya berubah selagi dialog hidup. Di ConfirmTypeToDeleteModal
      // tombol "Hapus Permanen" `disabled` sampai ketikannya cocok, jadi tepi
      // lingkarannya bergeser saat pemakai mengetik.
      const anggota = Array.from(dialog.querySelectorAll(TERFOKUS));

      if (anggota.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const pertama = anggota[0];
      const terakhir = anggota[anggota.length - 1];
      const kini = document.activeElement;

      // Wadahnya ikut dihitung sebagai tepi KEDUA arah. Ia mendahului seluruh
      // anaknya di DOM, jadi Shift+Tab darinya akan keluar dari dialog.
      if (e.shiftKey && (kini === pertama || kini === dialog)) {
        e.preventDefault();
        terakhir.focus();
      } else if (!e.shiftKey && (kini === terakhir || kini === dialog)) {
        e.preventDefault();
        pertama.focus();
      }
    };

    dialog.addEventListener('keydown', padaKeydown);

    return () => {
      dialog.removeEventListener('keydown', padaKeydown);
      // Diperiksa masih ada di dokumen: pemicunya bisa ikut hilang bersama
      // barisnya, misalnya tombol hapus pada baris tabel yang baru dihapus.
      if (pemicu && typeof pemicu.focus === 'function' && document.contains(pemicu)) {
        pemicu.focus();
      }
    };
  }, [aktif, refDialog, refFokusAwal]);
}

export default useFocusTrap;
