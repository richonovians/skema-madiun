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
import { useAdminLayout } from '@/components/layouts/AdminLayoutProvider';
import { getSurveys } from '@/features/surveys/services/surveys.api';
import { getSurveyResults, exportSurveyResults } from '@/features/analytics/services/ikm.api';
import {
  hitungAnalitikPengaduan,
  saringSurveiPeriode,
  titikTrenTahun,
} from '@/features/analytics/adapters/analitik.adapter';
import { getAllComplaints } from '@/features/complaints/services/complaints.api';
import { getComplaintCategories } from '@/features/complaints/services/reference.api';
import { getOpdDashboard } from '@/features/dashboards/services/dashboardOpd.api';
import {
  cocokPeriode,
  formatPeriodeLabel,
  parsePeriodeFilter,
} from '@/features/surveys/adapters/survey.adapter';

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
  // PENYARING TAHUN + TRIWULAN dipegang navbar (lihat AdminLayoutProvider) dan
  // dibaca di sini, persis seperti dashboard. Seluruh penyaringan di klien:
  // lihat catatan di analitik.adapter.js.
  const { periode, setPeriode } = useAdminLayout();
  const labelPeriode = formatPeriodeLabel(periode);

  const [activeTab, setActiveTab] = useState('skm');
  // Dipicu tombol "Lihat Hasil" di AdminSurveyCardActions.jsx (INT-32) --
  // survei yg tak eligible (Draf/tak ditemukan) jatuh wajar ke ErrorState
  // via fetchResults di bawah, bukan divalidasi khusus di sini.
  //
  // Dibaca SEKALI ke state, bukan dibaca ulang dari `searchParams`: objek itu
  // dipakai sebagai dependensi `fetchSurveys`, dan identitasnya tak boleh
  // menentukan kapan daftar survei diambil ulang.
  const [tautanId] = useState(() => searchParams.get('surveyId'));
  const [selectedSurveyId, setSelectedSurveyId] = useState(tautanId);
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
  //
  // TAUTAN `?surveyId=` DISESUAIKAN DI SINI, saat datanya tiba, bukan di sebuah
  // efek. Survei yang diklik pengguna bisa berada di luar penyaring (bakunya
  // triwulan berjalan), dan menimpanya dengan survei lain berarti pengguna
  // mendarat di hasil yang tak ia minta. Yang disesuaikan PENYARINGNYA, bukan
  // daftar: ia tampak di navbar, jadi pengguna melihat mengapa survei itu yang
  // terbuka. Bentuk fungsional supaya penyaring yang SUDAH mencakup survei itu
  // -- mis. "Semua Triwulan" -- tak dipersempit tanpa perlu.
  //
  // Penyetelan terjadi sebelum `useAsync` menyimpan datanya, jadi keduanya
  // sampai ke render yang sama: tak ada render ketika daftar sudah ada tetapi
  // penyaringnya belum, yang akan memuat hasil survei LAIN lebih dulu.
  // Dependensinya hanya `tautanId` & `setPeriode` (keduanya stabil), jadi
  // berganti penyaring TIDAK mengambil ulang daftar survei.
  const fetchSurveys = useCallback(async () => {
    const hasil = await getSurveys({ limit: 100 });
    if (tautanId !== null) {
      const target = hasil.data.find((s) => s.status !== 'DRAF' && String(s.id) === tautanId);
      if (target) {
        setPeriode((saatIni) => (cocokPeriode(target.period, saatIni) ? saatIni : target.period));
      }
    }
    return hasil;
  }, [tautanId, setPeriode]);
  const { data: surveysResponse, isLoading: isLoadingSurveys, error: surveysError } =
    useAsync(fetchSurveys);

  // Hasil IKM cuma bermakna utk survei yg sudah berjalan (Aktif/Ditutup) --
  // survei Draf belum pernah dibuka utk diisi, tabelnya pasti kosong.
  const eligibleSurveys = useMemo(
    () => (surveysResponse?.data ?? []).filter((s) => s.status !== 'DRAF'),
    [surveysResponse],
  );

  // Pemilih survei hanya menawarkan survei yang periodenya lolos penyaring --
  // `cocokPeriode`, bukan `===`, supaya "Semua Triwulan" (tahun saja) berlaku.
  const periodSurveys = useMemo(
    () => saringSurveiPeriode(eligibleSurveys, periode),
    [eligibleSurveys, periode],
  );

  // Pilihan yang jatuh di luar penyaring (penyaring diganti) diganti survei
  // pertama yang lolos, bukan dibiarkan menampilkan hasil survei yang tak lagi
  // ada di daftar.
  const activeSurveyId = periodSurveys.some((s) => String(s.id) === String(selectedSurveyId))
    ? selectedSurveyId
    : (periodSurveys[0]?.id ?? null);

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
    () => periodSurveys.map((s) => ({ value: s.id, label: s.title })),
    [periodSurveys],
  );

  // Ringkasan OPD ini (`GET /dashboard/opd`): sumber TREN IKM per triwulan di tab
  // SKM. Berdiri sendiri dan GALATNYA DITELAN: kegagalan di sini tak boleh
  // meruntuhkan tab SKM yang sebenarnya sehat. Tanpanya tren tak digambar,
  // bukan diganti angka karangan.
  const fetchOpdDashboard = useCallback(() => getOpdDashboard(), []);
  const { data: opdDashboard } = useAsync(fetchOpdDashboard);

  // Tren memakai TAHUN penyaring saja -- lihat titikTrenTahun. `undefined`
  // (bukan larik kosong) selama sumbernya belum ada: kosong berarti "tak ada
  // titik pada tahun ini", dan itu klaim yang berbeda.
  const titikTren = useMemo(
    () =>
      opdDashboard
        ? titikTrenTahun(opdDashboard.ikmTrend, periode).map((p) => ({
            month: p.periode,
            nilaiIkm: p.nilaiIkm,
          }))
        : undefined,
    [opdDashboard, periode],
  );
  const tahunPenyaring = parsePeriodeFilter(periode)?.tahun;

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
    // Ada survei, tetapi tak satu pun pada periode ini. Dibedakan dari keadaan
    // di atas: pengguna di sini perlu tahu bahwa PENYARINGNYA yang menyembunyikan,
    // bukan bahwa survei belum pernah dibuat.
    if (periodSurveys.length === 0) {
      return (
        <EmptyState
          icon={<BarChart3 size={48} />}
          title={`Tidak ada survei pada ${labelPeriode}`}
          description="Ubah penyaring Tahun atau Triwulan di bilah atas untuk melihat periode lain."
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
        ikmTrend={titikTren}
        judulTren={
          tahunPenyaring
            ? `Tren Nilai IKM per Triwulan, Tahun ${tahunPenyaring}`
            : 'Tren Nilai IKM per Triwulan'
        }
      />
    );
  };

  // Toolbar sejajar tab: dropdown survei + dropdown export. Hanya bila ada survei
  // pada periode terpilih: pemilih yang kosong tak menawarkan apa pun.
  const tabRightSlot = activeTab === 'skm' && periodSurveys.length > 0 ? (
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

  // --- Tab Pengaduan ---
  // SEMUA pengaduan OPD ini, bukan 100 terbaru. Angkanya kini disaring per
  // periode di klien, dan menyaring irisan 100 baris membuat triwulan lama
  // tampak kosong atau kurang padahal datanya ada.
  const fetchComplaintData = useCallback(async () => {
    const [semua, categories] = await Promise.all([getAllComplaints(), getComplaintCategories()]);
    return {
      complaints: semua.data,
      total: semua.total,
      truncated: semua.truncated,
      categories,
    };
  }, []);
  const {
    data: complaintData,
    isLoading: isLoadingComplaints,
    error: complaintsError,
    refetch: refetchComplaints,
  } = useAsync(fetchComplaintData);

  // Seluruh angka dihitung dari pengaduan yang LOLOS penyaring, termasuk tiga
  // angka resolusi yang dulu diambil dari `GET /dashboard/opd`. Endpoint itu
  // menghitung sepanjang masa; menyandingkannya dengan daftar yang tersaring
  // akan memajang angka sepanjang masa di bawah judul triwulan tertentu.
  const complaintAnalytics = useMemo(
    () =>
      complaintData
        ? hitungAnalitikPengaduan({
            complaints: complaintData.complaints,
            categories: complaintData.categories,
            periode,
          })
        : null,
    [complaintData, periode],
  );

  const renderComplaintsTab = () => {
    if (complaintsError) {
      return (
        <ErrorState
          title="Gagal memuat data pengaduan"
          description={complaintsError.message}
          onRetry={refetchComplaints}
        />
      );
    }
    if (isLoadingComplaints || !complaintAnalytics) {
      return <LoadingState label="Memuat data pengaduan..." />;
    }
    if (complaintAnalytics.totalComplaints === 0) {
      // Dibedakan: "tak ada pengaduan sama sekali" vs "tak ada pada periode ini".
      // Pada yang kedua pengguna perlu tahu bahwa PENYARINGNYA yang menyembunyikan.
      const adaPengaduan = complaintData.total > 0;
      return (
        <EmptyState
          icon={<BarChart3 size={48} />}
          title={
            adaPengaduan ? `Tidak ada pengaduan pada ${labelPeriode}` : 'Belum ada data pengaduan'
          }
          description={
            adaPengaduan
              ? 'Ubah penyaring Tahun atau Triwulan di bilah atas untuk melihat periode lain.'
              : 'Analisis pengaduan akan muncul setelah ada pengaduan masuk ke OPD Anda.'
          }
        />
      );
    }
    return (
      <div className="space-y-lg">
        {complaintData.truncated && (
          // Angka di bawah DIHITUNG dari baris yang dimuat, jadi bila tak seluruhnya
          // termuat ia salah, bukan sekadar kurang lengkap -- dan pengguna wajib tahu.
          <div
            role="note"
            className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-medium"
          >
            Hanya {complaintData.complaints.length.toLocaleString('id-ID')} dari{' '}
            {complaintData.total.toLocaleString('id-ID')} pengaduan terbaru yang dimuat, sehingga
            angka pada periode yang lebih lama bisa kurang dari sebenarnya.
          </div>
        )}
        <ComplaintAnalysisView
          categories={complaintAnalytics.categories}
          totalComplaints={complaintAnalytics.totalComplaints}
          resolutionStats={complaintAnalytics.resolutionStats}
          volumeMonthly={complaintAnalytics.volumeMonthly}
          statusDistribution={complaintAnalytics.statusDistribution}
        />
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col">
      {/* TANPA JUDUL DI BADAN HALAMAN (7 Oktober 2026, permintaan pengguna).
          Sehari sebelumnya judul ini justru DIPERTAHANKAN saat padanannya di
          halaman Kabupaten dibuang, dengan alasan navbar Admin OPD menampilkan
          nama OPD dan bukan judul halaman. Pemilik produk menimbang lain.

          Penanda lokasinya tidak hilang: `metadata.title` di layout.jsx tetap
          "Statistik & Laporan", dan itulah yang diumumkan pembaca layar saat
          pindah halaman. Bunyinya juga sempat BERBEDA dari menu sidebar yang
          menuju ke sini ("Statistik & Laporan"); membuangnya sekaligus menutup
          satu halaman bernama dua. */}
      {exportError && (
        <div className="mb-lg p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          Gagal mengekspor: {exportError}
        </div>
      )}

      <AnalyticsTabs
        kelasSticky="top-[var(--tinggi-navbar-opd)]"
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        rightSlot={tabRightSlot}
      />

      <div className="flex-1 mt-4">
        {activeTab === 'skm' && renderSkmTab()}
        {activeTab === 'complaints' && renderComplaintsTab()}
      </div>
    </div>
  );
}
