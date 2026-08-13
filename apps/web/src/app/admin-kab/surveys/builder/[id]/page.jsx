'use client';

import React, { use } from 'react';
import SurveyBuilderScreen from '@/features/surveys/builder/components/SurveyBuilderScreen';

/**
 * Builder survei untuk Admin Kabupaten -- komponen yang SAMA dengan builder
 * Admin OPD (satu implementasi di features/surveys/builder), hanya berbeda
 * `listHref` supaya tombol kembali & redirect setelah publikasi tetap berada
 * di area /admin-kab, bukan melempar pengguna ke halaman Admin OPD.
 *
 * Segmen statis `builder` menang atas segmen dinamis `[id]` di App Router,
 * jadi rute ini tidak bertabrakan dengan /admin-kab/surveys/[id] (detail hasil).
 */
export default function AdminKabSurveyBuilderPage({ params }) {
  const { id } = use(params);
  return <SurveyBuilderScreen surveyId={id} listHref="/admin-kab/surveys" />;
}
