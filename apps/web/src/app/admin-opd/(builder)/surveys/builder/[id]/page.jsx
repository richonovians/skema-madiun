'use client';

import React, { use } from 'react';
import SurveyBuilderScreen from '@/features/surveys/builder/components/SurveyBuilderScreen';

/**
 * Builder survei milik Admin OPD. Seluruh logikanya ada di SurveyBuilderScreen
 * (features/surveys/builder) karena Admin Kabupaten memakai builder yang sama
 * lewat rute /admin-kab/surveys/builder/[id] -- satu implementasi, dua rute.
 */
export default function SurveyBuilderPage({ params }) {
  const { id } = use(params);
  return <SurveyBuilderScreen surveyId={id} listHref="/admin-opd/surveys" />;
}
