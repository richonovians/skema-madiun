import React from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Search, X } from 'lucide-react';

/**
 * Penyaring daftar survei warga.
 *
 * `opdFilterName` + `onClearOpdFilter` (2026-08-24, permintaan user: "ketika warga
 * sudah memilih instansi/opd nama opd akan tampil disamping search bar beserta ada
 * tombol silang"): chip instansi SEBELUMNYA dirender di halaman, satu baris DI BAWAH
 * baris penyaring ini -- jauh dari kolom pencarian yang seharusnya ia dampingi.
 * Kini chip itu tinggal di sini, tepat di samping kolom pencarian.
 *
 * Tombol "Semua" ikut menghapus penyaring instansi (permintaan yang sama). Sebelum
 * ini tombol itu MATI: pemanggilnya mengirim `onCategoryChange={() => {}}` dan
 * `categories` selalu kosong -- backend tak punya taksonomi kategori survei sama
 * sekali, jadi satu-satunya penyaring yang nyata di halaman ini adalah instansi.
 */
export default function SurveyFilter({
  searchTerm,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  categories = [],
  opdFilterName = null,
  onClearOpdFilter,
}) {
  return (
    <div className="flex flex-col md:flex-row gap-6 mb-10 items-center justify-between">
      {/* Kolom pencarian + chip instansi: satu kelompok, agar chip tetap
          menempel pada kolom pencarian di layar lebar dan turun rapi (bukan
          berdesakan) di layar sempit. */}
      <div className="w-full md:w-auto flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
        <div className="w-full sm:w-80 shrink-0">
          <Input
            id="search-survey"
            type="text"
            placeholder="Cari Instansi/OPD..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search size={20} />}
          />
        </div>

        {opdFilterName && (
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto max-w-full px-3 py-1.5 rounded-full bg-primary-container text-on-primary-container text-sm font-semibold">
            <span className="truncate">{opdFilterName}</span>
            <button
              type="button"
              onClick={onClearOpdFilter}
              aria-label={`Hapus filter instansi ${opdFilterName}`}
              title="Hapus filter instansi"
              className="shrink-0 rounded-full p-0.5 hover:bg-on-primary-container/15 transition-colors"
            >
              <X size={14} />
            </button>
          </span>
        )}
      </div>

      <div className="flex overflow-x-auto gap-2 md:gap-3 justify-start md:justify-end w-full md:w-auto flex-1 pb-2 scrollbar-hide">
        <Button
          variant={activeCategory === 'Semua' ? 'primary' : 'outline'}
          className={activeCategory === 'Semua' ? 'shrink-0 rounded-lg px-lg' : 'shrink-0 rounded-lg px-lg bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-container'}
          onClick={() => onCategoryChange('Semua')}
        >
          Semua
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'primary' : 'outline'}
            className={activeCategory === cat ? 'shrink-0 rounded-lg px-lg' : 'shrink-0 rounded-lg px-lg bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-container'}
            onClick={() => onCategoryChange(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>
    </div>
  );
}
