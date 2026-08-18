import React from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { ArrowLeft, Building2 } from 'lucide-react';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';

const STATUS_VARIANT = {
  AKTIF: 'success',
  DITUTUP: 'danger',
  DRAF: 'default',
};

const STATUS_LABEL = {
  AKTIF: 'Aktif',
  DITUTUP: 'Ditutup',
  DRAF: 'Draf',
};

/**
 * Header detail survei untuk Admin Kabupaten: identitas survei + tombol kembali
 * ke daftar monitoring. `actionSlot` dipakai halaman pemanggil utk menaruh menu
 * ekspor -- header ini sendiri tak punya aksi yang mengubah data survei.
 */
export default function SurveyDetailHeader({ title, opdName, period, status, actionSlot }) {
  return (
    <div className="mb-xl space-y-md">
      <Link
        href="/admin-kab/surveys"
        className="inline-flex items-center gap-2 text-label-md font-semibold text-text-secondary hover:text-primary transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Kembali ke Monitoring Survei</span>
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-md">
        <div>
          <h1 className="font-h1 text-h1 text-text-primary tracking-tight">{title}</h1>

          <div className="flex flex-wrap items-center gap-sm mt-3">
            <Badge variant={STATUS_VARIANT[status] ?? 'default'}>{STATUS_LABEL[status] ?? status}</Badge>
            <Badge variant="default">Periode: {formatPeriodeLabel(period)}</Badge>
            <span className="inline-flex items-center gap-1.5 text-body-md text-text-secondary">
              <Building2 size={16} />
              {opdName || 'OPD tidak diketahui'}
            </span>
          </div>
        </div>

        {actionSlot}
      </div>
    </div>
  );
}
