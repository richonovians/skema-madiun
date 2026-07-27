import React from 'react';

export default function SurveyTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'all', label: 'Semua Paket' },
    { id: 'active', label: 'Survei Aktif' },
    { id: 'draft', label: 'Draf Kuesioner' },
    { id: 'closed', label: 'Survei Ditutup' },
  ];

  return (
    <div className="flex items-center overflow-x-auto border-b border-border mb-lg">
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
  );
}
