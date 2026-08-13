'use client';

import React, { useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import SurveyDetailHeader from '@/features/surveys/components/admin-kab/SurveyDetailHeader';
import SurveyResultExportMenu from '@/features/surveys/components/admin-kab/SurveyResultExportMenu';
import SkmAnalysisView from '@/features/analytics/components/SkmAnalysisView';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getSurveyById } from '@/features/surveys/services/surveys.api';
import { getOpdById } from '@/features/opd/services/opd.api';
import { getSurveyResults, exportSurveyResults } from '@/features/analytics/services/ikm.api';

function downloadBlobFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Detail satu survei untuk Admin Kabupaten -- READ-ONLY lintas OPD. Hasil IKM
 * memakai SkmAnalysisView yang sama dengan halaman Analitik Admin OPD (sumber
 * GET /surveys/:id/results, boleh diakses Kabupaten) supaya angka yang dilihat
 * Kabupaten identik dengan yang dilihat OPD pemilik, bukan hitungan terpisah.
 *
 * Nilai IKM & jumlah responden diambil dari hasil IKM, BUKAN dari
 * getSurveyById: backend hanya mengisi `respondentsCount`/`nilaiIkm` pada
 * GET /surveys (daftar), tidak pada detail (lihat SurveyEntity backend).
 */
export default function AdminKabSurveyDetailPage() {
  const params = useParams();
  const surveyId = params.id;

  const [exportingFormat, setExportingFormat] = useState(null);
  const [exportError, setExportError] = useState(null);

  const fetchDetail = useCallback(async () => {
    const survey = await getSurveyById(surveyId);
    // Nama OPD & hasil IKM tak saling bergantung -- ambil paralel. `opdId` baru
    // diketahui setelah detail survei ada, jadi tahap ini menyusul.
    const [opd, results] = await Promise.all([
      survey.opdId != null ? getOpdById(survey.opdId) : Promise.resolve(null),
      getSurveyResults(surveyId),
    ]);
    return { survey, opdName: opd?.name ?? '', results };
  }, [surveyId]);

  const { data, isLoading, error, refetch } = useAsync(fetchDetail);

  const handleExport = async (format) => {
    setExportError(null);
    setExportingFormat(format);
    try {
      const { blob, filename } = await exportSurveyResults(surveyId, format);
      downloadBlobFile(blob, filename);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExportingFormat(null);
    }
  };

  if (isLoading) {
    return <LoadingState label="Memuat detail survei..." />;
  }

  if (error) {
    return <ErrorState title="Gagal memuat detail survei" description={error.message} onRetry={refetch} />;
  }

  const { survey, opdName, results } = data;

  return (
    <div className="p-lg w-full">
      <SurveyDetailHeader
        title={survey.title}
        opdName={opdName}
        period={survey.period}
        status={survey.status}
        actionSlot={
          <SurveyResultExportMenu onExport={handleExport} exportingFormat={exportingFormat} />
        }
      />

      {exportError && (
        <div className="mb-lg p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          Gagal mengekspor: {exportError}
        </div>
      )}

      <SkmAnalysisView
        metrics={results.metrics}
        serviceElements={results.serviceElements}
        periode={results.periode}
        jumlahResponden={results.jumlahResponden}
      />
    </div>
  );
}
