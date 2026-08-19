import React from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { ClipboardList, Users, Gauge, ArrowRight } from 'lucide-react';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';

const STATUS_VARIANT = { AKTIF: 'success', DITUTUP: 'danger', DRAF: 'default' };
const STATUS_LABEL = { AKTIF: 'Aktif', DITUTUP: 'Ditutup', DRAF: 'Draf' };

/**
 * Kinerja survei OPD pada SATU triwulan terpilih -- inilah yang membuat
 * penyaring triwulan di navbar benar-benar berguna.
 *
 * Dihitung dari `GET /surveys` (sudah tersaring OPD sendiri oleh backend lewat
 * opdWhereFilter) dengan mencocokkan `periode` survei, BUKAN dari
 * `GET /dashboard/opd` -- endpoint itu tak menerima parameter periode dan
 * angkanya selalu kumulatif.
 *
 * Nilai IKM: dirata-ratakan HANYA dari survei yang sudah punya nilai
 * (survei draf/tanpa responden bernilai null) -- memasukkan null sebagai 0
 * akan menurunkan rata-rata secara palsu.
 */
export default function PeriodSurveyPerformance({ surveys, periode, listHref = '/admin-opd/surveys' }) {
  const scored = surveys.filter((s) => s.ikmScore != null);
  const avgIkm =
    scored.length > 0 ? scored.reduce((sum, s) => sum + s.ikmScore, 0) / scored.length : null;
  const totalRespondents = surveys.reduce((sum, s) => sum + (s.respondentsCount ?? 0), 0);
  const countByStatus = surveys.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="lg:col-span-2 bg-surface p-lg rounded-xl shadow-sm border border-outline-variant">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-lg">
        <div>
          <h3 className="font-headline-md text-headline-md text-primary">Kinerja Periode</h3>
          <p className="text-xs text-text-secondary mt-0.5">{formatPeriodeLabel(periode)}</p>
        </div>
        <Link
          href={listHref}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          Kelola survei <ArrowRight size={14} />
        </Link>
      </div>

      {surveys.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={44} />}
          title="Belum ada survei pada periode ini"
          description={`Tidak ada paket survei OPD Anda yang berperiode ${formatPeriodeLabel(periode)}. Pilih triwulan lain pada navbar, atau buat survei baru.`}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-md mb-lg">
            <div className="p-md rounded-xl bg-surface-container-low border border-outline-variant">
              <div className="flex items-center gap-1.5 text-secondary text-xs font-medium">
                <ClipboardList size={14} /> Paket Survei
              </div>
              <p className="text-2xl font-extrabold text-on-surface mt-1">{surveys.length}</p>
            </div>
            <div className="p-md rounded-xl bg-surface-container-low border border-outline-variant">
              <div className="flex items-center gap-1.5 text-secondary text-xs font-medium">
                <Users size={14} /> Responden
              </div>
              <p className="text-2xl font-extrabold text-on-surface mt-1">
                {totalRespondents.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-md rounded-xl bg-surface-container-low border border-outline-variant">
              <div className="flex items-center gap-1.5 text-secondary text-xs font-medium">
                <Gauge size={14} /> Rata-rata IKM
              </div>
              <p className="text-2xl font-extrabold text-primary mt-1">
                {avgIkm != null ? avgIkm.toFixed(2) : '-'}
              </p>
              <p className="text-[10px] text-text-secondary mt-0.5">
                {scored.length > 0
                  ? `dari ${scored.length} survei bernilai`
                  : 'belum ada survei bernilai'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-lg">
            {Object.entries(STATUS_LABEL).map(([status, label]) =>
              countByStatus[status] ? (
                <Badge key={status} variant={STATUS_VARIANT[status]}>
                  {label}: {countByStatus[status]}
                </Badge>
              ) : null,
            )}
          </div>

          <ul className="divide-y divide-outline-variant">
            {surveys.map((survey) => (
              <li key={survey.id} className="py-sm flex items-center justify-between gap-md">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-on-surface truncate" title={survey.title}>
                    {survey.title}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {survey.status === 'DRAF'
                      ? 'Belum dipublikasikan'
                      : `${(survey.respondentsCount ?? 0).toLocaleString('id-ID')} responden${
                          survey.ikmScore != null ? ` · IKM ${survey.ikmScore.toFixed(2)}` : ''
                        }`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={STATUS_VARIANT[survey.status] ?? 'default'}>
                    {STATUS_LABEL[survey.status] ?? survey.status}
                  </Badge>
                  {/* Draf diarahkan ke builder (belum ada respons utk dilihat);
                      survei terbit ke daftar responsnya. */}
                  <Link
                    href={
                      survey.status === 'DRAF'
                        ? `/admin-opd/surveys/builder/${survey.id}`
                        : `/admin-opd/surveys/${survey.id}/responses`
                    }
                    className="text-xs font-bold text-primary hover:underline whitespace-nowrap"
                  >
                    {survey.status === 'DRAF' ? 'Susun' : 'Lihat respons'}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
