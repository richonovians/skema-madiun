import React from 'react';
import { Search } from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';

/**
 * `serviceOptions` datang dari page.jsx, DIDERIVASI dari nilai `jenisLayanan`
 * yang sungguhan ada di data OPD ter-fetch -- backend TIDAK punya enum tetap
 * utk field ini (VarChar bebas dari Helpdesk, lihat StubOpdSource), jadi 3
 * opsi hardcode ('kesehatan'/'pendidikan'/'umum') versi dummy lama tak pernah
 * cocok dgn nilai asli ('Kesehatan', 'Administrasi Kependudukan', dst).
 *
 * Tombol sync duplikat (sebelumnya di sini, `fetch('/opd/sync')` relatif ke
 * origin FRONTEND sendiri -- selalu 404, tak pernah benar2 memanggil backend)
 * DIHAPUS -- satu-satunya aksi sync sungguhan sekarang di OPDHeader.jsx.
 */
export default function OPDFilterBar({
  searchQuery,
  setSearchQuery,
  selectedService,
  setSelectedService,
  serviceOptions,
}) {
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
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <Dropdown
          options={serviceOptions}
          value={selectedService}
          onChange={setSelectedService}
          variant="default"
        />
      </div>
    </div>
  );
}
