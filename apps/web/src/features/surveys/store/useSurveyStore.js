import { create } from 'zustand';
import { tandaiSudahMengisi } from '@/utils/surveyFillMarker';
import { submitPublicSurveyResponse, submitSurveyResponse } from '../services/surveys.api';
import { kodeGalat } from '@/services/api';

const useSurveyStore = create((set, get) => ({
  surveyData: null,
  currentStepIndex: 0,
  answers: {},
  isCompleted: false,
  isSurveyInProgress: false,
  isSubmitting: false,
  submitError: null,
  submitErrorCode: null,
  // Pengisian tanpa sesi (rute /survei/:id). Menentukan endpoint pengiriman, bukan
  // tampilan.
  isAnonimMode: false,
  // Persetujuan PDP & data diri dari GerbangPengisianPublik (8 September
  // 2026). Disimpan di store bersama `isAnonimMode`, dengan alasan yang sama:
  // keputusannya diambil SEKALI sebelum pengisian, bukan diperiksa ulang saat
  // mengirim. `null` pada jalur bersesi, yang tak memakainya.
  dataPublik: null,
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
  initSurvey: (data, { anonim = false, dataPublik = null, tanpaDataDiri = false } = {}) => {
    set({
      surveyData: data,
      currentStepIndex: 0,
      answers: {},
      isCompleted: false,
      isSurveyInProgress: true,
      isAnonimMode: anonim,
      dataPublik,
      tanpaDataDiri,
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
  submitSurvey: async () => {
    const { surveyData, answers, isAnonimMode, dataPublik, tanpaDataDiri } = get();
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
        ? submitPublicSurveyResponse(surveyData.id, surveyData.questions, answers, dataPublik)
        : submitSurveyResponse(surveyData.id, surveyData.questions, answers, tanpaDataDiri));
      // Penanda peramban ditulis HANYA sesudah server menerima -- menandainya
      // lebih dulu akan mengunci responden dari survei yang belum tersimpan.
      if (isAnonimMode) {
        tandaiSudahMengisi(surveyData.id);
      }
      set({ isCompleted: true, isSurveyInProgress: false, isSubmitting: false });
      return { success: true };
    } catch (err) {
      // Kodenya disimpan terpisah dari pesannya supaya layar dapat menawarkan
      // jalan keluar yang tepat -- mis. tombol menuju halaman persetujuan --
      // tanpa mencocokkan bunyi pesan yang dapat berubah kapan saja.
      set({ isSubmitting: false, submitError: err.message, submitErrorCode: kodeGalat(err) });
      return { success: false, error: err.message };
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
      tanpaDataDiri: false,
    });
  },
}));

export default useSurveyStore;
