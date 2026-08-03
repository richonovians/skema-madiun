import { DUMMY_SURVEY_RESPONSES } from '../constants/dummySurveyResponses';

// Simulasi network delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const surveyResponsesApi = {
  /**
   * Mengambil daftar respons untuk suatu survei.
   * @param {string} surveyId ID dari survei
   * @returns {Promise<Array>} Daftar respons survei
   */
  getSurveyResponses: async (surveyId) => {
    await delay(800); // Simulasi request API
    const responses = DUMMY_SURVEY_RESPONSES.filter((r) => r.surveyId === surveyId);
    return responses;
  },

  /**
   * Mengambil detail satu respons survei.
   * @param {string} surveyId ID dari survei
   * @param {string} responseId ID dari respons
   * @returns {Promise<Object>} Detail respons survei
   */
  getSurveyResponseDetail: async (surveyId, responseId) => {
    await delay(500); // Simulasi request API
    const response = DUMMY_SURVEY_RESPONSES.find(
      (r) => r.id === responseId && r.surveyId === surveyId
    );
    if (!response) {
      throw new Error('Respons tidak ditemukan');
    }
    return response;
  },
};
