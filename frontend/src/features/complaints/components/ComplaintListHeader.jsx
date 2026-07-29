import React from 'react';
import { Download, FileText } from 'lucide-react';

export default function ComplaintListHeader({ totalComplaints = 0, onExportExcel, onExportPDF }) {
  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-h1 text-h1 text-text-primary tracking-tight">Daftar Pengaduan Masyarakat</h2>
          <p className="font-body-md text-body-md text-text-secondary mt-2">
            Menampilkan {totalComplaints} tiket pengaduan aktif yang membutuhkan tindak lanjut segera.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
          <button 
            onClick={onExportExcel}
            className="flex items-center gap-sm px-md py-2 border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container transition-colors"
          >
            <Download size={20} />
            <span className="font-label-md text-label-md">Ekspor Excel</span>
          </button>
          <button 
            onClick={onExportPDF}
            className="flex items-center gap-sm px-md py-2 border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container transition-colors"
          >
            <FileText size={20} />
            <span className="font-label-md text-label-md">Ekspor PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
