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
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border mb-lg">
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
      <Link href="/admin-opd/surveys/builder/new" className="shrink-0 pb-2">
        <Button 
          variant="primary" 
          className="px-6 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:scale-[1.02] active:scale-95 transition-all text-sm"
        >
          <Plus size={18} />
          <span>Buat Paket Survei Baru</span>
        </Button>
      </Link>
    </div>
  );
}
