import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Plus } from 'lucide-react';

export default function SurveyTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'all', label: 'Semua Paket' },
    { id: 'active', label: 'Survei Aktif' },
    { id: 'draft', label: 'Draf Kuesioner' },
    { id: 'closed', label: 'Survei Ditutup' },
  ];

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border mb-lg gap-4 sm:gap-0 pb-2 sm:pb-0">
      <div className="flex items-center overflow-x-auto w-full sm:w-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-lg py-md text-label-md transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary font-bold'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <Link href="/admin-opd/surveys/builder/new">
        <Button 
          variant="primary" 
          className="px-xl py-sm rounded-lg flex items-center gap-sm shadow-md hover:-translate-y-0.5 transition-all mb-1 sm:mb-2"
        >
          <Plus size={20} />
          <span>Buat Survei Baru</span>
        </Button>
      </Link>
    </div>
  );
}
