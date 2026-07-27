import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendType = 'neutral',
  badge
}) {
  
  const renderTrendIcon = () => {
    if (trendType === 'positive') return <TrendingUp size={14} className="mr-1" />;
    if (trendType === 'negative') return <TrendingDown size={14} className="mr-1" />;
    if (trendType === 'neutral') return <Minus size={14} className="mr-1" />;
    return null;
  };

  const getTrendColor = () => {
    if (trendType === 'positive') return 'text-emerald-600';
    if (trendType === 'negative') return 'text-error';
    return 'text-secondary';
  };

  return (
    <div className="bg-white p-lg rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-slate-100 flex flex-col justify-between group transition-all duration-300">
      <div className="flex justify-between items-start">
        <span className="text-secondary text-label-md font-medium">{title}</span>
        {Icon && <Icon className="text-primary" size={24} />}
      </div>
      
      <div className="mt-md">
        <h2 className={`text-4xl font-extrabold ${trendType === 'neutral' ? 'text-on-surface' : 'text-primary'}`}>
          {value}
        </h2>
        
        {badge && (
          <div className="mt-sm inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-container text-on-primary-container">
            {badge}
          </div>
        )}

        {trend && (
          <p className={`mt-sm text-xs font-medium flex items-center ${getTrendColor()}`}>
            {renderTrendIcon()}
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}
