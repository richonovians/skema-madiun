import React from 'react';

export default function PerformanceMetrics({ metrics }) {
  if (!metrics || metrics.length === 0) return null;

  return (
    <div className="lg:col-span-2 bg-surface p-lg rounded-xl shadow-sm border border-outline-variant">
      <div className="flex justify-between items-center mb-lg">
        <h3 className="font-headline-md text-headline-md text-primary">NRR Per 9 Unsur Pelayanan</h3>
        <div className="flex gap-2">
          <span className="flex items-center gap-1 text-xs font-medium">
            <span className="w-3 h-3 bg-primary rounded"></span> Realisasi
          </span>
          <span className="flex items-center gap-1 text-xs font-medium">
            <span className="w-3 h-3 bg-outline-variant rounded"></span> Target
          </span>
        </div>
      </div>
      
      <div className="space-y-md">
        {metrics.map((item, index) => {
          // Calculate percentage based on target (e.g. 3.65 / 4.00)
          const percentage = (item.realization / item.target) * 100;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-xs font-bold uppercase text-secondary">
                <span>{item.name}</span>
                <span className="text-primary">{item.realization.toFixed(2)} / {item.target.toFixed(2)}</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-3 overflow-hidden flex">
                <div 
                  className="bg-primary h-full" 
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
