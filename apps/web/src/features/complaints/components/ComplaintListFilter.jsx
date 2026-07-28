import React from 'react';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { Search, Filter } from 'lucide-react';

export default function ComplaintListFilter({ 
  searchQuery, 
  onSearchChange, 
  statusFilter, 
  onStatusChange 
}) {
  const statusOptions = [
    { value: 'Semua Status', label: 'Semua Status' },
    { value: 'Diterima', label: 'Diterima' },
    { value: 'Diproses', label: 'Diproses' },
    { value: 'Selesai', label: 'Selesai' },
    { value: 'Ditolak', label: 'Ditolak' },
  ];

  return (
    <div className="p-lg border-b border-outline-variant bg-surface-container-low flex flex-col md:flex-row gap-lg">
      <div className="flex-1">
        <Input 
          id="search-complaint"
          leftIcon={<Search size={20} />}
          placeholder="Cari nomor tiket, judul, atau nama pelapor..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="flex items-center gap-md z-10 relative">
        <Dropdown 
          options={statusOptions}
          value={statusFilter}
          onChange={onStatusChange}
        />
        <button className="p-2.5 mt-0 md:mt-1 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors h-[42px] flex items-center justify-center bg-white">
          <Filter size={20} className="text-on-surface-variant" />
        </button>
      </div>
    </div>
  );
}
