'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import SurveyOverviewCards from '@/features/surveys/components/admin-kab/SurveyOverviewCards';
import SurveyFilterBar from '@/features/surveys/components/admin-kab/SurveyFilterBar';
import SurveyMonitoringTable from '@/features/surveys/components/admin-kab/SurveyMonitoringTable';
import SurveyFormModal from '@/features/surveys/components/admin-kab/SurveyFormModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { downloadTablePdf } from '@/utils/pdf';
import { KOLOM_MONITORING_SURVEI } from '@/utils/pdfKolom';
import { SURVEY_STATUS_LABEL } from '@/utils/enumLabels';
import { useAsync } from '@/hooks/useAsync';
import {
  getSurveys,
  createSurvey,
  updateSurvey,
  updateSurveyStatus,
  deleteSurvey,
  duplicateSurvey,
} from '@/features/surveys/services/surveys.api';
import { getOpdList } from '@/features/opd/services/opd.api';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';

const ITEMS_PER_PAGE = 10;
// Kabupaten melihat SEMUA survei lintas OPD (opdWhereFilter kosong utk role
// kabupaten, lihat SurveysService.findAll backend) -- ambil satu halaman besar
// lalu filter+paginasi di klien, backend belum punya pencarian judul bebas teks
// maupun filter OPD pada GET /surveys (pola sama halaman Pengaduan Kabupaten).
const FETCH_LIMIT = 100;

/**
 * Naskah dialog konfirmasi per aksi baris (dipakai ConfirmDialog.jsx) --
 * dikumpulkan di satu tempat supaya tiap aksi punya peringatan yang jujur
 * sesuai akibatnya di backend, bukan satu pesan generik.
 */
const CONFIRM_COPY = {
  publish: {
    title: 'Publikasikan survei ini?',
    description: (survey) =>
      `"${survey.title}" akan langsung dapat diisi responden. Setelah dipublikasikan, judul, periode, dan daftar pertanyaannya tidak dapat diubah lagi.`,
    confirmLabel: 'Ya, Publikasikan',
    tone: 'primary',
  },
  close: {
    title: 'Tutup periode survei ini?',
    description: (survey) =>
      `Periode "${survey.title}" akan ditutup dan hasil IKM saat ini disimpan sebagai snapshot. Responden tidak dapat mengisi selama survei ditutup. Survei masih dapat diaktifkan kembali setelahnya.`,
    confirmLabel: 'Ya, Tutup Periode',
    tone: 'danger',
  },
  reopen: {
    title: 'Aktifkan kembali survei ini?',
    description: (survey) =>
      `"${survey.title}" akan kembali berstatus aktif dan dapat diisi responden lagi. Jawaban yang sudah masuk tetap tersimpan. Catatan: snapshot hasil IKM dari penutupan sebelumnya tidak terhapus, sehingga survei ini sementara terhitung dua kali pada rekap lintas-OPD sampai periodenya ditutup lagi.`,
    confirmLabel: 'Ya, Aktifkan Kembali',
    tone: 'primary',
  },
  duplicate: {
    title: 'Salin survei ini?',
    description: (survey) =>
      `Salinan "${survey.title}" akan dibuat sebagai draf baru pada ${survey.opdName} beserta seluruh pertanyaannya. Jawaban responden tidak ikut disalin.`,
    confirmLabel: 'Ya, Salin',
    tone: 'primary',
  },
  delete: {
    title: 'Pindahkan survei ini ke Sampah?',
    description: (survey) => pesanHapus(survey),
    confirmLabel: 'Ya, Pindahkan ke Sampah',
    tone: 'danger',
  },
};

/**
 * Bunyi dialog buang mengikuti KEADAAN barisnya, bukan satu kalimat untuk
 * semua. Yang perlu diketahui sebelum menekan tombol memang berbeda: survei
 * aktif akan ditutup, dan survei yang sudah dijawab membawa serta jawabannya.
 *
 * BERUBAH ARTI 11 September 2026: dahulu pesan ini mengumumkan penghapusan
 * permanen, yang kini tidak lagi benar -- barisnya pindah ke Sampah.
 */
function pesanHapus(survey) {
  const bagian = [`"${survey.title}" akan dipindahkan ke Sampah dan dapat dipulihkan kembali.`];
  if (survey.status === 'AKTIF') {
    bagian.push(
      'Survei ini ditutup lebih dulu, sehingga tautan dan QR yang sudah tersebar berhenti menerima jawaban.',
    );
  }
  if (survey.respondentsCount > 0) {
    bagian.push(
      `${survey.respondentsCount} jawaban yang sudah masuk ikut terbawa ke Sampah.`,
    );
  }
  return bagian.join(' ');
}

function downloadBlob(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminKabSurveysPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ search: '', opd: '', status: '', periode: '' });
  const [currentPage, setCurrentPage] = useState(1);

  // `survey` = baris yang sedang diubah (null = mode buat). Referensinya diambil
  // dari daftar hasil fetch (stabil selama modal terbuka) -- SurveyFormModal
  // memuat ulang nilai awal setiap kali `initialValues` berubah, jadi jangan
  // kirim objek literal baru tiap render.
  const [formModal, setFormModal] = useState({ isOpen: false, mode: 'create', survey: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Aksi baris (publikasi/tutup/aktifkan kembali/hapus) -- satu baris terkunci
  // selagi diproses. `confirmAction` = { type: 'publish'|'close'|'reopen'|'delete',
  // survey } bila dialog konfirmasi sedang terbuka.
  const [confirmAction, setConfirmAction] = useState(null);
  const [busySurveyId, setBusySurveyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // GET /surveys tak mengirim nama OPD (cuma `opdId`, lihat SurveyEntity
  // backend) -- nama diambil dari GET /opd lalu disandingkan di sini, sumber
  // yang sama dengan halaman Manajemen OPD.
  const fetchData = useCallback(async () => {
    const [surveysResult, opdResult] = await Promise.all([
      getSurveys({ limit: FETCH_LIMIT }),
      getOpdList({ limit: FETCH_LIMIT }),
    ]);
    return { surveys: surveysResult.data, opdList: opdResult.data };
  }, []);

  const { data, isLoading, error, refetch } = useAsync(fetchData);

  const surveys = useMemo(() => {
    const opdNameById = new Map((data?.opdList ?? []).map((opd) => [String(opd.id), opd.name]));
    return (data?.surveys ?? []).map((survey) => ({
      ...survey,
      opdName: opdNameById.get(String(survey.opdId)) ?? '',
    }));
  }, [data]);

  const opdOptions = useMemo(() => {
    const seen = new Map();
    surveys.forEach((survey) => {
      if (survey.opdId != null && survey.opdName) {
        seen.set(String(survey.opdId), survey.opdName);
      }
    });
    return [
      { value: '', label: 'Semua OPD' },
      ...Array.from(seen.entries())
        .sort(([, a], [, b]) => a.localeCompare(b))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [surveys]);

  // Periode kanonik "{tahun}-Q{1-4}" terurut leksikografis (lihat periode.util.ts
  // backend) -- diurutkan menurun supaya periode terbaru di atas.
  const periodeOptions = useMemo(() => {
    const unique = [...new Set(surveys.map((s) => s.period).filter(Boolean))].sort().reverse();
    return [
      { value: '', label: 'Semua Periode' },
      ...unique.map((periode) => ({ value: periode, label: formatPeriodeLabel(periode) })),
    ];
  }, [surveys]);

  // Opsi OPD untuk FORM buat-survei = SELURUH OPD (bukan cuma yang sudah punya
  // survei spt `opdOptions` di atas). Hanya OPD aktif ditawarkan: OPD adalah
  // cache read-only dari Helpdesk (D10) yang menandai instansi nonaktif, dan
  // membuat survei baru untuk instansi nonaktif hampir pasti keliru -- backend
  // sendiri cuma memeriksa OPD-nya ada (assertOpdExists).
  const opdFormOptions = useMemo(() => {
    const active = (data?.opdList ?? []).filter((opd) => opd.status === 'ACTIVE');
    return [
      { value: '', label: 'Pilih OPD penyelenggara' },
      ...active
        .map((opd) => ({ value: String(opd.id), label: opd.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [data]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({ search: '', opd: '', status: '', periode: '' });
    setCurrentPage(1);
  };

  const openCreateForm = () => {
    setSubmitError(null);
    setFormModal({ isOpen: true, mode: 'create', survey: null });
  };

  const openEditForm = (survey) => {
    setSubmitError(null);
    setFormModal({ isOpen: true, mode: 'edit', survey });
  };

  const closeForm = () => {
    setFormModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleFormSubmit = async (values) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setActionError(null);
    try {
      if (formModal.mode === 'edit') {
        await updateSurvey(formModal.survey.id, values);
        setActionNotice(`Survei "${values.title}" berhasil diperbarui.`);
        closeForm();
        await refetch();
        return;
      }

      // Survei baru selalu lahir sebagai draf TANPA pertanyaan -- tak ada
      // gunanya kembali ke daftar dulu, jadi langsung ke builder milik area
      // /admin-kab (bukan builder /admin-opd, biar tak berpindah area peran).
      const created = await createSurvey(values);
      closeForm();
      router.push(`/admin-kab/surveys/builder/${created.id}`);
    } catch (err) {
      // Galat aturan backend (mis. survei bukan draf lagi, judul >100 karakter,
      // OPD tak ditemukan) ditampilkan DI DALAM modal supaya isian tak hilang.
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Aksi baris yang tak butuh form: publikasi, tutup, aktifkan kembali, hapus. */
  const runRowAction = async (surveyId, action, successMessage) => {
    setBusySurveyId(surveyId);
    setActionError(null);
    setActionNotice(null);
    try {
      await action();
      setActionNotice(successMessage);
      await refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusySurveyId(null);
    }
  };

  /** Jalankan aksi yang sudah dikonfirmasi lewat ConfirmDialog. */
  const handleConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, survey } = confirmAction;
    setConfirmAction(null);

    if (type === 'publish') {
      await runRowAction(
        survey.id,
        () => updateSurveyStatus(survey.id, 'AKTIF'),
        'Survei berhasil dipublikasikan dan kini dapat diisi responden.',
      );
      return;
    }
    if (type === 'close') {
      await runRowAction(
        survey.id,
        () => updateSurveyStatus(survey.id, 'DITUTUP'),
        'Periode survei ditutup. Hasil IKM final sudah disimpan sebagai snapshot.',
      );
      return;
    }
    if (type === 'reopen') {
      // DITUTUP -> AKTIF, transisi yang memang diizinkan ALLOWED_TRANSITIONS
      // backend. Endpoint & payloadnya identik dengan publikasi draf ('aktif'),
      // hanya konfirmasi & pesannya yang berbeda karena akibatnya berbeda.
      await runRowAction(
        survey.id,
        () => updateSurveyStatus(survey.id, 'AKTIF'),
        'Survei diaktifkan kembali dan sudah dapat diisi responden.',
      );
      return;
    }
    if (type === 'duplicate') {
      await runRowAction(
        survey.id,
        () => duplicateSurvey(survey.id),
        'Salinan survei dibuat sebagai draf baru. Judulnya diberi akhiran "(Salinan)".',
      );
      return;
    }
    await runRowAction(
      survey.id,
      () => deleteSurvey(survey.id),
      'Survei dipindahkan ke Sampah. Anda dapat memulihkannya dari halaman Sampah.',
    );
  };

  const filteredSurveys = useMemo(() => {
    const q = filters.search.toLowerCase();
    return surveys.filter((survey) => {
      const matchSearch =
        !q ||
        survey.title.toLowerCase().includes(q) ||
        survey.opdName.toLowerCase().includes(q);

      const matchOpd = !filters.opd || String(survey.opdId) === filters.opd;
      const matchStatus = !filters.status || survey.status === filters.status;
      const matchPeriode = !filters.periode || survey.period === filters.periode;

      return matchSearch && matchOpd && matchStatus && matchPeriode;
    });
  }, [surveys, filters]);

  const totalItems = filteredSurveys.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  const paginatedSurveys = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSurveys.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSurveys, currentPage]);

  const handleExportExcel = () => {
    const headers = ['JUDUL SURVEI', 'OPD', 'PERIODE', 'STATUS', 'RESPONDEN', 'NILAI IKM'];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filteredSurveys.map((survey) =>
      [
        survey.title,
        survey.opdName,
        formatPeriodeLabel(survey.period),
        survey.status,
        survey.status === 'DRAF' ? '-' : survey.respondentsCount,
        survey.ikmScore != null ? survey.ikmScore.toFixed(2) : '-',
      ]
        .map(escape)
        .join(','),
    );
    downloadBlob([headers.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8;', 'monitoring_survei.csv');
  };

  /**
    * SEBELUMNYA `window.print()`, yang mencetak seluruh halaman berikut sidebar,
    * tab, dan tombol -- bukan laporannya. Kini tabel sungguhan berisi baris yang
    * SEDANG tersaring, sama persis dengan ekspor Excel di atas.
    */
  const handleExportPDF = async () => {
    await downloadTablePdf({
      filename: 'monitoring-survei.pdf',
      title: 'Monitoring Survei Kepuasan Masyarakat',
      subtitle: `${filteredSurveys.length} survei`,
      columns: KOLOM_MONITORING_SURVEI,
      rows: filteredSurveys.map((survey) => [
        survey.title,
        survey.opdName,
        formatPeriodeLabel(survey.period),
        SURVEY_STATUS_LABEL[survey.status] ?? survey.status,
        survey.status === 'DRAF' ? '-' : survey.respondentsCount,
        survey.ikmScore != null ? survey.ikmScore.toFixed(2).replace('.', ',') : '-',
      ]),
      emptyLabel: 'Tidak ada survei yang cocok dengan filter saat ini.',
    });
  };

  if (isLoading) {
    return <LoadingState label="Memuat data survei..." />;
  }

  if (error) {
    return <ErrorState title="Gagal memuat data survei" description={error.message} onRetry={refetch} />;
  }

  return (
    <div className="p-lg w-full space-y-6">
      <div className="flex justify-end">
        {/* Tanpa tautan ini halaman Sampah tak punya pintu masuk sama sekali --
            survei yang terlanjur dibuang akan terlihat seperti hilang. */}
        <Link
          href="/admin-kab/surveys/sampah"
          className="px-lg py-sm border border-outline rounded-lg text-sm font-bold flex items-center gap-sm hover:bg-surface-container-low transition-colors"
        >
          <Trash2 size={16} />
          Sampah
        </Link>
      </div>

      <SurveyOverviewCards surveys={surveys} />

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
          {actionNotice}
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          Aksi gagal: {actionError}
        </div>
      )}

      <div className="bg-surface rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <SurveyFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          onCreateSurvey={openCreateForm}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
          opdOptions={opdOptions}
          periodeOptions={periodeOptions}
        />

        <SurveyMonitoringTable
          surveys={paginatedSurveys}
          onEdit={openEditForm}
          onPublish={(survey) => setConfirmAction({ type: 'publish', survey })}
          onClose={(survey) => setConfirmAction({ type: 'close', survey })}
          onReopen={(survey) => setConfirmAction({ type: 'reopen', survey })}
          onDelete={(survey) => setConfirmAction({ type: 'delete', survey })}
          onDuplicate={(survey) => setConfirmAction({ type: 'duplicate', survey })}
          busySurveyId={busySurveyId}
        />

        <div className="border-t border-slate-200 p-md">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            itemName="survei"
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!confirmAction}
        title={confirmAction ? CONFIRM_COPY[confirmAction.type].title : ''}
        description={
          confirmAction ? CONFIRM_COPY[confirmAction.type].description(confirmAction.survey) : ''
        }
        confirmLabel={confirmAction ? CONFIRM_COPY[confirmAction.type].confirmLabel : ''}
        tone={confirmAction ? CONFIRM_COPY[confirmAction.type].tone : 'danger'}
        onConfirm={handleConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Dirender hanya saat terbuka -- modal memuat nilai awalnya dari
          `initialValues` saat mount, jadi setiap kali dibuka isiannya segar. */}
      {formModal.isOpen && (
        <SurveyFormModal
          mode={formModal.mode}
          initialValues={formModal.survey}
          opdName={formModal.survey?.opdName ?? ''}
          opdOptions={opdFormOptions}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
        />
      )}
    </div>
  );
}
