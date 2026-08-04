'use client';

import React, { useCallback, useState } from 'react';
import SurveyListHeader from '@/features/surveys/components/SurveyListHeader';
import SurveyFilter from '@/features/surveys/components/SurveyFilter';
import SurveyGrid from '@/features/surveys/components/SurveyGrid';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getActiveSurveys } from '@/features/surveys/services/surveys.api';

export default function SurveysPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSurveys = useCallback(() => getActiveSurveys({ limit: 100 }), []);
  const { data: response, isLoading, error, refetch } = useAsync(fetchSurveys);

  const surveys = response?.data ?? [];

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
