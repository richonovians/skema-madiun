'use client';

import { useEffect, useRef } from 'react';

/**
 * Jarak terdekat antara dua penyegaran yang dipicu peristiwa (`focus` dan
 * `visibilitychange`). Diekspor supaya ujinya memajukan waktu dengan angka yang
 * sama persis, bukan angka yang disalin lalu diam-diam berbeda saat nilai ini
 * diubah.
 */
export const JEDA_MINIMUM_SEGAR_MS = 10_000;

/**
 * Menyegarkan sesuatu secara berkala, TETAPI hanya selagi tabnya terlihat.
 *
 * Dibuat untuk lencana notifikasi di navbar (16 September 2026, pertanyaan
 * pengguna: lencananya tak berubah saat ada notifikasi baru). Penyebabnya bukan
 * cacat: `useAsync` mengambil data sekali per pemasangan, dan satu-satunya
 * penyegaran lain adalah peristiwa `skema:notifikasi-berubah` yang HANYA
 * ditembakkan tab ini sendiri sesudah menandai notifikasi terbaca. Lonceng itu
 * hidup di layout, jadi berpindah halaman pun tak memasangnya ulang, dan
 * angkanya bertahan sampai halaman dimuat ulang penuh.
 *
 * SYARAT TIDURNYA BUKAN HIASAN. Interval yang berjalan terus membuat setiap tab
 * yang ditinggalkan terbuka, termasuk yang tak dilihat siapa pun sejak kemarin,
 * tetap memanggil API sepanjang hari. `visibilitychange` menutup itu: saat tab
 * tersembunyi intervalnya dimatikan, dan saat kembali terlihat penyegarannya
 * dijalankan SEKETIKA lalu hitungannya dimulai lagi dari nol. Pengguna yang
 * kembali dari tab lain melihat angka terbaru tanpa menunggu satu jeda penuh.
 *
 * `focus` IKUT DIDENGARKAN sejak 17 September 2026, sesudah tim melaporkan
 * lencananya tetap terasa mati saat menguji dua akun berdampingan. Semula ia
 * ditolak karena dianggap menambah permintaan tanpa menambah kebaruan --
 * penilaian yang meleset justru pada pemakaian yang paling wajar: dua jendela
 * yang tampil bersisian sama-sama berstatus terlihat menurut peramban, jadi
 * `visibilitychange` tak pernah menembak di antara keduanya dan berpindah
 * jendela tak menyegarkan apa pun sampai satu menit penuh berlalu.
 *
 * Keberatan lamanya tidak salah, hanya perlu dijawab: `focus` memang menembak
 * jauh lebih sering, dan berpindah tab menembakkan `visibilitychange` DAN
 * `focus` berurutan. Karena itu keduanya berbagi satu JEDA MINIMUM
 * (`JEDA_MINIMUM_SEGAR_MS`) -- pemicu yang datang sebelum jedanya terlewat
 * diabaikan, sehingga satu perpindahan tetap menghasilkan satu permintaan dan
 * berpindah jendela bolak-balik tak berubah menjadi rentetan permintaan.
 *
 * Ketukan berkala tidak ikut disaring jedanya. Jaraknya sendiri sudah jauh
 * lebih lebar, tetapi ia TETAP mencatat waktunya, supaya fokus yang datang
 * sedetik sesudah sebuah ketukan tidak mengulang permintaan yang sama.
 *
 * Penyegarnya disimpan di ref: bila ia dijadikan dependency effect, setiap
 * render pemanggil yang menghasilkan fungsi baru akan membongkar dan memasang
 * ulang intervalnya, sehingga jedanya tak pernah genap tercapai pada komponen
 * yang sering render.
 *
 * @param {() => void} segarkan
 * @param {number} jedaMs
 */
export default function useSegarkanBerkala(segarkan, jedaMs) {
  const segarkanRef = useRef(segarkan);

  useEffect(() => {
    segarkanRef.current = segarkan;
  }, [segarkan]);

  useEffect(() => {
    let id = null;
    let terakhirSegarMs = null;

    const hentikan = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };

    const segarkanSekarang = () => {
      terakhirSegarMs = Date.now();
      segarkanRef.current?.();
    };

    const mulai = () => {
      hentikan();
      id = setInterval(segarkanSekarang, jedaMs);
    };

    const baruSajaSegar = () =>
      terakhirSegarMs !== null && Date.now() - terakhirSegarMs < JEDA_MINIMUM_SEGAR_MS;

    const tanggapiKeterlihatan = () => {
      if (document.visibilityState !== 'visible') {
        hentikan();
        return;
      }
      // Intervalnya dimulai ulang tanpa syarat, bahkan ketika penyegarannya
      // ditelan jeda minimum: selagi tersembunyi ia memang dimatikan, jadi tak
      // ada yang akan menghidupkannya lagi kalau bukan di sini.
      if (!baruSajaSegar()) segarkanSekarang();
      mulai();
    };

    const tanggapiFokus = () => {
      // Jendela yang tersembunyi pun masih bisa menerima fokus. Menanggapinya
      // berarti membangunkan interval yang sengaja ditidurkan, dan tab yang
      // ditinggal berhari-hari mulai memanggil API lagi tanpa ada yang melihat.
      if (document.visibilityState !== 'visible' || baruSajaSegar()) return;
      segarkanSekarang();
      mulai();
    };

    if (document.visibilityState === 'visible') mulai();
    document.addEventListener('visibilitychange', tanggapiKeterlihatan);
    window.addEventListener('focus', tanggapiFokus);

    return () => {
      document.removeEventListener('visibilitychange', tanggapiKeterlihatan);
      window.removeEventListener('focus', tanggapiFokus);
      hentikan();
    };
  }, [jedaMs]);
}
