'use client';

import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';

import AnalyticsTabs from '@/features/analytics/components/AnalyticsTabs';
import SkmAnalysisView from '@/features/analytics/components/SkmAnalysisView';
import ComplaintAnalysisView from '@/features/analytics/components/ComplaintAnalysisView';
import Dropdown from '@/components/ui/Dropdown';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { getSurveys } from '@/features/surveys/services/surveys.api';
import { getSurveyResults } from '@/features/analytics/services/ikm.api';
import { getComplaints } from '@/features/complaints/services/complaints.api';
import { getComplaintCategories } from '@/features/complaints/services/reference.api';
import { getOpdList } from '@/features/opd/services/opd.api';
import { getStatistics } from '@/features/statistics/services/statistics.api';

const tabs = [
  { id: 'skm', label: 'Analisis SKM' },
  { id: 'complaints', label: 'Analisis Pengaduan' },
];

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Statistik & Laporan lintas OPD, untuk Admin Kabupaten (6 Oktober 2026,
 * permintaan pengguna: "tambahkan juga halaman statistik & laporan yang ada di
 * halaman opd ke halaman kabupaten").
 *
 * BUKAN SALINAN HALAMAN ADMIN OPD, dan itu hasil pengukuran bukan selera.
 * `/admin-opd/analytics` mengambil angka resolusi pengaduannya dari
 * `GET /dashboard/opd`, yang dijaga `@Roles(Role.opd)`; seorang Admin Kabupaten
 * dijawab 403 dan seluruh tab Pengaduan runtuh. Sumbernya di sini
 * `GET /statistics` -- kabupaten-wide, dan memang sudah membawa angka yang sama
 * maksudnya.
 *
 * Tiga perbedaan yang lahir dari itu, semuanya dijaga uji:
 *
 *  1. SATUAN. Halaman OPD memakai `avgResponseTime` dalam JAM; statistik
 *     Kabupaten memakai `avgSlaDays` dalam HARI. `ComplaintAnalysisView`
 *     menerima jam lalu memilih sendiri label Jam/Hari, jadi konversinya
 *     dilakukan SEKALI di sini -- bukan dengan mengganti label komponennya,
 *     yang akan membuat halaman OPD ikut salah.
 *  2. TIKET TERBUKA. `GET /dashboard/opd` punya `activeTickets`; statistik
 *     Kabupaten tidak, tetapi membawa sebaran status. Yang terbuka dihitung
 *     dari status `diterima` + `diproses`.
 *  3. NAMA OPD. `GET /surveys` mengembalikan survei SELURUH OPD bagi Kabupaten
 *     dan TIDAK mengirim `opdNama` (hanya `/surveys/active` yang mengisinya).
 *     Namanya digabungkan dari `GET /opd`, pola yang sama dengan halaman daftar
 *     survei Kabupaten.
 *
 * PADDING HALAMAN DIPASANG DI SINI, dan itu bukan hiasan. `AdminKabLayout`
 * tidak memberi padding apa pun; setiap halaman `admin-kab` memasangnya
 * sendiri (`p-lg` di dashboard, opd, surveys, complaints, users, audit-logs,
 * dokumentasi-api). Versi pertama halaman ini melewatkannya, dan terukur dari
 * potretnya: judul menempel ke navbar, isi rata dengan tepi sidebar, dropdown
 * Survei menyentuh tepi kanan layar.
 *
 * Label pemilih Survei `sr-only` karena alasan yang sama dengan penyaring
 * periode di navbar: label blok di ATAS kontrol membuatnya tak sejajar dengan
 * baris tab di sebelahnya. Namanya tak dibuang -- ia satu-satunya nama
 * aksesibel kontrol itu, dan medan carinya ikut menurunkan nama dari sana.
 *
 * TANPA TOMBOL EKSPOR. Halaman OPD punya, dan backend pun mengizinkan
 * `kabupaten` pada `GET /surveys/:id/results/export` -- tetapi ekspor lintas OPD
 * belum pernah diminta maupun dirancang, dan menambahkannya diam-diam berarti
 * memutuskan sendiri apa yang boleh diunduh seorang Admin Kabupaten.
 */
export default function AnalyticsKabPage() {
  return (
    <Suspense fallback={<LoadingState label="Memuat..." />}>
      <AnalyticsKabContent />
    </Suspense>
  );
}

function AnalyticsKabContent() {
  const [activeTab, setActiveTab] = useState('skm');
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);

  const fetchSkm = useCallback(async () => {
    const [surveysRes, opdRes] = await Promise.all([
      getSurveys({ limit: 100 }),
      getOpdList({ limit: 100 }),
    ]);
    return { surveys: surveysRes.data ?? [], opd: opdRes?.data ?? [] };
  }, []);
  const { data: skmData, isLoading: isLoadingSurveys, error: surveysError } = useAsync(fetchSkm);

  const namaOpd = useMemo(() => {
    const peta = new Map((skmData?.opd ?? []).map((o) => [String(o.id), o.name]));
    return (opdId) => peta.get(String(opdId)) ?? null;
  }, [skmData]);

  // Hasil IKM hanya bermakna bagi survei yang sudah berjalan: survei Draf belum
  // pernah dibuka untuk diisi, tabelnya pasti kosong.
  const eligibleSurveys = useMemo(
    () => (skmData?.surveys ?? []).filter((s) => s.status !== 'DRAF'),
    [skmData],
  );
  const activeSurveyId = selectedSurveyId ?? eligibleSurveys[0]?.id ?? null;

  const surveyOptions = useMemo(
    () =>
      eligibleSurveys.map((s) => {
        const opd = namaOpd(s.opdId);
        return { value: s.id, label: opd ? `${s.title} - ${opd}` : s.title };
      }),
    [eligibleSurveys, namaOpd],
  );

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

  const fetchPengaduan = useCallback(async () => {
    const [complaintsRes, categories, statistik] = await Promise.all([
      getComplaints({ limit: 100 }),
      getComplaintCategories(),
      getStatistics(),
    ]);
    return { complaints: complaintsRes.data ?? [], categories, statistik };
  }, []);
  const {
    data: pengaduanData,
    isLoading: isLoadingComplaints,
    error: complaintsError,
    refetch: refetchComplaints,
  } = useAsync(fetchPengaduan);

  const analitikPengaduan = useMemo(() => {
    if (!pengaduanData) return null;
    const { complaints, categories, statistik } = pengaduanData;

    const labelKategori = Object.fromEntries(categories.map((c) => [c.kode, c.nama]));
    const hitung = {};
    for (const c of complaints) {
      const kode = c.kategori || 'lainnya';
      hitung[kode] = (hitung[kode] || 0) + 1;
    }
    const kategori = Object.entries(hitung)
      .map(([kode, count]) => ({ name: labelKategori[kode] || kode, count }))
      .sort((a, b) => b.count - a.count);

    const ember = {};
    for (const c of complaints) {
      if (!c.createdAt) continue;
      const d = new Date(c.createdAt);
      const kunci = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      if (!ember[kunci]) ember[kunci] = { month: BULAN[d.getMonth()], received: 0, completed: 0 };
      ember[kunci].received += 1;
      if (c.status === 'Selesai') ember[kunci].completed += 1;
    }
    const volumeBulanan = Object.entries(ember)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v);

    const terbuka = (statistik.complaintStatus?.status ?? [])
      .filter((s) => s.id === 'diterima' || s.id === 'diproses')
      .reduce((jumlah, s) => jumlah + s.count, 0);

    return {
      categories: kategori,
      totalComplaints: complaints.length,
      resolutionStats: {
        // HARI -> JAM. `ComplaintAnalysisView` menerima jam lalu memilih sendiri
        // label Jam/Hari; mengirimkan hari apa adanya akan menampilkan angka
        // hari di bawah tulisan "Jam".
        averageHours:
          statistik.summary?.avgSlaDays != null ? statistik.summary.avgSlaDays * 24 : null,
        completionRate: statistik.summary?.completionRate ?? null,
        openTickets: terbuka,
      },
      volumeMonthly: volumeBulanan,
    };
  }, [pengaduanData]);

  const tabSkm = () => {
    if (isLoadingSurveys) return <LoadingState label="Memuat daftar survei..." />;
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
    if (isLoadingResults || !results) return <LoadingState label="Memuat hasil SKM..." />;
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

  const tabPengaduan = () => {
    if (isLoadingComplaints) return <LoadingState label="Memuat data pengaduan..." />;
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
        categories={analitikPengaduan?.categories ?? []}
        totalComplaints={analitikPengaduan?.totalComplaints ?? 0}
        resolutionStats={analitikPengaduan?.resolutionStats ?? null}
        volumeMonthly={analitikPengaduan?.volumeMonthly ?? []}
      />
    );
  };

  const pemilihSurvei =
    activeTab === 'skm' && eligibleSurveys.length > 0 ? (
      <div className="flex items-center gap-md min-w-0 w-full sm:w-auto">
        <Dropdown
          className="min-w-0 flex-1 sm:flex-none sm:w-80"
          label="Survei"
          id="pilih-survei-kab"
          options={surveyOptions}
          value={activeSurveyId}
          onChange={setSelectedSurveyId}
          searchable
          labelTersembunyi
        />
      </div>
    ) : null;

  return (
    <div className="p-lg w-full flex flex-col">
      {/* TANPA <h2>: navbar Admin Kabupaten sudah menuliskan "Statistik &
          Laporan" (PAGE_TITLES di AdminKabNavbar), jadi judul kedua di sini
          hanya mengulangnya sebaris di bawahnya -- dan saat digulir ia
          meluncur ke belakang navbar yang `fixed` lalu terpotong separuh.
          Halaman Admin OPD TETAP memakai h2-nya: navbar di sana menampilkan
          nama OPD, bukan judul halaman. */}
      <AnalyticsTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        rightSlot={pemilihSurvei}
        kelasSticky="top-[var(--tinggi-navbar-kab)]"
      />

      <div className="flex-1 mt-4">{activeTab === 'skm' ? tabSkm() : tabPengaduan()}</div>
    </div>
  );
}
