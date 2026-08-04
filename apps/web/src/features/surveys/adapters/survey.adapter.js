/**
 * Terjemahkan SurveyEntity backend (GET /surveys) ke bentuk yang dipakai komponen
 * (lihat features/surveys/data/dummySurveys.js). Satu tempat -- perubahan kontrak
 * backend cukup diubah di sini, tak menyebar ke tiap komponen (INT-6).
 */
const STATUS_MAP = {
  draft: 'DRAF',
  aktif: 'AKTIF',
  ditutup: 'DITUTUP',
};

export function adaptSurvey(survey) {
  return {
    id: String(survey.id),
    title: survey.judul,
    status: STATUS_MAP[survey.status] ?? survey.status,
    period: survey.periode,
    respondentsCount: survey.respondentsCount ?? 0,
    ikmScore: survey.nilaiIkm ?? null,
    isClosed: survey.status === 'ditutup',
  };
}

export function adaptSurveyList(surveys) {
  return surveys.map(adaptSurvey);
}
