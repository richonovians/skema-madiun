'use client';
import React, { useState } from 'react';
import { Download } from 'lucide-react';

export default function ExportButton({ type = 'pdf', filters }) {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    setLoading(true);
    // Simulate API call GET /analytics/export/{type}
    console.log(`GET /analytics/export/${type}`, filters);
    
    setTimeout(() => {
      setLoading(false);
      alert(`Berhasil mengekspor Laporan ${type.toUpperCase()}!`);
    }, 1500);
  };

  return (
    <button 
      onClick={handleExport}
      disabled={loading}
      className={`px-md py-sm rounded-lg flex items-center gap-xs transition-all shadow-sm font-bold text-label-md
        ${type === 'pdf' 
          ? 'bg-red-600 hover:bg-red-700 text-white' 
          : 'bg-green-600 hover:bg-green-700 text-white'}
        ${loading ? 'opacity-70 cursor-not-allowed' : ''}
      `}
    >
      <Download size={18} />
      <span className="hidden sm:inline">{loading ? 'Loading...' : `Export ${type.toUpperCase()}`}</span>
    </button>
  );
}
