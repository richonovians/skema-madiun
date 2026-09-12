'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import BuilderLayout from './BuilderLayout';
import BuilderToolbar from './BuilderToolbar';
import BuilderCanvas from './BuilderCanvas';
import FloatingStatus from './FloatingStatus';
import QuestionOptionsModal from './QuestionOptionsModal';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import { useAsync } from '@/hooks/useAsync';
import { buildPeriode } from '@/features/surveys/adapters/survey.adapter';
import { scaleStepsFromOptions } from '@/features/surveys/constants/scaleLabels';
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
  updateQuestionOptions,
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
  // Jumlah jawaban yang sudah masuk. Dikirim GET /surveys/:id sejak 11
  // September 2026; sebelum itu endpoint ini tak pernah mengisinya.
  const [jumlahJawaban, setJumlahJawaban] = useState(0);
  const [konfirmasiTerbit, setKonfirmasiTerbit] = useState(false);
  // Saklarnya ada DI SINI sejak 11 September 2026. Sebelumnya hanya di
  // SurveyFormModal -- formulir milik Admin Kabupaten -- sementara setiap jalur
  // Admin OPD, membuat maupun mengubah survei, bermuara ke builder ini. Peran
  // itu jadi tak punya cara apa pun menyalakannya, dan surveinya selamanya
  // lahir tertutup.
  const [izinkanAnonim, setIzinkanAnonim] = useState(false);
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
  // Pertanyaan pilihan ganda yang opsinya sedang disunting (null = tak ada).
  const [editingQuestion, setEditingQuestion] = useState(null);

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
      setJumlahJawaban(loaded.survey.respondentsCount ?? 0);
      setIzinkanAnonim(loaded.survey.izinkanAnonim === true);
      setQuestions(loaded.loadedQuestions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  /** Buat survei sungguhan bila belum ada -- dipicu aksi pertama yg butuh id nyata. */
  const ensureSurveyExists = useCallback(async () => {
    if (surveyId) return surveyId;
    // `opdId` HANYA terisi bila superuser sedang memerankan satu OPD (2026-08-20).
    // Tanpa itu backend menolak "opdId wajib diisi" untuk peran berhak penuh --
    // akun superuser tak tertaut OPD mana pun (resolveOpdId di SurveysService).
    // Admin OPD sungguhan tak terpengaruh: backend selalu memakai OPD akunnya
    // sendiri dan mengabaikan field ini.
    // `opdId` tak dikirim lagi: SurveysService.resolveOpdId memakai OPD akun
    // bagi peran `opd`, dan area ini hanya terbuka bagi sesi berperan `opd`.
    const created = await createSurvey({
      title: title.trim() || 'Survei Tanpa Judul',
      period: periode,
      izinkanAnonim,
    });
    setSurveyId(created.id);
    setStatus(created.status);
    return created.id;
  }, [surveyId, title, periode, izinkanAnonim]);

  /**
   * Susunan pertanyaan terkunci begitu jawaban pertama masuk (aturan §2.4
   * spec), BUKAN begitu surveinya terbit. Dihitung di sini lalu diturunkan,
   * bukan diperiksa ulang di tiap komponen anak: satu sumber kebenaran, dan
   * penjaga sesungguhnya tetap di backend (assertSurveyEditable) -- yang di
   * layar ini hanya supaya pengguna tak menekan tombol yang pasti ditolak.
   *
   * Survei DITUTUP terkunci seluruhnya: hasil IKM-nya sudah terbit.
   */
  const susunanTerkunci = status === 'DITUTUP' || (status !== 'DRAF' && jumlahJawaban > 0);
  // Judul & izin pengisian berada pada tingkat 'meta': backend mengizinkannya
  // sepanjang survei belum ditutup, SEKALIPUN jawaban sudah masuk -- keduanya
  // tak mengubah arti jawaban yang sudah terkumpul. Dipisahkan dari
  // `susunanTerkunci` supaya layar ini tidak menolak apa yang backend terima.
  const metaTerkunci = status === 'DITUTUP';
  const alasanTerkunci =
    status === 'DITUTUP'
      ? 'Survei ini sudah ditutup dan hasil IKM-nya sudah terbit, jadi isinya tidak dapat diubah. Aktifkan kembali lebih dulu bila memang perlu diubah.'
      : susunanTerkunci
        ? `Susunan pertanyaan tidak dapat diubah karena survei ini sudah menerima ${jumlahJawaban} jawaban. Teks pertanyaan masih dapat diperbaiki.`
        : null;

  const assertDraftOrThrow = () => {
    if (susunanTerkunci) {
      throw new Error(alasanTerkunci);
    }
  };

  const handleTitleBlur = async () => {
    if (!surveyId || metaTerkunci) return;
    setIsSaving(true);
    try {
      await updateSurvey(surveyId, { title, period: periode, izinkanAnonim });
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  /** Dipicu langsung saat dropdown Tahun/Triwulan berubah (commit diskret, bukan blur). */
  const handlePeriodeCommit = async (newPeriode) => {
    setPeriode(newPeriode);
    if (!surveyId || susunanTerkunci) return;
    setIsSaving(true);
    try {
      await updateSurvey(surveyId, { title, period: newPeriode, izinkanAnonim });
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Disimpan SEKETIKA saat saklarnya diubah, bukan menunggu blur seperti judul:
   * kotak centang tak punya momen blur yang wajar, dan admin yang menyalakannya
   * lalu langsung berpindah halaman berhak menemukannya tetap menyala.
   *
   * Pada survei yang belum benar-benar ada di basis data, nilainya cukup
   * disimpan di state -- `ensureSurveyExists` mengirimkannya saat survei dibuat.
   */
  const handleIzinkanAnonimCommit = async (nilai) => {
    setIzinkanAnonim(nilai);
    if (!surveyId || metaTerkunci) return;
    setIsSaving(true);
    setActionError(null);
    try {
      await updateSurvey(surveyId, { title, period: periode, izinkanAnonim: nilai });
    } catch (err) {
      // Dikembalikan ke keadaan semula: saklar yang tetap menyala padahal
      // backend menolak akan membuat admin mengira survei sudah terbuka.
      setIzinkanAnonim(!nilai);
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
    if (susunanTerkunci) return;
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
    if (susunanTerkunci) {
      setActionError(alasanTerkunci);
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

  const handleEditOptions = (question) => {
    setActionError(null);
    try {
      assertDraftOrThrow();
    } catch (err) {
      setActionError(err.message);
      return;
    }
    setOptionsError(null);
    setEditingQuestion(question);
  };

  /**
   * Simpan penggantian opsi/label pertanyaan yang SUDAH ada.
   *
   * Satu panggilan `PATCH /questions/:id` saja (backend menggantinya dalam satu
   * transaksi, 2026-08-20). SEBELUMNYA jalur ini harus memutar: buat pertanyaan
   * baru -> hapus yang lama -> kembalikan urutannya, karena DTO backend tak
   * menerima `options` sama sekali. Cara lama mengganti id pertanyaan dan bisa
   * meninggalkan duplikat bila gagal separuh jalan; kini tak ada lagi keadaan
   * setengah jadi yang perlu dijelaskan ke pengguna.
   */
  const handleSubmitEditOptions = async ({ text, options }) => {
    setOptionsError(null);
    setIsSaving(true);
    const target = editingQuestion;
    try {
      assertDraftOrThrow();
      const updated = await updateQuestionOptions(target.id, {
        // Unsur baku PermenPANRB: teksnya terkunci di UI, jadi jangan sampai
        // ikut terkirim -- hanya labelnya yang boleh berubah.
        text: target.isBaku ? undefined : text,
        options,
      });
      // `title` pertanyaan tak pernah tersimpan di backend (murni kosmetik per
      // posisi) -- pertahankan yang sedang tampil supaya tak berkedip berubah.
      setQuestions((prev) =>
        prev.map((q) => (q.id === target.id ? { ...updated, title: q.title } : q)),
      );
      setEditingQuestion(null);
    } catch (err) {
      // Modal dibiarkan terbuka supaya isian tak hilang & bisa diperbaiki.
      setOptionsError(err.message);
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

  /**
   * Membuka konfirmasi, BUKAN langsung menerbitkan (11 September 2026).
   * Sesudah terbit dan jawaban pertama masuk, susunan pertanyaan terkunci --
   * jadi publikasi karena salah tekan tak dapat dibatalkan diam-diam.
   *
   * Pemeriksaan "minimal satu pertanyaan" tetap di DEPAN konfirmasi: tak ada
   * gunanya meminta persetujuan atas sesuatu yang pasti ditolak.
   */
  const handlePublishClick = () => {
    setActionError(null);
    if (questions.length === 0) {
      setActionError('Tambahkan minimal satu pertanyaan sebelum memublikasikan survei.');
      return;
    }
    setKonfirmasiTerbit(true);
  };

  const handlePublish = async () => {
    setActionError(null);
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
      canDrag={!susunanTerkunci}
      alasanTerkunci={alasanTerkunci}
    >
      {/* Judul & periode TIDAK lagi dikirim ke bilah atas (2026-08-20) --
          keduanya disunting di kartu putih pada kanvas. State-nya tetap di sini,
          jadi tak ada kendali yang terduplikasi. */}
      <BuilderToolbar
        status={status}
        isSaving={isSaving}
        onPublish={handlePublishClick}
        isPublishing={isPublishing}
        backHref={listHref}
      />
      {actionError && (
        <div className="mx-lg mt-lg p-md rounded-xl bg-error-container text-on-error-container text-sm font-semibold">
          {actionError}
        </div>
      )}

      {/* Sebab penguncian ditampilkan SEKALI di atas kanvas, bukan pada tiap
          kendali yang mati: pada survei berisi 9 unsur, kalimat yang sama akan
          terulang belasan kali di satu layar dan justru berhenti dibaca. */}
      {alasanTerkunci && (
        <div
          role="status"
          className="mx-lg mt-lg p-md rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm leading-relaxed flex items-start gap-sm"
        >
          <Lock size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{alasanTerkunci}</span>
        </div>
      )}
      <BuilderCanvas
        questions={questions}
        onDelete={handleDelete}
        onUpdate={handleUpdateLocal}
        onTextCommit={handleTextCommit}
        onAdd={() => handleAddCustom('Skala Penilaian 1-4')}
        title={title}
        onTitleChange={setTitle}
        onTitleBlur={handleTitleBlur}
        periode={periode}
        onPeriodeCommit={handlePeriodeCommit}
        izinkanAnonim={izinkanAnonim}
        onIzinkanAnonimCommit={handleIzinkanAnonimCommit}
        canEditMeta={!metaTerkunci}
        drag={drag}
        canReorder={!susunanTerkunci}
        alasanTerkunci={alasanTerkunci}
        onQuestionDragStart={(index) => setDrag({ kind: 'reorder', index })}
        onDragEnd={() => setDrag(null)}
        onDropAt={handleDropAt}
        onMove={moveQuestion}
        onEditOptions={handleEditOptions}
      />
      <FloatingStatus questionCount={questions.length} />

      {/* Gerbang publikasi. Menyebut dua hal yang paling sering luput diperiksa
          sebelum terbit -- berapa pertanyaannya dan siapa yang boleh mengisi --
          beserta akibat yang tak dapat dibatalkan diam-diam sesudahnya. */}
      <ConfirmActionModal
        isOpen={konfirmasiTerbit}
        title="Publikasikan Survei"
        description={`Survei ini akan terbit dengan ${questions.length} pertanyaan dan ${
          izinkanAnonim ? 'dapat diisi tanpa login' : 'hanya dapat diisi setelah login'
        }. Setelah terbit dan jawaban pertama masuk, susunan pertanyaan tidak dapat diubah lagi -- hanya teksnya yang masih dapat diperbaiki.`}
        confirmLabel="Ya, Publikasikan"
        onConfirm={() => {
          setKonfirmasiTerbit(false);
          handlePublish();
        }}
        onCancel={() => setKonfirmasiTerbit(false)}
      />

      {/* Satu komponen modal, dua mode & dua bentuk. Keduanya tak pernah terbuka
          bersamaan: "Ubah Opsi/Label" cuma bisa diklik dari blok pertanyaan yang
          sudah ada. Untuk skala, label awalnya diambil lewat scaleStepsFromOptions
          -- pertanyaan yang belum pernah disesuaikan tak punya opsi tersimpan,
          jadi yang tampil label BAKU SKM (yang memang sedang dilihat responden),
          bukan 4 baris kosong. */}
      {editingQuestion && (
        <QuestionOptionsModal
          mode="edit"
          variant={editingQuestion.type === 'Skala Penilaian 1-4' ? 'skala' : 'pilihan'}
          isTextLocked={editingQuestion.isBaku === true}
          initialText={editingQuestion.text}
          initialOptions={
            editingQuestion.type === 'Skala Penilaian 1-4'
              ? scaleStepsFromOptions(editingQuestion.options).map((step) => step.label)
              : (editingQuestion.options ?? []).map((o) => o.label)
          }
          isSubmitting={isSaving}
          submitError={optionsError}
          onSubmit={handleSubmitEditOptions}
          onCancel={() => {
            setEditingQuestion(null);
            setOptionsError(null);
          }}
        />
      )}

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
