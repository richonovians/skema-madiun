import React from 'react';

export default function HorizontalProgress({ data, title }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm flex flex-col h-full">
      <h3 className="text-lg font-bold text-text-primary mb-6">{title}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-text-secondary truncate pr-2">{item.name}</span>
              <span className="font-bold text-text-primary shrink-0">{item.score}</span>
            </div>
            
            <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden flex">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${item.score}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
