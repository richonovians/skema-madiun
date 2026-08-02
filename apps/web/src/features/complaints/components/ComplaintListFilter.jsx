import React, { useState, useRef, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { Search, Download, FileText, ChevronDown } from 'lucide-react';

export default function ComplaintListFilter({ 
  searchQuery, 
  onSearchChange, 
  statusFilter, 
  onStatusChange,
  onExportExcel,
  onExportPDF
}) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const statusOptions = [
    { value: 'Semua Status', label: 'Semua Status' },
    { value: 'Diterima', label: 'Diterima' },
    { value: 'Diproses', label: 'Diproses' },
    { value: 'Selesai', label: 'Selesai' },
    { value: 'Ditolak', label: 'Ditolak' },
  ];

  return (
    <div className="p-lg border-b border-outline-variant bg-surface-container-low flex flex-col md:flex-row gap-lg">
      <div className="flex-1">
        <Input 
          id="search-complaint"
          leftIcon={<Search size={20} />}
          placeholder="Cari nomor tiket, judul, atau nama pelapor..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="flex items-center gap-md z-10 relative">
        <Dropdown 
          options={statusOptions}
          value={statusFilter}
          onChange={onStatusChange}
        />
        <div className="relative group space-y-1" ref={exportRef}>
          <button 
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="flex items-center justify-between gap-1 sm:gap-3 min-w-0 md:min-w-[140px] min-h-[44px] p-2 md:p-md rounded-lg font-medium text-xs sm:text-body-md transition-all bg-surface border border-border text-text-primary hover:bg-surface-container shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Download size={18} className="text-text-secondary group-hover:text-primary" />
              <span className="truncate hidden sm:inline">Ekspor</span>
            </div>
            <ChevronDown size={20} className={`flex-shrink-0 transition-all duration-300 ${isExportOpen ? 'rotate-180' : ''} text-text-secondary group-hover:text-primary`} />
          </button>
          
          {isExportOpen && (
            <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
              <ul className="py-1 max-h-60 overflow-y-auto">
                <li>
                  <button 
                    onClick={() => {
                      onExportExcel?.();
                      setIsExportOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Download size={16} />
                    <span className="truncate">Excel</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      onExportPDF?.();
                      setIsExportOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <FileText size={16} />
                    <span className="truncate">PDF</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
