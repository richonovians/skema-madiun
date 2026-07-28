'use client';
import React, { useState, useEffect } from 'react';
import { calculateDonutSegments } from '../../utils/chartHelpers';

export default function ComplaintStatusDonut({ data }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!data || !data.status) return null;

  const segments = calculateDonutSegments(data.status);

  return (
    <div className="bg-surface p-lg rounded-xl shadow-sm border border-border flex flex-col">
      <h4 className="font-headline-md text-headline-md font-bold text-text-primary mb-xl">
        Status Pengaduan
      </h4>
      
      <div className="relative flex-1 flex items-center justify-center">
        {/* SVG Donut */}
        <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 36 36">
          <circle 
            cx="18" 
            cy="18" 
            fill="transparent" 
            r="15.915" 
            stroke="#E2E8F0" 
            strokeWidth="3"
          ></circle>
          
          {segments.map((segment) => (
            <circle 
              key={segment.id}
              cx="18" 
              cy="18" 
              fill="transparent" 
              r="15.915" 
              stroke={segment.color} 
              strokeDasharray={segment.dashArray} 
              strokeDashoffset={animate ? segment.dashOffset : 0} 
              strokeWidth="3"
              className="transition-all duration-1000 ease-out"
            ></circle>
          ))}
        </svg>

        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-extrabold">{data.total}</span>
          <span className="text-text-secondary text-[10px] font-bold uppercase tracking-widest">
            Total Tiket
          </span>
        </div>
      </div>

      <div className="mt-xl space-y-sm">
        {data.status.map((item) => (
          <div key={item.id} className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-xs">
              <span 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              ></span>
              <span className="font-medium text-text-secondary">{item.label}</span>
            </div>
            <span className="font-bold">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
