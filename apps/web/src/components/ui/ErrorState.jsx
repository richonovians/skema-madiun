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
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="text-error mb-4 opacity-80">
        <AlertTriangle size={48} />
      </div>
      <h3 className={`text-headline-md font-headline-md text-text-primary ${description ? 'mb-2' : 'mb-6'}`}>
        {title}
      </h3>
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
