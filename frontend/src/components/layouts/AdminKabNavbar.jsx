'use client';
import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Dropdown from '@/components/ui/Dropdown';

export default function AdminKabNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const getPageTitle = () => {
    if (pathname.includes('/dashboard')) return 'Dashboard Eksekutif';
    if (pathname.includes('/management-opd')) return 'Manajemen OPD';
    if (pathname.includes('/management-users')) return 'Manajemen User';
    return 'Panel Admin Kabupaten';
  };

  const isDashboard = pathname.includes('/dashboard');

  const handleFilterChange = (key, val) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, val);
    router.push(`${pathname}?${params.toString()}`);
  };

  const yearOptions = [
    { value: '2024', label: 'Tahun 2024' },
    { value: '2023', label: 'Tahun 2023' }
  ];

  const serviceOptions = [
    { value: 'all', label: 'Semua Layanan' },
    { value: 'kesehatan', label: 'Kesehatan' },
    { value: 'pendidikan', label: 'Pendidikan' },
    { value: 'kependudukan', label: 'Kependudukan' }
  ];

  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-lg z-40">
      <div className="flex items-center gap-lg">
        <h2 className="font-headline-md text-headline-md font-extrabold text-primary">
          {getPageTitle()}
        </h2>
        
        {isDashboard && (
          <>
            <div className="hidden md:block h-6 w-[1px] bg-border mx-sm"></div>
            <div className="flex items-center gap-md">
              <Dropdown 
                options={yearOptions}
                value={searchParams.get('year') || '2024'}
                onChange={(val) => handleFilterChange('year', val)}
                variant="primary"
              />
              <Dropdown 
                options={serviceOptions}
                value={searchParams.get('service') || 'all'}
                onChange={(val) => handleFilterChange('service', val)}
                variant="primary"
              />
            </div>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-md pl-lg">
        <div className="text-right">
          <p className="text-label-md font-bold text-primary">Admin Kabupaten</p>
          <p className="text-xs text-secondary">Administrator Kabupaten</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold border-2 border-primary/20">
          AK
        </div>
      </div>
    </header>
  );
}
