'use client';

import { useEffect, useRef } from 'react';

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
 * `focus` sengaja TIDAK didengarkan. Ia menembak setiap kali jendela mendapat
 * fokus, termasuk saat kembali dari jendela yang tak pernah menutupi tab ini,
 * jadi ia menambah permintaan tanpa menambah kebaruan.
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

    const hentikan = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };

    const mulai = () => {
      hentikan();
      id = setInterval(() => segarkanRef.current?.(), jedaMs);
    };

    const tanggapiKeterlihatan = () => {
      if (document.visibilityState === 'visible') {
        segarkanRef.current?.();
        mulai();
      } else {
        hentikan();
      }
    };

    if (document.visibilityState === 'visible') mulai();
    document.addEventListener('visibilitychange', tanggapiKeterlihatan);

    return () => {
      document.removeEventListener('visibilitychange', tanggapiKeterlihatan);
      hentikan();
    };
  }, [jedaMs]);
}
