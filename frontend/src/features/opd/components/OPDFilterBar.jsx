import React from 'react';
import { Search } from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';

export default function OPDFilterBar({ searchQuery, setSearchQuery, selectedService, setSelectedService }) {
  const handleClear = () => {
    setSearchQuery('');
    setSelectedService('');
  };

  const serviceOptions = [
    { value: '', label: 'Semua Jenis Layanan' },
    { value: 'kesehatan', label: 'Kesehatan' },
    { value: 'pendidikan', label: 'Pendidikan' },
    { value: 'umum', label: 'Layanan Umum' }
  ];

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border mb-lg p-md flex flex-wrap items-center gap-4">
      <div className="flex-1 relative min-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
        <input 
          className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-surface-container-low focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" 
          placeholder="Cari berdasarkan nama OPD atau kode..." 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <Dropdown 
          options={serviceOptions}
          value={selectedService}
          onChange={setSelectedService}
          variant="default"
        />
        <button 
          onClick={handleClear}
          className="text-primary font-semibold text-sm px-3 py-2 hover:bg-primary-fixed-dim rounded-lg transition-colors"
        >
          Bersihkan
        </button>
      </div>
    </div>
  );
}
