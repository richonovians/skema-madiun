'use client';
import React, { Suspense, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart3, Download, FileText, ChevronDown } from 'lucide-react';

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
  return (
    <Suspense fallback={<LoadingState label="Memuat..." />}>
      <AnalyticsPageContent />
    </Suspense>
  );
}

function AnalyticsPageContent() {
  const searchParams = useSearchParams();
  // Dipicu tombol "Lihat Hasil" di AdminSurveyCardActions.jsx (INT-32) --
  // survei yg tak eligible (Draf/tak ditemukan) jatuh wajar ke ErrorState
  // via fetchResults di bawah, bukan divalidasi khusus di sini.
  const [activeTab, setActiveTab] = useState('skm');
  const [selectedSurveyId, setSelectedSurveyId] = useState(() => searchParams.get('surveyId'));
  const [exportingFormat, setExportingFormat] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setIsExportOpen(false);
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

  // Toolbar sejajar tab: dropdown survei + dropdown export
  const tabRightSlot = activeTab === 'skm' && eligibleSurveys.length > 0 ? (
    <div className="flex items-center gap-md">
      <Dropdown
        options={surveyOptions}
        value={activeSurveyId}
        onChange={(val) => setSelectedSurveyId(val)}
      />
      {/* Dropdown Export bergaya ComplaintListFilter */}
      <div className="relative" ref={exportRef}>
        <button
          onClick={() => setIsExportOpen(!isExportOpen)}
          disabled={!!exportingFormat}
          className={`flex items-center justify-between gap-2 min-w-[140px] min-h-[44px] px-md py-sm rounded-lg font-medium text-body-md transition-all bg-surface border border-border text-text-primary hover:bg-surface-container shadow-sm group ${exportingFormat ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-2">
            <Download size={18} className="text-text-secondary group-hover:text-primary" />
            <span className="truncate">
              {exportingFormat ? 'Memproses...' : 'Ekspor'}
            </span>
          </div>
          <ChevronDown
            size={20}
            className={`flex-shrink-0 transition-all duration-300 ${isExportOpen ? 'rotate-180' : ''} text-text-secondary group-hover:text-primary`}
          />
        </button>

        {isExportOpen && (
          <div className="absolute top-full right-0 mt-2 w-full min-w-[140px] bg-white rounded-xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
            <ul className="py-1">
              <li>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Download size={16} />
                  <span>CSV</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Download size={16} />
                  <span>Excel</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  <FileText size={16} />
                  <span>PDF</span>
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="w-full flex flex-col">
      {/* Judul halaman */}
      <h2 className="font-headline-md text-headline-md font-extrabold text-primary mb-4">
        Statistik &amp; Analisis
      </h2>

      {exportError && (
        <div className="mb-lg p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          Gagal mengekspor: {exportError}
        </div>
      )}

      <AnalyticsTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        rightSlot={tabRightSlot}
      />

      <div className="flex-1 mt-4">
        {activeTab === 'skm' ? renderSkmTab() : <ComplaintAnalysisView />}
      </div>
    </div>
  );
}
