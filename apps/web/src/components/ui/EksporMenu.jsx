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
        <ChevronDown size={14} className={terbuka ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {terbuka && (
        <ul
          role="menu"
          className="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-20"
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
