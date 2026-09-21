'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TrashedSurveyTable from '@/features/surveys/components/TrashedSurveyTable';
import ConfirmTypeToDeleteModal from '@/components/ui/ConfirmTypeToDeleteModal';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import {
  getTrashedSurveys,
  restoreSurvey,
  purgeSurvey,
} from '@/features/surveys/services/surveys.api';

/**
 * Sampah survei — Admin Kabupaten (11 September 2026).
 *
 * Peran inilah satu-satunya yang boleh MEMUSNAHKAN, dan itu keputusan yang
 * disengaja: tindakannya tak dapat dibatalkan dan ikut membawa jawaban
 * responden. Penjaganya tetap di backend (`@Roles` pada DELETE
 * /surveys/:id/purge); tombol di sini hanya mengikuti.
 */
export default function SampahSurveiKabPage() {
  const fetchTrashed = useCallback(() => getTrashedSurveys({ limit: 100 }), []);
  const { data: response, isLoading, error, refetch } = useAsync(fetchTrashed);
  const rows = response?.data ?? [];

  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(null);
  // Baris yang sedang dikonfirmasi penghapusan permanennya, atau `null`.
  const [akanDihapusPermanen, setAkanDihapusPermanen] = useState(null);

  const jalankan = async (row, aksi, pesanSukses) => {
    setActionError(null);
    setNotice(null);
    setBusyId(row.id);
    try {
      await aksi();
      setNotice(pesanSukses);
      // Daftar dimuat ulang: tanpa ini baris yang sudah dipulihkan atau
      // dihapus permanen tetap terpampang, dan pengguna menekannya lagi.
      refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = (row) =>
    jalankan(
      row,
      () => restoreSurvey(row.id),
      `"${row.title}" dipulihkan. Statusnya tidak berubah, jadi survei tetap tertutup sampai Anda mengaktifkannya kembali.`,
    );

  const handlePurge = (row) => {
    setAkanDihapusPermanen(null);
    return jalankan(
      row,
      () => purgeSurvey(row.id),
      `"${row.title}" dihapus permanen beserta seluruh jawabannya.`,
    );
  };

  if (isLoading) {
    return <LoadingState label="Memuat isi Sampah..." />;
  }

  if (error) {
    return <ErrorState title="Gagal memuat Sampah" description={error.message} onRetry={refetch} />;
  }

  return (
    <div className="p-lg w-full space-y-6">
      {/* `p-lg` DISEDIAKAN HALAMAN, bukan layout: AdminKabLayout sengaja tak
          memberi padding apa pun (lihat <main> di AdminKabLayout.jsx), sehingga
          halaman yang lupa menyebutnya menempel rapat ke tepi kiri layar. */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-md">
        {/* Nilai TERSURAT, bukan `max-w-2xl`: di apps/web skala `max-w-*`
            dipetakan ke token spacing, sehingga `max-w-2xl` menyusut menjadi
            ~189px dan paragrafnya patah tiap dua kata. Diukur di peramban. */}
        <div className="max-w-[46rem]">
          <h1 className="font-h1 text-h1 text-text-primary tracking-tight">Sampah Survei</h1>
          <p className="text-text-secondary font-body mt-2">
            Survei yang dihapus disimpan di sini beserta jawabannya. Pulihkan kapan saja, atau hapus
            permanen bila memang sudah tidak diperlukan.
          </p>
        </div>
        <Link
          href="/admin-kab/surveys"
          className="shrink-0 whitespace-nowrap px-lg py-sm min-h-[44px] border border-outline rounded-lg text-sm font-bold flex items-center gap-sm hover:bg-surface-container-low transition-colors"
        >
          <ArrowLeft size={16} />
          Kembali ke Daftar Survei
        </Link>
      </div>

      {notice && (
        <div className="p-md rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
          {notice}
        </div>
      )}
      {actionError && (
        <div className="p-md rounded-xl bg-error-container text-on-error-container text-sm font-semibold">
          {actionError}
        </div>
      )}

      <div className="bg-surface rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <TrashedSurveyTable
          rows={rows}
          onRestore={handleRestore}
          onPurge={setAkanDihapusPermanen}
          tampilkanKolomOpd
          tampilkanHapusPermanen
          busyId={busyId}
        />
      </div>

      {/* Ketik-ulang judul, bukan satu klik: menghapus permanen jawaban responden tak
          punya jalan kembali. Angka jawabannya disebut karena hanya halaman ini
          yang tahu berapa yang ikut hilang. */}
      <ConfirmTypeToDeleteModal
        isOpen={akanDihapusPermanen != null}
        judul="Hapus Survei Permanen"
        deskripsi={
          akanDihapusPermanen
            ? `${akanDihapusPermanen.responsesCount ?? 0} jawaban responden akan ikut hilang selamanya, beserta seluruh pertanyaan dan hasil IKM survei ini. Tindakan ini tidak dapat dibatalkan.`
            : ''
        }
        teksKonfirmasi={akanDihapusPermanen?.title ?? ''}
        onConfirm={() => handlePurge(akanDihapusPermanen)}
        onCancel={() => setAkanDihapusPermanen(null)}
      />
    </div>
  );
}
