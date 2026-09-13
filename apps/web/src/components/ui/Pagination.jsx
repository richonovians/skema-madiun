'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ 
  currentPage = 1, 
  totalPages = 1, 
  totalItems = 0, 
  itemsPerPage = 10,
  itemName = 'pengaduan',
  onPageChange 
}) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="px-6 py-4 bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
      <span className="font-body text-sm font-medium text-text-secondary">
        Menampilkan {startItem}-{endItem} dari {totalItems} {itemName}
      </span>
      {/* Kedua tombol di bawah HANYA berisi ikon, jadi tanpa `aria-label` ia tak
          punya nama yang bisa dibacakan sama sekali -- pembaca layar cuma
          menyebut "tombol", persis cacat yang dulu ditemukan pada bel
          notifikasi. Ditemukan 13 September 2026 saat menulis uji halaman
          riwayat notifikasi; berlaku untuk SETIAP halaman berpaginasi. */}
      <div className="flex gap-2">
        <button 
          aria-label="Halaman sebelumnya"
          onClick={() => onPageChange && onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`p-1 rounded flex items-center justify-center transition-colors ${
            currentPage <= 1 
              ? 'opacity-50 cursor-not-allowed text-text-secondary' 
              : 'hover:bg-surface-container text-text-primary'
          }`}
        >
          <ChevronLeft size={20} />
        </button>
        <button 
          aria-label="Halaman berikutnya"
          onClick={() => onPageChange && onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`p-1 rounded flex items-center justify-center transition-colors ${
            currentPage >= totalPages 
              ? 'opacity-50 cursor-not-allowed text-text-secondary' 
              : 'hover:bg-surface-container text-text-primary'
          }`}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
