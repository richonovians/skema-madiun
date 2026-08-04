'use client';
import React, { useState } from 'react';
import { Bell, RefreshCw, Menu } from 'lucide-react';
import Image from 'next/image';
import Dropdown from '@/components/ui/Dropdown';
import { useAdminLayout } from './AdminLayoutProvider';
import NotificationDropdown from '@/components/ui/NotificationDropdown';

export default function AdminNavbar() {
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useAdminLayout();
  const [period, setPeriod] = useState('q1');

  const periodOptions = [
    { value: 'q1', label: 'Triwulan I' },
    { value: 'q2', label: 'Triwulan II' },
    { value: 'q3', label: 'Triwulan III' },
    { value: 'q4', label: 'Triwulan IV' }
  ];

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 md:h-20 bg-surface border-b border-outline-variant flex justify-between items-center px-4 md:px-lg z-40 transition-all gap-2">
      <div className="flex items-center gap-2 md:gap-lg flex-1 min-w-0">
        <button 
          className="md:hidden p-2 text-on-surface hover:bg-surface-container rounded-lg shrink-0"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        >
          <Menu size={24} />
        </button>
        <span className="font-headline-md text-base md:text-headline-md font-extrabold text-primary truncate">
          Dinas Kesehatan
        </span>
        <div className="hidden md:block h-8 w-[1px] bg-outline-variant shrink-0"></div>
        <div className="flex items-center shrink-0">
          <Dropdown 
            options={periodOptions} 
            value={period} 
            onChange={setPeriod} 
            variant="primary"
          />

        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-lg shrink-0 ml-auto">
        <div className="flex gap-1 md:gap-md">
          <NotificationDropdown hasIndicator={false} />
        </div>
        
        <div className="flex items-center gap-2 md:gap-md md:border-l border-outline-variant md:pl-lg">
          <div className="text-right hidden sm:block">
            <p className="text-label-md font-bold text-primary">Dr. Handoko</p>
            <p className="text-xs text-secondary">Kepala Dinas</p>
          </div>
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8ORTg4kuMFwR3Yw-tI9o4WYUA025mJH-BTtsuNF00kEat_lJGA1kGvShNCr2G453H8Kez6MY_Rh7FVS28wQkCWBdoACERPw0UeF49LhJ_19LMDL_Xc069U3onVnM_cutN5Hrc6baZHHox1W0REX44viSbS5rmNTiApiUp0yEH1jQRRca7hWEfvF32Mq0aIDMksMw26D-wbMz_dMiJmjPpgva3FQqnouqV_aYSApPh1keVYYz494vqaA" 
            alt="Profile" 
            className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
          />
        </div>
      </div>
    </header>
  );
}
