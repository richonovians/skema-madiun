'use client';

import React from 'react';
import { X } from 'lucide-react';
import IconButton from './IconButton';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

/**
 * Gambar layar penuh. DIEKSTRAK dari ImageViewer (7 September 2026) supaya
 * galeri lampiran admin dapat memakainya juga.
 *
 * Diekstrak, bukan disalin: ImageViewer sudah memuat perbaikan `useBodyScrollLock`
 * -- tanpanya, menggulir di atas gambar menggeser halaman di baliknya, dan
 * menutup lightbox meninggalkan pengguna jauh dari tempatnya semula pada halaman
 * detail pengaduan yang panjang. Lightbox kedua yang disalin akan berangkat tanpa
 * perbaikan itu, lalu diam-diam menyimpang.
 *
 * @param {object} props
 * @param {string} props.src
 * @param {string} props.alt
 * @param {() => void} props.onClose
 */
export default function ImageLightbox({ src, alt, onClose }) {
  useBodyScrollLock(true);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 md:p-8">
      {/* `aria-label` WAJIB: tombolnya ikon-saja, jadi tanpa ini pembaca layar
          hanya menyebut "tombol" dan tak ada jalan keluar yang dapat dikenali. */}
      <IconButton
        className="absolute top-4 right-4 text-white hover:text-white hover:bg-white/20 p-2"
        aria-label="Tutup gambar"
        onClick={onClose}
      >
        <X size={24} />
      </IconButton>
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain rounded-lg" />
    </div>
  );
}
