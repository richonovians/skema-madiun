'use client';

import React, { useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import SurveyResponsesHeader from '@/features/surveys/components/SurveyResponsesHeader';
import SurveyResponsesSummary from '@/features/surveys/components/SurveyResponsesSummary';
import SurveyResponsesTable from '@/features/surveys/components/SurveyResponsesTable';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getSurveyById, getQuestions, getSurveyResponses } from '@/features/surveys/services/surveys.api';
import { adaptSurveyResponseList } from '@/features/surveys/adapters/survey.adapter';

export default function SurveyResponsesPage() {
  const params = useParams();
  const surveyId = params.id;

  const fetchData = useCallback(async () => {
    const [survey, questions, responsesResult] = await Promise.all([
      getSurveyById(surveyId),
      getQuestions(surveyId),
      getSurveyResponses(surveyId, { limit: 100 }),
    ]);
    const questionsById = new Map(questions.map((q) => [q.id, q]));
    const responses = adaptSurveyResponseList(responsesResult.data, questionsById);
    return { survey, responses };
  }, [surveyId]);

  const { data, isLoading, error, refetch } = useAsync(fetchData);

  const summary = useMemo(() => {
    const responses = data?.responses ?? [];
    const total = responses.length;
    const withScore = responses.filter((r) => r.averageScore != null);
    const averageScore =
      withScore.length > 0
        ? withScore.reduce((sum, r) => sum + r.averageScore, 0) / withScore.length
        : 0;
    const lastResponseDate =
      total > 0
        ? [...responses].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0]
            .submittedAt
        : null;
    return { total, averageScore, lastResponseDate };
  }, [data]);

  return (
    <div className="w-full pt-4">
      <SurveyResponsesHeader surveyTitle={data?.survey.title ?? ''} period={data?.survey.period ?? ''} />

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

          <SurveyResponsesTable surveyId={surveyId} responses={data.responses} />
        </>
      )}
    </div>
  );
}
