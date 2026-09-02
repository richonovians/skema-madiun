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
import useKeepInViewport from '@/hooks/useKeepInViewport';
import { getSurveys } from '@/features/surveys/services/surveys.api';
import { getSurveyResults, exportSurveyResults } from '@/features/analytics/services/ikm.api';
import { getComplaints } from '@/features/complaints/services/complaints.api';
import { getActingOpd } from '@/features/authentication/services/authStorage';
import { getComplaintCategories } from '@/features/complaints/services/reference.api';
import { getOpdDashboard } from '@/features/dashboards/services/dashboardOpd.api';

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

  // Pada lanskap ponsel menu ini terukur `bawah=467` dari layar 390px tinggi --
  // pilihan terakhir di luar jangkauan. Lihat useKeepInViewport.
  const exportPanelRef = useRef(null);
  useKeepInViewport(exportPanelRef, isExportOpen);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dipersempit ke OPD yang diperankan superuser bila ada (lihat
  // app/admin-opd/surveys/page.jsx) supaya pemilih survei di halaman ini tak
  // menawarkan survei OPD lain.
  const fetchSurveys = useCallback(() => {
    const actingOpd = getActingOpd();
    return getSurveys({ limit: 100, ...(actingOpd ? { opdId: actingOpd.id } : {}) });
  }, []);
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
    // `min-w-0` + `flex-1` (31 Agustus 2026): tanpa keduanya, judul survei yang
    // panjang membuat baris ini tak bisa menyusut sama sekali dan seluruh
    // halaman melebar. `Dropdown` sudah punya `truncate`, tapi ia baru bekerja
    // kalau leluhurnya diizinkan lebih sempit dari isinya -- lihat catatan
    // lengkap di AnalyticsTabs.jsx.
    <div className="flex items-center gap-md min-w-0 w-full sm:w-auto">
      <Dropdown
        className="min-w-0 flex-1 sm:flex-none sm:w-64"
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
          <div
            ref={exportPanelRef}
            className="absolute top-full right-0 mt-2 w-full min-w-[140px] max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200"
          >
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

  // --- Tab Pengaduan: fetch data saat tab aktif ---
  const fetchComplaintData = useCallback(async () => {
    const actingOpd = getActingOpd();
    const [complaintsRes, categories, dashboard] = await Promise.all([
      getComplaints({ limit: 100, ...(actingOpd ? { opdId: actingOpd.id } : {}) }),
      getComplaintCategories(),
      getOpdDashboard(actingOpd?.id),
    ]);
    return { complaints: complaintsRes.data, categories, dashboard };
  }, []);
  const {
    data: complaintData,
    isLoading: isLoadingComplaints,
    error: complaintsError,
    refetch: refetchComplaints,
  } = useAsync(fetchComplaintData);

  // Distribusi kategori pengaduan (client-side groupBy)
  const complaintAnalytics = useMemo(() => {
    if (!complaintData) return null;
    const { complaints, categories, dashboard } = complaintData;

    // Buat map kode -> nama dari reference
    const categoryLabelMap = Object.fromEntries(
      categories.map((c) => [c.kode, c.nama]),
    );

    // GroupBy kategori
    const catCounts = {};
    for (const c of complaints) {
      const kode = c.kategori || 'lainnya';
      catCounts[kode] = (catCounts[kode] || 0) + 1;
    }
    const categoryDistribution = Object.entries(catCounts)
      .map(([kode, count]) => ({ name: categoryLabelMap[kode] || kode, count }))
      .sort((a, b) => b.count - a.count);

    // Volume bulanan (groupBy bulan dari createdAt)
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthBuckets = {};
    for (const c of complaints) {
      if (!c.createdAt) continue;
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      if (!monthBuckets[key]) {
        monthBuckets[key] = { month: MONTH_NAMES[d.getMonth()], received: 0, completed: 0 };
      }
      monthBuckets[key].received += 1;
      if (c.status === 'Selesai') {
        monthBuckets[key].completed += 1;
      }
    }
    const volumeMonthly = Object.entries(monthBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // 6 bulan terakhir
      .map(([, v]) => v);

    // Stats resolusi dari dashboard OPD
    const resolutionStats = {
      averageHours: dashboard.summary.avgResponseTime !== 'Belum ada data'
        ? parseFloat(dashboard.summary.avgResponseTime)
        : null,
      completionRate: dashboard.summary.completionRate,
      openTickets: dashboard.summary.activeTickets,
    };

    return {
      categories: categoryDistribution,
      totalComplaints: complaints.length,
      resolutionStats,
      volumeMonthly,
    };
  }, [complaintData]);

  const renderComplaintsTab = () => {
    if (isLoadingComplaints) {
      return <LoadingState label="Memuat data pengaduan..." />;
    }
    if (complaintsError) {
      return (
        <ErrorState
          title="Gagal memuat data pengaduan"
          description={complaintsError.message}
          onRetry={refetchComplaints}
        />
      );
    }
    return (
      <ComplaintAnalysisView
        categories={complaintAnalytics?.categories ?? []}
        totalComplaints={complaintAnalytics?.totalComplaints ?? 0}
        resolutionStats={complaintAnalytics?.resolutionStats ?? null}
        volumeMonthly={complaintAnalytics?.volumeMonthly ?? []}
      />
    );
  };



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
        {activeTab === 'skm' ? renderSkmTab() : renderComplaintsTab()}
      </div>
    </div>
  );
}
