'use client';
import React, { useCallback } from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { useAsync } from '@/hooks/useAsync';
import { getComplaintCategories } from '@/features/complaints/services/reference.api';
import ExportButton from './ExportButton';

export default function AnalyticsHeader({ filters, setFilters }) {
  const yearOptions = [
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
  ];

  const monthOptions = [
    { value: 'all', label: 'Semua Bulan' },
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
  ];

  // Daftar kategori SEBELUMNYA di-hardcode di sini, dan hanya memuat 3 dari 7
  // kode lama. Setelah taksonomi disederhanakan menjadi Aduan/Lapor/Lainnya
  // (4 September 2026), salinan mati seperti itu menawarkan kategori yang sudah
  // tak ada -- karena itu kini diambil dari sumber yang sama dengan formulir
  // pengaduan, GET /ref/complaint-categories.
  const fetchCategories = useCallback(() => getComplaintCategories(), []);
  const { data: categories } = useAsync(fetchCategories);
  const serviceOptions = [
    { value: 'all', label: 'Semua Kategori' },
    ...(categories ?? []).map((c) => ({ value: c.kode, label: c.nama })),
  ];

  return (
    <header className="bg-surface border-b border-outline-variant flex flex-col md:flex-row justify-between items-start md:items-center px-lg py-md mb-lg gap-4">
      <div className="flex flex-col">
        <h2 className="font-headline-md text-headline-md font-extrabold text-primary">
          Statistik & Analisis
        </h2>
      </div>
      
      <div className="flex flex-wrap items-center gap-md z-40">
        <div className="flex flex-wrap items-center gap-sm">
          <Dropdown 
            options={yearOptions}
            value={filters.year}
            onChange={(val) => setFilters({ ...filters, year: val })}
          />
          <Dropdown 
            options={monthOptions}
            value={filters.month}
            onChange={(val) => setFilters({ ...filters, month: val })}
          />
          <Dropdown 
            options={serviceOptions}
            value={filters.service}
            onChange={(val) => setFilters({ ...filters, service: val })}
          />
        </div>
        
        <div className="flex items-center gap-sm border-l border-outline-variant pl-md ml-xs">
          <ExportButton type="pdf" filters={filters} />
          <ExportButton type="excel" filters={filters} />
        </div>
      </div>
    </header>
  );
}
