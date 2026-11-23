import { create } from 'zustand';
import { tandaiSudahMengisi } from '@/utils/surveyFillMarker';
import { submitPublicSurveyResponse, submitSurveyResponse } from '../services/surveys.api';
import { isUnauthorizedError, kodeGalat } from '@/services/api';
import { ambilDrafSurvei, hapusDrafSurvei, simpanDrafSurvei } from '@/utils/drafSurvei';

const useSurveyStore = create((set, get) => ({
  surveyData: null,
  currentStepIndex: 0,
  answers: {},
  isCompleted: false,
  isSurveyInProgress: false,
  isSubmitting: false,
  submitError: null,
  submitErrorCode: null,
  // Id akun yang mengisi (23 November 2026). Mengikat draf yang disimpan saat
  // sesi berakhir, dan memastikan draf itu hanya dituangkan bagi akun yang
  // sama. `null` pada jalur publik dan selama akunnya belum diketahui.
  pemilik: null,
  // Jawaban dari draf sesi berakhir sudah dituangkan; layar memberitahukannya.
  jawabanDipulihkan: false,
  // Pengisian tanpa sesi (rute /survei/:id). Menentukan endpoint pengiriman, bukan
  // tampilan.
  isAnonimMode: false,
  // Persetujuan PDP & data diri dari GerbangPengisianPublik (8 September
  // 2026). Disimpan di store bersama `isAnonimMode`, dengan alasan yang sama:
  // keputusannya diambil SEKALI sebelum pengisian, bukan diperiksa ulang saat
  // mengirim. `null` pada jalur bersesi, yang tak memakainya.
  dataPublik: null,
  /**
   * Token Cloudflare Turnstile (14 September 2026). TERPISAH dari `dataPublik`
   * yang diisi sekali di gerbang awal: token ini baru datang setelah widget-nya
   * selesai menilai pengunjung, dan ia kedaluwarsa dalam hitungan menit --
   * sedangkan mengisi survei bisa lebih lama, sehingga widget menyegarkannya
   * sendiri dan memanggil penyetel ini lagi.
   */
  captchaToken: null,
  // Pilihan anonim pada GerbangPengisianBersesi, jalur BERSESI (8 September
  // 2026). Terpisah dari `dataPublik` karena isinya bukan data, melainkan satu
  // pilihan: data dirinya disalin backend dari akunnya, tak pernah dikirim dari
  // sini. Terpisah pula dari `isAnonimMode`, yang menyatakan ada-tidaknya sesi
  // dan menentukan endpoint, bukan pilihan pengisi.
  tanpaDataDiri: false,

  startSurvey: () => {
    set({ isSurveyInProgress: true, isCompleted: false });
  },

  /**
   * `anonim` disimpan di store, BUKAN diperiksa ulang saat submit: keputusannya
   * diambil SEKALI saat halaman tahu ada-tidaknya sesi. Memeriksanya lagi di
   * tengah pengisian berisiko berpindah jalur di tengah jalan bila sesi
   * kedaluwarsa -- responden akan kehilangan jawabannya tanpa sebab yang jelas.
   */
  initSurvey: (
    data,
    { anonim = false, dataPublik = null, tanpaDataDiri = false, pemilik = null } = {},
  ) => {
    set({
      surveyData: data,
      currentStepIndex: 0,
      answers: {},
      isCompleted: false,
      isSurveyInProgress: true,
      isAnonimMode: anonim,
      dataPublik,
      tanpaDataDiri,
      pemilik,
      jawabanDipulihkan: false,
    });
    if (anonim || pemilik == null || !data) return;

    // Draf dari sesi yang berakhir saat dikirim (23 November 2026). Milik akun
    // lain dibuang tanpa dituangkan, sebab isinya jawaban orang yang berbeda.
    const draf = ambilDrafSurvei(data.id);
    if (!draf) return;
    hapusDrafSurvei(data.id);
    if (draf.pemilik !== pemilik) return;

    // Hanya pertanyaan yang masih ada: admin dapat mengubah kuesioner di antara
    // dua waktu itu, dan backend menolak id pertanyaan yang tak dikenalnya.
    const idAda = new Set((data.questions ?? []).map((q) => String(q.id)));
    const answers = Object.fromEntries(
      Object.entries(draf.answers).filter(([id]) => idAda.has(String(id))),
    );
    set({
      answers,
      jawabanDipulihkan: true,
      // Ke pertanyaan terakhir, tempat responden menekan Kirim sebelumnya.
      currentStepIndex: Math.max(0, (data.questions?.length ?? 1) - 1),
    });
  },

  setAnswer: (questionId, value) => {
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: value,
      },
    }));
  },

  nextStep: () => {
    const { currentStepIndex, surveyData } = get();
    if (surveyData && currentStepIndex < surveyData.questions.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  setCompleted: () => {
    set({ isCompleted: true, isSurveyInProgress: false });
  },

  /**
   * Kirim jawaban lalu tandai selesai. Endpointnya ditentukan `isAnonimMode`:
   * jalur berpenjaga (POST /surveys/:id/responses) bagi pengguna bersesi, jalur
   * publik (POST /public/surveys/:id/responses) bagi pengunjung tanpa sesi.
   */
  setCaptchaToken: (captchaToken) => set({ captchaToken }),

  submitSurvey: async () => {
    const {
      surveyData,
      answers,
      isAnonimMode,
      dataPublik,
      tanpaDataDiri,
      captchaToken,
    } = get();
    if (!surveyData) {
      return { success: false, error: 'Survei belum dimuat' };
    }
    set({ isSubmitting: true, submitError: null, submitErrorCode: null });
    try {
      // Parameter keempat berbeda arti per jalur, dan tiap fungsi hanya
      // menerima yang menjadi urusannya: jalur publik menerima persetujuan PDP
      // beserta data diri yang diketik pengisi, jalur berpenjaga menerima satu
      // pilihan anonim (data dirinya disalin backend dari akun, tak pernah
      // dikirim dari sini). Persetujuan pengguna bersesi sudah tercatat di
      // `users.consentAt` dan ditegakkan `assertConsented` di backend.
      await (isAnonimMode
        ? submitPublicSurveyResponse(surveyData.id, surveyData.questions, answers, {
            ...(dataPublik ?? {}),
            captchaToken,
          })
        : submitSurveyResponse(surveyData.id, surveyData.questions, answers, tanpaDataDiri));
      // Penanda peramban ditulis HANYA sesudah server menerima -- menandainya
      // lebih dulu akan mengunci responden dari survei yang belum tersimpan.
      if (isAnonimMode) {
        tandaiSudahMengisi(surveyData.id);
      }
      hapusDrafSurvei(surveyData.id);
      set({ isCompleted: true, isSurveyInProgress: false, isSubmitting: false });
      return { success: true };
    } catch (err) {
      // Kodenya disimpan terpisah dari pesannya supaya layar dapat menawarkan
      // jalan keluar yang tepat -- mis. tombol menuju halaman persetujuan --
      // tanpa mencocokkan bunyi pesan yang dapat berubah kapan saja.
      let pesan = err.message;
      // Sesi berakhir (23 November 2026). Jawaban hanya ada di memori, dan
      // masuk ulang memindahkan halaman. Disimpan hanya bila pemiliknya
      // diketahui; jalur publik tak bersesi sehingga tak pernah sampai sini.
      if (!isAnonimMode && isUnauthorizedError(err)) {
        const { pemilik } = get();
        simpanDrafSurvei(surveyData.id, answers, pemilik);
        pesan =
          pemilik != null
            ? 'Sesi Anda sudah berakhir. Jawaban Anda disimpan sementara di tab ini. Masuk kembali, lalu buka lagi survei ini.'
            : 'Sesi Anda sudah berakhir. Masuk kembali untuk mengirim jawaban.';
      }
      set({ isSubmitting: false, submitError: pesan, submitErrorCode: kodeGalat(err) });
      return { success: false, error: pesan };
    }
  },

  resetSurvey: () => {
    set({
      surveyData: null,
      currentStepIndex: 0,
      answers: {},
      isCompleted: false,
      isSurveyInProgress: false,
      isSubmitting: false,
      submitError: null,
      submitErrorCode: null,
      isAnonimMode: false,
      dataPublik: null,
      captchaToken: null,
      tanpaDataDiri: false,
      pemilik: null,
      jawabanDipulihkan: false,
    });
  },
}));

export default useSurveyStore;
