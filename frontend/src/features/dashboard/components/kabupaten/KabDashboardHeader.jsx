'use client';
import React from 'react';
import { Download } from 'lucide-react';

export default function KabDashboardHeader({ filters }) {
  const handleExport = () => {
    // TODO: Integrate with backend export API
    console.log('Exporting report for', filters);
  };

  return (
    <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-md mb-lg">

      <button 
        onClick={handleExport}
        className="bg-primary-container text-on-primary-container px-lg py-sm rounded-lg font-medium flex items-center gap-sm hover:bg-primary-hover active:scale-95 transition-all shadow-md"
      >
        <Download size={18} />
        Ekspor Laporan Tahunan
      </button>
    </div>
  );
}
