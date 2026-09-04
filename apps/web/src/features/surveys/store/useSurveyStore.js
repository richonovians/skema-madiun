import { create } from 'zustand';
import { tandaiSudahMengisi } from '@/utils/surveyFillMarker';
import { submitPublicSurveyResponse, submitSurveyResponse } from '../services/surveys.api';

const useSurveyStore = create((set, get) => ({
  surveyData: null,
  currentStepIndex: 0,
  answers: {},
  isCompleted: false,
  isSurveyInProgress: false,
  isSubmitting: false,
  submitError: null,
  // Pengisian tanpa sesi (rute /isi/:id). Menentukan endpoint pengiriman, bukan
  // tampilan.
  isAnonimMode: false,

  startSurvey: () => {
    set({ isSurveyInProgress: true, isCompleted: false });
  },

  /**
   * `anonim` disimpan di store, BUKAN diperiksa ulang saat submit: keputusannya
   * diambil SEKALI saat halaman tahu ada-tidaknya sesi. Memeriksanya lagi di
   * tengah pengisian berisiko berpindah jalur di tengah jalan bila sesi
   * kedaluwarsa -- responden akan kehilangan jawabannya tanpa sebab yang jelas.
   */
  initSurvey: (data, { anonim = false } = {}) => {
    set({
      surveyData: data,
      currentStepIndex: 0,
      answers: {},
      isCompleted: false,
      isSurveyInProgress: true,
      isAnonimMode: anonim,
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
    const { surveyData, answers, isAnonimMode } = get();
    if (!surveyData) {
      return { success: false, error: 'Survei belum dimuat' };
    }
    set({ isSubmitting: true, submitError: null });
    try {
      const kirim = isAnonimMode ? submitPublicSurveyResponse : submitSurveyResponse;
      await kirim(surveyData.id, surveyData.questions, answers);
      // Penanda peramban ditulis HANYA sesudah server menerima -- menandainya
      // lebih dulu akan mengunci responden dari survei yang belum tersimpan.
      if (isAnonimMode) {
        tandaiSudahMengisi(surveyData.id);
      }
      set({ isCompleted: true, isSurveyInProgress: false, isSubmitting: false });
      return { success: true };
    } catch (err) {
      set({ isSubmitting: false, submitError: err.message });
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
      isAnonimMode: false,
    });
  },
}));

export default useSurveyStore;
