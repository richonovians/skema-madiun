import React from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { Eye, FileEdit, Pencil, UploadCloud, Lock, Trash2 } from 'lucide-react';
import ShareSurveyButton from '@/features/surveys/components/ShareSurveyButton';
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

const ACTION_CLASS =
  'whitespace-nowrap px-2.5 py-1 border border-outline-variant rounded-lg text-xs font-label-md text-text-primary hover:bg-slate-100 transition-colors h-[32px] flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Tabel survei lintas OPD untuk Admin Kabupaten, lengkap dengan aksi CRUD.
 *
 * Aksi yang tersedia MENGIKUTI aturan backend, bukan sekadar hak akses peran
 * (kabupaten memang melewati seluruh @Roles lewat bypass RolesGuard, tapi
 * SurveysService tetap menegakkan aturan status):
 * - "Ubah" & "Hapus" hanya untuk DRAF (`assertDraft`, selain draf -> 400).
 * - "Publikasikan" hanya DRAF; "Tutup" untuk DRAF/AKTIF (ALLOWED_TRANSITIONS).
 *   CATATAN: sejak 2026-08-18 backend mengizinkan DITUTUP -> AKTIF (survei dapat
 *   dibuka kembali). Aksi "Buka Kembali" itu sudah ada di kartu Admin OPD tapi
 *   BELUM di tabel ini -- perlu tiket sendiri, jangan disangka terlewat.
 * - "Pertanyaan" JUGA hanya DRAF: begitu survei dipublikasikan, pertanyaannya
 *   terkunci (builder sendiri menolak lewat assertDraftOrThrow, dan backend
 *   menolak perubahan pertanyaan di luar status draft) -- menampilkan tombol
 *   yang pasti mentok cuma menyesatkan. Membuka builder versi /admin-kab
 *   (komponen sama dengan builder Admin OPD, lihat SurveyBuilderScreen.jsx)
 *   supaya pengguna tak berpindah ke area peran lain.
 *
 * Konfirmasi aksi TIDAK memakai `window.confirm` -- dialognya dipegang halaman
 * pemanggil lewat ConfirmDialog.jsx (komponen tabel ini murni presentasional,
 * cuma meneruskan baris yang dipilih).
 *
 * Responden & nilai IKM survei DRAF ditampilkan '-' (bukan 0/0,00): survei draf
 * belum pernah dibuka utk diisi, jadi angka nol di situ bukan capaian
 * melainkan "belum berlaku".
 */
export default function SurveyMonitoringTable({
  surveys,
  onEdit,
  onPublish,
  onClose,
  onDelete,
  busySurveyId = null,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-surface-container text-on-surface-variant">
          <tr>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">JUDUL SURVEI</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">OPD PENYELENGGARA</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">PERIODE</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">RESPONDEN</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">NILAI IKM</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">STATUS</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider text-left">AKSI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {surveys.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center py-xl text-text-secondary">
                Tidak ada survei yang ditemukan.
              </td>
            </tr>
          ) : (
            surveys.map((survey) => {
              const isDraft = survey.status === 'DRAF';
              const isActive = survey.status === 'AKTIF';
              const isBusy = busySurveyId === survey.id;

              return (
                <tr key={survey.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-lg py-lg max-w-xs">
                    <p
                      className="font-body-md text-body-md font-bold text-slate-800 line-clamp-2"
                      title={survey.title}
                    >
                      {survey.title}
                    </p>
                  </td>

                  <td className="px-lg py-lg">
                    <div className="font-body-md text-body-md text-on-surface">{survey.opdName || '-'}</div>
                  </td>

                  <td className="px-lg py-lg">
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      {formatPeriodeLabel(survey.period)}
                    </span>
                  </td>

                  <td className="px-lg py-lg">
                    <span className="font-body-md text-body-md text-on-surface">
                      {isDraft ? '-' : survey.respondentsCount.toLocaleString('id-ID')}
                    </span>
                  </td>

                  <td className="px-lg py-lg">
                    <span className="font-bold text-on-surface">
                      {survey.ikmScore != null ? survey.ikmScore.toFixed(2) : '-'}
                    </span>
                  </td>

                  <td className="px-lg py-lg">
                    <Badge variant={STATUS_VARIANT[survey.status] ?? 'default'}>
                      {STATUS_LABEL[survey.status] ?? survey.status}
                    </Badge>
                  </td>

                  <td className="px-lg py-lg">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-[230px]">
                      <Link href={`/admin-kab/surveys/${survey.id}`} className={ACTION_CLASS}>
                        <Eye size={12} />
                        Detail
                      </Link>

                      {/* Komponen yang sama dipakai kartu survei Admin OPD --
                          satu implementasi QR/tautan untuk kedua area. */}
                      <ShareSurveyButton survey={survey} className={ACTION_CLASS} iconSize={12} />

                      {isDraft && (
                        <Link href={`/admin-kab/surveys/builder/${survey.id}`} className={ACTION_CLASS}>
                          <FileEdit size={12} />
                          Pertanyaan
                        </Link>
                      )}

                      {isDraft && (
                        <button onClick={() => onEdit?.(survey)} disabled={isBusy} className={ACTION_CLASS}>
                          <Pencil size={12} />
                          Ubah
                        </button>
                      )}

                      {isDraft && (
                        <button onClick={() => onPublish?.(survey)} disabled={isBusy} className={ACTION_CLASS}>
                          <UploadCloud size={12} />
                          Publikasikan
                        </button>
                      )}

                      {(isDraft || isActive) && (
                        <button onClick={() => onClose?.(survey)} disabled={isBusy} className={ACTION_CLASS}>
                          <Lock size={12} />
                          Tutup
                        </button>
                      )}

                      {isDraft && (
                        <button
                          onClick={() => onDelete?.(survey)}
                          disabled={isBusy}
                          className={`${ACTION_CLASS} text-error hover:bg-error-container`}
                        >
                          <Trash2 size={12} />
                          Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
