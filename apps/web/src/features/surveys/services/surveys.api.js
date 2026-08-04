import api from '@/services/api';
import {
  adaptSurvey,
  adaptSurveyList,
  toBackendStatus,
  toCreateSurveyPayload,
  toUpdateSurveyPayload,
} from '../adapters/survey.adapter';

// --- Survei ---

/** @param {{status?: string, page?: number, limit?: number}} params */
export async function getSurveys(params = {}) {
  const response = await api.get('/surveys', { params });
  return { data: adaptSurveyList(response.data), meta: response.meta };
}

/** Survei berstatus aktif (responden memilih survei untuk diisi). */
export async function getActiveSurveys(params = {}) {
  const response = await api.get('/surveys/active', { params });
  return { data: adaptSurveyList(response.data), meta: response.meta };
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

// --- Pertanyaan (nested di bawah survei) ---
// CATATAN: belum ada adapter khusus pertanyaan -- bentuk komponen builder
// (isBaku/title/text, lihat app/admin-opd/(builder)/surveys/builder/[id]/page.jsx)
// baru dipetakan penuh saat wiring builder sungguhan (Fase 4, INT-19), bukan
// cakupan INT-7. Fungsi di bawah masih passthrough bentuk backend apa adanya
// (teks/tipe/isIkmUnsur/kodeUnsur).

export async function getQuestions(surveyId) {
  const response = await api.get(`/surveys/${surveyId}/questions`);
  return response.data;
}

/** @param {{teks: string, tipe: 'skala'|'teks'|'pilihan', isIkmUnsur?: boolean, kodeUnsur?: string, options?: Array}} payload */
export async function createQuestion(surveyId, payload) {
  const response = await api.post(`/surveys/${surveyId}/questions`, payload);
  return response.data;
}

export async function applyQuestionTemplate(surveyId) {
  const response = await api.post(`/surveys/${surveyId}/questions/template`);
  return response.data;
}

/** @param {number[]} orderedIds Seluruh id pertanyaan survei dalam urutan baru. */
export async function reorderQuestions(surveyId, orderedIds) {
  const response = await api.patch(`/surveys/${surveyId}/questions/reorder`, { orderedIds });
  return response.data;
}

export async function updateQuestion(questionId, payload) {
  const response = await api.patch(`/questions/${questionId}`, payload);
  return response.data;
}

export async function deleteQuestion(questionId) {
  await api.delete(`/questions/${questionId}`);
}

// --- Pengisian & respons (Responden + Admin OPD) ---

/** Struktur kuesioner untuk diisi responden. */
export async function getSurveyFill(surveyId) {
  const response = await api.get(`/surveys/${surveyId}/fill`);
  return response.data;
}

/** @param {Array<{questionId: number, nilai?: number, teks?: string, selectedOptionId?: number}>} answers */
export async function submitSurveyResponse(surveyId, answers) {
  const response = await api.post(`/surveys/${surveyId}/responses`, { answers });
  return response.data;
}

/** Daftar respons masuk (Admin OPD). */
export async function getSurveyResponses(surveyId, params = {}) {
  const response = await api.get(`/surveys/${surveyId}/responses`, { params });
  return { data: response.data, meta: response.meta };
}
