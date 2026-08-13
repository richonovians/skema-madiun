'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileText } from 'lucide-react';

const FORMATS = [
  { value: 'csv', label: 'CSV', icon: Download },
  { value: 'excel', label: 'Excel', icon: Download },
  { value: 'pdf', label: 'PDF', icon: FileText },
];

/**
 * Menu ekspor hasil IKM sebuah survei (GET /surveys/:id/results/export -- boleh
 * diakses Kabupaten, lihat @Roles IkmController). Komponen ini hanya memilih
 * format; pengunduhan & penanganan galat dilakukan pemanggil lewat
 * `onExport(format)` (bukan tugas komponen tampilan memanipulasi DOM/blob).
 *
 * `exportingFormat` = format yang sedang diproses (null bila idle).
 */
export default function SurveyResultExportMenu({ onExport, exportingFormat = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isExporting = !!exportingFormat;

  return (
    <div className="relative group" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={`flex items-center justify-between gap-2 min-w-[150px] min-h-[44px] px-md rounded-lg font-medium text-body-md transition-all bg-surface border border-border text-text-primary hover:bg-surface-container shadow-sm ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2">
          <Download size={18} className="text-text-secondary group-hover:text-primary" />
          <span className="truncate">{isExporting ? 'Memproses...' : 'Ekspor Hasil'}</span>
        </div>
        <ChevronDown
          size={20}
          className={`flex-shrink-0 transition-all duration-300 ${isOpen ? 'rotate-180' : ''} text-text-secondary group-hover:text-primary`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-full min-w-[150px] bg-white rounded-xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <ul className="py-1">
            {FORMATS.map(({ value, label, icon: Icon }) => (
              <li key={value}>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onExport(value);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
