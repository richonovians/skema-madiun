'use client';
import React from 'react';

export default function AnalyticsTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex border-b border-outline-variant sticky top-0 bg-background pt-sm z-30 mb-lg">
      {tabs.map((tab) => (
        <button 
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-xl py-md text-label-md transition-all hover:bg-surface-container-low border-b-[3px]
            ${activeTab === tab.id 
              ? 'border-primary text-primary font-bold' 
              : 'border-transparent text-secondary'}
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
