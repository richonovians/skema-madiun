import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

/** State error konsisten -- pasangan EmptyState.jsx & LoadingState.jsx. */
export default function ErrorState({
  title = 'Gagal memuat data',
  description = 'Terjadi kesalahan saat mengambil data. Silakan coba lagi.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="text-error mb-4 opacity-80">
        <AlertTriangle size={48} />
      </div>
      <h3 className="text-headline-md font-headline-md text-text-primary mb-2">{title}</h3>
      <p className="text-body-md font-body-md text-text-secondary mb-6 max-w-[400px] w-full">
        {description}
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Coba Lagi
        </Button>
      )}
    </div>
  );
}
