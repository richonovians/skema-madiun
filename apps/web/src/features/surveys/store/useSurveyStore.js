import { create } from 'zustand';
import { submitSurveyResponse } from '../services/surveys.api';

const useSurveyStore = create((set, get) => ({
  surveyData: null,
  currentStepIndex: 0,
  answers: {},
  isCompleted: false,
  isSurveyInProgress: false,
  isSubmitting: false,
  submitError: null,

  startSurvey: () => {
    set({ isSurveyInProgress: true, isCompleted: false });
  },

  initSurvey: (data) => {
    set({
      surveyData: data,
      currentStepIndex: 0,
      answers: {},
      isCompleted: false,
      isSurveyInProgress: true,
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

  /** Kirim jawaban ke backend (POST /surveys/:id/responses) lalu tandai selesai. */
  submitSurvey: async () => {
    const { surveyData, answers } = get();
    if (!surveyData) {
      return { success: false, error: 'Survei belum dimuat' };
    }
    set({ isSubmitting: true, submitError: null });
    try {
      await submitSurveyResponse(surveyData.id, surveyData.questions, answers);
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
    });
  },
}));

export default useSurveyStore;
