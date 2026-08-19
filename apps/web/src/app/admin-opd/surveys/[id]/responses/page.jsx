'use client';

import React, { use } from 'react';
import SurveyResponsesScreen from '@/features/surveys/components/SurveyResponsesScreen';

/**
 * Seluruh logikanya ada di SurveyResponsesScreen karena Admin Kabupaten memakai
 * layar yang sama lewat /admin-kab/surveys/[id]/responses -- satu implementasi,
 * dua rute (pola yang sama dengan SurveyBuilderScreen).
 */
export default function SurveyResponsesPage({ params }) {
  const { id } = use(params);
  return <SurveyResponsesScreen surveyId={id} basePath="/admin-opd/surveys" />;
}
