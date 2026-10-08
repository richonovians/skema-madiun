'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import BuilderLayout from './BuilderLayout';
import BuilderToolbar from './BuilderToolbar';
import BuilderCanvas from './BuilderCanvas';
import FloatingStatus from './FloatingStatus';
import QuestionOptionsModal from './QuestionOptionsModal';
import PemilihJenisSurvei from './PemilihJenisSurvei';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAsync } from '@/hooks/useAsync';
import { buildPeriode } from '@/features/surveys/adapters/survey.adapter';
import { scaleStepsFromOptions } from '@/features/surveys/constants/scaleLabels';
import {
  getSurveyById,
  getSurveys,
  getQuestions,
  createSurvey,
  updateSurvey,
  updateSurveyStatus,
  createCustomQuestion,
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
  const [isUtama, setIsUtama] = useState(false);
  /** Survei utama lain yang akan diturunkan, atau null bila tak ada konfirmasi tertunda. */
  const [konfirmasiUtama, setKonfirmasiUtama] = useState(null);
  const [questions, setQuestions] = useState([]);
  // Jenis survei BARU (8 Oktober 2026). `null` = belum dipilih; builder survei baru
  // menampilkan pemilih jenis lebih dulu karena jenis tak dapat diganti sesudah
  // dibuat. Survei yang sudah ada tak memakainya (jenisnya sudah di backend).
  const [jenis, setJenis] = useState(null);
  // Jenis yang baru DIKLIK dan menunggu konfirmasi (8 Oktober 2026). Jenis tak dapat
  // diganti sesudah survei dibuat, dan memilih SKM langsung membuat survei, jadi
  // klik pertama hanya membuka dialog -- tak ada yang dibuat sebelum "Ya".
  const [jenisTertunda, setJenisTertunda] = useState(null);
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
      setIsUtama(loaded.survey.isUtama === true);
      setQuestions(loaded.loadedQuestions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  /** Buat survei sungguhan bila belum ada -- dipicu aksi pertama yg butuh id nyata. */
  const ensureSurveyExists = useCallback(
    async (jenisDipilih = jenis) => {
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
        jenis: jenisDipilih,
        izinkanAnonim,
      });
      setSurveyId(created.id);
      setStatus(created.status);
      return created.id;
    },
    [surveyId, title, periode, izinkanAnonim, jenis],
  );

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
        ? `Susunan pertanyaan tidak dapat diubah karena survei ini sudah menerima ${jumlahJawaban} jawaban. Teks pertanyaan dan label skala 1-4 masih dapat diperbaiki.`
        : null;

  const assertDraftOrThrow = () => {
    if (susunanTerkunci) {
      throw new Error(alasanTerkunci);
    }
  };

  /**
   * Memilih jenis pada survei baru. SKM dibuat SEKARANG: kesembilan unsurnya
   * lahir bersama survei di backend, jadi kanvas baru berarti bila surveinya
   * sudah ada. Survei umum tetap malas (dibuat pada aksi pertama) seperti
   * sebelum jenis ada.
   */
  const handlePilihJenis = async (jenisDipilih) => {
    setActionError(null);
    if (jenisDipilih === 'umum') {
      setJenis('umum');
      return;
    }
    setIsSaving(true);
    try {
      const id = await ensureSurveyExists(jenisDipilih);
      setQuestions(await getQuestions(id));
      setJenis(jenisDipilih);
    } catch (err) {
      // Pemilih dibiarkan tampil dengan galatnya supaya bisa dicoba lagi.
      setActionError(err.message);
    } finally {
      setIsSaving(false);
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

  /**
   * Survei utama OPD (15 September 2026). Menyalakannya MELEPAS survei utama
   * OPD yang sebelumnya -- backend yang melakukannya dalam satu transaksi, jadi
   * tak pernah ada saat OPD ini punya dua, maupun saat ia tak punya satu pun.
   *
   * Pola pengembaliannya sama dengan saklar anonim di atas: saklar yang tetap
   * menyala padahal backend menolak membuat admin mengira OPD-nya sudah punya
   * survei utama, dan ia baru tahu keliru ketika warga mengadu lalu mendarat di
   * daftar alih-alih di kuesionernya.
   */
  /** Mengirim perubahan status utama. Dipakai jalur langsung maupun sesudah konfirmasi. */
  const kirimIsUtama = async (nilai) => {
    setIsUtama(nilai);
    if (!surveyId) return;
    setIsSaving(true);
    setActionError(null);
    try {
      await updateSurvey(surveyId, { title, period: periode, isUtama: nilai });
    } catch (err) {
      setIsUtama(!nilai);
      setActionError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * KONFIRMASI SEBELUM MENGGANTI SURVEI UTAMA (4 Oktober 2026, permintaan
   * pengguna).
   *
   * Backend menurunkan survei utama lama dalam transaksi yang sama, tanpa
   * memberi tahu siapa pun. Yang hilang bukan hanya lencana di kartu: tombol
   * "Lanjut Isi Survei" pada halaman sukses pengaduan menuju survei utama OPD,
   * jadi menggantinya mengalihkan setiap warga yang baru mengadu ke kuesioner
   * yang berbeda.
   *
   * HANYA saat MENYALAKAN, dan hanya bila memang ada yang akan diturunkan.
   * Mematikan saklar tak menyentuh survei lain, dan OPD yang belum punya utama
   * tidak sedang mengganti apa pun. Modal yang muncul pada kejadian tak
   * berbahaya melatih orang menekan "Ya" tanpa membaca.
   *
   * Kegagalan memuat daftar TIDAK memblokir: bila daftarnya tak terbaca, lebih
   * baik melanjutkan tanpa konfirmasi daripada mengunci admin dari sakelarnya
   * sendiri. Penegakan "paling banyak satu" tetap di indeks unik parsial
   * backend, dan itulah yang menjaga kebenarannya.
   */
  const handleIsUtamaCommit = async (nilai) => {
    if (nilai !== true || !surveyId) {
      await kirimIsUtama(nilai);
      return;
    }

    setIsUtama(true);
    let utamaLain = null;
    try {
      const { data } = await getSurveys({ limit: 100 });
      utamaLain = (data ?? []).find((s) => s.isUtama && Number(s.id) !== Number(surveyId)) ?? null;
    } catch {
      utamaLain = null;
    }

    if (!utamaLain) {
      await kirimIsUtama(true);
      return;
    }
    setKonfirmasiUtama(utamaLain);
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
    // Hanya survei DITUTUP yang menolak perbaikan kalimat. Memeriksa
    // `susunanTerkunci` di sini diam-diam membuang perbaikan teks pada survei
    // terbit yang sudah dijawab, padahal backend mengizinkannya (aturan `teks`)
    // dan banner di atas kanvas menjanjikannya.
    if (metaTerkunci) return;
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
        'Pertanyaan berhasil dibuat, tetapi posisinya gagal disimpan. Untuk sementara pertanyaan diletakkan di akhir daftar.',
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

  /**
   * Label SKALA mengikuti aturan teks (terkunci hanya saat survei DITUTUP);
   * opsi PILIHAN GANDA mengikuti aturan susunan. Lihat QuestionsService.update.
   */
  const assertBolehUbahOpsi = (question) => {
    if (question.type === 'Skala Penilaian 1-4') {
      if (metaTerkunci) throw new Error(alasanTerkunci);
      return;
    }
    assertDraftOrThrow();
  };

  const handleEditOptions = (question) => {
    setActionError(null);
    try {
      assertBolehUbahOpsi(question);
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
      assertBolehUbahOpsi(target);
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

  if (isNew && jenis === null && !surveyId) {
    return (
      /* `max-w-[48rem]`, BUKAN `max-w-3xl`: tema proyek mendefinisikan
         `--spacing-3xl: 64px`, dan di repo ini Tailwind memakai token spasi itu
         untuk `max-w-3xl` -- hasilnya kolom 64px dengan teks bertumpuk (terukur di
         Chrome 8 Oktober 2026). Kelas `max-w-<xs..3xl>` tak dapat dipercaya di sini. */
      <div className="w-full max-w-[48rem] mx-auto p-lg md:p-xl flex flex-col gap-lg">
        <div>
          <h1 className="font-headline-md text-headline-md text-text-primary">Jenis Survei</h1>
          <p className="text-body-md text-text-secondary mt-xs">
            Pilih jenis survei lebih dulu. Jenis tidak dapat diganti setelah survei dibuat.
          </p>
        </div>
        {actionError && (
          <div className="p-md rounded-xl bg-error-container text-on-error-container text-sm font-semibold">
            {actionError}
          </div>
        )}
        <PemilihJenisSurvei
          nilai={jenisTertunda ?? jenis}
          onPilih={setJenisTertunda}
          disabled={isSaving}
        />
        <ConfirmDialog
          isOpen={jenisTertunda !== null}
          tone="primary"
          title={
            jenisTertunda === 'skm_permenpanrb'
              ? 'Pilih Survei SKM PermenPANRB?'
              : 'Pilih Survei Umum?'
          }
          description={
            jenisTertunda === 'skm_permenpanrb'
              ? 'Survei langsung dibuat dengan sembilan unsur baku PermenPANRB 14/2017 (U1 sampai U9) dan menghasilkan Nilai IKM. Unsurnya tidak dapat dihapus, dan jenis survei tidak dapat diganti setelah dibuat.'
              : 'Susunan pertanyaan bebas, tanpa unsur baku dan tanpa Nilai IKM. Jenis survei tidak dapat diganti setelah pertanyaan pertama ditambahkan.'
          }
          confirmLabel="Ya, Pilih Jenis Ini"
          cancelLabel="Batal"
          onCancel={() => setJenisTertunda(null)}
          onConfirm={async () => {
            const dipilih = jenisTertunda;
            setJenisTertunda(null);
            await handlePilihJenis(dipilih);
          }}
        />
        <a href={listHref} className="self-start text-label-md text-primary hover:underline">
          Kembali ke daftar survei
        </a>
      </div>
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
      onAddCustom={handleAddCustom}
      onDragTypeStart={(type) => setDrag({ kind: 'new', type })}
      onDragEnd={() => setDrag(null)}
      canDrag={!susunanTerkunci}
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
      {/* Pilihan "Survei Umum" dapat dibatalkan selama BELUM ada survei yang dibuat
          (pembuatannya malas, pada aksi pertama). Sesudahnya jenis tak dapat diganti. */}
      {isNew && jenis === 'umum' && !surveyId && (
        <div className="mx-lg mt-lg p-md rounded-xl border border-border bg-surface-container-low text-sm flex flex-wrap items-center justify-between gap-sm">
          <span>
            Jenis survei: <strong className="font-semibold">Survei Umum</strong>
          </span>
          <button
            type="button"
            onClick={() => setJenis(null)}
            className="min-h-[44px] px-md rounded-lg border border-border text-label-md font-label-md text-primary hover:bg-primary-container/10"
          >
            Ganti jenis
          </button>
        </div>
      )}
      {/* KERANGKA UNSUR (8 Oktober 2026). Ditampilkan sekali di atas kanvas, bukan
          pada tiap kartu: kesembilan kartu sudah memuat badge terkunci. */}
      {questions.some((q) => q.isBaku) && (
        <div
          role="note"
          className="mx-lg mt-lg p-md rounded-xl border border-primary/20 bg-primary-container/10 text-on-surface text-sm leading-relaxed flex items-start gap-sm"
        >
          <Lock size={16} className="shrink-0 mt-0.5 text-primary" aria-hidden="true" />
          <span>
            Kerangka 9 unsur PermenPANRB terkunci. Anda dapat mengubah kalimat pertanyaannya, tetapi
            unsurnya tidak dapat dihapus atau diganti.
          </span>
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
        isUtama={isUtama}
        onIsUtamaCommit={handleIsUtamaCommit}
        canEditMeta={!metaTerkunci}
        drag={drag}
        canReorder={!susunanTerkunci}
        alasanTerkunci={alasanTerkunci}
        onQuestionDragStart={(index) => setDrag({ kind: 'reorder', index })}
        onDragEnd={() => setDrag(null)}
        onDropAt={handleDropAt}
        onMove={moveQuestion}
        onEditOptions={handleEditOptions}
        canEditText={!metaTerkunci}
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
        }. Setelah terbit dan jawaban pertama masuk, susunan pertanyaan tidak dapat diubah lagi, dan hanya teksnya yang masih dapat diperbaiki.`}
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
          jumlahJawaban={jumlahJawaban}
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
      <ConfirmDialog
        isOpen={konfirmasiUtama !== null}
        tone="primary"
        title="Ganti survei utama OPD?"
        description={
          konfirmasiUtama
            ? `"${konfirmasiUtama.title}" sedang menjadi survei utama OPD ini dan akan diturunkan menjadi survei biasa. Tombol "Lanjut Isi Survei" pada halaman sukses pengaduan akan mengarah ke survei ini.`
            : ''
        }
        confirmLabel="Ya, ganti"
        cancelLabel="Batal"
        isProcessing={isSaving}
        onCancel={() => {
          setKonfirmasiUtama(null);
          setIsUtama(false);
        }}
        onConfirm={async () => {
          setKonfirmasiUtama(null);
          await kirimIsUtama(true);
        }}
      />

    </BuilderLayout>
  );
}
