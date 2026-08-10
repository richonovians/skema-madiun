'use client';
import React from 'react';

export default function AnalyticsTabs({ tabs, activeTab, onChange, rightSlot }) {
  return (
    <div className="flex items-end justify-between border-b border-outline-variant sticky top-0 bg-background pt-sm z-30 mb-lg">
      <div className="flex">
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
      {rightSlot && (
        <div className="pb-2 flex items-center">
          {rightSlot}
        </div>
      )}
    </div>
  );
}
