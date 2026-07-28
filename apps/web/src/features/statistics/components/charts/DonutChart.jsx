import React from 'react';

export default function DonutChart({ data, title }) {
  // SVG Donut calculation
  const total = data.reduce((acc, curr) => acc + curr.count, 0);
  let cumulativePercent = 0;
  
  const size = 200;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;

  return (
    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm flex flex-col h-full">
      <h3 className="text-lg font-bold text-text-primary mb-6">{title}</h3>
      
      <div className="flex flex-col md:flex-row items-center gap-8 justify-center flex-1">
        
        {/* SVG Chart */}
        <div className="relative w-full max-w-[200px] aspect-square flex items-center justify-center">
          <svg viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" className="-rotate-90">
            {/* Background Circle */}
            <circle 
              cx={center} 
              cy={center} 
              r={radius} 
              fill="transparent" 
              stroke="#f1f5f9" 
              strokeWidth={strokeWidth} 
            />
            
            {/* Data Segments */}
            {data.map((item, index) => {
              const percentage = (item.count / total);
              const strokeDasharray = `${percentage * circumference} ${circumference}`;
              const strokeDashoffset = cumulativePercent * circumference;
              
              cumulativePercent -= percentage; // SVG dashoffset moves backwards

              return (
                <circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-in-out hover:opacity-80 cursor-pointer"
                />
              );
            })}
          </svg>
          
          {/* Inner Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold text-text-primary">{total}</span>
            <span className="text-xs text-text-secondary uppercase font-semibold">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3 min-w-[120px]">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-sm font-medium text-text-secondary">{item.status}</span>
              </div>
              <span className="text-sm font-bold text-text-primary">{item.count}</span>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
}
