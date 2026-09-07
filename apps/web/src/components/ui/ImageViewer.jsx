'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import ImageLightbox from './ImageLightbox';

/**
 * Thumbnail gambar yang membuka lightbox saat diklik.
 *
 * Lightbox-nya sendiri kini ImageLightbox (diekstrak 7 September 2026, dipakai
 * juga oleh galeri lampiran admin). `useBodyScrollLock` pindah ke sana bersama
 * markup-nya -- ia dipasang hanya saat komponen itu terpasang, jadi perilakunya
 * sama dengan `useBodyScrollLock(isOpen)` yang dulu di sini.
 */
export default function ImageViewer({ src, alt, className }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        className={twMerge(clsx(
          'aspect-square rounded-lg overflow-hidden border border-border hover:opacity-90 cursor-pointer transition-opacity group relative', 
          className
        ))}
        onClick={() => setIsOpen(true)}
      >
        <img className="w-full h-full object-cover" alt={alt} src={src} />
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all" />
      </div>

      {isOpen && <ImageLightbox src={src} alt={alt} onClose={() => setIsOpen(false)} />}
    </>
  );
}
