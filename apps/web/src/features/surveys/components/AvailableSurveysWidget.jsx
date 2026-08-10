'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import SurveyCard from './SurveyCard';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { getActiveSurveys } from '../services/surveys.api';

/**
 * Widget survei aktif di dashboard warga -- sebelumnya 100% hardcoded (2 kartu
 * palsu), kini fetch GET /surveys/active sungguhan. Tampilkan maks 2 terbaru.
 */
export default function AvailableSurveysWidget() {
  const fetchSurveys = useCallback(() => getActiveSurveys({ limit: 2 }), []);
  const { data: response, isLoading, error } = useAsync(fetchSurveys);

  const surveys = response?.data ?? [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">Survei Kepuasan Tersedia</h2>
        <Link href="/surveys" className="text-primary text-sm font-medium hover:underline inline-flex items-center min-h-[44px]">
          Lihat Semua Survei
        </Link>
      </div>

      {isLoading && <LoadingState label="Memuat survei aktif..." />}

      {error && (
        <ErrorState
          title="Gagal memuat survei"
          description={error.message}
        />
      )}

      {!isLoading && !error && surveys.length === 0 && (
        <EmptyState
          icon={<ClipboardList size={48} />}
          title="Tidak ada survei aktif saat ini"
          description="Survei baru akan muncul di sini ketika OPD membuka periode survei kepuasan masyarakat."
        />
      )}

      {!isLoading && !error && surveys.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {surveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              id={survey.id}
              title={survey.title}
              opd={survey.opd}
              deadline={null}
              questionsCount={survey.questionsCount}
              status={survey.status}
            />
          ))}
        </div>
      )}
    </section>
  );
}
