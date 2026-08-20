'use client';

import React, { useCallback, useMemo } from 'react';
import SurveyResponsesHeader from './SurveyResponsesHeader';
import SurveyResponsesSummary from './SurveyResponsesSummary';
import SurveyResponsesTable from './SurveyResponsesTable';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getSurveyById, getQuestions, getSurveyResponses } from '@/features/surveys/services/surveys.api';
import { adaptSurveyResponseList } from '@/features/surveys/adapters/survey.adapter';

/**
 * Daftar respons satu survei -- dipakai DUA rute: /admin-opd/surveys/[id]/responses
 * dan /admin-kab/surveys/[id]/responses. Pola sama dengan SurveyBuilderScreen
 * (satu implementasi, dua rute) supaya Admin Kabupaten tak perlu berpindah ke
 * area peran lain hanya untuk membaca respons. Backend memang mengizinkan:
 * `GET /surveys/:id/responses` ber-@Roles(kabupaten, opd) dan assertOpdAccess
 * selalu meloloskan kabupaten.
 *
 * `basePath` = akar area ('/admin-opd/surveys' | '/admin-kab/surveys'); dari situ
 * seluruh tautan diturunkan, jadi tak ada '/admin-opd' yang tertanam keras.
 *
 * `className` diserahkan pemanggil karena padding kedua area BEDA: <main>
 * admin-opd sudah ber-`p-4 md:p-lg`, sedangkan <main> admin-kab tidak punya
 * padding horizontal sama sekali (lihat AdminLayout.jsx vs AdminKabLayout.jsx).
 */

// Batas maksimum `limit` backend (PaginationQueryDto: @Max(100)) -- bukan angka pilihan sendiri.
const RESPONSES_LIMIT = 100;

export default function SurveyResponsesScreen({ surveyId, basePath, className = 'w-full pt-4' }) {
  const fetchData = useCallback(async () => {
    const [survey, questions, responsesResult] = await Promise.all([
      getSurveyById(surveyId),
      getQuestions(surveyId),
      getSurveyResponses(surveyId, { limit: RESPONSES_LIMIT }),
    ]);
    const questionsById = new Map(questions.map((q) => [q.id, q]));
    const responses = adaptSurveyResponseList(responsesResult.data, questionsById);
    return {
      survey,
      responses,
      // Total sesungguhnya dari backend, BUKAN `responses.length`: yang kedua
      // berhenti di 100 dan akan melaporkan jumlah responden lebih kecil dari
      // kenyataan begitu survei melewati batas itu.
      total: responsesResult.meta?.pagination?.total ?? responses.length,
    };
  }, [surveyId]);

  const { data, isLoading, error, refetch } = useAsync(fetchData);

  const summary = useMemo(() => {
    const responses = data?.responses ?? [];
    const withScore = responses.filter((r) => r.averageScore != null);
    const averageScore =
      withScore.length > 0
        ? withScore.reduce((sum, r) => sum + r.averageScore, 0) / withScore.length
        : 0;
    const lastResponseDate =
      responses.length > 0
        ? [...responses].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0]
            .submittedAt
        : null;
    return { total: data?.total ?? 0, averageScore, lastResponseDate };
  }, [data]);

  const isTruncated = (data?.total ?? 0) > (data?.responses.length ?? 0);

  return (
    <div className={className}>
      <SurveyResponsesHeader
        surveyTitle={data?.survey.title ?? ''}
        period={data?.survey.period ?? ''}
        listHref={basePath}
      />

      {isLoading ? (
        <LoadingState label="Memuat daftar respons..." />
      ) : error ? (
        <ErrorState title="Gagal memuat respons" description={error.message} onRetry={refetch} />
      ) : (
        <>
          <SurveyResponsesSummary
            totalResponses={summary.total}
            averageScore={summary.averageScore}
            lastResponseDate={summary.lastResponseDate}
          />

          {/* Jujur soal batas: tabel di bawah cuma memuat 100 respons pertama,
              dan "Nilai Rata-Rata" di ringkasan pun dihitung dari 100 itu saja.
              Tanpa keterangan ini, angkanya terbaca seolah mencakup semuanya. */}
          {isTruncated && (
            <div className="mb-lg p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
              Menampilkan {data.responses.length} respons terbaru dari total {data.total}. Nilai
              rata-rata pada ringkasan dihitung dari yang ditampilkan saja.
            </div>
          )}

          <SurveyResponsesTable
            surveyId={surveyId}
            responses={data.responses}
            basePath={basePath}
          />
        </>
      )}
    </div>
  );
}
