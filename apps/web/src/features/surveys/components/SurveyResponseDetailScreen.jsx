'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import SurveyResponseDetailCard from './SurveyResponseDetailCard';
import SurveyResponseAnswers from './SurveyResponseAnswers';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getSurveyById, getQuestions, getSurveyResponses } from '@/features/surveys/services/surveys.api';
import { adaptSurveyResponseList } from '@/features/surveys/adapters/survey.adapter';

/**
 * Detail satu respons -- dipakai DUA rute (/admin-opd/... dan /admin-kab/...),
 * lihat catatan pola di SurveyResponsesScreen.jsx.
 *
 * Tak ada endpoint detail-per-respons di backend (ResponsesController hanya
 * punya GET /surveys/:surveyId/responses versi daftar) -- ambil daftarnya (sudah
 * memuat jawaban lengkap tiap item) lalu cari client-side, daripada menambah
 * endpoint baru untuk data yang sudah ikut terkirim.
 */

// Batas maksimum `limit` backend (PaginationQueryDto: @Max(100)).
const RESPONSES_LIMIT = 100;

export default function SurveyResponseDetailScreen({
  surveyId,
  responseId,
  basePath,
  className = 'w-full pt-4',
}) {
  const responsesHref = `${basePath}/${surveyId}/responses`;

  const fetchData = useCallback(async () => {
    const [survey, questions, responsesResult] = await Promise.all([
      getSurveyById(surveyId),
      getQuestions(surveyId),
      getSurveyResponses(surveyId, { limit: RESPONSES_LIMIT }),
    ]);
    const questionsById = new Map(questions.map((q) => [q.id, q]));
    const responses = adaptSurveyResponseList(responsesResult.data, questionsById);
    const response = responses.find((r) => String(r.id) === String(responseId));
    if (!response) {
      // Pesan lama cuma "Respons tidak ditemukan", padahal penyebab paling
      // sering BUKAN respons yang hilang: id respons bersifat GLOBAL (bukan
      // nomor urut per survei), sehingga URL yang memasangkan id respons milik
      // survei lain tetap terlihat wajar tapi tak akan pernah cocok.
      const total = responsesResult.meta?.pagination?.total ?? responses.length;
      throw new Error(
        total > responses.length
          ? `Respons #${responseId} tidak ada di ${responses.length} respons terbaru yang dimuat (total ${total}). Buka lewat daftar respons.`
          : `Respons #${responseId} bukan milik survei ini. Pastikan dibuka dari daftar respons survei yang benar.`,
      );
    }
    return { survey, response };
  }, [surveyId, responseId]);

  const { data, isLoading, error, refetch } = useAsync(fetchData);

  return (
    <div className={className}>
      <div className="mb-lg">
        <div className="flex items-center text-label-md text-on-surface-variant mb-md">
          <Link href={basePath} className="hover:text-primary transition-colors">
            Daftar Survei
          </Link>
          <ChevronRight size={16} className="mx-xs" />
          <Link href={responsesHref} className="hover:text-primary transition-colors">
            Respon Survei
          </Link>
          <ChevronRight size={16} className="mx-xs" />
          <span className="text-on-surface">Detail</span>
        </div>

        <div className="flex items-center gap-md">
          <Link href={responsesHref}>
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
