import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Printer, Download, ChevronDown } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import useKeepInViewport from '@/hooks/useKeepInViewport';

/** Badge Prioritas & SLA DIHAPUS -- tak ada field ini di backend (lihat gap complaint.adapter.js). */
export default function ComplaintDetailHeader({ complaint }) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef(null);

  // Kepala halaman ini MEMBUNGKUS di layar sempit, sehingga tombol ekspornya
  // turun ke sisi kiri. `right-0` lalu menarik menu 192px itu keluar tepi kiri
  // -- terukur `kiri=-92` pada 320px maupun 390px, alias hampir separuh menu
  // hilang. Digeser kembali ke dalam layar oleh kait di bawah.
  const exportPanelRef = useRef(null);
  useKeepInViewport(exportPanelRef, isExportOpen);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const getStatusVariant = (status) => {
    switch (status) {
      case 'Selesai': return 'success';
      case 'Diproses': return 'warning';
      case 'Ditolak': return 'danger';
      case 'Diterima': return 'info';
      default: return 'default';
    }
  };

  return (
    <div className="flex flex-col gap-4 mb-md">
      {/* Top Nav & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link 
          href="/admin-kab/complaints" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          <ArrowLeft size={18} />
          Kembali ke Daftar Pengaduan
        </Link>

        <div className="relative group space-y-1" ref={exportRef}>
          <button 
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="flex items-center justify-between gap-1 sm:gap-3 min-h-[44px] px-md rounded-lg font-medium text-xs sm:text-body-md transition-all bg-surface border border-border text-text-primary hover:bg-surface-container shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Download size={18} className="text-text-secondary group-hover:text-primary" />
              <span className="hidden sm:inline">Ekspor</span>
            </div>
            <ChevronDown size={20} className={`flex-shrink-0 transition-all duration-300 ${isExportOpen ? 'rotate-180' : ''} text-text-secondary group-hover:text-primary`} />
          </button>
          
          {isExportOpen && (
            <div
              ref={exportPanelRef}
              className="absolute right-0 top-full mt-2 w-48 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200"
            >
              <ul className="py-1">
                <li>
                  <button 
                    onClick={async () => { 
                      try {
                        setIsExportOpen(false);
                        const { toPng } = await import('html-to-image');
                        const { jsPDF } = await import('jspdf');
                        
                        const element = document.getElementById('complaint-detail-container');
                        if (!element) return;
                        
                        const dataUrl = await toPng(element, { quality: 0.95, backgroundColor: '#ffffff' });
                        
                        const pdf = new jsPDF({
                          orientation: 'portrait',
                          unit: 'px',
                          format: [element.offsetWidth, element.offsetHeight]
                        });
                        
                        pdf.addImage(dataUrl, 'PNG', 0, 0, element.offsetWidth, element.offsetHeight);
                        pdf.save(`tiket_pengaduan_${complaint.id}.pdf`);
                      } catch (err) {
                        console.error('Failed to generate PDF', err);
                        alert('Gagal menghasilkan PDF.');
                      }
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <FileText size={16} />
                    <span>Export PDF</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => { window.print(); setIsExportOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Printer size={16} />
                    <span>Cetak Detail</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Main Title Area */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant p-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-bold text-primary">#{complaint.id}</span>
              <Badge variant={getStatusVariant(complaint.status)}>{complaint.status}</Badge>
            </div>
            <h1 className="text-headline-sm font-bold text-slate-900 leading-tight">
              {complaint.title}
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}
