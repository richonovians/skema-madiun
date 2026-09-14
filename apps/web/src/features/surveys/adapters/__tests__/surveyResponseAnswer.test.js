import { adaptSurveyResponse, adaptSurveyResponseList } from '../survey.adapter';

/**
 * Laporan pengguna 13 September 2026: "detail soal respon nomornya terbalik
 * dengan nomor soal di survei".
 *
 * Dua sebab bertumpuk. Backend memuat `include: { answers: true }` TANPA
 * `orderBy`, sehingga urutannya tak ditentukan -- pada basis data lokal dua dari
 * tiga respons kembali persis terbalik. Lalu layar detail menomori jawaban dari
 * POSISI ARRAY, sehingga urutan apa pun yang datang langsung menjadi nomor soal.
 *
 * Backend kini mengurutkan. Uji di berkas ini menjaga lapis kedua: nomornya
 * diambil dari posisi pertanyaan DI DALAM SURVEI, bukan dari posisi jawaban di
 * array -- supaya urutan kiriman yang kacau tak dapat lagi menjadi nomor soal.
 */
const pertanyaan = (id, text) => ({ id, text, type: 'Skala Penilaian 1-4', options: [] });

describe('penomoran jawaban respons', () => {
  const questions = [pertanyaan(101, 'Kesesuaian pelayanan'), pertanyaan(102, 'Kecepatan petugas'), pertanyaan(103, 'Kenyamanan ruang')];

  it('nomor mengikuti posisi pertanyaan di survei, bukan posisi jawaban', () => {
    // Jawaban datang TERBALIK, seperti yang benar-benar terjadi pada respons #13.
    const response = {
      id: 1,
      surveyId: 7,
      submittedAt: '2026-09-13T00:00:00.000Z',
      answers: [
        { questionId: 103, nilai: 2 },
        { questionId: 102, nilai: 3 },
        { questionId: 101, nilai: 4 },
      ],
    };

    const hasil = adaptSurveyResponse(response, questions);

    expect(hasil.answers.map((a) => a.nomor)).toEqual([3, 2, 1]);
    expect(hasil.answers.map((a) => a.questionText)).toEqual([
      'Kenyamanan ruang',
      'Kecepatan petugas',
      'Kesesuaian pelayanan',
    ]);
  });

  it('urutan kiriman yang sudah benar menghasilkan nomor 1..N', () => {
    const response = {
      id: 2,
      surveyId: 7,
      submittedAt: '2026-09-13T00:00:00.000Z',
      answers: [
        { questionId: 101, nilai: 4 },
        { questionId: 102, nilai: 3 },
        { questionId: 103, nilai: 2 },
      ],
    };

    expect(adaptSurveyResponse(response, questions).answers.map((a) => a.nomor)).toEqual([1, 2, 3]);
  });

  /**
   * Pertanyaan yang DITAMBAHKAN sesudah respons terkirim: jawaban lama tak
   * menyebutnya sama sekali. Penomoran berbasis posisi array akan menggeser
   * seluruh nomor sesudahnya; penomoran berbasis survei tidak.
   */
  it('jawaban yang melompati satu pertanyaan tetap memakai nomor survei', () => {
    const response = {
      id: 3,
      surveyId: 7,
      submittedAt: '2026-09-13T00:00:00.000Z',
      answers: [
        { questionId: 101, nilai: 4 },
        { questionId: 103, nilai: 2 },
      ],
    };

    expect(adaptSurveyResponse(response, questions).answers.map((a) => a.nomor)).toEqual([1, 3]);
  });

  it('pertanyaan yang sudah terhapus dari survei tak memaksa nomor palsu', () => {
    const response = {
      id: 4,
      surveyId: 7,
      submittedAt: '2026-09-13T00:00:00.000Z',
      answers: [{ questionId: 999, nilai: 4 }],
    };

    const [jawaban] = adaptSurveyResponse(response, questions).answers;
    expect(jawaban.nomor).toBeNull();
    expect(jawaban.questionText).toBe('Pertanyaan #999');
  });

  it('rata-rata skala tetap dihitung seperti sebelumnya', () => {
    const response = {
      id: 5,
      surveyId: 7,
      submittedAt: '2026-09-13T00:00:00.000Z',
      answers: [
        { questionId: 101, nilai: 4 },
        { questionId: 102, nilai: 2 },
      ],
    };

    expect(adaptSurveyResponse(response, questions).averageScore).toBe(3);
  });

  it('daftar respons memakai penomoran yang sama', () => {
    const hasil = adaptSurveyResponseList(
      [
        {
          id: 6,
          surveyId: 7,
          submittedAt: '2026-09-13T00:00:00.000Z',
          answers: [{ questionId: 102, nilai: 3 }],
        },
      ],
      questions,
    );

    expect(hasil[0].answers[0].nomor).toBe(2);
  });
});
