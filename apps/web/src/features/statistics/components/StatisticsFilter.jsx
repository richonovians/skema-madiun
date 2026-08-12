'use client';

import React, { useState } from 'react';
import { Filter } from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';

export default function StatisticsFilter() {
  const [year, setYear] = useState('2026');
  const [opd, setOpd] = useState('semua_opd');
  const [layanan, setLayanan] = useState('semua_layanan');

  const yearOptions = [
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
  ];



  const opdOptions = [
    { value: 'semua_opd', label: 'Semua OPD' },
    { value: 'dukcapil', label: 'Dinas Kependudukan' },
    { value: 'dinkes', label: 'Dinas Kesehatan' },
  ];

  const layananOptions = [
    { value: 'semua_layanan', label: 'Semua Layanan' },
    { value: 'infrastruktur', label: 'Infrastruktur' },
    { value: 'kesehatan', label: 'Kesehatan' },
  ];

  return (
    <div className="bg-surface border-y border-border py-4 px-4 sm:px-6 sticky top-16 z-40 shadow-sm">
      <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2 text-text-secondary">
          <Filter size={18} />
          <span className="font-bold text-sm uppercase tracking-wider">Filter Data</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative z-[60] w-full sm:w-auto">
            <Dropdown 
              options={yearOptions}
              value={year}
              onChange={setYear}
              variant="default"
            />
          </div>

          <div className="relative z-[40] w-full sm:w-auto">
            <Dropdown 
              options={opdOptions}
              value={opd}
              onChange={setOpd}
              variant="default"
            />
          </div>
          <div className="relative z-[30] w-full sm:w-auto">
            <Dropdown 
              options={layananOptions}
              value={layanan}
              onChange={setLayanan}
              variant="default"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
