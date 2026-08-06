'use client';

import React, { Suspense, useCallback, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import SurveyListHeader from '@/features/surveys/components/SurveyListHeader';
import SurveyFilter from '@/features/surveys/components/SurveyFilter';
import SurveyGrid from '@/features/surveys/components/SurveyGrid';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getActiveSurveys } from '@/features/surveys/services/surveys.api';

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
  const opdId = searchParams.get('opdId');

  const fetchSurveys = useCallback(
    () => getActiveSurveys(opdId ? { limit: 100, opdId } : { limit: 100 }),
    [opdId],
  );
  const { data: response, isLoading, error, refetch } = useAsync(fetchSurveys);

  const surveys = response?.data ?? [];
  const filterOpdName = opdId ? surveys[0]?.opd : null;

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

      <SurveyFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeCategory="Semua"
        onCategoryChange={() => {}}
      />

      {filterOpdName && (
        <div className="mb-lg flex items-center gap-2 text-sm">
          <span className="text-text-secondary">Menampilkan survei aktif untuk:</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-on-primary-container font-semibold">
            {filterOpdName}
            <Link href="/surveys" aria-label="Hapus filter instansi" className="hover:opacity-70">
              <X size={14} />
            </Link>
          </span>
        </div>
      )}

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
