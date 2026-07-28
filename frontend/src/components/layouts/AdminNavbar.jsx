'use client';
import React, { useState } from 'react';
import { Bell, RefreshCw, ChevronDown, Menu } from 'lucide-react';
import Image from 'next/image';
import Dropdown from '@/components/ui/Dropdown';

export default function AdminNavbar({ onMenuClick }) {
  const [period, setPeriod] = useState('q1');

  const periodOptions = [
    { value: 'q1', label: 'Periode Triwulan I' },
    { value: 'q2', label: 'Periode Triwulan II' },
    { value: 'q3', label: 'Periode Triwulan III' },
    { value: 'q4', label: 'Periode Triwulan IV' }
  ];

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-4 md:px-lg z-40 transition-all duration-300">
      <div className="flex items-center gap-2 md:gap-lg">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-surface-container rounded-lg text-text-primary transition-colors"
        >
          <Menu size={24} />
        </button>
        <span className="font-headline-md text-base md:text-headline-md font-extrabold text-primary truncate max-w-[140px] sm:max-w-none">
          Dinas Kesehatan
        </span>
        <div className="h-8 w-[1px] bg-outline-variant hidden sm:block"></div>
        <div className="hidden sm:flex items-center gap-3">
          <Dropdown 
            options={periodOptions} 
            value={period} 
            onChange={setPeriod} 
            variant="primary"
          />

        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 md:gap-lg shrink-0">
        <div className="flex gap-1 sm:gap-md">
          <button className="p-1.5 sm:p-2 hover:bg-surface-container rounded-full transition-colors relative shrink-0">
            <Bell className="text-on-surface w-4 h-4 sm:w-5 sm:h-5" />
            <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-error rounded-full"></span>
          </button>
          <button className="p-1.5 sm:p-2 hover:bg-surface-container rounded-full transition-colors shrink-0">
            <RefreshCw className="text-on-surface w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-md border-l border-outline-variant pl-2 sm:pl-4 md:pl-lg">
          <div className="text-right hidden sm:block">
            <p className="text-label-md font-bold text-primary">Dr. Handoko</p>
            <p className="text-xs text-secondary">Kepala Dinas</p>
          </div>
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8ORTg4kuMFwR3Yw-tI9o4WYUA025mJH-BTtsuNF00kEat_lJGA1kGvShNCr2G453H8Kez6MY_Rh7FVS28wQkCWBdoACERPw0UeF49LhJ_19LMDL_Xc069U3onVnM_cutN5Hrc6baZHHox1W0REX44viSbS5rmNTiApiUp0yEH1jQRRca7hWEfvF32Mq0aIDMksMw26D-wbMz_dMiJmjPpgva3FQqnouqV_aYSApPh1keVYYz494vqaA" 
            alt="Profile" 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-primary/20 shrink-0"
          />
        </div>
      </div>
    </header>
  );
}
