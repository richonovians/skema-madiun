'use client';

import React, { use } from 'react';
import SurveyResponseDetailScreen from '@/features/surveys/components/SurveyResponseDetailScreen';

/** Lihat catatan pola di SurveyResponsesScreen.jsx (satu implementasi, dua rute). */
export default function SurveyResponseDetailPage({ params }) {
  const { id, responseId } = use(params);
  return (
    <SurveyResponseDetailScreen
      surveyId={id}
      responseId={responseId}
      basePath="/admin-opd/surveys"
    />
  );
}
