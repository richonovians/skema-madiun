'use client';

import React, { useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import SurveyResponseDetailCard from '@/features/surveys/components/SurveyResponseDetailCard';
import SurveyResponseAnswers from '@/features/surveys/components/SurveyResponseAnswers';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getSurveyById, getQuestions, getSurveyResponses } from '@/features/surveys/services/surveys.api';
import { adaptSurveyResponseList } from '@/features/surveys/adapters/survey.adapter';

/**
 * Tak ada endpoint detail-per-respons di backend (GET /surveys/:id/responses
 * cuma list) -- ambil daftar (sudah include jawaban lengkap per item) lalu
 * cari client-side, drpd nambah endpoint baru utk sesuatu yg datanya sudah
 * ada di respons list manapun.
 */
export default function SurveyResponseDetailPage() {
  const params = useParams();
  const surveyId = params.id;
  const responseId = params.responseId;

  const fetchData = useCallback(async () => {
    const [survey, questions, responsesResult] = await Promise.all([
      getSurveyById(surveyId),
      getQuestions(surveyId),
      getSurveyResponses(surveyId, { limit: 100 }),
    ]);
    const questionsById = new Map(questions.map((q) => [q.id, q]));
    const responses = adaptSurveyResponseList(responsesResult.data, questionsById);
    const response = responses.find((r) => String(r.id) === String(responseId));
    if (!response) {
      throw new Error('Respons tidak ditemukan');
    }
    return { survey, response };
  }, [surveyId, responseId]);

  const { data, isLoading, error, refetch } = useAsync(fetchData);

  return (
    <div className="w-full pt-4">
      <div className="mb-lg">
        <div className="flex items-center text-label-md text-on-surface-variant mb-md">
          <Link href="/admin-opd/surveys" className="hover:text-primary transition-colors">
            Daftar Survei
          </Link>
          <ChevronRight size={16} className="mx-xs" />
          <Link
            href={`/admin-opd/surveys/${surveyId}/responses`}
            className="hover:text-primary transition-colors"
          >
            Respon Survei
          </Link>
          <ChevronRight size={16} className="mx-xs" />
          <span className="text-on-surface">Detail</span>
        </div>

        <div className="flex items-center gap-md">
          <Link href={`/admin-opd/surveys/${surveyId}/responses`}>
            <button className="p-sm hover:bg-surface-container rounded-full transition-colors">
              <ArrowLeft size={24} className="text-on-surface" />
            </button>
          </Link>
          <div>
            <h1 className="font-h2 text-h2 text-on-surface">Detail Respons</h1>
            <p className="text-body-md text-on-surface-variant mt-xs">
              Respons anonim -- SKM tidak menyimpan identitas pengisi
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Memuat detail respons..." />
      ) : error ? (
        <ErrorState title="Gagal memuat respons" description={error.message} onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          <div className="lg:col-span-1 space-y-lg">
            <SurveyResponseDetailCard
              surveyTitle={data.survey.title}
              submittedAt={data.response.submittedAt}
              averageScore={data.response.averageScore}
            />
          </div>
          <div className="lg:col-span-2">
            <SurveyResponseAnswers answers={data.response.answers} />
          </div>
        </div>
      )}
    </div>
  );
}
