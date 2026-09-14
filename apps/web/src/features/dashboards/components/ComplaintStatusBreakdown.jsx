import React from 'react';
import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';
import { Inbox, ArrowRight, AlertTriangle } from 'lucide-react';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';
import { COMPLAINT_STATUS_LABEL } from '@/utils/enumLabels';

// Empat status ComplaintStatus backend, dalam urutan alur penanganan.
// Label sudah bentuk frontend (lihat STATUS_MAP di complaint.adapter.js).
const STATUS_ROWS = [
  { key: 'Diterima', bar: 'bg-blue-500', dot: 'bg-blue-500' },
  { key: 'Diproses', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  { key: 'Selesai', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  { key: 'Ditolak', bar: 'bg-rose-500', dot: 'bg-rose-500' },
];

const FETCH_LIMIT = 100; // batas `limit` PaginationQueryDto backend

/**
 * Sebaran status pengaduan OPD pada triwulan terpilih.
 *
 * Pengaduan TAK punya field `periode` sendiri (hanya `createdAt`), jadi
 * pembucketannya memakai `periodeFromDate` -- cermin persis cara backend
 * membucket tren pengaduan (DashboardService.getStatistics), bukan aturan baru
 * yang dikarang di frontend.
 *
 * `totalAll` (dari meta.pagination.total) dipakai untuk berterus terang bila
 * data yang diambil terpotong batas 100 baris: lebih baik memberi tahu
 * daripada menampilkan angka yang terlihat pasti padahal tidak lengkap.
 */
export default function ComplaintStatusBreakdown({
  complaints,
  periode,
  totalAll = 0,
  completionRate = null,
}) {
  const counts = STATUS_ROWS.map((row) => ({
    ...row,
    count: complaints.filter((c) => c.status === row.key).length,
  }));
  const total = complaints.length;
  const isTruncated = totalAll > FETCH_LIMIT;

  return (
    <div className="bg-surface p-lg rounded-xl shadow-sm border border-outline-variant flex flex-col h-full">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-lg">
        <div>
          <h3 className="font-headline-md text-headline-md text-primary">Status Pengaduan</h3>
          <p className="text-xs text-text-secondary mt-0.5">{formatPeriodeLabel(periode)}</p>
        </div>
        <Link
          href="/admin-opd/complaints"
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          Buka <ArrowRight size={14} />
        </Link>
      </div>

      {total === 0 ? (
        <div className="flex-1 flex flex-col justify-center">
          <EmptyState
            icon={<Inbox size={44} />}
            title="Tidak ada pengaduan"
            description={`Belum ada pengaduan masuk pada ${formatPeriodeLabel(periode)}.`}
          />
        </div>
      ) : (
        <div className="flex-1 space-y-md">
          <div>
            <p className="text-3xl font-extrabold text-on-surface leading-none">{total}</p>
            <p className="text-xs text-text-secondary mt-1">pengaduan pada periode ini</p>
          </div>

          <div className="space-y-sm">
            {counts.map((row) => {
              const percent = total > 0 ? (row.count / total) * 100 : 0;
              return (
                <div key={row.key} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-on-surface-variant">
                      <span className={`w-2 h-2 rounded-full ${row.dot}`}></span>
                      {COMPLAINT_STATUS_LABEL[row.key] ?? row.key}
                    </span>
                    <span className="font-bold text-on-surface">
                      {row.count}
                      <span className="text-text-secondary font-medium ml-1">
                        ({Math.round(percent)}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                    <div className={`h-full ${row.bar}`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {completionRate != null && (
            <div className="pt-md border-t border-outline-variant">
              <p className="text-xs text-text-secondary">
                Tingkat penyelesaian kumulatif seluruh periode:{' '}
                <span className="font-bold text-on-surface">{completionRate}%</span>
              </p>
            </div>
          )}
        </div>
      )}

      {isTruncated && (
        <p className="flex items-start gap-1.5 mt-md text-[11px] text-amber-700 leading-relaxed">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          Dihitung dari {FETCH_LIMIT} pengaduan terbaru saja (total {totalAll}), karena satu
          permintaan daftar dibatasi {FETCH_LIMIT} baris.
        </p>
      )}
    </div>
  );
}
