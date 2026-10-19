import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

/**
 * State error konsisten -- pasangan EmptyState.jsx & LoadingState.jsx.
 *
 * `description={null}` berarti "sengaja tanpa paragraf", dan itu BERBEDA dari
 * propnya tidak diberikan sama sekali (yang tetap memakai kalimat bawaan):
 * parameter berbawaan hanya menyala untuk `undefined`. Pembedaan ini dipakai
 * layar galat /survei/:id, tempat kalimat galat dari backend menyebut id
 * internal dan istilah yang hanya dikenal di dalam kode.
 *
 * `action` mengikuti EmptyState.jsx: aksi bebas untuk galat yang TAK dapat
 * diperbaiki dengan mengulang, mis. survei yang memang tidak ada. Di sana
 * tombol "Coba Lagi" menjanjikan yang tak dapat ditepati, sementara layar tanpa
 * tautan apa pun menjadi jalan buntu.
 */
export default function ErrorState({
  title = 'Gagal memuat data',
  description = 'Terjadi kesalahan saat mengambil data. Silakan coba lagi.',
  onRetry,
  action,
  as: Judul = 'h3',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="text-error mb-4 opacity-80">
        <AlertTriangle size={48} />
      </div>
      {/* `as` ditambahkan 25 September 2026 untuk halaman galat seluruh layar
          (not-found.jsx & error.jsx). Di sana komponen ini BUKAN satu bagian di
          dalam halaman melainkan satu-satunya isi halaman, jadi judulnya harus
          `h1`: halaman yang dimulai dari `h3` membuat pembaca layar mengumumkan
          tingkat yang tak punya induk. Bawaannya tetap `h3` sehingga kedelapan
          pemakai lama tak berubah sedikit pun. */}
      <Judul className={`text-headline-md font-headline-md text-text-primary ${description ? 'mb-2' : 'mb-6'}`}>
        {title}
      </Judul>
      {description && (
        <p className="text-body-md font-body-md text-text-secondary mb-6 max-w-[400px] w-full">
          {description}
        </p>
      )}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Coba Lagi
        </Button>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
