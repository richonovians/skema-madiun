'use client';

import React, { useState, useRef, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import { Search, Download, FileText, ChevronDown, Filter, Plus } from 'lucide-react';
import ResetFilterButton from '@/components/ui/ResetFilterButton';
import useKeepInViewport from '@/hooks/useKeepInViewport';

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

  // Sama seperti ComplaintFilterBar: menu 192px bertambat ke tombolnya, bukan
  // ke tepi layar. Lihat useKeepInViewport.
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

        {/* TOMBOL BOLEH MEMBUNGKUS (1 September 2026, laporan pengguna "tombol
            ekspor masih terlihat tertutup di tampilan hp").
            Empat tombol di sini butuh 314px berjajar, sementara ruang yang
            tersedia di layar 320px hanya 222px dan di 360px hanya 262px.
            Barisnya dulu `flex` tanpa `flex-wrap`, jadi kelebihannya tak
            hilang ke mana-mana: tombol terakhir -- Ekspor -- terdorong sampai
            x=363, yaitu 43px DI LUAR layar 320px dan 3px di luar layar 360px.
            Itulah yang terlihat sebagai "tertutup"; panelnya sendiri sudah
            benar sejak useKeepInViewport dipasang.
            Dua perubahan kecil menghapusnya sama sekali: `flex-wrap` membuat
            tombol yang tak muat turun ke baris berikutnya (isi baris tak
            mungkin lagi melebihi kotaknya), dan `gap-2` di ponsel menghemat
            24px sehingga di 390px keempatnya tetap satu baris seperti semula.
            `justify-end` menggantikan `justify-between`: pada baris terakhir
            yang cuma berisi satu tombol, `justify-between` akan
            melemparkannya ke kiri, jauh dari tombol saudaranya. */}
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

          {/* `aria-label` + `title` (21 September 2026). Labelnya disembunyikan
              di bawah 640px, dan elemen ber-`display: none` tidak ikut menyusun
              nama yang dapat diakses -- tombol ini karena itu dulu hanya
              disebut "tombol" oleh pembaca layar, dan tak punya apa pun untuk
              diucapkan oleh perintah suara. Polanya sendiri dipertahankan:
              menampilkan label penuh di 320px akan mendorong tombol keluar
              layar. Contoh yang sejak awal sudah benar: ResetFilterButton. */}
          <button
            onClick={onCreateSurvey}
            aria-label="Buat Survei"
            title="Buat Survei"
            className="flex items-center gap-2 min-h-[44px] px-md rounded-lg bg-primary text-on-primary hover:bg-primary-hover transition-colors font-bold text-xs sm:text-body-md shadow-sm shadow-primary/20"
          >
            <Plus size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Buat Survei</span>
          </button>

          <div className="relative group space-y-1" ref={exportRef}>
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              aria-label="Ekspor"
              title="Ekspor"
              aria-haspopup="menu"
              aria-expanded={isExportOpen}
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

      {/* Baris filter lanjutan */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-3 gap-md ${isMobileFilterOpen ? 'block' : 'hidden md:grid'}`}
      >
        {/* Opsi pertama tiap dropdown ("Semua ...") sekaligus jadi label saat
            belum ada filter dipilih -- Dropdown.jsx jatuh ke options[0]. */}
        {/* Medan cari, 11 September 2026. Daftar ini sepanjang jumlah instansi
            yang pernah membuat survei -- menuju 62 di data nyata, sementara
            panelnya cuma 240px. Syaratnya `> 1` sebab isi terkecilnya adalah
            "Semua OPD" seorang diri: sebelum ada survei sama sekali, tak ada
            yang dapat dicari.

            `searchAriaLabel` ditulis tersurat karena dropdown ini tak berlabel
            tampak, dan bawaan "Cari pilihan" tak membedakannya dari dua
            dropdown di sebelahnya. */}
        <Dropdown
          options={opdOptions}
          value={filters.opd}
          onChange={(val) => handleChange('opd', val)}
          searchable={opdOptions.length > 1}
          searchAriaLabel="Cari OPD"
          searchPlaceholder="Cari nama OPD..."
          emptySearchLabel="Tidak ada OPD yang cocok"
        />
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
