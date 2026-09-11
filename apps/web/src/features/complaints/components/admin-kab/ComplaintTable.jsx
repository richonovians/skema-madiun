import React from 'react';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';
import { COMPLAINT_STATUS_LABEL } from '@/utils/enumLabels';

/**
 * Kolom Prioritas/SLA/Progress% DIHAPUS -- tak ada field ini di backend
 * (lihat gap complaint.adapter.js sejak INT-6). `categoryMap` (kode->nama,
 * dari GET /ref/complaint-categories) dipakai menerjemahkan kode kategori
 * mentah jadi label ramah-baca, tanggung jawab halaman pemanggil (di luar
 * adapter sinkron -- lihat catatan di complaint.adapter.js).
 */
export default function ComplaintTable({ complaints, categoryMap = {}, onForward }) {
  const getStatusVariant = (status) => {
    switch (status) {
      case 'Selesai':
        return 'success';
      case 'Diproses':
        return 'warning';
      case 'Ditolak':
        return 'danger';
      case 'Diterima':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-surface-container text-on-surface-variant">
          <tr>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">NO. TIKET</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">OPD & KATEGORI</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">JUDUL KELUHAN</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">TANGGAL & UMUR</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">STATUS</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider text-left">AKSI</th>
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
                <td className="px-lg py-lg">
                  <div className="font-mono text-sm font-bold text-primary">#{complaint.id}</div>
                </td>

                <td className="px-lg py-lg">
                  {/* "Belum bertujuan" sebagai LENCANA, bukan '-': tanda hubung
                      tak dapat dibedakan dari nama OPD yang gagal dimuat,
                      sedangkan baris inilah yang justru menuntut tindakan. */}
                  {complaint.opdId == null ? (
                    <Badge variant="warning">Belum bertujuan</Badge>
                  ) : (
                    <div className="font-body-md text-body-md font-bold text-slate-800">
                      {complaint.target || '-'}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-0.5">
                    {categoryMap[complaint.kategori] ?? complaint.kategori ?? '-'}
                  </div>
                </td>

                <td className="px-lg py-lg max-w-xs">
                  <p className="font-body-md text-body-md text-on-surface line-clamp-2" title={complaint.title}>
                    {complaint.title}
                  </p>
                  <div className="text-xs text-slate-500 mt-1">Pelapor: {complaint.reporter?.name ?? '-'}</div>
                </td>

                <td className="px-lg py-lg">
                  <div className="font-body-md text-body-md text-on-surface-variant">{complaint.dateStr}</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">Umur: {complaint.ageDays} hari</div>
                </td>

                <td className="px-lg py-lg">
                  <Badge variant={getStatusVariant(complaint.status)}>
                    {COMPLAINT_STATUS_LABEL[complaint.status] ?? complaint.status}
                  </Badge>
                </td>

                <td className="px-lg py-lg text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin-kab/complaints/${complaint.id}`}>
                      <button className="px-md py-1.5 text-primary border border-primary rounded-lg font-label-md text-label-md hover:bg-primary hover:text-white transition-all">
                        Monitor Tiket
                      </button>
                    </Link>
                    {/* Hanya pada baris yang BELUM bertujuan: backend menolak
                        400 bila tiketnya sudah menjadi tanggung jawab OPD. */}
                    {complaint.opdId == null && onForward && (
                      <button
                        onClick={() => onForward(complaint)}
                        className="px-md py-1.5 text-white bg-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-all"
                      >
                        Teruskan
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
