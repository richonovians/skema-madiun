'use client';

import React, { useState, useRef, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import { Search, Download, FileText, ChevronDown, RotateCcw, Filter, Plus } from 'lucide-react';

/**
 * Filter daftar survei untuk Admin Kabupaten -- pola tata letak sama dgn
 * ComplaintFilterBar.jsx (halaman Pengaduan Kabupaten) supaya kedua halaman
 * monitoring terasa satu keluarga.
 *
 * `opdOptions` & `periodeOptions` DIDERIVASI dari data ter-fetch oleh halaman
 * pemanggil (pola sama INT-22 / halaman OPD) -- backend tak punya endpoint
 * daftar periode, dan GET /surveys tak dukung pencarian judul bebas teks.
 */
export default function SurveyFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  onCreateSurvey,
  onExportExcel,
  onExportPDF,
  opdOptions = [],
  periodeOptions = [],
}) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Nilai status = bentuk frontend hasil adaptSurvey (DRAF/AKTIF/DITUTUP).
  const statusOptions = [
    { value: '', label: 'Semua Status' },
    { value: 'AKTIF', label: 'Aktif' },
    { value: 'DRAF', label: 'Draf' },
    { value: 'DITUTUP', label: 'Ditutup' },
  ];

  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-surface-container-low border-b border-outline-variant p-lg">
      {/* Baris atas: pencarian & aksi */}
      <div className="flex flex-col md:flex-row gap-md items-center justify-between mb-md">
        <div className="w-full md:w-96">
          <Input
            id="search-survey"
            leftIcon={<Search size={20} />}
            placeholder="Cari judul survei atau OPD..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-md w-full md:w-auto justify-between md:justify-end">
          <Button
            variant="secondary"
            className="md:hidden flex items-center gap-2"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
          >
            <Filter size={18} />
            <span>Filter</span>
          </Button>

          <button
            onClick={onResetFilters}
            className="flex items-center gap-2 min-h-[44px] px-md rounded-lg text-white bg-slate-700 hover:bg-slate-800 hover:text-white transition-colors font-medium text-xs sm:text-body-md"
          >
            <RotateCcw size={16} />
            <span className="hidden sm:inline">Reset Filter</span>
          </button>

          <button
            onClick={onCreateSurvey}
            className="flex items-center gap-2 min-h-[44px] px-md rounded-lg bg-primary text-on-primary hover:bg-primary-hover transition-colors font-bold text-xs sm:text-body-md shadow-sm shadow-primary/20"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Buat Survei</span>
          </button>

          <div className="relative group space-y-1" ref={exportRef}>
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center justify-between gap-1 sm:gap-3 min-h-[44px] px-md rounded-lg font-medium text-xs sm:text-body-md transition-all bg-surface border border-border text-text-primary hover:bg-surface-container shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Download size={18} className="text-text-secondary group-hover:text-primary" />
                <span className="hidden sm:inline">Ekspor</span>
              </div>
              <ChevronDown
                size={20}
                className={`flex-shrink-0 transition-all duration-300 ${isExportOpen ? 'rotate-180' : ''} text-text-secondary group-hover:text-primary`}
              />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                <ul className="py-1">
                  <li>
                    <button
                      onClick={() => {
                        onExportExcel?.();
                        setIsExportOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    >
                      <Download size={16} />
                      <span>Excel</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        onExportPDF?.();
                        setIsExportOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    >
                      <FileText size={16} />
                      <span>PDF</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Baris filter lanjutan */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-3 gap-md ${isMobileFilterOpen ? 'block' : 'hidden md:grid'}`}
      >
        {/* Opsi pertama tiap dropdown ("Semua ...") sekaligus jadi label saat
            belum ada filter dipilih -- Dropdown.jsx jatuh ke options[0]. */}
        <Dropdown options={opdOptions} value={filters.opd} onChange={(val) => handleChange('opd', val)} />
        <Dropdown
          options={statusOptions}
          value={filters.status}
          onChange={(val) => handleChange('status', val)}
        />
        <Dropdown
          options={periodeOptions}
          value={filters.periode}
          onChange={(val) => handleChange('periode', val)}
        />
      </div>
    </div>
  );
}
