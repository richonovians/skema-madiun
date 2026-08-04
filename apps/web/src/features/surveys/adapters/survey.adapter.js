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

const STATUS_TO_BACKEND = {
  DRAF: 'draft',
  AKTIF: 'aktif',
  DITUTUP: 'ditutup',
};

/** Terjemahkan payload buat-survei (bentuk komponen) -> CreateSurveyDto backend. */
export function toCreateSurveyPayload({ title, period, allowMultipleSubmit, opdId }) {
  return { judul: title, periode: period, allowMultipleSubmit, opdId };
}

/** Terjemahkan payload edit-survei -> UpdateSurveyDto backend. */
export function toUpdateSurveyPayload({ title, period, allowMultipleSubmit }) {
  return { judul: title, periode: period, allowMultipleSubmit };
}

/** Terjemahkan status frontend ('AKTIF' dkk) -> enum backend ('aktif' dkk). */
export function toBackendStatus(status) {
  return STATUS_TO_BACKEND[status] ?? status;
}
