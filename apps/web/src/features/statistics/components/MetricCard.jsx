import React from 'react';

export default function MetricCard({ title, value, subtitle, icon: Icon, colorClass = "text-primary" }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm hover:shadow-lg transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider">{title}</h4>
        {Icon && (
          <div className={`p-2 rounded-lg bg-surface-container-low group-hover:bg-surface-container ${colorClass} transition-colors`}>
            <Icon size={20} />
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-1">
        <span className={`text-3xl md:text-4xl font-extrabold ${colorClass}`}>
          {value}
        </span>
        {subtitle && (
          <span className="text-sm text-text-secondary mt-1">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
