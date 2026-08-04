'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import SurveyResponseDetailCard from '@/features/surveys/components/SurveyResponseDetailCard';
import SurveyResponseIdentity from '@/features/surveys/components/SurveyResponseIdentity';
import SurveyResponseAnswers from '@/features/surveys/components/SurveyResponseAnswers';
import { surveyResponsesApi } from '@/features/surveys/services/surveyResponses.api';

export default function SurveyResponseDetailPage() {
  const params = useParams();
  const surveyId = params.id;
  const responseId = params.responseId;

  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResponseDetail = async () => {
      try {
        setLoading(true);
        const data = await surveyResponsesApi.getSurveyResponseDetail(surveyId, responseId);
        setResponse(data);
      } catch (error) {
        console.error('Failed to fetch survey response detail', error);
      } finally {
        setLoading(false);
      }
    };

    if (surveyId && responseId) {
      fetchResponseDetail();
    }
  }, [surveyId, responseId]);

  if (loading) {
    return (
      <div className="w-full pt-4">
        <div className="flex justify-center items-center py-20 text-on-surface-variant">
          <p>Memuat detail respons...</p>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="w-full pt-4">
        <div className="flex flex-col justify-center items-center py-20">
          <p className="text-on-surface-variant mb-md">Respons tidak ditemukan.</p>
          <Link href={`/admin-opd/surveys/${surveyId}/responses`}>
            <button className="px-md py-sm bg-primary text-on-primary rounded-lg text-label-md font-bold">
              Kembali ke Daftar Respons
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pt-4">
      <div className="mb-lg">
        <div className="flex items-center text-label-md text-on-surface-variant mb-md">
          <Link href="/admin-opd/surveys" className="hover:text-primary transition-colors">
            Daftar Survei
          </Link>
          <ChevronRight size={16} className="mx-xs" />
          <Link href={`/admin-opd/surveys/${surveyId}/responses`} className="hover:text-primary transition-colors">
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
              Melihat respons dari {response.respondent?.name}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-1 space-y-lg">
          <SurveyResponseDetailCard response={response} />
          <SurveyResponseIdentity respondent={response.respondent} />
        </div>
        <div className="lg:col-span-2">
          <SurveyResponseAnswers 
            answers={response.answers} 
            suggestion={response.suggestion} 
          />
        </div>
      </div>
    </div>
  );
}
