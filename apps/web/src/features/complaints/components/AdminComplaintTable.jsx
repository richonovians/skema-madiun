import React from 'react';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Link from 'next/link';
import { COMPLAINT_STATUS_LABEL } from '@/utils/enumLabels';

export default function AdminComplaintTable({ complaints }) {
  const getStatusVariant = (status) => {
    switch (status) {
      case 'Selesai': return 'success';
      case 'Diproses': return 'warning';
      case 'Ditolak': return 'danger';
      case 'Diterima': return 'info';
      default: return 'default';
    }
  };

  const getAvatarVariant = (initials) => {
    const charCode = initials.charCodeAt(0);
    if (charCode % 3 === 0) return 'primary';
    if (charCode % 3 === 1) return 'secondary';
    return 'outline';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-surface-container text-on-surface-variant">
          <tr>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">NO. TIKET</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">PELAPOR</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">JUDUL KELUHAN</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">TANGGAL MASUK</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">STATUS</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider text-right">TINDAKAN</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {complaints.length === 0 ? (
            <tr>
              <td colSpan="6" className="text-center py-xl text-text-secondary">
                Tidak ada data pengaduan yang ditemukan.
              </td>
            </tr>
          ) : (
            complaints.map((complaint) => (
              <tr key={complaint.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-lg py-lg font-mono text-sm font-bold text-primary">#{complaint.id}</td>
                <td className="px-lg py-lg">
                  <div className="flex items-center gap-sm">
                    <Avatar 
                      initials={complaint.reporter.initials} 
                      variant={getAvatarVariant(complaint.reporter.initials)}
                      size="md"
                    />
                    <span className="font-body-md text-body-md font-medium">{complaint.reporter.name}</span>
                  </div>
                </td>
                <td className="px-lg py-lg max-w-xs">
                  <p className="font-body-md text-body-md text-on-surface line-clamp-1">{complaint.title}</p>
                </td>
                <td className="px-lg py-lg font-body-md text-body-md text-on-surface-variant">{complaint.dateStr}</td>
                <td className="px-lg py-lg">
                  <Badge variant={getStatusVariant(complaint.status)}>
                    {COMPLAINT_STATUS_LABEL[complaint.status] ?? complaint.status}
                  </Badge>
                </td>
                <td className="px-lg py-lg text-right">
                  <Link href={`/admin-opd/complaints/${complaint.id}`}>
                    <button className="px-md py-1.5 text-primary border border-primary rounded-lg font-label-md text-label-md hover:bg-primary hover:text-white transition-all">
                      Buka Tiket
                    </button>
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
