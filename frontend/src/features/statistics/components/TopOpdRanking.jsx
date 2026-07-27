import React from 'react';

export default function TopOpdRanking({ data }) {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-border shadow-sm flex flex-col h-full">
      <div className="mb-6 border-b border-border pb-4">
        <h3 className="text-lg font-bold text-text-primary">Top OPD Terbaik</h3>
        <p className="text-sm text-text-secondary">Peringkat berdasarkan Indeks Kepuasan Masyarakat</p>
      </div>
      
      <div className="flex-1 flex flex-col gap-4">
        {data.map((opd, idx) => (
          <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group border border-transparent hover:border-outline-variant/30">
            {/* Rank / Medal */}
            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-white font-bold text-xl shadow-sm">
              {opd.medal ? (
                <span>{opd.medal}</span>
              ) : (
                <span className="text-text-secondary">#{opd.rank}</span>
              )}
            </div>
            
            {/* Details */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-text-primary truncate text-sm md:text-base group-hover:text-primary transition-colors">
                {opd.name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">IKM Score:</span>
                <span className="text-sm font-bold text-emerald-600">{opd.ikm}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
