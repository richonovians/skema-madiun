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

/**
 * Format kanonik periode survei (D5+D8, 2026-08-05): `{tahun}-Q{1-4}` (mis.
 * "2026-Q2") -- disimpan & divalidasi backend (lihat periode.util.ts),
 * granularitas triwulan (D5), terurut leksikografis sistematis (D8). Util di
 * sini murni utk sisi tampilan/builder -- backend tetap sumber kebenaran
 * validasi.
 */
const PERIODE_REGEX = /^(\d{4})-Q([1-4])$/;
const ROMAN_BY_QUARTER = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

/** "2026-Q2" -> { tahun: 2026, triwulan: 2 }, atau null bila bukan format kanonik. */
export function parsePeriode(periode) {
  const match = PERIODE_REGEX.exec(periode ?? '');
  if (!match) return null;
  return { tahun: Number(match[1]), triwulan: Number(match[2]) };
}

export function buildPeriode(tahun, triwulan) {
  return `${tahun}-Q${triwulan}`;
}

/** "2026-Q2" -> "Triwulan II - 2026" (label ramah-baca, dipakai kartu/tampilan). */
export function formatPeriodeLabel(periode) {
  const parsed = parsePeriode(periode);
  if (!parsed) return periode; // data lama/tak dikenal -- tampilkan apa adanya
  return `Triwulan ${ROMAN_BY_QUARTER[parsed.triwulan]} - ${parsed.tahun}`;
}

/**
 * Bucket sebuah tanggal ke periode triwulan kanonik. Cermin persis
 * `periodeFromDate` backend (surveys/utils/periode.util.ts) -- dipakai untuk
 * entitas yang TAK punya field `periode` sendiri, khususnya `Complaint`
 * (cuma punya `createdAt`), supaya penyaringan per triwulan di dashboard
 * konsisten dengan cara backend membucket tren pengaduannya.
 */
export function periodeFromDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return buildPeriode(d.getFullYear(), Math.floor(d.getMonth() / 3) + 1);
}

/**
 * Daftar pilihan periode untuk penyaring triwulan (lihat AdminNavbar.jsx).
 *
 * Rentangnya SENGAJA berpusat pada triwulan berjalan: `back` triwulan ke
 * belakang (riwayat yang memang punya data) + `forward` ke depan (survei
 * periode berikutnya biasa disiapkan lebih awal, lihat rentang tahun
 * BuilderToolbar). Terurut terbaru dulu supaya triwulan berjalan -- nilai
 * default penyaring -- selalu berada di dekat puncak daftar.
 */
export function buildRecentPeriodeOptions({ back = 7, forward = 1, from = new Date() } = {}) {
  const base = from instanceof Date ? from : new Date(from);
  // Indeks triwulan absolut (tahun*4 + triwulan-1) supaya pergeseran melewati
  // batas tahun tak perlu ditangani sebagai kasus khusus.
  const baseIndex = base.getFullYear() * 4 + Math.floor(base.getMonth() / 3);
  const options = [];
  for (let offset = forward; offset >= -back; offset -= 1) {
    const index = baseIndex + offset;
    const periode = buildPeriode(Math.floor(index / 4), (index % 4) + 1);
    options.push({ value: periode, label: formatPeriodeLabel(periode) });
  }
  return options;
}

export function adaptSurvey(survey) {
  return {
    id: String(survey.id),
    // `opdId` dipakai monitoring Kabupaten (lintas OPD) utk menyandingkan nama
    // OPD dari GET /opd -- GET /surveys TIDAK mengirim `opdNama` (cuma
    // /surveys/active yang mengisinya, lihat SurveyEntity backend), jadi
    // penggabungan nama dilakukan halaman pemanggil, bukan dikarang di sini.
    opdId: survey.opdId,
    title: survey.judul,
    status: STATUS_MAP[survey.status] ?? survey.status,
    period: survey.periode,
    respondentsCount: survey.respondentsCount ?? 0,
    ikmScore: survey.nilaiIkm ?? null,
    // Dipakai formulir kelola survei (saklar "izinkan tanpa login") dan modal
    // bagikan (keterangan tautannya menyesuaikan diri).
    izinkanAnonim: survey.izinkanAnonim === true,
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
export function toCreateSurveyPayload({
  title,
  period,
  allowMultipleSubmit,
  izinkanAnonim,
  opdId,
}) {
  return { judul: title, periode: period, allowMultipleSubmit, izinkanAnonim, opdId };
}

/** Terjemahkan payload edit-survei -> UpdateSurveyDto backend. */
export function toUpdateSurveyPayload({ title, period, allowMultipleSubmit, izinkanAnonim }) {
  return { judul: title, periode: period, allowMultipleSubmit, izinkanAnonim };
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
 * Ketiga tipe ('scale_1_to_4', 'text', 'multiple_choice') kini punya tampilan
 * pengisiannya masing-masing di QuestionCard.jsx. Sebelum 2026-08-19 kartu itu
 * SELALU merender skala 1-4, jadi pertanyaan uraian/pilihan ganda tak benar-benar
 * dapat diisi walau adapter ini sudah menerjemahkannya dengan benar.
 */
export function adaptFillQuestion(q) {
  return {
    id: q.id,
    text: q.teks,
    type: QUESTION_TYPE_TO_FRONTEND[q.tipe] ?? q.tipe,
    // `nilai` ikut dibawa karena tipe skala memakainya sebagai SKOR jawaban
    // (1-4), bukan id opsi -- lihat scaleStepsFromOptions & toSubmitAnswers.
    options: q.options?.length
      ? q.options.map((o) => ({ id: o.id, label: o.label, nilai: o.nilai ?? null }))
      : undefined,
  };
}

export function adaptSurveyFill(fill) {
  return {
    id: fill.id,
    title: fill.judul,
    periode: fill.periode,
    allowMultipleSubmit: fill.allowMultipleSubmit,
    izinkanAnonim: fill.izinkanAnonim === true,
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
    // Tipe `pilihan` selalu berisi; tipe `skala` berisi HANYA bila labelnya
    // pernah disesuaikan (4 baris, lihat scaleLabels.js); tipe teks selalu
    // kosong. Selalu array (bukan undefined) supaya pemanggil bisa langsung
    // `.length` tanpa penjagaan.
    options: (q.options ?? []).map((o) => ({ id: o.id, label: o.label, nilai: o.nilai ?? null })),
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
 *
 * `options` diterima sebagai array label (string) dari QuestionOptionsModal dan
 * dibungkus jadi QuestionOptionInputDto di sini. Field itu HANYA disertakan utk
 * tipe pilihan: backend menolak `options` pada tipe lain (400 "Opsi hanya
 * berlaku untuk tipe pilihan"), dan mewajibkannya (>=2) pada tipe pilihan.
 */
export function toCreateQuestionPayload({ text, type, options }) {
  const tipe = builderTypeToBackendTipe(type);
  return {
    teks: text,
    tipe,
    isIkmUnsur: false,
    ...(tipe === 'pilihan' ? { options: (options ?? []).map((label) => ({ label })) } : {}),
  };
}

/**
 * Payload PATCH /questions/:id untuk MENGGANTI opsi jawaban (2026-08-20).
 *
 * Semantik backend adalah penggantian PENUH: opsi lama dihapus, daftar ini
 * dibuat urut sesuai posisi array (tipe pilihan minimal 2; tipe skala tepat 4,
 * satu label per skor). `nilai` sengaja TIDAK dikirim -- untuk skala backend
 * memaksanya = posisi (1..4) agar label tak bisa menggeser dasar hitungan IKM,
 * dan untuk pilihan skor opsi memang di luar cakupan rumus IKM.
 *
 * `teks` hanya disertakan bila memang diubah: pertanyaan unsur baku terkunci
 * teksnya di UI, sehingga hanya labelnya yang boleh ikut terkirim.
 */
export function toUpdateQuestionOptionsPayload({ text, options }) {
  return {
    ...(text != null ? { teks: text } : {}),
    options: (options ?? []).map((label) => ({ label })),
  };
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
    // AnswerEntity backend cuma mengirim id opsi terpilih (bukan salinan
    // labelnya) -- labelnya diambil dari daftar opsi pertanyaan yg sudah
    // di-fetch pemanggil, supaya tampilan tak berhenti di "Opsi #12".
    selectedOptionLabel:
      question?.options?.find((o) => o.id === answer.selectedOptionId)?.label ?? null,
    // Label skor skala bila pertanyaannya memakai label yang disesuaikan
    // (2026-08-20). null = label baku, dan pemanggil cukup menampilkan angkanya
    // -- label baku SKM ("Cepat / Baik" dst) tak diulang di sini supaya tabel
    // respons tak jadi penuh kalimat panjang yang sama untuk setiap jawaban.
    nilaiLabel:
      answer.nilai == null
        ? null
        : (question?.options?.find((o) => o.nilai === answer.nilai)?.label ?? null),
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

/**
 * Satu baris riwayat "survei yang saya isi" (GET /me/survey-responses) -- untuk
 * dashboard warga, 2026-08-24.
 *
 * Beda dari `adaptSurveyResponse` di atas: yang ini TIDAK memuat jawaban sama
 * sekali (backend pun tak mengirimkannya), karena riwayat hanya butuh survei apa
 * & kapan diisi. Judul dan nama OPD sudah dibawa backend, jadi tak perlu satu
 * permintaan tambahan per baris.
 */
export function adaptMySurveyResponse(response) {
  return {
    id: response.id,
    surveyId: response.surveyId,
    title: response.surveyJudul,
    period: response.periode,
    opd: response.opdNama,
    submittedAt: response.submittedAt,
  };
}

export function adaptMySurveyResponseList(responses) {
  return (responses ?? []).map(adaptMySurveyResponse);
}
