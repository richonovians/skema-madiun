import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Printer, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

export default function ComplaintDetailHeader({ complaint }) {
  const getStatusVariant = (status) => {
    switch (status) {
      case 'Selesai': return 'success';
      case 'Diproses': return 'warning';
      case 'Ditolak': return 'danger';
      case 'Diterima': return 'info';
      default: return 'default';
    }
  };

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'Tinggi': return 'danger';
      case 'Sedang': return 'warning';
      case 'Rendah': return 'success';
      default: return 'default';
    }
  };

  const getSLABadge = (sla) => {
    if (!sla) return null;
    if (sla.isOverdue) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-sm font-bold border border-red-100">
          <AlertCircle size={16} /> Melebihi SLA
        </div>
      );
    }
    if (sla.remainingHours <= 24) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-yellow-600 text-sm font-bold border border-yellow-100">
          <Clock size={16} /> Mendekati Batas SLA
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-sm font-bold border border-emerald-100">
        <CheckCircle size={16} /> Dalam SLA
      </div>
    );
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

        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2 bg-white">
            <FileText size={16} />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
          <Button variant="outline" className="flex items-center gap-2 bg-white">
            <Printer size={16} />
            <span className="hidden sm:inline">Cetak Detail</span>
          </Button>
        </div>
      </div>

      {/* Main Title Area */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant p-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-bold text-primary">#{complaint.id}</span>
              <Badge variant={getStatusVariant(complaint.status)}>{complaint.status}</Badge>
              <Badge variant={getPriorityVariant(complaint.priority)}>{complaint.priority}</Badge>
              {getSLABadge(complaint.sla)}
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
