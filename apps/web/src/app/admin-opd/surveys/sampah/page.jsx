'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';
import TrashedSurveyTable from '@/features/surveys/components/TrashedSurveyTable';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getTrashedSurveys, restoreSurvey } from '@/features/surveys/services/surveys.api';

/**
 * Sampah survei — Admin OPD (11 September 2026).
 *
 * TANPA tombol Hapus Permanen, dan tanpa kolom OPD. Keduanya bukan kelalaian:
 * backend menolak `DELETE /surveys/:id/purge` bagi peran ini (403), dan seluruh
 * baris di sini milik instansi yang sama sehingga satu kolom berisi nama yang
 * berulang tak menambah apa pun.
 */
export default function SampahSurveiOpdPage() {
  const fetchTrashed = useCallback(() => getTrashedSurveys({ limit: 100 }), []);
  const { data: response, isLoading, error, refetch } = useAsync(fetchTrashed);
  const rows = response?.data ?? [];

  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(null);

  const handleRestore = async (row) => {
    setActionError(null);
    setNotice(null);
    setBusyId(row.id);
    try {
      await restoreSurvey(row.id);
      setNotice(
        `"${row.title}" dipulihkan. Statusnya tidak berubah, jadi survei tetap tertutup sampai Anda mengaktifkannya kembali.`,
      );
      refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return <LoadingState label="Memuat isi Sampah..." />;
  }

  if (error) {
    return <ErrorState title="Gagal memuat Sampah" description={error.message} onRetry={refetch} />;
  }

  return (
    // Padding horizontalnya datang dari AdminLayout (<main> sudah ber-px),
    // berbeda dari area Kabupaten yang menyerahkannya ke tiap halaman.
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-md">
        {/* Nilai TERSURAT, bukan `max-w-2xl`: di apps/web skala `max-w-*`
            dipetakan ke token spacing, sehingga `max-w-2xl` menyusut menjadi
            ~189px dan paragrafnya patah tiap dua kata. Diukur di peramban. */}
        <div className="max-w-[46rem]">
          <h1 className="font-h1 text-h1 text-text-primary tracking-tight">Sampah Survei</h1>
          <p className="text-text-secondary font-body mt-2">
            Survei yang Anda hapus disimpan di sini beserta jawabannya, dan dapat dipulihkan kapan
            saja.
          </p>
        </div>
        <Link
          href="/admin-opd/surveys"
          className="shrink-0 whitespace-nowrap px-lg py-sm border border-outline rounded-lg text-sm font-bold flex items-center gap-sm hover:bg-surface-container-low transition-colors"
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

      {/* Disebut TERSURAT, bukan dibiarkan sebagai tombol yang hilang: pengguna
          yang mencari cara mengosongkan Sampah perlu tahu ke mana harus
          meminta, bukan mengira fiturnya rusak. */}
      <div className="p-md rounded-xl bg-surface-container-low border border-border text-sm text-text-secondary flex items-start gap-sm">
        <Info size={16} className="shrink-0 mt-0.5 text-primary" aria-hidden="true" />
        <span>
          Survei di Sampah tidak terhapus dengan sendirinya. Untuk menghapusnya permanen, hubungi
          Admin Kabupaten.
        </span>
      </div>

      <div className="bg-surface rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <TrashedSurveyTable rows={rows} onRestore={handleRestore} busyId={busyId} />
      </div>
    </div>
  );
}
