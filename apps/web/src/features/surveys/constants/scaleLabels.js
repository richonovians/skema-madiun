/**
 * Label BAKU skala 1-4 SKM (PermenPANRB 14/2017 Lampiran A).
 *
 * Dipakai sebagai CADANGAN, bukan satu-satunya sumber: sejak 2026-08-20 label
 * skala tiap pertanyaan dapat disesuaikan pengelola survei dan tersimpan sebagai
 * `question_options` (tepat 4 baris, `nilai` = skor 1-4). Bila sebuah pertanyaan
 * belum pernah disesuaikan, opsinya kosong dan label di bawah inilah yang
 * ditampilkan -- itulah sebabnya daftar ini dipusatkan di satu tempat: modal
 * builder (QuestionOptionsModal) dan wizard pengisian (QuestionCard) harus
 * menampilkan kalimat yang sama persis, bukan dua salinan yang bisa menyimpang.
 *
 * SKOR-nya sendiri TIDAK pernah ikut berubah (backend memaksa `nilai` = posisi
 * 1..4, lihat QuestionsService.toOptionRows) -- rumus IKM tetap memakai 1-4.
 */
export const DEFAULT_SCALE_LABELS = [
  'Tidak Cepat / Tidak Baik',
  'Kurang Cepat / Kurang Baik',
  'Cepat / Baik',
  'Sangat Cepat / Sangat Baik',
];

export const SCALE_OPTION_COUNT = DEFAULT_SCALE_LABELS.length;

/**
 * Label per skor untuk satu pertanyaan skala: pakai opsi tersimpan bila lengkap
 * (4 baris), selain itu label baku. Diurutkan menurut skor supaya tampilan tak
 * bergantung pada urutan array yang diterima.
 *
 * @param {{nilai?: number|null, label: string}[]} [options] Opsi dari backend.
 * @returns {{value: string, label: string}[]} value = skor sebagai string,
 *   bentuk yang langsung dipakai RadioCard/`toSubmitAnswers`.
 */
export function scaleStepsFromOptions(options) {
  const list = options ?? [];
  if (list.length === SCALE_OPTION_COUNT) {
    return list
      .map((option, index) => ({
        skor: option.nilai ?? index + 1,
        label: option.label,
      }))
      .sort((a, b) => a.skor - b.skor)
      .map((step) => ({ value: String(step.skor), label: step.label }));
  }
  return DEFAULT_SCALE_LABELS.map((label, index) => ({
    value: String(index + 1),
    label,
  }));
}
