'use client';

import React, { use } from 'react';
import SurveyResponsesScreen from '@/features/surveys/components/SurveyResponsesScreen';

/**
 * Daftar respons lintas OPD untuk Admin Kabupaten (rute BARU 2026-08-19).
 * Sebelumnya Admin Kabupaten tak punya jalan apa pun ke respons per pengisi:
 * rutenya hanya ada di /admin-opd/**, sehingga URL sepadan di area ini 404 --
 * itulah "404 detail respon survei" yang dilaporkan.
 *
 * `className` diberikan eksplisit karena <main> layout admin-kab TIDAK punya
 * padding horizontal (beda dengan admin-opd), sama seperti halaman admin-kab lain.
 */
export default function AdminKabSurveyResponsesPage({ params }) {
  const { id } = use(params);
  return (
    <SurveyResponsesScreen
      surveyId={id}
      basePath="/admin-kab/surveys"
      className="p-lg w-full"
    />
  );
}
