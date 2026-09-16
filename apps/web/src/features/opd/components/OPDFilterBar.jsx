import React from 'react';
import { Search } from 'lucide-react';
import ResetFilterButton from '@/components/ui/ResetFilterButton';

/**
 * Penyaring jenis layanan DIBUANG (15 September 2026, permintaan pengguna),
 * seiring kolomnya yang juga hilang dari tabel. Nilainya datang apa adanya dari
 * Helpdesk sebagai VarChar bebas tanpa enum tetap, jadi ia tak pernah menjadi
 * golongan yang dapat diandalkan -- dan penyaring untuk kolom yang tak tampil
 * hanya menyembunyikan baris tanpa sebab yang terlihat di layar.
 *
 * Tombol sync duplikat (sebelumnya di sini, `fetch('/opd/sync')` relatif ke
 * origin FRONTEND sendiri -- selalu 404, tak pernah benar2 memanggil backend)
 * DIHAPUS -- satu-satunya aksi sync sungguhan sekarang di OPDHeader.jsx.
 */
export default function OPDFilterBar({ searchQuery, setSearchQuery, onReset }) {
  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border mb-lg p-md flex flex-wrap items-center gap-4">
      <div className="flex-1 relative w-full min-w-0 md:min-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
        <input 
          className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-surface-container-low focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" 
          placeholder="Cari berdasarkan nama OPD atau kode..." 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      {/* `flex-wrap` + `min-w-0`: dua kendali ini berjajar dengan kotak
          pencarian di atas, dan tanpa keduanya baris ini bisa melebihi
          kotaknya di layar ponsel -- cacat yang sama seperti bilah aksi
          halaman survei & pengaduan (lihat SurveyFilterBar). */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto min-w-0 justify-end">
        <ResetFilterButton onReset={onReset} />
      </div>
    </div>
  );
}
