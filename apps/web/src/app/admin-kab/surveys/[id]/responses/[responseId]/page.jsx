'use client';

import React, { use } from 'react';
import SurveyResponseDetailScreen from '@/features/surveys/components/SurveyResponseDetailScreen';

/** Detail satu respons untuk Admin Kabupaten (rute BARU 2026-08-19) -- lihat catatan di ../page.jsx. */
export default function AdminKabSurveyResponseDetailPage({ params }) {
  const { id, responseId } = use(params);
  return (
    <SurveyResponseDetailScreen
      surveyId={id}
      responseId={responseId}
      basePath="/admin-kab/surveys"
      className="p-lg w-full"
    />
  );
}
