'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import BuilderLayout from '@/features/surveys/builder/components/BuilderLayout';
import BuilderToolbar from '@/features/surveys/builder/components/BuilderToolbar';
import BuilderCanvas from '@/features/surveys/builder/components/BuilderCanvas';
import FloatingStatus from '@/features/surveys/builder/components/FloatingStatus';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import {
  getSurveyById,
  getQuestions,
  createSurvey,
  updateSurvey,
  updateSurveyStatus,
  createCustomQuestion,
  applyQuestionTemplate,
  deleteQuestion,
  updateQuestionText,
} from '@/features/surveys/services/surveys.api';

/**
 * Builder survei (INT-19). Persist LANGSUNG per aksi (bukan draft lokal murni
 * lalu commit sekali di akhir) -- "Tersimpan Otomatis" di toolbar memang
 * menjanjikan ini, sebelumnya cuma janji kosong (semua state lokal, tak ada
 * panggilan API sama sekali). Survei baru dibuat MALAS (lazy) saat aksi
 * pertama yang butuh surveyId (tambah unsur/pertanyaan), bukan saat halaman
 * dibuka -- biar tak ada baris survei kosong tanpa judul/periode di DB kalau
 * pengguna cuma buka lalu pergi.
 */
export default function SurveyBuilderPage({ params }) {
  const resolvedParams = use(params);
  const isNew = resolvedParams.id === 'new';
  const router = useRouter();

  const [surveyId, setSurveyId] = useState(isNew ? null : resolvedParams.id);
  const [title, setTitle] = useState('Survei Tanpa Judul');
  const [periode, setPeriode] = useState('');
  const [status, setStatus] = useState('DRAF');
  const [questions, setQuestions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchExisting = useCallback(async () => {
    if (isNew) return null;
    const survey = await getSurveyById(resolvedParams.id);
    const loadedQuestions = await getQuestions(resolvedParams.id);
    return { survey, loadedQuestions };
  }, [isNew, resolvedParams.id]);

  const { data: loaded, isLoading, error, refetch } = useAsync(fetchExisting);

  useEffect(() => {
    if (loaded) {
      setSurveyId(resolvedParams.id);
      setTitle(loaded.survey.title);
      setPeriode(loaded.survey.period);
      setStatus(loaded.survey.status);
      setQuestions(loaded.loadedQuestions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  /** Buat survei sungguhan bila belum ada -- dipicu aksi pertama yg butuh id nyata. */
  const ensureSurveyExists = useCallback(async () => {
    if (surveyId) return surveyId;
    const trimmedPeriode = periode.trim();
    if (!trimmedPeriode) {
      throw new Error('Isi periode survei (mis. "2026" atau "TRIWULAN II - 2026") sebelum menambah pertanyaan.');
    }
    const created = await createSurvey({ title: title.trim() || 'Survei Tanpa Judul', period: trimmedPeriode });
    setSurveyId(created.id);
    setStatus(created.status);
    return created.id;
  }, [surveyId, title, periode]);

  const assertDraftOrThrow = () => {
    if (status !== 'DRAF') {
      throw new Error('Survei sudah tidak berstatus draf -- pertanyaan tidak dapat diubah lagi.');
    }
  };

  const handleTitleBlur = async () => {
    if (!surveyId || status !== 'DRAF') return;
    setIsSaving(true);
    try {
      await updateSurvey(surveyId, { title, period: periode });
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePeriodeBlur = async () => {
    if (!surveyId || status !== 'DRAF') return;
    setIsSaving(true);
    try {
      await updateSurvey(surveyId, { title, period: periode });
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setActionError(null);
    try {
      assertDraftOrThrow();
      const removed = questions.find((q) => q.id === id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setIsSaving(true);
      try {
        await deleteQuestion(id);
      } catch (err) {
        setQuestions((prev) => [...prev, removed]); // rollback optimistik
        throw err;
      } finally {
        setIsSaving(false);
      }
    } catch (err) {
      setActionError(err.message);
    }
  };

  /** Persist teks on-blur (bukan tiap keystroke) -- lihat QuestionBlock.jsx. */
  const handleTextCommit = async (id, text) => {
    if (status !== 'DRAF') return;
    setIsSaving(true);
    try {
      await updateQuestionText(id, text);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  /** Update LOKAL saja (responsif saat mengetik) -- persist sungguhan di handleTextCommit (blur). */
  const handleUpdateLocal = (id, updates) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const handleAddCustom = async (type = 'Skala Penilaian 1-4') => {
    setActionError(null);
    if (type === 'Pilihan Ganda') {
      // GAP: builder ini belum punya UI pengaturan opsi jawaban, padahal
      // backend WAJIB >=2 opsi utk tipe pilihan (CreateQuestionDto). Daripada
      // kirim payload yg pasti 400, ditolak di sini dgn pesan jelas.
      setActionError('Tipe "Pilihan Ganda" belum didukung builder ini (pengaturan opsi jawaban belum tersedia).');
      return;
    }
    setIsSaving(true);
    try {
      assertDraftOrThrow();
      const id = await ensureSurveyExists();
      const customCount = questions.filter((q) => !q.isBaku).length;
      const created = await createCustomQuestion(id, { text: 'Pertanyaan baru', type });
      setQuestions((prev) => [...prev, { ...created, title: `Pertanyaan Kustom #${customCount + 1}` }]);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBaku = async () => {
    setActionError(null);
    setIsSaving(true);
    try {
      assertDraftOrThrow();
      const id = await ensureSurveyExists();
      // Satu panggilan backend (template resmi PermenPANRB 14/2017) -- balas
      // SELURUH pertanyaan survei ini, bukan cuma yg baru ditambah.
      const allQuestions = await applyQuestionTemplate(id);
      setQuestions(allQuestions);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setActionError(null);
    if (questions.length === 0) {
      setActionError('Tambahkan minimal satu pertanyaan sebelum memublikasikan survei.');
      return;
    }
    setIsPublishing(true);
    try {
      const id = await ensureSurveyExists();
      await updateSurveyStatus(id, 'AKTIF');
      router.push('/admin-opd/surveys');
    } catch (err) {
      setActionError(err.message);
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <BuilderLayout>
        <LoadingState label="Memuat survei..." />
      </BuilderLayout>
    );
  }

  if (error) {
    return (
      <BuilderLayout>
        <ErrorState title="Gagal memuat survei" description={error.message} onRetry={refetch} />
      </BuilderLayout>
    );
  }

  return (
    <BuilderLayout onAddBaku={handleAddBaku} onAddCustom={handleAddCustom}>
      <BuilderToolbar
        title={title}
        onTitleChange={setTitle}
        onTitleBlur={handleTitleBlur}
        periode={periode}
        onPeriodeChange={setPeriode}
        onPeriodeBlur={handlePeriodeBlur}
        status={status}
        isSaving={isSaving}
        onPublish={handlePublish}
        isPublishing={isPublishing}
      />
      {actionError && (
        <div className="mx-lg mt-lg p-md rounded-xl bg-error-container text-on-error-container text-sm font-semibold">
          {actionError}
        </div>
      )}
      <BuilderCanvas
        questions={questions}
        onDelete={handleDelete}
        onUpdate={handleUpdateLocal}
        onTextCommit={handleTextCommit}
        onAdd={() => handleAddCustom('Skala Penilaian 1-4')}
        title={title}
        periode={periode}
      />
      <FloatingStatus questionCount={questions.length} />
    </BuilderLayout>
  );
}
