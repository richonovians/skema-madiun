import React from 'react';

export default function TrendChart({ data, title, dataKey, yMin = 0, yMax = 100 }) {
  // Line chart calculations
  const width = 600;
  const height = 200;
  const paddingX = 40;
  const paddingY = 40;
  
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  
  const pointSpacing = innerWidth / (data.length - 1 || 1);
  
  const points = data.map((item, index) => {
    const val = item[dataKey];
    const x = paddingX + index * pointSpacing;
    const y = height - paddingY - ((val - yMin) / (yMax - yMin)) * innerHeight;
    return { x, y, val, label: item.month };
  });

  const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

  return (
    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm flex flex-col h-full w-full overflow-hidden">
      <h3 className="text-lg font-bold text-text-primary mb-6">{title}</h3>
      
      <div className="flex-1 w-full relative min-h-[220px]">
        {/* SVG Container responsive hack using viewBox */}
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          preserveAspectRatio="none" 
          className="w-full h-full overflow-visible"
        >
          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = height - paddingY - (innerHeight * ratio);
            const val = Math.round(yMin + (yMax - yMin) * ratio);
            return (
              <g key={`grid-${i}`}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                <text x={paddingX - 10} y={y + 4} fontSize="12" fill="#64748b" textAnchor="end">{val}</text>
              </g>
            );
          })}

          {/* Line Path */}
          <path 
            d={pathD} 
            fill="none" 
            stroke="#2563eb" 
            strokeWidth="3" 
            strokeLinecap="round"
            strokeLinejoin="round" 
            className="drop-shadow-sm"
          />

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={`point-${i}`} className="group cursor-pointer">
              <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#2563eb" strokeWidth="2" className="transition-transform group-hover:scale-150" />
              <text x={p.x} y={p.y - 15} fontSize="12" fill="#0f172a" textAnchor="middle" opacity="0" className="group-hover:opacity-100 font-bold transition-opacity">
                {p.val}
              </text>
              <text x={p.x} y={height - 15} fontSize="12" fill="#64748b" textAnchor="middle">
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
