import React, { useState } from 'react';
import { Eye, Edit2, Copy, Check, BarChart3, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import ShareSurveyButton from './ShareSurveyButton';

export default function AdminSurveyCardActions({
  isDraft,
  surveyId,
  survey,
  onDuplicate,
  onDelete,
}) {
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  /**
   * Bagikan HANYA pada survei aktif (permintaan pengguna 22 September 2026).
   *
   * Ini membalik keputusan 11 September yang dulu tercatat tepat di atas
   * tombolnya: draf pun boleh dibagikan supaya poster/QR dapat disiapkan lebih
   * dulu, sebab id survei -- dan karenanya tautannya -- sudah final sejak
   * survei dibuat. Alasan itu tidak salah, tetapi pengguna memilih yang
   * sebaliknya: tombolnya hanya muncul bila tautannya benar-benar dapat diisi.
   *
   * DITUTUP ikut disembunyikan, juga atas pilihan pengguna. Survei yang sudah
   * ditutup memang pernah terbit, tetapi tautannya tak lagi menerima jawaban.
   *
   * Statusnya dibaca dari `survey`, bukan dari prop `isDraft`, supaya satu
   * aturan berlaku di kedua cabang render komponen ini.
   */
  const bolehDibagikan = survey?.status === 'AKTIF';

  const actionButtonClass =
    'px-md py-sm border border-outline rounded-lg text-label-md font-bold flex items-center gap-sm hover:bg-surface-container-low transition-colors';

  /**
   * Tombol "Salin" = MENGGANDAKAN survei (POST duplicate), bukan menyalin ke
   * papan klip. Label & umpan baliknya memang "Salin"/"Tersalin!", dan itu
   * merujuk pada survei yang tersalin di daftar.
   *
   * PENULISAN KE PAPAN KLIP DIHAPUS (2 September 2026), bukan diberi jalan
   * cadangan. Dua sebab, dan keduanya berdiri sendiri:
   *
   * 1. Ia MELEMPAR di lingkungan pengujian proyek ini.
   *    `navigator.clipboard` hanya ada di secure context (HTTPS/localhost),
   *    sementara semuanya diakses lewat `http://skema.local`. Di sana objek
   *    itu `undefined`, jadi `navigator.clipboard.writeText(...)` melempar
   *    "Cannot read properties of undefined (reading 'writeText')" tepat di
   *    tengah handler -- sesudah permintaan duplikat terkirim, tapi SEBELUM
   *    `setCopied(true)`. Akibatnya survei benar-benar tergandakan namun
   *    tombolnya tak pernah memberi tanda apa pun, dan konsol dipenuhi galat
   *    yang tampak seperti kerusakan lebih besar daripada yang sesungguhnya.
   *
   * 2. Yang disalinnya tak berguna bagi siapa pun. Isinya `SRV-${id}` --
   *    format yang TIDAK ADA di mana pun selain baris itu sendiri (dicari di
   *    seluruh src/: satu kecocokan, yaitu dirinya). Backend memakai id angka
   *    dan nomor tiket berformat lain. Jadi memberinya jalan cadangan hanya
   *    akan melestarikan penyalinan kode karangan, bukan memperbaiki apa pun.
   *
   * Yang memang perlu menyalin -- tautan pengisian survei -- ada di
   * ShareSurveyModal, dan kini memakai utils/clipboard.js yang aman di HTTP.
   */
  const handleCopy = () => {
    if (onDuplicate) {
      onDuplicate(surveyId);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Bunyinya mengikuti keadaan survei. BERUBAH ARTI 11 September 2026: tak ada
   * lagi penghapusan permanen dari kartu ini -- barisnya pindah ke Sampah, dan
   * penghapusan permanennya hanya dapat dilakukan Admin Kabupaten dari halaman Sampah.
   */
  const deskripsiHapus = isDraft
    ? `Draf "${survey?.title ?? 'ini'}" akan dipindahkan ke Sampah dan dapat dipulihkan kembali.`
    : `"${survey?.title ?? 'Survei ini'}" akan ditutup lalu dipindahkan ke Sampah. Tautan dan QR yang sudah tersebar berhenti menerima jawaban. Survei beserta jawabannya dapat dipulihkan dari Sampah.`;

  // Satu modal untuk kedua cabang, dirender di bawah. Menyalinnya ke tiap
  // cabang berarti dua naskah yang bisa berbeda diam-diam.
  const modalHapus = (
    <ConfirmActionModal
      isOpen={showDeleteModal}
      title="Pindahkan Survei ke Sampah"
      description={deskripsiHapus}
      confirmLabel="Ya, Pindahkan ke Sampah"
      danger
      onConfirm={() => {
        setShowDeleteModal(false);
        onDelete?.(surveyId);
      }}
      onCancel={() => setShowDeleteModal(false)}
    />
  );

  if (isDraft) {
    return (
      <>
        <div className="flex flex-wrap gap-md pt-lg border-t border-border">
          <Link href={`/admin-opd/surveys/builder/${surveyId}`}>
            <button className="px-xl py-sm bg-primary text-on-primary rounded-lg text-label-md font-bold flex items-center gap-sm hover:bg-primary-hover transition-colors shadow-lg shadow-primary/10">
              <Edit2 size={18} />
              Lanjut Edit
            </button>
          </Link>
          {bolehDibagikan && <ShareSurveyButton survey={survey} className={actionButtonClass} />}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-md py-sm bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-label-md font-bold flex items-center gap-sm hover:bg-rose-100 transition-colors ml-auto"
          >
            Hapus
          </button>
        </div>

        {modalHapus}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-md pt-lg border-t border-border">
        <button className={actionButtonClass} onClick={handleCopy}>
          {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
          {copied ? 'Tersalin!' : 'Salin'}
        </button>

        {bolehDibagikan && <ShareSurveyButton survey={survey} className={actionButtonClass} />}

        <Link href={`/admin-opd/surveys/${surveyId}/responses`}>
          <button className={actionButtonClass}>
            <Eye size={18} />
            Daftar Respons Survei
          </button>
        </Link>

        <Link href={`/admin-opd/analytics?surveyId=${surveyId}`}>
          <button className={actionButtonClass}>
            <BarChart3 size={18} />
            Lihat Hasil
          </button>
        </Link>

        {/* Survei terbit kini dapat diubah & dibuang (11 September 2026). Yang
          terkunci begitu ada jawaban adalah SUSUNAN pertanyaannya, dan
          penjaganya di backend -- bukan hilangnya tombol ini, yang justru
          menyembunyikan perbaikan teks pertanyaan yang masih sah.

          Tautan bergaya tombol, TANPA <button> di dalamnya: kendali interaktif
          bersarang membuat pembaca layar mengumumkan dua kendali untuk satu
          sasaran. Tetangganya di atas masih memakai pola lama; yang baru tak
          ikut menambahnya. */}
        <Link href={`/admin-opd/surveys/builder/${surveyId}`} className={actionButtonClass}>
          <Pencil size={18} />
          Ubah
        </Link>

        <button
          className={`${actionButtonClass} text-error hover:bg-error-container ml-auto`}
          onClick={() => setShowDeleteModal(true)}
        >
          <Trash2 size={18} />
          Hapus
        </button>
      </div>

      {modalHapus}
    </>
  );
}
