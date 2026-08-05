import React, { useState, useRef, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import { Search, Download, FileText, ChevronDown, RotateCcw, Filter } from 'lucide-react';

/**
 * Filter "Prioritas" & "Kecamatan" DIHAPUS -- tak ada field ini di backend
 * (lihat gap complaint.adapter.js). "OPD" & "Kategori" sekarang opsi ASLI
 * (opdOptions diderivasi dari data ter-fetch pola sama INT-22; categoryOptions
 * dari GET /ref/complaint-categories, satu-satunya sumber resmi sejak INT-18).
 */
export default function ComplaintFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  onExportExcel,
  onExportPDF,
  opdOptions = [],
  categoryOptions = [],
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

  const statusOptions = [
    { value: '', label: 'Semua Status' },
    { value: 'Diterima', label: 'Diterima' },
    { value: 'Diproses', label: 'Diproses' },
    { value: 'Selesai', label: 'Selesai' },
    { value: 'Ditolak', label: 'Ditolak' },
  ];

  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-surface-container-low border-b border-outline-variant p-lg">
      {/* Top row: Search and Actions */}
      <div className="flex flex-col md:flex-row gap-md items-center justify-between mb-md">
        <div className="w-full md:w-96">
          <Input
            id="search-complaint"
            leftIcon={<Search size={20} />}
            placeholder="Cari nomor tiket, judul, pelapor..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-md w-full md:w-auto justify-between md:justify-end">
          <Button
            variant="outline"
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

      {/* Advanced Filters Row */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-3 gap-md ${isMobileFilterOpen ? 'block' : 'hidden md:grid'}`}
      >
        <Dropdown
          options={opdOptions}
          value={filters.opd}
          onChange={(val) => handleChange('opd', val)}
          placeholder="Semua OPD"
        />
        <Dropdown
          options={statusOptions}
          value={filters.status}
          onChange={(val) => handleChange('status', val)}
          placeholder="Semua Status"
        />
        <Dropdown
          options={categoryOptions}
          value={filters.kategori}
          onChange={(val) => handleChange('kategori', val)}
          placeholder="Semua Kategori"
        />
      </div>
    </div>
  );
}
