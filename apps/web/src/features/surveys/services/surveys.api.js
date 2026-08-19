import api from '@/services/api';
import {
  adaptActiveSurveyCardList,
  adaptBuilderQuestions,
  adaptSurvey,
  adaptSurveyFill,
  adaptSurveyList,
  toBackendStatus,
  toCreateQuestionPayload,
  toCreateSurveyPayload,
  toSubmitAnswers,
  toUpdateSurveyPayload,
} from '../adapters/survey.adapter';

// --- Survei ---

/** @param {{status?: string, page?: number, limit?: number}} params */
export async function getSurveys(params = {}) {
  const response = await api.get('/surveys', { params });
  return { data: adaptSurveyList(response.data), meta: response.meta };
}

/** Survei berstatus aktif (responden memilih survei untuk diisi) -- bentuk kartu, lihat adaptActiveSurveyCard. */
export async function getActiveSurveys(params = {}) {
  const response = await api.get('/surveys/active', { params });
  return { data: adaptActiveSurveyCardList(response.data), meta: response.meta };
}

export async function getSurveyById(surveyId) {
  const response = await api.get(`/surveys/${surveyId}`);
  return adaptSurvey(response.data);
}

/** @param {{title: string, period: string, allowMultipleSubmit?: boolean, opdId?: number}} payload */
export async function createSurvey(payload) {
  const response = await api.post('/surveys', toCreateSurveyPayload(payload));
  return adaptSurvey(response.data);
}

/** @param {{title?: string, period?: string, allowMultipleSubmit?: boolean}} payload */
export async function updateSurvey(surveyId, payload) {
  const response = await api.patch(`/surveys/${surveyId}`, toUpdateSurveyPayload(payload));
  return adaptSurvey(response.data);
}

export async function deleteSurvey(surveyId) {
  await api.delete(`/surveys/${surveyId}`);
}

/** @param {string} status Nilai frontend ('AKTIF'/'DRAF'/'DITUTUP'). */
export async function updateSurveyStatus(surveyId, status) {
  const response = await api.patch(`/surveys/${surveyId}/status`, {
    status: toBackendStatus(status),
  });
  return adaptSurvey(response.data);
}

export async function duplicateSurvey(surveyId) {
  const response = await api.post(`/surveys/${surveyId}/duplicate`);
  return adaptSurvey(response.data);
}

// --- Pertanyaan (nested di bawah survei, bentuk builder -- lihat survey.adapter.js) ---

export async function getQuestions(surveyId) {
  const response = await api.get(`/surveys/${surveyId}/questions`);
  return adaptBuilderQuestions(response.data);
}

/**
 * @param {{text: string, type: string, options?: string[]}} payload bentuk builder
 *   (lihat BuilderSidebar.jsx). `options` = daftar label, WAJIB >=2 utk tipe
 *   'Pilihan Ganda' (dikumpulkan QuestionOptionsModal sebelum pemanggilan ini).
 * @returns {Promise<object>} bentuk pertanyaan builder TANPA `title` -- label
 *   "Pertanyaan Kustom #N" bergantung posisi di daftar lokal pemanggil, biar tak
 *   dihitung ulang secara terpisah di sini (lihat adaptBuilderQuestions).
 */
export async function createCustomQuestion(surveyId, payload) {
  const response = await api.post(`/surveys/${surveyId}/questions`, toCreateQuestionPayload(payload));
  const q = response.data;
  return {
    id: q.id,
    text: q.teks,
    type: payload.type,
    isBaku: false,
    // Diselaraskan dgn adaptBuilderQuestion supaya blok pertanyaan yg baru
    // ditambah tampil persis sama dgn setelah halaman dimuat ulang. Sebelumnya
    // `isRequired` tak diisi sama sekali -- pertanyaan skala baru keliru
    // berlabel "Opsional (isian teks)" sampai builder di-refresh.
    isRequired: q.tipe !== 'teks',
    options: (q.options ?? []).map((o) => ({ id: o.id, label: o.label })),
  };
}

/** Terapkan template 9 unsur baku -- SATU panggilan backend, bukan disimulasikan lokal (lihat INT-30 -> INT-19). */
export async function applyQuestionTemplate(surveyId) {
  const response = await api.post(`/surveys/${surveyId}/questions/template`);
  return adaptBuilderQuestions(response.data);
}

/** @param {number[]} orderedIds Seluruh id pertanyaan survei dalam urutan baru. */
export async function reorderQuestions(surveyId, orderedIds) {
  const response = await api.patch(`/surveys/${surveyId}/questions/reorder`, { orderedIds });
  return adaptBuilderQuestions(response.data);
}

/** Hanya `teks` yang bisa diubah (UpdateQuestionDto backend tak dukung ubah tipe). */
export async function updateQuestionText(questionId, text) {
  const response = await api.patch(`/questions/${questionId}`, { teks: text });
  return response.data;
}

export async function deleteQuestion(questionId) {
  await api.delete(`/questions/${questionId}`);
}

// --- Pengisian & respons (Responden + Admin OPD) ---

/** Struktur kuesioner untuk diisi responden (lihat useSurveyStore.js utk bentuk konsumen). */
export async function getSurveyFill(surveyId) {
  const response = await api.get(`/surveys/${surveyId}/fill`);
  return adaptSurveyFill(response.data);
}

/**
 * Kirim jawaban. `questions` & `answers` bentuk dari useSurveyStore
 * (getSurveyFill().questions + store.answers) -- toSubmitAnswers menerjemahkan
 * ke AnswerInputDto[] backend berdasar tipe tiap pertanyaan.
 */
export async function submitSurveyResponse(surveyId, questions, answers) {
  const response = await api.post(`/surveys/${surveyId}/responses`, {
    answers: toSubmitAnswers(questions, answers),
  });
  return response.data;
}

/** Daftar respons masuk (Admin OPD). */
export async function getSurveyResponses(surveyId, params = {}) {
  const response = await api.get(`/surveys/${surveyId}/responses`, { params });
  return { data: response.data, meta: response.meta };
}
