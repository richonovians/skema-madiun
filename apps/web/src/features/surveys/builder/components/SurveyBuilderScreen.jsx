'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BuilderLayout from './BuilderLayout';
import BuilderToolbar from './BuilderToolbar';
import BuilderCanvas from './BuilderCanvas';
import FloatingStatus from './FloatingStatus';
import QuestionOptionsModal from './QuestionOptionsModal';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { buildPeriode } from '@/features/surveys/adapters/survey.adapter';
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
  reorderQuestions,
} from '@/features/surveys/services/surveys.api';

/**
 * Builder survei (INT-19). Persist LANGSUNG per aksi (bukan draft lokal murni
 * lalu commit sekali di akhir) -- "Tersimpan Otomatis" di toolbar memang
 * menjanjikan ini, sebelumnya cuma janji kosong (semua state lokal, tak ada
 * panggilan API sama sekali). Survei baru dibuat MALAS (lazy) saat aksi
 * pertama yang butuh surveyId (tambah unsur/pertanyaan), bukan saat halaman
 * dibuka -- biar tak ada baris survei kosong tanpa judul/periode di DB kalau
 * pengguna cuma buka lalu pergi.
 *
 * DIPINDAH dari app/admin-opd/(builder)/surveys/builder/[id]/page.jsx ke sini
 * supaya bisa dipakai DUA area sekaligus tanpa disalin: Admin OPD dan Admin
 * Kabupaten (yang berhak mengelola survei seluruh OPD -- assertOpdAccess
 * backend selalu meloloskan role kabupaten). `listHref` menentukan ke mana
 * tombol kembali & redirect setelah publikasi mengarah, supaya pengguna tak
 * pernah terlempar ke area peran yang bukan miliknya.
 *
 * SERET-LEPAS (2026-08-19): urutan pertanyaan bisa diubah dengan menyeret
 * pegangannya, dan komponen dari bilah sisi bisa dilepas langsung ke posisi yang
 * diinginkan. Keduanya persisten lewat `PATCH /surveys/:id/questions/reorder`
 * (backend sudah menyediakannya sejak awal, dan `reorderQuestions` di
 * surveys.api.js sudah ada tapi belum pernah dipanggil). Hanya berlaku saat
 * status DRAF -- `assertDraft` backend menolak di luar itu, jadi afordansi
 * seretnya sekalian dimatikan daripada mengundang gerakan yang pasti gagal.
 */
export default function SurveyBuilderScreen({ surveyId: surveyIdParam, listHref }) {
  const isNew = surveyIdParam === 'new';
  const router = useRouter();

  const [surveyId, setSurveyId] = useState(isNew ? null : surveyIdParam);
  const [title, setTitle] = useState('Survei Tanpa Judul');
  // Dropdown Tahun/Triwulan (D5+D8) selalu punya nilai valid -- default
  // triwulan berjalan saat ini, bukan string kosong (beda dari `title` yg
  // placeholder-nya memang boleh kosong sebelum diisi).
  const [periode, setPeriode] = useState(() => {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    return buildPeriode(now.getFullYear(), currentQuarter);
  });
  const [status, setStatus] = useState('DRAF');
  const [questions, setQuestions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [actionError, setActionError] = useState(null);
  // Tipe "Pilihan Ganda" butuh opsi jawaban lengkap SEBELUM dikirim (lihat
  // QuestionOptionsModal.jsx) -- errornya ditaruh di state terpisah agar tampil
  // di dalam modal, bukan di banner yang tertutup modal itu sendiri.
  const [isOptionsFormOpen, setIsOptionsFormOpen] = useState(false);
  const [optionsError, setOptionsError] = useState(null);
  // Seret-lepas (2026-08-19). State-nya dipegang di sini, BUKAN di dataTransfer,
  // karena browser melarang membaca dataTransfer saat `dragover` -- padahal
  // kanvas perlu tahu apa yang sedang diseret untuk menggambar garis sisipan.
  // { kind: 'reorder', index } | { kind: 'new', type }
  const [drag, setDrag] = useState(null);
  // Slot tujuan saat komponen "Pilihan Ganda" dilepas di tengah daftar --
  // pembuatannya tertunda sampai opsi jawaban diisi di modal.
  const [pendingInsertSlot, setPendingInsertSlot] = useState(null);

  const fetchExisting = useCallback(async () => {
    if (isNew) return null;
    const survey = await getSurveyById(surveyIdParam);
    const loadedQuestions = await getQuestions(surveyIdParam);
    return { survey, loadedQuestions };
  }, [isNew, surveyIdParam]);

  const { data: loaded, isLoading, error, refetch } = useAsync(fetchExisting);

  useEffect(() => {
    if (loaded) {
      setSurveyId(surveyIdParam);
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
    const created = await createSurvey({ title: title.trim() || 'Survei Tanpa Judul', period: periode });
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

  /** Dipicu langsung saat dropdown Tahun/Triwulan berubah (commit diskret, bukan blur). */
  const handlePeriodeCommit = async (newPeriode) => {
    setPeriode(newPeriode);
    if (!surveyId || status !== 'DRAF') return;
    setIsSaving(true);
    try {
      await updateSurvey(surveyId, { title, period: newPeriode });
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

  /**
   * Pindahkan satu pertanyaan ke SLOT SISIPAN baru (0..questions.length; lihat
   * penjelasan slot di BuilderCanvas.jsx). Optimistik lalu di-rollback bila
   * backend menolak, pola sama dengan handleDelete.
   */
  const moveQuestion = async (fromIndex, toSlot) => {
    setActionError(null);
    if (status !== 'DRAF') {
      setActionError('Survei sudah tidak berstatus draf -- urutan pertanyaan tidak dapat diubah.');
      return;
    }
    if (!surveyId) return;
    // Slot tepat sebelum atau sesudah dirinya sendiri berarti tidak berpindah.
    if (toSlot === fromIndex || toSlot === fromIndex + 1) return;

    const previous = questions;
    const next = [...questions];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toSlot > fromIndex ? toSlot - 1 : toSlot, 0, moved);

    setQuestions(next);
    setIsSaving(true);
    try {
      // ReorderQuestionsDto menuntut SELURUH id pertanyaan survei ini (bukan
      // hanya yang berpindah) dan mengembalikan daftar final yang sudah terurut.
      const updated = await reorderQuestions(
        surveyId,
        next.map((q) => q.id),
      );
      setQuestions(updated);
    } catch (err) {
      setQuestions(previous);
      setActionError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  /** Kirim satu pertanyaan kustom & sisipkan ke daftar lokal. Melempar bila gagal. */
  const createCustom = async ({ text, type, options, insertSlot = null }) => {
    assertDraftOrThrow();
    const id = await ensureSurveyExists();
    const before = questions;
    const customCount = before.filter((q) => !q.isBaku).length;
    const created = await createCustomQuestion(id, { text, type, options });
    const withTitle = { ...created, title: `Pertanyaan Kustom #${customCount + 1}` };
    const appended = [...before, withTitle];

    // Backend SELALU menaruh pertanyaan baru di akhir (`nextUrutan`), tak ada
    // parameter posisi. Jadi kalau pengguna melepasnya di tengah daftar,
    // posisinya dibetulkan menyusul lewat endpoint reorder -- dua panggilan,
    // tapi hasil akhirnya persis di tempat ia melepas.
    if (insertSlot == null || insertSlot >= appended.length - 1) {
      setQuestions(appended);
      return;
    }

    const placed = [...before];
    placed.splice(insertSlot, 0, withTitle);
    setQuestions(placed);
    try {
      const updated = await reorderQuestions(
        id,
        placed.map((q) => q.id),
      );
      setQuestions(updated);
    } catch {
      // Pertanyaannya SUDAH tersimpan di backend -- yang gagal cuma posisinya,
      // jadi jangan dilempar sebagai kegagalan pembuatan (nanti pengguna
      // menyangka harus mengulang dan jadi dobel).
      setQuestions(appended);
      setActionError(
        'Pertanyaan berhasil dibuat, tetapi posisinya gagal disimpan -- untuk sementara diletakkan di akhir daftar.',
      );
    }
  };

  const handleAddCustom = async (type = 'Skala Penilaian 1-4', insertSlot = null) => {
    setActionError(null);
    if (type === 'Pilihan Ganda') {
      // Tipe pilihan tak bisa dibuat dgn sekali klik seperti skala/teks: backend
      // WAJIB menerima >=2 opsi jawaban di permintaan POST yang sama, dan opsi
      // tak dapat ditambahkan belakangan lewat PATCH. Jadi kumpulkan dulu.
      try {
        assertDraftOrThrow();
      } catch (err) {
        setActionError(err.message);
        return;
      }
      setOptionsError(null);
      setPendingInsertSlot(insertSlot);
      setIsOptionsFormOpen(true);
      return;
    }
    setIsSaving(true);
    try {
      await createCustom({ text: 'Pertanyaan baru', type, insertSlot });
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  /** Dilepas di kanvas: pindah urutan, atau tambah pertanyaan baru di slot itu. */
  const handleDropAt = (slot) => {
    const current = drag;
    setDrag(null);
    if (!current) return;
    if (current.kind === 'reorder') {
      moveQuestion(current.index, slot);
      return;
    }
    handleAddCustom(current.type, slot);
  };

  const handleSubmitPilihan = async ({ text, options }) => {
    setOptionsError(null);
    setIsSaving(true);
    try {
      await createCustom({ text, type: 'Pilihan Ganda', options, insertSlot: pendingInsertSlot });
      setIsOptionsFormOpen(false);
      setPendingInsertSlot(null);
    } catch (err) {
      // Modal dibiarkan terbuka supaya isian tak hilang & bisa diperbaiki.
      setOptionsError(err.message);
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
      router.push(listHref);
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
    <BuilderLayout
      onAddBaku={handleAddBaku}
      onAddCustom={handleAddCustom}
      onDragTypeStart={(type) => setDrag({ kind: 'new', type })}
      onDragEnd={() => setDrag(null)}
      canDrag={status === 'DRAF'}
    >
      <BuilderToolbar
        title={title}
        onTitleChange={setTitle}
        onTitleBlur={handleTitleBlur}
        periode={periode}
        onPeriodeCommit={handlePeriodeCommit}
        status={status}
        isSaving={isSaving}
        onPublish={handlePublish}
        isPublishing={isPublishing}
        backHref={listHref}
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
        drag={drag}
        canReorder={status === 'DRAF'}
        onQuestionDragStart={(index) => setDrag({ kind: 'reorder', index })}
        onDragEnd={() => setDrag(null)}
        onDropAt={handleDropAt}
        onMove={moveQuestion}
      />
      <FloatingStatus questionCount={questions.length} />

      {isOptionsFormOpen && (
        <QuestionOptionsModal
          isSubmitting={isSaving}
          submitError={optionsError}
          onSubmit={handleSubmitPilihan}
          onCancel={() => {
            setIsOptionsFormOpen(false);
            setPendingInsertSlot(null);
          }}
        />
      )}
    </BuilderLayout>
  );
}
