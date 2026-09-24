import React from 'react';
import Link from 'next/link';
import ErrorState from '@/components/ui/ErrorState';

export const metadata = {
  title: 'Halaman tidak ditemukan — SKEMA Madiun',
};

/**
 * Halaman 404 untuk seluruh aplikasi (25 September 2026).
 *
 * Sebelumnya berkas ini tak ada, jadi alamat yang salah ketik mendarat di 404
 * bawaan Next: berbahasa Inggris, tanpa jalan pulang, dan tanpa tanda bahwa ini
 * situs pemerintah kabupaten.
 *
 * SENGAJA TANPA "COBA LAGI". Mengulang permintaan ke alamat yang memang tidak
 * ada menjanjikan yang tak dapat ditepati; alasan yang sama sudah tertulis di
 * komentar ErrorState untuk layar /survei/:id. Yang ditawarkan satu-satunya
 * tindakan yang benar-benar menolong, yaitu kembali ke beranda.
 *
 * Root layout tak memuat navbar, jadi tautan itu bukan pelengkap melainkan
 * SATU-SATUNYA jalan keluar selain tombol back peramban.
 */
export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center">
      <ErrorState
        as="h1"
        title="Halaman tidak ditemukan"
        description="Alamat yang Anda buka tidak ada atau sudah dipindahkan."
        action={
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-primary text-white font-medium transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            Kembali ke beranda
          </Link>
        }
      />
    </main>
  );
}
