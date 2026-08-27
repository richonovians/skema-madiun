'use client';

import React, { Suspense, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SurveyListHeader from '@/features/surveys/components/SurveyListHeader';
import SurveyFilter from '@/features/surveys/components/SurveyFilter';
import SurveyGrid from '@/features/surveys/components/SurveyGrid';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getActiveSurveys } from '@/features/surveys/services/surveys.api';
import { getOpdList } from '@/features/opd/services/opd.api';

/**
 * `useSearchParams()` (dipakai `SurveysPageContent`) WAJIB dibungkus
 * `<Suspense>` -- Next.js App Router menolak build produksi tanpa ini
 * ("should be wrapped in a suspense boundary"), dev server sempat lolos
 * krn tak melakukan prerender yg sama.
 */
export default function SurveysPage() {
  return (
    <Suspense fallback={<LoadingState label="Memuat daftar survei..." />}>
      <SurveysPageContent />
    </Suspense>
  );
}

function SurveysPageContent() {
  const [searchTerm, setSearchTerm] = useState('');
  // `?opdId=` (2026-08-06): datang dari SurveyForm.jsx di beranda (pilih
  // instansi -> lihat survei aktifnya) -- server sudah mendukung filter ini
  // sejak INT-45 (GET /surveys/active?opdId=), sebelumnya tak pernah dibaca
  // sama sekali di halaman ini.
  const searchParams = useSearchParams();
  const router = useRouter();
  const opdId = searchParams.get('opdId');

  const fetchSurveys = useCallback(async () => {
    if (!opdId) {
      const response = await getActiveSurveys({ limit: 100 });
      return { surveys: response.data ?? [], opdName: null };
    }

    // Nama instansi TIDAK boleh diambil dari `surveys[0]` saja (bug sebelumnya):
    // bila instansi terpilih belum punya survei aktif, daftarnya kosong sehingga
    // chip filter tak pernah muncul -- warga melihat halaman kosong tanpa tahu
    // penyaring sedang aktif, dan tanpa tombol untuk melepasnya.
    //
    // Namanya diambil dari `GET /opd` (terbuka untuk semua peran terautentikasi),
    // BUKAN `GET /opd/:id` yang dibatasi @Roles(kabupaten, opd) -- peran responden
    // akan kena 403 di sana.
    const [response, opdList] = await Promise.all([
      getActiveSurveys({ limit: 100, opdId }),
      getOpdList({ limit: 100 }),
    ]);
    const surveys = response.data ?? [];
    const match = (opdList?.data ?? []).find((opd) => String(opd.id) === String(opdId));
    return { surveys, opdName: match?.name ?? surveys[0]?.opd ?? null };
  }, [opdId]);

  const { data, isLoading, error, refetch } = useAsync(fetchSurveys);

  const surveys = data?.surveys ?? [];
  const filterOpdName = data?.opdName ?? null;

  // Menghapus penyaring = kembali ke /surveys tanpa query. `router.push` (bukan
  // <Link>) supaya tombol "Semua" dan tombol silang memakai jalan yang sama.
  const clearOpdFilter = () => router.push('/surveys');

  // Kategori (INT-17 GAP): backend tak punya taksonomi kategori survei sama
  // sekali -- filter kategori dihapus dari halaman ini (bukan disembunyikan
  // diam-diam) supaya tak menampilkan pilihan yang selalu berujung 0 hasil.
  const filteredSurveys = surveys.filter((survey) => {
    const q = searchTerm.toLowerCase();
    return survey.title.toLowerCase().includes(q) || (survey.opd ?? '').toLowerCase().includes(q);
  });

  return (
    <main className="max-w-container-max mx-auto py-8 sm:py-12 px-4 sm:px-6">
      <SurveyListHeader />

      {/* `activeCategory` mencerminkan ADA-TIDAKNYA penyaring instansi: selama
          satu instansi dipilih, "Semua" tampil non-aktif supaya terlihat bahwa
          menekannya akan mengubah sesuatu. */}
      <SurveyFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeCategory={opdId ? '' : 'Semua'}
        onCategoryChange={clearOpdFilter}
        opdFilterName={filterOpdName}
        onClearOpdFilter={clearOpdFilter}
      />

      {isLoading ? (
        <LoadingState label="Memuat daftar survei..." />
      ) : error ? (
        <ErrorState title="Gagal memuat survei" description={error.message} onRetry={refetch} />
      ) : (
        <SurveyGrid surveys={filteredSurveys} />
      )}
    </main>
  );
}
