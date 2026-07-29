'use client';
import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';
import { useAdminKabLayout } from './AdminKabLayoutProvider';

export default function AdminKabNavbar() {
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useAdminKabLayout();
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
    <header className="fixed top-0 right-0 left-0 md:left-64 min-h-[80px] bg-surface border-b border-outline-variant flex flex-col md:flex-row justify-center md:justify-between px-4 py-3 md:px-lg md:py-0 z-30 gap-3 md:gap-0 transition-all">
      <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-auto">
        <div className="flex items-center gap-2">
          <button 
            className="md:hidden p-2 text-on-surface hover:bg-surface-container rounded-lg"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          >
            <Menu size={24} />
          </button>
          <h2 className="font-headline-md text-base md:text-headline-md font-extrabold text-primary truncate max-w-[200px] md:max-w-none">
            {getPageTitle()}
          </h2>
        </div>
        
        {/* Mobile Profile Avatar (only visible on mobile) */}
        <div className="md:hidden w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold border-2 border-primary/20 shrink-0">
          AK
        </div>
      </div>
      
      <div className="flex items-center flex-wrap gap-2 md:gap-md w-full md:w-auto justify-between md:justify-end">
        {isDashboard && (
          <div className="flex items-center gap-2 w-full md:w-auto pb-1 md:pb-0">
            <div className="flex-1 min-w-0">
              <Dropdown 
                options={yearOptions}
                value={searchParams.get('year') || '2024'}
                onChange={(val) => handleFilterChange('year', val)}
                variant="primary"
                className="w-full"
              />
            </div>
            <div className="flex-1 min-w-0">
              <Dropdown 
                options={serviceOptions}
                value={searchParams.get('service') || 'all'}
                onChange={(val) => handleFilterChange('service', val)}
                variant="primary"
                className="w-full"
              />
            </div>
          </div>
        )}
        
        {/* Desktop Profile (only visible on desktop) */}
        <div className="hidden md:flex items-center gap-md pl-lg border-l border-border">
        <div className="text-right">
          <p className="text-label-md font-bold text-primary">Admin Kabupaten</p>
          <p className="text-xs text-secondary">Administrator Kabupaten</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold border-2 border-primary/20">
          AK
        </div>
        </div>
      </div>
    </header>
  );
}
