import { create } from 'zustand';

const useSurveyStore = create((set, get) => ({
  surveyData: null,
  currentStepIndex: 0,
  answers: {},
  isCompleted: false,
  isSurveyInProgress: false,

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

  resetSurvey: () => {
    set({
      surveyData: null,
      currentStepIndex: 0,
      answers: {},
      isCompleted: false,
      isSurveyInProgress: false,
    });
  },
}));

export default useSurveyStore;
