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

/**
 * Terjemahkan SurveyEntity dari GET /surveys/active ke bentuk kartu survei
 * responden (lihat features/surveys/components/SurveyCard.jsx) -- BEDA dari
 * adaptSurvey/adaptSurveyList di atas yang utk daftar admin (respondentsCount/
 * ikmScore/isClosed, bukan opd/deadline/questionsCount/category).
 *
 * CATATAN GAP: `deadline` (tanggal tenggat) TIDAK ADA di skema Survey sama
 * sekali -- cuma ada `periode` (teks bebas mis. "2026", bukan tanggal
 * diskret). `category` (taksonomi filter UI) juga tak ada konsepnya di
 * backend. Keduanya null di sini, BUKAN dikarang -- halaman pemanggil
 * (app/(respondent)/surveys/page.jsx) sengaja tak lagi menampilkan filter
 * kategori krn tak ada field utk dicocokkan (akan selalu 0 hasil kalau
 * dipertahankan).
 */
export function adaptActiveSurveyCard(survey) {
  return {
    id: String(survey.id),
    title: survey.judul,
    opd: survey.opdNama,
    deadline: null, // gap, lihat catatan di atas
    questionsCount: survey.questionsCount ?? 0,
    category: null, // gap, lihat catatan di atas
    status: STATUS_MAP[survey.status] ?? survey.status,
  };
}

export function adaptActiveSurveyCardList(surveys) {
  return surveys.map(adaptActiveSurveyCard);
}

const QUESTION_TYPE_TO_FRONTEND = {
  skala: 'scale_1_to_4',
  teks: 'text',
  pilihan: 'multiple_choice',
};

/**
 * Terjemahkan SurveyFillEntity (GET /surveys/:id/fill) ke bentuk yang dipakai
 * wizard pengisian (lihat features/surveys/store/useSurveyStore.js).
 *
 * CATATAN GAP UI (bukan gap backend): QuestionCard.jsx saat ini HANYA
 * merender tipe 'scale_1_to_4' -- pertanyaan tipe teks/pilihan akan lolos
 * dari adapter ini (diterjemahkan dgn benar) TAPI belum ada tampilan wizard
 * utk keduanya. Tak masalah utk survei 9-unsur baku (semua skala), tapi
 * survei kustom ber-pertanyaan teks/pilihan belum sepenuhnya bisa diisi
 * lewat wizard ini -- perlu perluasan QuestionCard di tiket terpisah.
 */
export function adaptFillQuestion(q) {
  return {
    id: q.id,
    text: q.teks,
    type: QUESTION_TYPE_TO_FRONTEND[q.tipe] ?? q.tipe,
    options: q.options?.length
      ? q.options.map((o) => ({ id: o.id, label: o.label }))
      : undefined,
  };
}

export function adaptSurveyFill(fill) {
  return {
    id: fill.id,
    title: fill.judul,
    periode: fill.periode,
    allowMultipleSubmit: fill.allowMultipleSubmit,
    sudahMengisi: fill.sudahMengisi,
    questions: fill.questions.map(adaptFillQuestion),
  };
}

/**
 * Terjemahkan answers dari useSurveyStore ({[questionId]: value}) -> array
 * AnswerInputDto backend. Hanya sertakan pertanyaan yang benar-benar terjawab
 * (teks memang opsional di backend; skala/pilihan wajib tapi wizard sudah
 * memaksa semua terjawab sebelum tombol "Kirim" aktif, lihat SurveyNavigation.jsx).
 */
export function toSubmitAnswers(questions, answers) {
  return questions
    .filter((q) => answers[q.id] !== undefined && answers[q.id] !== '')
    .map((q) => {
      const raw = answers[q.id];
      if (q.type === 'scale_1_to_4') return { questionId: q.id, nilai: Number(raw) };
      if (q.type === 'multiple_choice') return { questionId: q.id, selectedOptionId: Number(raw) };
      return { questionId: q.id, teks: String(raw) };
    });
}
