import React from 'react';
import { Users, BarChart3, TrendingUp } from 'lucide-react';

export default function AdminSurveyCardStats({ respondentsCount, ikmScore, isDraft }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-xl mb-xl ${isDraft ? 'opacity-60' : ''}`}>
      <div className={`flex items-center gap-md p-md rounded-lg ${isDraft ? 'border border-dashed border-outline-variant' : 'bg-surface-container-low'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDraft ? 'bg-surface-container-high text-outline' : 'bg-primary-fixed text-primary'}`}>
          <Users size={20} />
        </div>
        <div>
          <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Total Pengisi</p>
          {isDraft ? (
            <p className="text-h3 font-bold text-text-secondary">-</p>
          ) : (
            <p className="text-h3 font-bold text-text-primary">
              {respondentsCount} <span className="text-label-md font-medium text-text-secondary">Responden</span>
            </p>
          )}
        </div>
      </div>

      <div className={`flex items-center gap-md p-md rounded-lg ${isDraft ? 'border border-dashed border-outline-variant' : 'bg-surface-container-low'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDraft ? 'bg-surface-container-high text-outline' : 'bg-emerald-100 text-emerald-600'}`}>
          {isDraft ? <BarChart3 size={20} /> : <TrendingUp size={20} />}
        </div>
        <div>
          <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Nilai Sementara IKM</p>
          {isDraft ? (
            <p className="text-h3 font-bold text-text-secondary">-</p>
          ) : (
            <p className="text-h3 font-bold text-emerald-600">
              {ikmScore ? ikmScore.toFixed(2) : '-'} <span className="text-label-md font-medium">{ikmScore && ikmScore >= 80 ? '(Baik)' : ''}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
