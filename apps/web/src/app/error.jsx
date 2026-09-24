'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import ErrorState from '@/components/ui/ErrorState';

export const ALAMAT_PELAPORAN = 'diskominfo@madiunkab.go.id';

/**
 * Batas galat untuk seluruh rute (25 September 2026).
 *
 * Sebelumnya berkas ini tak ada di seluruh 44 halaman, jadi galat di rute mana
 * pun menampilkan layar bawaan Next.
 *
 * YANG DITAMPILKAN HANYA `digest`, TIDAK PERNAH `error.message`. Pesan galat
 * mentah dapat memuat nama tabel, jalur berkas di peladen, atau potongan kueri
 * -- keterangan yang berguna bagi penyerang dan tak berarti apa-apa bagi warga.
 * `digest` adalah kode acak yang diterbitkan Next dan menunjuk ke baris log di
 * peladen, sehingga pelapor punya sesuatu untuk disebut tanpa ada yang bocor.
 * Uji di halaman-galat.test.jsx menjaga batas ini.
 *
 * `digest` hanya terisi pada build produksi, jadi barisnya disembunyikan saat
 * kosong; baris "Kode:" yang melompong justru membuat orang mengira ada bagian
 * halaman yang gagal dimuat.
 *
 * `console.error` di bawah adalah penampung sementara sampai ada pemantauan
 * galat sungguhan. Ia tak menggantikannya: yang tercetak di konsol peramban
 * warga tak pernah sampai ke siapa pun. Ini membuat galat terlihat saat ada
 * yang membuka DevTools, bukan membuatnya terlaporkan.
 */
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex-1 flex items-center justify-center">
      <ErrorState
        as="h1"
        title="Terjadi gangguan"
        description={`Kami tidak dapat menampilkan halaman ini. Silakan coba lagi. Bila terus terjadi, laporkan ke ${ALAMAT_PELAPORAN} dengan menyertakan kode di bawah.`}
        onRetry={reset}
        action={
          <div className="flex flex-col items-center gap-4">
            {error?.digest && (
              <p className="text-body-sm font-mono text-text-secondary">Kode: {error.digest}</p>
            )}
            <Link
              href="/"
              className="text-body-md font-medium text-primary underline underline-offset-4 min-h-[44px] inline-flex items-center focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
            >
              Kembali ke beranda
            </Link>
          </div>
        }
      />
    </main>
  );
}
