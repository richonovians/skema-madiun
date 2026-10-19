'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import useKeepInViewport from '@/hooks/useKeepInViewport';
import { terapkanTemplate } from '@/features/complaints/adapters/templatePesan';

/**
 * Tombol + panel berisi template pesan siap pakai (17 September 2026,
 * permintaan pengguna).
 *
 * Komponen ini TIDAK tahu siapa yang memakainya. Daftar templatenya dioper
 * pemanggil, sehingga kotak balasan warga dan ruang kerja admin memakai
 * komponen yang sama tanpa satu pun percabangan peran di dalamnya -- dan
 * daftar yang tertukar akan tertangkap oleh uji di masing-masing kotak pesan,
 * bukan bersembunyi di balik kondisi di sini.
 *
 * BENTUKNYA TOMBOL, BUKAN BARIS CHIP yang selalu terlihat. Chip lebih mudah
 * ditemukan, tetapi ia menambah tinggi kotak pesan dan berjajar melebar --
 * dua hal yang sudah beberapa kali merusak tampilan proyek ini di layar 320px.
 * Panelnya dijaga `useKeepInViewport`, kait yang sama yang menahan panel
 * notifikasi tetap di dalam layar.
 *
 * @param {object} props
 * @param {{id: string, judul: string, isi: string}[]} props.templates
 * @param {string} [props.nomorTiket] mengisi kata kunci `{tiket}` pada isinya
 * @param {(teks: string) => void} props.onPilih menerima teks yang sudah jadi
 */
export default function TemplatePesanPicker({
  templates = [],
  nomorTiket,
  onPilih,
  className = '',
}) {
  const [terbuka, setTerbuka] = useState(false);
  const wadahRef = useRef(null);
  const panelRef = useRef(null);
  useKeepInViewport(panelRef, terbuka);

  useEffect(() => {
    if (!terbuka) return undefined;

    const tutupBilaDiLuar = (e) => {
      if (wadahRef.current && !wadahRef.current.contains(e.target)) setTerbuka(false);
    };
    const tutupBilaEsc = (e) => {
      if (e.key === 'Escape') setTerbuka(false);
    };

    document.addEventListener('mousedown', tutupBilaDiLuar);
    document.addEventListener('keydown', tutupBilaEsc);
    return () => {
      document.removeEventListener('mousedown', tutupBilaDiLuar);
      document.removeEventListener('keydown', tutupBilaEsc);
    };
  }, [terbuka]);

  if (templates.length === 0) return null;

  const pilih = (template) => {
    setTerbuka(false);
    onPilih?.(terapkanTemplate(template.isi, nomorTiket));
  };

  return (
    <div className={`relative ${className}`} ref={wadahRef}>
      <button
        type="button"
        onClick={() => setTerbuka(!terbuka)}
        aria-label="Template pesan"
        aria-expanded={terbuka}
        className="p-sm text-on-surface-variant hover:bg-surface-variant/50 rounded-lg transition-colors flex items-center gap-xs min-h-[44px]"
      >
        <MessageSquareText size={20} />
        <span className="text-label-md hidden sm:inline">Template</span>
      </button>

      {terbuka && (
        <div
          ref={panelRef}
          className="absolute bottom-full left-0 mb-2 w-[min(320px,calc(100vw-1.5rem))] bg-surface rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-outline-variant z-50 overflow-hidden"
        >
          <p className="px-4 py-2.5 text-label-md font-bold text-on-surface border-b border-outline-variant">
            Pilih template pesan
          </p>
          <ul className="max-h-72 overflow-y-auto overscroll-contain divide-y divide-outline-variant/50">
            {templates.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => pilih(template)}
                  className="w-full text-left px-4 py-3 hover:bg-surface-container-low transition-colors"
                >
                  <span className="block text-body-md font-semibold text-on-surface">
                    {template.judul}
                  </span>
                  {/* Cuplikan isinya ikut ditampilkan: judul saja tak cukup
                      untuk memutuskan, dan membuka lalu membatalkan satu per
                      satu jauh lebih mahal daripada dua baris teks di sini. */}
                  <span className="block text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">
                    {terapkanTemplate(template.isi, nomorTiket)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
