'use client';
import React, { useCallback, useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';

import AnalyticsTabs from '@/features/analytics/components/AnalyticsTabs';
import SkmAnalysisView from '@/features/analytics/components/SkmAnalysisView';
import ComplaintAnalysisView from '@/features/analytics/components/ComplaintAnalysisView';
import Dropdown from '@/components/ui/Dropdown';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { getSurveys } from '@/features/surveys/services/surveys.api';
import { getSurveyResults, exportSurveyResults } from '@/features/analytics/services/ikm.api';

const tabs = [
  { id: 'skm', label: 'Analisis SKM' },
  { id: 'complaints', label: 'Analisis Pengaduan' },
];

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

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('skm');
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  const [exportingFormat, setExportingFormat] = useState(null);
  const [exportError, setExportError] = useState(null);

  const fetchSurveys = useCallback(() => getSurveys({ limit: 100 }), []);
  const { data: surveysResponse, isLoading: isLoadingSurveys, error: surveysError } =
    useAsync(fetchSurveys);

  // Hasil IKM cuma bermakna utk survei yg sudah berjalan (Aktif/Ditutup) --
  // survei Draf belum pernah dibuka utk diisi, tabelnya pasti kosong.
  const eligibleSurveys = useMemo(
    () => (surveysResponse?.data ?? []).filter((s) => s.status !== 'DRAF'),
    [surveysResponse],
  );

  const activeSurveyId = selectedSurveyId ?? eligibleSurveys[0]?.id ?? null;

  const fetchResults = useCallback(() => {
    if (!activeSurveyId) return Promise.resolve(null);
    return getSurveyResults(activeSurveyId);
  }, [activeSurveyId]);
  const {
    data: results,
    isLoading: isLoadingResults,
    error: resultsError,
    refetch: refetchResults,
  } = useAsync(fetchResults);

  const surveyOptions = useMemo(
    () => eligibleSurveys.map((s) => ({ value: s.id, label: s.title })),
    [eligibleSurveys],
  );

  const handleExport = async (format) => {
    if (!activeSurveyId) return;
    setExportError(null);
    setExportingFormat(format);
    try {
      const { blob, filename } = await exportSurveyResults(activeSurveyId, format);
      downloadBlobFile(blob, filename);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExportingFormat(null);
    }
  };

  const renderSkmTab = () => {
    if (isLoadingSurveys) {
      return <LoadingState label="Memuat daftar survei..." />;
    }
    if (surveysError) {
      return <ErrorState title="Gagal memuat survei" description={surveysError.message} />;
    }
    if (eligibleSurveys.length === 0) {
      return (
        <EmptyState
          icon={<BarChart3 size={48} />}
          title="Belum ada survei aktif/ditutup"
          description="Analisis SKM baru tersedia setelah survei dipublikasikan dan mulai diisi responden."
        />
      );
    }
    if (isLoadingResults || !results) {
      return <LoadingState label="Memuat hasil SKM..." />;
    }
    if (resultsError) {
      return (
        <ErrorState
          title="Gagal memuat hasil SKM"
          description={resultsError.message}
          onRetry={refetchResults}
        />
      );
    }
    return (
      <SkmAnalysisView
        metrics={results.metrics}
        serviceElements={results.serviceElements}
        periode={results.periode}
        jumlahResponden={results.jumlahResponden}
      />
    );
  };

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-lg">
        <h2 className="font-headline-md text-headline-md font-extrabold text-primary">
          Statistik & Analisis
        </h2>

        {activeTab === 'skm' && eligibleSurveys.length > 0 && (
          <div className="flex flex-wrap items-center gap-md z-40">
            <Dropdown
              options={surveyOptions}
              value={activeSurveyId}
              onChange={(val) => setSelectedSurveyId(val)}
            />
            <div className="flex items-center gap-sm border-l border-outline-variant pl-md ml-xs">
              <button
                onClick={() => handleExport('pdf')}
                disabled={exportingFormat === 'pdf'}
                className={`px-md py-sm rounded-lg flex items-center gap-xs transition-all shadow-sm font-bold text-label-md bg-red-600 hover:bg-red-700 text-white ${exportingFormat === 'pdf' ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <Download size={18} />
                <span className="hidden sm:inline">
                  {exportingFormat === 'pdf' ? 'Memproses...' : 'Export PDF'}
                </span>
              </button>
              <button
                onClick={() => handleExport('excel')}
                disabled={exportingFormat === 'excel'}
                className={`px-md py-sm rounded-lg flex items-center gap-xs transition-all shadow-sm font-bold text-label-md bg-green-600 hover:bg-green-700 text-white ${exportingFormat === 'excel' ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <Download size={18} />
                <span className="hidden sm:inline">
                  {exportingFormat === 'excel' ? 'Memproses...' : 'Export Excel'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {exportError && (
        <div className="mb-lg p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          Gagal mengekspor: {exportError}
        </div>
      )}

      <AnalyticsTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex-1 mt-4">
        {activeTab === 'skm' ? renderSkmTab() : <ComplaintAnalysisView />}
      </div>
    </div>
  );
}
