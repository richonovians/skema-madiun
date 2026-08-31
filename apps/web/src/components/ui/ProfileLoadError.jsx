import React from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';
import ProfileErrorAvatar from './ProfileErrorAvatar';

/**
 * Blok identitas pengguna versi GAGAL untuk navbar admin (AdminNavbar &
 * AdminKabNavbar): teks keterangan + jalan keluarnya + avatar galat.
 *
 * Mengembalikan DUA elemen bersaudara (fragment), bukan satu pembungkus, supaya
 * jaraknya tetap ditentukan `gap` milik baris flex pemanggilnya -- persis seperti
 * pasangan "teks identitas + Avatar" yang digantikannya.
 *
 * Kedua navbar itu sebelumnya menampilkan `Pengguna` / `-` / `?` saat
 * GET /auth/me gagal: tiga nilai kalau-kalau yang terlihat seperti data
 * sungguhan. Yang penting bukan pesannya lebih ramah, tapi TINDAKANNYA berbeda:
 * - `offline`: sesi kemungkinan masih sah, server yang tak terjangkau -> tawarkan
 *   memuat ulang datanya saja.
 * - `expired`: sesi sudah ditolak backend (401) dan artefaknya sudah dibuang
 *   interceptor api.js -> tak ada gunanya mencoba lagi, yang dibutuhkan adalah
 *   masuk kembali.
 *
 * Catatan sasaran sentuh: tombol/tautan di sini sengaja lebih rendah dari 44px.
 * Blok ini hanya dirender pada kelompok profil yang khusus layar ≥sm/md di kedua
 * navbar (perangkat penunjuk), sementara jalur ponsel hanya menampilkan avatar
 * galat berlabel -- pemulihannya di sana adalah memuat ulang halaman. Menaikkan
 * tingginya ke 44px justru mendorong keluar isi navbar yang tingginya 64-80px.
 *
 * @param {'offline'|'expired'} reason
 * @param {() => void} [onRetry] dipakai hanya saat `offline`.
 * @param {string} [textClassName] mis. `hidden sm:block` mengikuti pemanggil.
 */
export default function ProfileLoadError({ reason = 'offline', onRetry, textClassName }) {
  const isExpired = reason === 'expired';

  return (
    <>
      <div className={twMerge(clsx('text-right', textClassName))}>
        <p className="text-label-md font-bold text-error truncate max-w-[180px]">
          {isExpired ? 'Sesi berakhir' : 'Profil gagal dimuat'}
        </p>
        {isExpired ? (
          <Link
            href="/"
            className="text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary-hover"
          >
            Masuk lagi
          </Link>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary-hover focus:outline-none focus:ring-2 focus:ring-primary rounded"
          >
            Coba lagi
          </button>
        )}
      </div>
      <ProfileErrorAvatar reason={reason} size="lg" className="w-10 h-10" />
    </>
  );
}
