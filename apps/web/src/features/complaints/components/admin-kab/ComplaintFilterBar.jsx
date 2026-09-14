import React, { useState, useRef, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import { Search, Download, FileText, ChevronDown, Filter } from 'lucide-react';
import ResetFilterButton from '@/components/ui/ResetFilterButton';
import useKeepInViewport from '@/hooks/useKeepInViewport';
import { COMPLAINT_STATUS_LABEL } from '@/utils/enumLabels';

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

  // Menu ekspor 192px bertambat `right-0` ke tombolnya, bukan ke tepi layar.
  // Lihat useKeepInViewport -- di layar sempit tambatan itu menjorokkan menu
  // keluar tepi kiri.
  const exportPanelRef = useRef(null);
  useKeepInViewport(exportPanelRef, isExportOpen);

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
    { value: 'Diterima', label: COMPLAINT_STATUS_LABEL.Diterima },
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

        {/* Sama seperti SurveyFilterBar: barisnya dibiarkan membungkus supaya
            tombol Ekspor tak pernah terdorong keluar layar ponsel. Alasan &
            angkanya ada di komentar SurveyFilterBar.jsx -- halaman ini
            memakai pola tata letak yang sama, jadi cacatnya juga sama.

            `variant="outline"` DIGANTI "secondary": varian "outline" tak
            pernah ada di Button.jsx, dan varian tak dikenal jatuh ke
            `variants.primary` -- pil terbesar di sistem desain (py-md px-lg
            text-lg) untuk sebuah tombol penyaring. Itu bukan pilihan desain,
            cuma nama varian yang salah tulis, dan ia ikut menyumbang ~125px
            ke baris yang sedang kehabisan ruang. "secondary" = tombol yang
            sama dengan tombol Filter di halaman Monitoring Survei. */}
        <div className="flex flex-wrap items-center gap-2 md:gap-md w-full md:w-auto min-w-0 justify-end">
          <Button
            variant="secondary"
            className="md:hidden flex items-center gap-2 min-h-[44px]"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
          >
            <Filter size={18} />
            <span>Filter</span>
          </Button>

          <ResetFilterButton onReset={onResetFilters} />

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
              <div
                ref={exportPanelRef}
                className="absolute right-0 top-full mt-2 w-48 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200"
              >
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
        {/* Medan cari, 11 September 2026 -- kembar dengan SurveyFilterBar.jsx,
            termasuk alasannya. Syarat `> 1` sebab isi terkecil daftar ini
            adalah "Semua OPD" seorang diri. */}
        <Dropdown
          options={opdOptions}
          value={filters.opd}
          onChange={(val) => handleChange('opd', val)}
          placeholder="Semua OPD"
          searchable={opdOptions.length > 1}
          searchAriaLabel="Cari OPD"
          searchPlaceholder="Cari nama OPD..."
          emptySearchLabel="Tidak ada OPD yang cocok"
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
