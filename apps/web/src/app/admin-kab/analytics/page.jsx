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
import { useAdminKabLayout } from '@/components/layouts/AdminKabLayoutProvider';
import { getSurveys } from '@/features/surveys/services/surveys.api';
import { getSurveyResults } from '@/features/analytics/services/ikm.api';
import {
  hitungAnalitikPengaduan,
  saringSurveiPeriode,
} from '@/features/analytics/adapters/analitik.adapter';
import { getAllComplaints } from '@/features/complaints/services/complaints.api';
import { getComplaintCategories } from '@/features/complaints/services/reference.api';
import { getOpdList } from '@/features/opd/services/opd.api';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';

const tabs = [
  { id: 'skm', label: 'Analisis SKM' },
  { id: 'complaints', label: 'Analisis Pengaduan' },
];

/**
 * Statistik & Laporan lintas OPD, untuk Admin Kabupaten (6 Oktober 2026,
 * permintaan pengguna: "tambahkan juga halaman statistik & laporan yang ada di
 * halaman opd ke halaman kabupaten").
 *
 * PENYARING TAHUN + TRIWULAN (7 Oktober 2026, permintaan pengguna: "tambahkan
 * filter di halaman admin-kab/analytics"). Milik navbar (AdminKabLayoutProvider)
 * dan dibaca di sini, persis seperti dashboard Kabupaten dan halaman Admin OPD.
 * Seluruh penyaringan di klien -- lihat analitik.adapter.js. Bakunya TAHUN
 * berjalan (bukan "semua"): pemilik produk menetapkan tahun wajib terisi.
 *
 * ANGKA PENGADUAN KINI DIHITUNG DARI PENGADUAN YANG TERSARING, bukan dari
 * `GET /statistics`. Versi pertama halaman ini memakai endpoint itu karena
 * `GET /dashboard/opd` (sumber halaman OPD) dijaga `@Roles(Role.opd)` dan
 * menjawab 403 bagi Kabupaten. Alasannya masih benar, tetapi `/statistics`
 * menghitung SEPANJANG MASA dan tak menerima parameter periode: menyandingkan
 * "Tingkat Penyelesaian" sepanjang masa di bawah penyaring "Triwulan II"
 * adalah klaim yang salah. Kabupaten dapat membaca pengaduan SELURUH OPD lewat
 * `GET /complaints`, jadi tak ada lagi yang menghalangi menghitungnya per
 * periode dengan rumus yang sama dengan halaman OPD (`hitungAnalitikPengaduan`).
 * Akibat sampingnya, dua perbedaan lama hilang dengan sendirinya: satuan
 * (jam vs hari) dan "tiket terbuka" tak perlu lagi diturunkan dari sebaran
 * status karena keduanya terhitung langsung dari barisnya.
 *
 * Yang MASIH berbeda dari halaman OPD:
 *
 *  - NAMA OPD. `GET /surveys` mengembalikan survei SELURUH OPD bagi Kabupaten
 *    dan TIDAK mengirim `opdNama` (hanya `/surveys/active` yang mengisinya).
 *    Namanya digabungkan dari `GET /opd`, pola yang sama dengan halaman daftar
 *    survei Kabupaten.
 *  - TANPA GRAFIK TREN IKM. Sumbernya di halaman OPD adalah `ikmTrend` milik
 *    SATU OPD dari `GET /dashboard/opd`; lintas OPD yang tersedia hanya
 *    `GET /statistics`, dan menempelkannya di sini belum pernah diminta.
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
  const { periode } = useAdminKabLayout();
  const labelPeriode = formatPeriodeLabel(periode);

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

  const surveyOptions = useMemo(
    () =>
      periodSurveys.map((s) => {
        const opd = namaOpd(s.opdId);
        return { value: s.id, label: opd ? `${s.title} - ${opd}` : s.title };
      }),
    [periodSurveys, namaOpd],
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

  // SEMUA pengaduan, bukan 100 terbaru: angkanya kini disaring per periode di
  // klien, dan menyaring irisan 100 baris membuat triwulan lama tampak kosong.
  const fetchPengaduan = useCallback(async () => {
    const [semua, categories] = await Promise.all([getAllComplaints(), getComplaintCategories()]);
    return {
      complaints: semua.data,
      total: semua.total,
      truncated: semua.truncated,
      categories,
    };
  }, []);
  const {
    data: pengaduanData,
    isLoading: isLoadingComplaints,
    error: complaintsError,
    refetch: refetchComplaints,
  } = useAsync(fetchPengaduan);

  const analitikPengaduan = useMemo(
    () =>
      pengaduanData
        ? hitungAnalitikPengaduan({
            complaints: pengaduanData.complaints,
            categories: pengaduanData.categories,
            periode,
          })
        : null,
    [pengaduanData, periode],
  );

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
    // Ada survei, tetapi tak satu pun pada periode ini. Dibedakan dari keadaan di
    // atas: pengguna perlu tahu bahwa PENYARINGNYA yang menyembunyikan, bukan
    // bahwa survei belum pernah dibuat.
    if (periodSurveys.length === 0) {
      return (
        <EmptyState
          icon={<BarChart3 size={48} />}
          title={`Tidak ada survei pada ${labelPeriode}`}
          description="Ubah penyaring Tahun atau Triwulan di bilah atas untuk melihat periode lain."
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
        sebaranSkor={results.sebaranSkor}
      />
    );
  };

  const tabPengaduan = () => {
    if (complaintsError) {
      return (
        <ErrorState
          title="Gagal memuat data pengaduan"
          description={complaintsError.message}
          onRetry={refetchComplaints}
        />
      );
    }
    if (isLoadingComplaints || !analitikPengaduan) {
      return <LoadingState label="Memuat data pengaduan..." />;
    }
    if (analitikPengaduan.totalComplaints === 0) {
      // Dibedakan: "tak ada pengaduan sama sekali" vs "tak ada pada periode ini".
      const adaPengaduan = pengaduanData.total > 0;
      return (
        <EmptyState
          icon={<BarChart3 size={48} />}
          title={
            adaPengaduan ? `Tidak ada pengaduan pada ${labelPeriode}` : 'Belum ada data pengaduan'
          }
          description={
            adaPengaduan
              ? 'Ubah penyaring Tahun atau Triwulan di bilah atas untuk melihat periode lain.'
              : 'Analisis pengaduan akan muncul setelah ada pengaduan masuk.'
          }
        />
      );
    }
    return (
      <div className="space-y-lg">
        {pengaduanData.truncated && (
          // Angka di bawah DIHITUNG dari baris yang dimuat, jadi bila tak seluruhnya
          // termuat ia salah, bukan sekadar kurang lengkap -- pengguna wajib tahu.
          <div
            role="note"
            className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-medium"
          >
            Hanya {pengaduanData.complaints.length.toLocaleString('id-ID')} dari{' '}
            {pengaduanData.total.toLocaleString('id-ID')} pengaduan terbaru yang dimuat, sehingga
            angka pada periode yang lebih lama bisa kurang dari sebenarnya.
          </div>
        )}
        <ComplaintAnalysisView
          categories={analitikPengaduan.categories}
          totalComplaints={analitikPengaduan.totalComplaints}
          resolutionStats={analitikPengaduan.resolutionStats}
          volumeMonthly={analitikPengaduan.volumeMonthly}
          statusDistribution={analitikPengaduan.statusDistribution}
        />
      </div>
    );
  };

  const pemilihSurvei =
    activeTab === 'skm' && periodSurveys.length > 0 ? (
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
          Halaman Admin OPD kini juga tanpa judul di badan halaman. */}
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
