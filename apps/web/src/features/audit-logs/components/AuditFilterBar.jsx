import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';

export default function AuditFilterBar({ filters, setFilters }) {
  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleReset = () => {
    setFilters({
      search: '',
      dateRange: '',
      module: 'Semua Modul',
      action: 'Semua Aktivitas',
      role: 'Semua Role',
      opd: 'Semua OPD',
      page: 1
    });
  };

  return (
    <div className="bg-surface p-lg rounded-2xl border border-outline-variant shadow-sm mb-lg space-y-4">
      {/* Top Row: Search & Reset */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex-1 w-full">
          <Input 
            id="search-audit"
            type="text" 
            placeholder="Cari pengguna, objek, atau deskripsi..." 
            leftIcon={<Search size={20} />}
            className="w-full"
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          onClick={handleReset}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <RotateCcw size={16} /> Reset Filter
        </Button>
      </div>

      {/* Bottom Row: Dropdowns */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[160px]">
          <Dropdown 
            value={filters.dateRange}
            onChange={(val) => handleChange('dateRange', val)}
            options={[
              { value: '', label: 'Semua Waktu' },
              { value: 'today', label: 'Hari Ini' },
              { value: '7days', label: '7 Hari Terakhir' },
              { value: '30days', label: '30 Hari Terakhir' }
            ]}
          />
        </div>
        
        <div className="flex-1 min-w-[160px]">
          <Dropdown 
            value={filters.module}
            onChange={(val) => handleChange('module', val)}
            options={[
              { value: 'Semua Modul', label: 'Semua Modul' },
              { value: 'Pengaduan', label: 'Pengaduan' },
              { value: 'Dashboard', label: 'Dashboard' },
              { value: 'Autentikasi', label: 'Autentikasi' },
              { value: 'Pengguna', label: 'Pengguna' },
              { value: 'Survei', label: 'Survei' }
            ]}
          />
        </div>

        <div className="flex-1 min-w-[160px]">
          <Dropdown 
            value={filters.action}
            onChange={(val) => handleChange('action', val)}
            options={[
              { value: 'Semua Aktivitas', label: 'Semua Aktivitas' },
              { value: 'CREATE', label: 'CREATE' },
              { value: 'READ', label: 'READ' },
              { value: 'UPDATE', label: 'UPDATE' },
              { value: 'DELETE', label: 'DELETE' },
              { value: 'LOGIN', label: 'LOGIN' }
            ]}
          />
        </div>

        <div className="flex-1 min-w-[160px]">
          <Dropdown 
            value={filters.role}
            onChange={(val) => handleChange('role', val)}
            options={[
              { value: 'Semua Role', label: 'Semua Role' },
              { value: 'Admin Kabupaten', label: 'Admin Kabupaten' },
              { value: 'Admin OPD', label: 'Admin OPD' },
              { value: 'System', label: 'System' },
              { value: 'Guest', label: 'Guest' }
            ]}
          />
        </div>

        <div className="flex-1 min-w-[160px]">
          <Dropdown 
            value={filters.opd}
            onChange={(val) => handleChange('opd', val)}
            options={[
              { value: 'Semua OPD', label: 'Semua OPD' },
              { value: 'Dinas Kesehatan', label: 'Dinas Kesehatan' },
              { value: 'Dinas PUPR', label: 'Dinas PUPR' },
              { value: 'Sekretariat Daerah', label: 'Sekretariat Daerah' },
              { value: '-', label: 'Tidak Ada OPD' }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
