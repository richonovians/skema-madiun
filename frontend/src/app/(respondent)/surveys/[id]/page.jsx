'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import SurveyProgress from '@/features/surveys/components/SurveyProgress';
import QuestionCard from '@/features/surveys/components/QuestionCard';
import SurveyNavigation from '@/features/surveys/components/SurveyNavigation';
import SurveyCompletion from '@/features/surveys/components/SurveyCompletion';
import useSurveyStore from '@/features/surveys/store/useSurveyStore';

// Dummy data for development. Ready to be replaced with API call.
const dummySurveyData = {
  id: '1',
  title: 'Evaluasi Mutu Pelayanan Rawat Jalan RSUD Caruban',
  opd: 'Dinas Kesehatan',
  questions: [
    {
      id: 'q1',
      text: 'Bagaimana kesesuaian persyaratan pelayanan dengan jenis pelayanannya?',
      type: 'scale_1_to_4',
    },
    {
      id: 'q2',
      text: 'Bagaimana kemudahan prosedur pelayanan di unit ini?',
      type: 'scale_1_to_4',
    },
    {
      id: 'q3',
      text: 'Bagaimana kecepatan waktu penyerahan dokumen hasil spesifikasi jenis pelayanan di unit ini?',
      type: 'scale_1_to_4',
    },
    {
      id: 'q4',
      text: 'Bagaimana kewajaran biaya/tarif dalam pelayanan ini?',
      type: 'scale_1_to_4',
    },
    {
      id: 'q5',
      text: 'Bagaimana kesesuaian produk pelayanan antara yang tercantum dalam standar pelayanan dengan hasil yang diberikan?',
      type: 'scale_1_to_4',
    }
  ]
};

export default function SurveyWizardPage() {
  const { id } = useParams(); // URL parameter (survey id)
  const { isCompleted, initSurvey, resetSurvey } = useSurveyStore();

  useEffect(() => {
    // 1. In a real scenario, fetch data using `id`:
    //    fetch(`/api/v1/surveys/${id}`).then(...)
    
    // 2. Initialize store with data
    initSurvey(dummySurveyData);

    // 3. Cleanup on unmount
    return () => {
      resetSurvey();
    };
  }, [id, initSurvey, resetSurvey]);

  return (
    <main className="max-w-container-max mx-auto py-12 px-6 min-h-[calc(100vh-64px)]">
      {isCompleted ? (
        <SurveyCompletion />
      ) : (
        <div className="w-full max-w-[800px] mx-auto">
          <SurveyProgress />
          
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-lg md:p-xl border border-outline-variant/20">
            <QuestionCard />
            <SurveyNavigation />
          </div>
        </div>
      )}
    </main>
  );
}
