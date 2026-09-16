'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';

/**
 * Tombol Ekspor beserta pilihan PDF dan Excel.
 *
 * Hanya tampilannya. Penyusunan berkasnya milik pemanggil, sebab tiap halaman
 * punya data dan susunan kolomnya sendiri.
 */
export default function EksporMenu({ onPdf, onExcel, label = 'Ekspor' }) {
  const [terbuka, setTerbuka] = useState(false);
  const wadahRef = useRef(null);

  useEffect(() => {
    const tutupBilaDiLuar = (e) => {
      if (wadahRef.current && !wadahRef.current.contains(e.target)) setTerbuka(false);
    };
    document.addEventListener('mousedown', tutupBilaDiLuar);
    return () => document.removeEventListener('mousedown', tutupBilaDiLuar);
  }, []);

  const jalankan = async (aksi) => {
    setTerbuka(false);
    await aksi?.();
  };

  return (
    <div className="relative" ref={wadahRef}>
      <button
        type="button"
        onClick={() => setTerbuka((t) => !t)}
        aria-haspopup="menu"
        aria-expanded={terbuka}
        className="px-lg py-sm border border-outline rounded-lg text-sm font-bold flex items-center gap-sm hover:bg-surface-container-low transition-colors"
      >
        <Download size={16} />
        {label}
        <ChevronDown
          size={14}
          className={terbuka ? 'rotate-180 transition-transform' : 'transition-transform'}
        />
      </button>

      {terbuka && (
        <ul
          role="menu"
          /* Dipatok ke tepi KIRI tombol di layar sempit (16 September 2026).
             Terukur pada 320-390px: dengan `right-0` menu selebar 192px yang
             tepi kanannya mengikuti tombol di x=160 jatuh di kiri=-32, sehingga
             huruf pertama kedua butirnya terpotong keluar layar. Luapan ke kiri
             tak membuat halaman bisa digeser, jadi sapuan responsif yang membaca
             `window.scrollX` tak pernah melihatnya.

             `max-w` adalah penjaga terakhirnya: memindahkan patokan cukup untuk
             lebar tombol yang ada sekarang, batas ini yang menahan menu tetap di
             dalam layar berapa pun lebarnya kelak. */
          className="absolute left-0 right-auto sm:left-auto sm:right-0 mt-1 w-48 max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-20"
        >
          <li>
            <button
              type="button"
              role="menuitem"
              onClick={() => jalankan(onPdf)}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-text-secondary hover:bg-surface-container-low hover:text-text-primary transition-colors"
            >
              <FileText size={16} />
              Ekspor PDF
            </button>
          </li>
          <li>
            <button
              type="button"
              role="menuitem"
              onClick={() => jalankan(onExcel)}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-text-secondary hover:bg-surface-container-low hover:text-text-primary transition-colors"
            >
              <FileSpreadsheet size={16} />
              Ekspor Excel
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
