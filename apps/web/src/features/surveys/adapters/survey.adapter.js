/**
 * Terjemahkan SurveyEntity backend (GET /surveys) ke bentuk yang dipakai komponen.
 * Satu tempat -- perubahan kontrak backend cukup diubah di sini, tak menyebar
 * ke tiap komponen (INT-6).
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

// --- Builder pertanyaan (admin OPD, INT-19) ---
// Label tipe di builder pakai Bahasa Indonesia penuh (beda dari label wizard
// pengisian yg pakai kode singkat spt 'scale_1_to_4', lihat adaptFillQuestion).

const QUESTION_TYPE_TO_BUILDER = {
  skala: 'Skala Penilaian 1-4',
  teks: 'Isian Teks',
  pilihan: 'Pilihan Ganda',
};

const QUESTION_TYPE_TO_BACKEND_TIPE = {
  'Skala Penilaian 1-4': 'skala',
  'Isian Teks': 'teks',
  'Pilihan Ganda': 'pilihan',
};

export function builderTypeToBackendTipe(type) {
  return QUESTION_TYPE_TO_BACKEND_TIPE[type] ?? type;
}

/**
 * Terjemahkan QuestionEntity backend -> bentuk builder (lihat QuestionBlock.jsx).
 * `title` pertanyaan kustom TIDAK PERNAH tersimpan backend (Question cuma py
 * `teks`, tak ada label terpisah) -- diregenerasi client-side per posisi
 * (`customIndex`) tiap kali dimuat, murni kosmetik, bukan identitas asli.
 *
 * `isRequired` DIDERIVASI dari tipe (bukan dikarang/preferensi tersimpan) --
 * backend TAK PUNYA flag wajib per-pertanyaan terpisah; ResponsesService.
 * validateAnswers menegakkan skala/pilihan SELALU wajib, teks SELALU
 * opsional. Makanya toggle "Wajib Diisi" di UI read-only, bukan interaktif.
 */
export function adaptBuilderQuestion(q, customIndex) {
  const isBaku = q.isIkmUnsur === true;
  return {
    id: q.id,
    isBaku,
    title: isBaku ? `${q.kodeUnsur}: ${q.teks}` : `Pertanyaan Kustom #${customIndex}`,
    text: q.teks,
    type: QUESTION_TYPE_TO_BUILDER[q.tipe] ?? q.tipe,
    isRequired: q.tipe !== 'teks',
  };
}

export function adaptBuilderQuestions(questions) {
  let customCounter = 0;
  return questions.map((q) => {
    if (q.isIkmUnsur !== true) customCounter += 1;
    return adaptBuilderQuestion(q, customCounter);
  });
}

/**
 * Terjemahkan payload tambah-pertanyaan-kustom (bentuk builder) -> CreateQuestionDto.
 * CATATAN GAP: tipe 'Pilihan Ganda' butuh `options` (wajib >=2 di backend),
 * TAPI builder saat ini TAK PUNYA UI pengaturan opsi sama sekali -- caller
 * (page.jsx) sengaja TIDAK memanggil ini utk tipe pilihan, biar tak coba
 * kirim payload yg pasti 400. Lihat catatan di page.jsx.
 */
export function toCreateQuestionPayload({ text, type }) {
  return { teks: text, tipe: builderTypeToBackendTipe(type), isIkmUnsur: false };
}

// --- Respons masuk (GET /surveys/:id/responses, Admin OPD, INT-38) ---

/**
 * Terjemahkan AnswerEntity backend (cuma `questionId`, tanpa teks pertanyaan)
 * jadi bentuk siap tampil, dgn `question` (dari GET /surveys/:id/questions,
 * di-Map-kan pemanggil) utk tampilkan teks+tipe pertanyaan di sebelah jawaban.
 */
export function adaptSurveyResponseAnswer(answer, question) {
  return {
    questionId: answer.questionId,
    questionText: question?.text ?? `Pertanyaan #${answer.questionId}`,
    questionType: question?.type ?? null, // 'Skala Penilaian 1-4' | 'Isian Teks' | 'Pilihan Ganda'
    nilai: answer.nilai,
    teks: answer.teks,
    selectedOptionId: answer.selectedOptionId,
  };
}

/**
 * Terjemahkan ResponseEntity (GET /surveys/:id/responses) ke bentuk siap tampil.
 * `questionsById` (Map<number, builderQuestion>) didapat dari getQuestions(surveyId)
 * -- dipisah jadi 1 fetch tersendiri krn AnswerEntity backend sengaja ramping
 * (cuma id relasi, bukan salinan teks pertanyaan).
 *
 * CATATAN GAP (bukan dikarang, desain terkunci): ResponseEntity backend SENGAJA
 * tidak memuat identitas pengisi (userId/dedupeUserId) -- SKM anonim by design
 * (lihat komentar ResponseEntity backend). `averageScore` DIDERIVASI di sini dari
 * rata-rata `nilai` jawaban skala PADA RESPONS INI SAJA (bukan field backend),
 * beda dari `nilaiIkm` survei (itu rata-rata SELURUH responden, dihitung IkmService).
 */
export function adaptSurveyResponse(response, questionsById) {
  const answers = (response.answers ?? []).map((a) =>
    adaptSurveyResponseAnswer(a, questionsById.get(a.questionId)),
  );
  const scaleValues = answers.filter((a) => a.nilai != null).map((a) => a.nilai);
  const averageScore =
    scaleValues.length > 0 ? scaleValues.reduce((sum, v) => sum + v, 0) / scaleValues.length : null;

  return {
    id: response.id,
    surveyId: response.surveyId,
    submittedAt: response.submittedAt,
    answers,
    averageScore,
  };
}

export function adaptSurveyResponseList(responses, questionsById) {
  return responses.map((r) => adaptSurveyResponse(r, questionsById));
}
