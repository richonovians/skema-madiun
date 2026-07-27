'use client';
import React, { useState } from 'react';
import { Bell, RefreshCw, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Dropdown from '@/components/ui/Dropdown';

export default function AdminNavbar() {
  const [period, setPeriod] = useState('q1');

  const periodOptions = [
    { value: 'q1', label: 'Periode Triwulan I' },
    { value: 'q2', label: 'Periode Triwulan II' },
    { value: 'q3', label: 'Periode Triwulan III' },
    { value: 'q4', label: 'Periode Triwulan IV' }
  ];

  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-lg z-40">
      <div className="flex items-center gap-lg">
        <span className="font-headline-md text-headline-md font-extrabold text-primary">
          Dinas Kesehatan
        </span>
        <div className="h-8 w-[1px] bg-outline-variant"></div>
        <div className="flex items-center gap-3">
          <Dropdown 
            options={periodOptions} 
            value={period} 
            onChange={setPeriod} 
            variant="primary"
          />

        </div>
      </div>
      
      <div className="flex items-center gap-lg">
        <div className="flex gap-md">
          <button className="p-2 hover:bg-surface-container rounded-full transition-colors relative">
            <Bell size={20} className="text-on-surface" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
          </button>
          <button className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <RefreshCw size={20} className="text-on-surface" />
          </button>
        </div>
        
        <div className="flex items-center gap-md border-l border-outline-variant pl-lg">
          <div className="text-right">
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
