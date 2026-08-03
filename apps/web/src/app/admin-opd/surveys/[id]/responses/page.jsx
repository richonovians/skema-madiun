'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SurveyResponsesHeader from '@/features/surveys/components/SurveyResponsesHeader';
import SurveyResponsesSummary from '@/features/surveys/components/SurveyResponsesSummary';
import SurveyResponsesTable from '@/features/surveys/components/SurveyResponsesTable';
import { surveyResponsesApi } from '@/features/surveys/services/surveyResponses.api';
import { DUMMY_SURVEYS } from '@/features/surveys/data/dummySurveys';

export default function SurveyResponsesPage() {
  const params = useParams();
  const surveyId = params.id;

  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Set survey info directly from DUMMY_SURVEYS
  const survey = DUMMY_SURVEYS.find(s => s.id === surveyId);
  const surveyInfo = {
    title: survey?.title || 'Judul Survei Tidak Ditemukan',
    opd: 'RSUD Daerah' // Dummy OPD since DUMMY_SURVEYS doesn't have it
  };

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        setLoading(true);
        const data = await surveyResponsesApi.getSurveyResponses(surveyId);
        setResponses(data);
      } catch (error) {
        console.error('Failed to fetch survey responses', error);
      } finally {
        setLoading(false);
      }
    };

    if (surveyId) {
      fetchResponses();
    }
  }, [surveyId]);

  const totalResponses = responses.length;
  const averageScore = totalResponses > 0 
    ? responses.reduce((acc, curr) => acc + curr.score, 0) / totalResponses 
    : 0;
  const lastResponseDate = totalResponses > 0 
    ? responses.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0].submittedAt 
    : null;

  return (
    <div className="w-full pt-4">
      <SurveyResponsesHeader 
        surveyTitle={surveyInfo?.title || ''} 
        opd={surveyInfo?.opd || ''} 
      />
      
      {!loading && (
        <>
          <SurveyResponsesSummary 
            totalResponses={totalResponses} 
            averageScore={averageScore} 
            lastResponseDate={lastResponseDate} 
          />
          
          <SurveyResponsesTable 
            surveyId={surveyId} 
            responses={responses} 
          />
        </>
      )}

      {loading && (
        <div className="flex justify-center items-center py-20 text-on-surface-variant">
          <p>Memuat daftar respons...</p>
        </div>
      )}
    </div>
  );
}
