'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText } from 'lucide-react';
import { downloadTablePdf } from '@/utils/pdf';

/**
 * INT-24 (2026-08-05): ekspor SEBELUMNYA berisi 4 angka hardcode (85.5/15200/
 * 432/92%) tak peduli data sungguhan -- kini pakai `summary` nyata dari GET
 * /statistics.
 *
 * 2026-08-18: format PDF tak lagi "simulasi teks" (dulu mengunduh .txt lengkap
 * dengan disclaimer) -- kini PDF sungguhan lewat utils/pdf.js yang memakai
 * jsPDF, dependensi yang ternyata sudah lama ada di proyek ini.
 */
export default function KabDashboardHeader({ summary }) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportError, setExportError] = useState(null);
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

  const rows = [
    ['Indeks Kepuasan Masyarakat', summary?.ikm ?? '-'],
    ['Total Responden', summary?.totalRespondents ?? '-'],
    ['Total Pengaduan', summary?.totalComplaints ?? '-'],
    ['Tingkat Penyelesaian', summary?.completionRate != null ? `${summary.completionRate}%` : '-'],
  ];

  const handleExportExcel = () => {
    const csvContent = `Kategori,Nilai\n${rows.map(([k, v]) => `${k},${v}`).join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Laporan_Tahunan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  /**
   * SEBELUMNYA mengunduh .txt berisi catatan "ini simulasi format teks" --
   * tombolnya bilang PDF tapi hasilnya teks. Kini PDF sungguhan lewat
   * utils/pdf.js (jsPDF, sudah jadi dependensi proyek).
   */
  const handleExportPDF = async () => {
    setIsExportOpen(false);
    setExportError(null);
    try {
      await downloadTablePdf({
        filename: 'Laporan_Tahunan.pdf',
        title: 'Laporan Tahunan Kinerja Kabupaten',
        subtitle: 'Ringkasan indikator utama',
        columns: [
          { header: 'INDIKATOR', width: 3 },
          { header: 'NILAI', width: 2 },
        ],
        rows: rows.map(([label, value]) => [label, value]),
      });
    } catch (err) {
      setExportError(err.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-md mb-lg">
      <div className="relative group space-y-1" ref={exportRef}>
        <button 
          onClick={() => setIsExportOpen(!isExportOpen)}
          className="bg-primary text-on-primary px-lg py-sm rounded-lg font-bold flex items-center justify-between gap-sm hover:bg-primary-hover active:scale-95 transition-all shadow-md min-h-[44px]"
        >
          <div className="flex items-center gap-2">
            <Download size={18} />
            <span>Ekspor Laporan Tahunan</span>
          </div>
          <ChevronDown size={20} className={`flex-shrink-0 transition-all duration-300 ${isExportOpen ? 'rotate-180' : ''}`} />
        </button>

        {isExportOpen && (
          <div className="absolute right-0 top-full mt-2 w-full bg-white rounded-xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
            <ul className="py-1 max-h-60 overflow-y-auto">
              <li>
                <button 
                  onClick={handleExportExcel}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Download size={16} />
                  <span className="truncate">Excel</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={handleExportPDF}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  <FileText size={16} />
                  <span className="truncate">PDF</span>
                </button>
              </li>
            </ul>
          </div>
        )}

        {exportError && (
          <p className="mt-2 text-xs font-medium text-red-600 text-right">
            Gagal mengekspor: {exportError}
          </p>
        )}
      </div>
    </div>
  );
}
