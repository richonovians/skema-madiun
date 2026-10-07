'use client';

import React, { useState } from 'react';
import Badge from '@/components/ui/Badge';
import RowActionsMenu from '@/components/ui/RowActionsMenu';
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
  Share2,
  Star,
} from 'lucide-react';
import ShareSurveyModal from '@/features/surveys/components/ShareSurveyModal';
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
 * Ukuran ikon di dalam butir menu. Seragam dengan Manajemen User, supaya kedua
 * menu di aplikasi ini terbaca sebagai benda yang sama.
 */
const IKON = 14;

/** Alasan "Ubah" mati; dipajang sebagai teks, bukan tooltip `title`. */
const ALASAN_DITUTUP = 'Survei yang sudah ditutup tidak dapat diubah. Aktifkan kembali lebih dulu.';

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
  onJadikanUtama,
  busySurveyId = null,
}) {
  /**
   * Modal "Bagikan" DIANGKAT KE SINI (30 September 2026). Dulu ia tinggal di
   * dalam `ShareSurveyButton`, yang membawa tombolnya sendiri -- dan butir menu
   * tak bisa membawa tombol. Yang berpindah hanya kepemilikan state-nya;
   * modalnya sendiri tak disentuh, dan Admin OPD tetap memakai
   * `ShareSurveyButton` seperti semula.
   */
  const [surveiDibagikan, setSurveiDibagikan] = useState(null);

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
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">NILAI RATA-RATA</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">STATUS</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider text-left">AKSI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {surveys.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center py-xl text-text-secondary">
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
                    {/* Lencana survei utama OPD. Tanpa penanda di daftar lintas
                        OPD ini, Admin Kabupaten hanya dapat mengetahui survei
                        utama tiap OPD dengan membuka satu per satu -- dan karena
                        menyalakan yang baru MELEPAS yang lama, ia juga tak punya
                        cara memastikan penunjukannya berpindah. Teks & gaya sama
                        dengan lencana di AdminSurveyCard (kartu Admin OPD). */}
                    {survey.isUtama && (
                      <Badge
                        variant="info"
                        className="mt-xs px-sm py-[2px] text-[10px] uppercase rounded"
                      >
                        Survei Utama
                      </Badge>
                    )}
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

                  {/* NILAI RATA-RATA (7 Oktober 2026, permintaan pengguna):
                      rata-rata SEMUA jawaban skala (1-4), BUKAN IKM. Kolom
                      sendiri, bukan pengganti: IKM menuntut 9 unsur baku, jadi
                      survei yang unsur bakunya dihapus menampilkan "-" di
                      kolom IKM padahal jawabannya ada. Draf dan survei yang
                      belum dijawab tak punya jawaban skala, jadi "-" -- bukan
                      0,00 yang terbaca sebagai hasil ukur terburuk. */}
                  <td className="px-lg py-lg">
                    <span className="font-bold text-on-surface">
                      {survey.averageScore != null ? survey.averageScore.toFixed(2) : '-'}
                    </span>
                  </td>

                  <td className="px-lg py-lg">
                    <Badge variant={STATUS_VARIANT[survey.status] ?? 'default'}>
                      {STATUS_LABEL[survey.status] ?? survey.status}
                    </Badge>
                  </td>

                  <td className="px-lg py-lg">
                    {/* SATU tombol, bukan sepuluh. Aturan statusnya tidak
                        bergeser sedikit pun dari versi tombol lepas -- yang
                        berubah hanya wadahnya. Entri `false` dibuang
                        RowActionsMenu sendiri, jadi syaratnya boleh ditulis
                        sebaris tanpa penjaga tambahan. */}
                    <RowActionsMenu
                      label={`Aksi untuk ${survey.title}`}
                      items={[
                        {
                          key: 'detail',
                          label: 'Detail',
                          icon: <Eye size={IKON} />,
                          href: `/admin-kab/surveys/${survey.id}`,
                        },
                        /* Hanya pada survei AKTIF (permintaan pengguna 22
                           September 2026): tautan draf dan survei tertutup tak
                           menerima jawaban, jadi membagikannya hanya
                           menyesatkan penerimanya. Aturan yang sama dipagari di
                           AdminSurveyCardActions.jsx. */
                        isActive && {
                          key: 'bagikan',
                          label: 'Bagikan',
                          icon: <Share2 size={IKON} />,
                          onSelect: () => setSurveiDibagikan(survey),
                        },
                        /* Draf belum pernah dibuka untuk diisi, jadi tautannya
                           pasti mendarat di tabel kosong. */
                        !isDraft && {
                          key: 'respons',
                          label: 'Respons',
                          icon: <ClipboardList size={IKON} />,
                          href: `/admin-kab/surveys/${survey.id}/responses`,
                        },
                        /* Survei DITUTUP terkunci seluruhnya karena hasil
                           IKM-nya sudah terbit. Yang terkunci begitu ada jawaban
                           adalah SUSUNAN pertanyaan, dan penjaganya di backend
                           (assertSurveyEditable) -- bukan hilangnya butir ini,
                           yang justru menyembunyikan perbaikan teks pertanyaan
                           yang masih sah. */
                        !isClosed && {
                          key: 'pertanyaan',
                          label: 'Pertanyaan',
                          icon: <FileEdit size={IKON} />,
                          href: `/admin-kab/surveys/builder/${survey.id}`,
                        },
                        {
                          key: 'ubah',
                          label: 'Ubah',
                          icon: <Pencil size={IKON} />,
                          onSelect: () => onEdit?.(survey),
                          disabled: isBusy || isClosed,
                          /* ALASANNYA TERBACA. Dulu ini atribut `title` --
                             tooltip yang tak pernah muncul pada sentuh dan tak
                             dibacakan pembaca layar, sehingga butir yang mati
                             tampak rusak begitu saja. */
                          keterangan: isClosed ? ALASAN_DITUTUP : undefined,
                        },
                        /* JADIKAN SURVEI UTAMA (7 Oktober 2026, permintaan
                           pengguna). Hanya bila belum utama dan belum DITUTUP:
                           survei yang sudah utama tak perlu ditunjuk ulang (lencana
                           di kolom judul sudah menandainya), dan survei DITUTUP
                           ditolak backend (assertSurveyEditable mode 'meta' ->
                           400). DRAF sengaja TIDAK dikecualikan: sejajar dengan
                           saklar di builder yang memang tak terikat status, dan
                           backend mengizinkannya. Backend juga MELEPAS survei
                           utama lama OPD ini dalam satu transaksi; peringatannya
                           ada di ConfirmDialog halaman. */
                        !survey.isUtama &&
                          !isClosed && {
                            key: 'utama',
                            label: 'Jadikan Utama',
                            icon: <Star size={IKON} />,
                            onSelect: () => onJadikanUtama?.(survey),
                            disabled: isBusy,
                          },
                        /* TANPA syarat status (8 September 2026):
                           `surveysService.duplicate` tidak memanggil
                           `assertDraft`, jadi survei aktif maupun yang sudah
                           ditutup boleh disalin. Salinannya selalu draf baru,
                           sehingga aslinya tak tersentuh. */
                        {
                          key: 'salin',
                          label: 'Salin',
                          icon: <Copy size={IKON} />,
                          onSelect: () => onDuplicate?.(survey),
                          disabled: isBusy,
                        },
                        isDraft && {
                          key: 'publikasikan',
                          label: 'Publikasikan',
                          icon: <UploadCloud size={IKON} />,
                          onSelect: () => onPublish?.(survey),
                          disabled: isBusy,
                        },
                        /* HANYA pada survei AKTIF (1 Oktober 2026, permintaan
                           pengguna). Syaratnya dulu `(isDraft || isActive)`,
                           dan backend memang MENGIZINKAN transisi
                           draft -> ditutup (ALLOWED_TRANSITIONS di
                           surveys.service.ts). Yang dipersempit karena itu
                           TAMPILANNYA saja: menutup survei yang belum pernah
                           dibuka tak mengakhiri apa pun, sebab tak ada periode
                           yang sedang berjalan. Pagar backend sengaja tak
                           disentuh -- jalur penghapusan ke Sampah ikut
                           memakainya untuk menutup survei yang dibuang. */
                        isActive && {
                          key: 'tutup',
                          label: 'Tutup',
                          icon: <Lock size={IKON} />,
                          onSelect: () => onClose?.(survey),
                          disabled: isBusy,
                        },
                        /* DITUTUP -> AKTIF, satu-satunya aksi yang membuat baris
                           berstatus ditutup kembali bisa diisi responden. */
                        isClosed && {
                          key: 'aktifkan',
                          label: 'Aktifkan',
                          icon: <Unlock size={IKON} />,
                          onSelect: () => onReopen?.(survey),
                          disabled: isBusy,
                        },
                        /* Semua status boleh dibuang -- keputusan pengguna 11
                           September 2026. Bukan penghapusan permanen: barisnya
                           pindah ke Sampah dan dapat dipulihkan. Dipisah garis
                           supaya tak bersebelahan dengan aksi sehari-hari. */
                        {
                          key: 'hapus',
                          label: 'Hapus',
                          icon: <Trash2 size={IKON} />,
                          onSelect: () => onDelete?.(survey),
                          disabled: isBusy,
                          tone: 'danger',
                          pemisahSebelum: true,
                        },
                      ]}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* SATU modal untuk seluruh tabel, bukan satu per baris. Isinya tak
          memanggil API sama sekali -- seluruhnya diturunkan dari `survey` --
          jadi merendernya hanya saat ada yang dipilih tak menunda apa pun. */}
      {surveiDibagikan && (
        <ShareSurveyModal
          survey={surveiDibagikan}
          namaInstansi={surveiDibagikan.opdName ?? ''}
          onClose={() => setSurveiDibagikan(null)}
        />
      )}
    </div>
  );
}
