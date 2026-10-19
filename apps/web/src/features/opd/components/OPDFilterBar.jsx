import React from 'react';
import { Search, X } from 'lucide-react';

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
 *
 * Tombol "Reset Filter" DIBUANG (21 September 2026, permintaan pengguna) --
 * diganti ikon X di dalam search bar agar lebih ringkas dan konsisten.
 */
export default function OPDFilterBar({ searchQuery, setSearchQuery }) {
  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border mb-lg p-md flex flex-wrap items-center gap-4">
      <div className="flex-1 relative w-full min-w-0 md:min-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
        <input
          className="w-full pl-10 pr-10 py-2 border border-border rounded-xl bg-surface-container-low focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
          placeholder="Cari berdasarkan nama OPD atau kode..."
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="Hapus pencarian"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
