import React from 'react';
import { Download } from 'lucide-react';

export default function TrendChart({ title, subtitle }) {
  return (
    <section className="bg-surface p-lg rounded-xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="flex justify-between items-center mb-xl">
        <div>
          <h3 className="font-headline-md text-headline-md text-primary">{title}</h3>
          <p className="text-secondary text-sm">{subtitle}</p>
        </div>
        <button className="flex items-center gap-2 text-label-md font-bold text-primary hover:underline">
          <Download size={16} /> Ekspor Data
        </button>
      </div>
      
      <div className="h-80 w-full relative">
        {/* Mock Chart Visualization */}
        <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>
        
        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 1000 300" preserveAspectRatio="none">
          {/* Area Gradient */}
          <defs>
            <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2"></stop>
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0"></stop>
            </linearGradient>
          </defs>
          <path d="M0,220 Q150,180 300,200 T600,140 T1000,100 V300 H0 Z" fill="url(#areaGradient)"></path>
          <path d="M0,220 Q150,180 300,200 T600,140 T1000,100" fill="none" stroke="#2563eb" strokeLinecap="round" strokeWidth="4"></path>
          
          {/* Data Points */}
          <circle cx="0" cy="220" fill="#2563eb" r="5"></circle>
          <circle cx="300" cy="200" fill="#2563eb" r="5"></circle>
          <circle cx="600" cy="140" fill="#2563eb" r="5"></circle>
          <circle cx="1000" cy="100" fill="#2563eb" r="5"></circle>
        </svg>
        
        {/* Bottom Axis Labels */}
        <div className="absolute bottom-[-24px] left-0 right-0 flex justify-between px-2 text-[10px] font-bold text-secondary uppercase tracking-widest">
          <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>Mei</span><span>Jun</span><span>Jul</span><span>Agu</span><span>Sep</span><span>Okt</span><span>Nov</span><span>Des</span>
        </div>
      </div>
    </section>
  );
}
