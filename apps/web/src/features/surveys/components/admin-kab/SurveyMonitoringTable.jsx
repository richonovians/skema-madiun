import React from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import {
  Eye,
  FileEdit,
  Pencil,
  UploadCloud,
  Lock,
  Unlock,
  Trash2,
  ClipboardList,
  Copy,
} from 'lucide-react';
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

// `h-[32px]` -> `min-h-[44px]` (21 September 2026). Delapan aksi per baris,
// semuanya 32px, dan barisnya digulir mendatar di ponsel -- kombinasi yang
// membuat "Hapus" bersebelahan dengan "Tutup" pada sasaran yang lebih kecil
// daripada ujung jari. Tinggi minimum, bukan tetap, supaya baris yang labelnya
// membungkus tak terpotong.
const ACTION_CLASS =
  'whitespace-nowrap px-2.5 py-1 border border-outline-variant rounded-lg text-xs font-label-md text-text-primary hover:bg-slate-100 transition-colors min-h-[44px] flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Tabel survei lintas OPD untuk Admin Kabupaten, lengkap dengan aksi CRUD.
 *
 * Aksi yang tersedia MENGIKUTI aturan backend, bukan sekadar hak akses peran
 * (kabupaten memang melewati seluruh @Roles lewat bypass RolesGuard, tapi
 * SurveysService tetap menegakkan aturan status):
 * - "Ubah" & "Hapus" hanya untuk DRAF (`assertDraft`, selain draf -> 400).
 * - "Publikasikan" hanya DRAF; "Tutup" untuk DRAF/AKTIF; "Aktifkan Kembali"
 *   hanya DITUTUP -- persis mengikuti ALLOWED_TRANSITIONS backend
 *   (draft -> [aktif, ditutup], aktif -> [ditutup], ditutup -> [aktif]).
 *   Aksi "Aktifkan Kembali" ditambahkan 2026-08-19; sebelumnya baris DITUTUP
 *   jadi jalan buntu di tabel ini padahal backend mengizinkan pembukaan kembali
 *   dan Admin OPD sudah bisa melakukannya lewat switch di kartunya.
 * - "Respons" hanya NON-DRAF (2026-08-19): membuka daftar respons per pengisi di
 *   area admin-kab sendiri. Backend memang mengizinkan (GET /surveys/:id/responses
 *   ber-@Roles(kabupaten, opd)); yang tadinya hilang cuma rutenya di frontend.
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
  onReopen,
  onDelete,
  onDuplicate,
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
              const isClosed = survey.status === 'DITUTUP';
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
                          satu implementasi QR/tautan untuk kedua area.

                          Hanya pada survei AKTIF (permintaan pengguna 22
                          September 2026). Draf dan yang sudah ditutup
                          disembunyikan: tautannya tak menerima jawaban, jadi
                          membagikannya hanya menyesatkan penerimanya. Aturan
                          yang sama dipagari di AdminSurveyCardActions.jsx. */}
                      {survey.status === 'AKTIF' && (
                        <ShareSurveyButton survey={survey} className={ACTION_CLASS} iconSize={12} />
                      )}

                      {/* "Respons" hanya untuk survei terbit: draf belum pernah
                          dibuka utk diisi, jadi tautannya pasti mendarat di tabel
                          kosong. Ditambahkan 2026-08-19 -- sebelumnya Admin
                          Kabupaten tak punya jalan APA PUN ke respons per pengisi
                          (rutenya cuma ada di /admin-opd/**, sehingga URL sepadan
                          di area ini 404). */}
                      {!isDraft && (
                        <Link
                          href={`/admin-kab/surveys/${survey.id}/responses`}
                          className={ACTION_CLASS}
                        >
                          <ClipboardList size={12} />
                          Respons
                        </Link>
                      )}

                      {/* "Pertanyaan" & "Ubah" tak lagi khusus draf (11
                          September 2026). Yang terkunci begitu ada jawaban
                          adalah SUSUNAN pertanyaan, dan penjaganya di backend
                          (assertSurveyEditable) -- bukan hilangnya tombol ini,
                          yang justru menyembunyikan perbaikan teks pertanyaan
                          yang masih sah. Survei DITUTUP terkunci seluruhnya
                          karena hasil IKM-nya sudah terbit. */}
                      {!isClosed && (
                        <Link href={`/admin-kab/surveys/builder/${survey.id}`} className={ACTION_CLASS}>
                          <FileEdit size={12} />
                          Pertanyaan
                        </Link>
                      )}

                      <button
                        onClick={() => onEdit?.(survey)}
                        disabled={isBusy || isClosed}
                        title={
                          isClosed
                            ? 'Survei yang sudah ditutup tidak dapat diubah. Aktifkan kembali lebih dulu.'
                            : undefined
                        }
                        className={ACTION_CLASS}
                      >
                        <Pencil size={12} />
                        Ubah
                      </button>

                      {/* TANPA syarat status (8 September 2026), dan itu bukan
                          kelalaian: `surveysService.duplicate` tidak memanggil
                          `assertDraft`, jadi survei aktif maupun yang sudah
                          ditutup boleh disalin. Salinannya selalu draf baru,
                          sehingga aslinya tak tersentuh sama sekali. */}
                      <button
                        onClick={() => onDuplicate?.(survey)}
                        disabled={isBusy}
                        className={ACTION_CLASS}
                      >
                        <Copy size={12} />
                        Salin
                      </button>

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

                      {/* DITUTUP -> AKTIF. Ditonjolkan (bukan gaya netral seperti
                          aksi lain) karena ini satu-satunya aksi yang membuat
                          baris berstatus ditutup kembali bisa diisi responden. */}
                      {isClosed && (
                        <button
                          onClick={() => onReopen?.(survey)}
                          disabled={isBusy}
                          className={`${ACTION_CLASS} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
                        >
                          <Unlock size={12} />
                          Aktifkan
                        </button>
                      )}

                      {/* Semua status boleh dibuang -- keputusan pengguna 11
                          September 2026. Bukan lagi penghapusan permanen:
                          barisnya pindah ke Sampah dan dapat dipulihkan.
                          Survei aktif ditutup lebih dulu oleh backend supaya
                          tautan & QR yang beredar berhenti menerima jawaban. */}
                      <button
                        onClick={() => onDelete?.(survey)}
                        disabled={isBusy}
                        className={`${ACTION_CLASS} text-error hover:bg-error-container`}
                      >
                        <Trash2 size={12} />
                        Hapus
                      </button>
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
