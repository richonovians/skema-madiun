import useSurveyStore from '../useSurveyStore';
import { submitSurveyResponse, submitPublicSurveyResponse } from '../../services/surveys.api';
import { tandaiSudahMengisi } from '@/utils/surveyFillMarker';

jest.mock('../../services/surveys.api', () => ({
  submitSurveyResponse: jest.fn().mockResolvedValue({ id: 1 }),
  submitPublicSurveyResponse: jest.fn().mockResolvedValue({ id: 2 }),
}));
jest.mock('@/utils/surveyFillMarker', () => ({
  tandaiSudahMengisi: jest.fn(),
  sudahMengisiDiPeramban: jest.fn().mockReturnValue(false),
}));

const survei = { id: 5, title: 'S', questions: [{ id: 1, type: 'scale_1_to_4' }] };

describe('useSurveyStore — mode anonim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSurveyStore.getState().resetSurvey();
  });

  it('mode bersesi (baku) memakai endpoint berpenjaga', async () => {
    useSurveyStore.getState().initSurvey(survei);
    useSurveyStore.getState().setAnswer(1, '4');

    const hasil = await useSurveyStore.getState().submitSurvey();

    expect(hasil.success).toBe(true);
    expect(submitSurveyResponse).toHaveBeenCalledTimes(1);
    expect(submitPublicSurveyResponse).not.toHaveBeenCalled();
    // Penanda peramban hanya untuk jalur anonim -- responden bersesi sudah
    // dijaga dedupeUserId di backend.
    expect(tandaiSudahMengisi).not.toHaveBeenCalled();
  });

  it('mode anonim memakai endpoint publik dan menandai peramban', async () => {
    useSurveyStore.getState().initSurvey(survei, { anonim: true });
    useSurveyStore.getState().setAnswer(1, '4');

    const hasil = await useSurveyStore.getState().submitSurvey();

    expect(hasil.success).toBe(true);
    expect(submitPublicSurveyResponse).toHaveBeenCalledTimes(1);
    expect(submitSurveyResponse).not.toHaveBeenCalled();
    expect(tandaiSudahMengisi).toHaveBeenCalledWith(5);
  });

  /**
   * Token captcha (14 September 2026). Ia diperoleh belakangan -- widget-nya
   * memanggil balik sesudah pengunjung lolos -- jadi ia TIDAK boleh ikut
   * `dataPublik` yang diisi sekali di gerbang awal. Token Turnstile juga
   * kedaluwarsa dalam hitungan menit, sedangkan mengisi survei bisa lebih lama.
   */
  it('token captcha ikut terkirim pada jalur publik', async () => {
    useSurveyStore.getState().initSurvey(survei, { anonim: true });
    useSurveyStore.getState().setCaptchaToken('token-dari-widget');

    await useSurveyStore.getState().submitSurvey();

    const argumen = submitPublicSurveyResponse.mock.calls[0];
    expect(argumen[3].captchaToken).toBe('token-dari-widget');
  });

  it('pengiriman anonim yang GAGAL tidak menandai peramban', async () => {
    submitPublicSurveyResponse.mockRejectedValueOnce(new Error('jaringan'));
    useSurveyStore.getState().initSurvey(survei, { anonim: true });

    const hasil = await useSurveyStore.getState().submitSurvey();

    expect(hasil.success).toBe(false);
    // Menandai lebih dulu akan mengunci responden dari survei yang belum tersimpan.
    expect(tandaiSudahMengisi).not.toHaveBeenCalled();
  });

  it('resetSurvey mengembalikan mode ke bersesi', () => {
    useSurveyStore.getState().initSurvey(survei, { anonim: true });
    expect(useSurveyStore.getState().isAnonimMode).toBe(true);

    useSurveyStore.getState().resetSurvey();

    expect(useSurveyStore.getState().isAnonimMode).toBe(false);
  });
});

/**
 * PILIHAN GERBANG BERSESI DITERUSKAN SAMPAI PENGIRIMAN (1 Oktober 2026).
 *
 * DIPERSEMPIT pada sore hari yang sama. Berkas ini semula menjaga DUA medan --
 * `tanpaDataDiri` dan `nomorHp` -- karena nomor HP sempat dikirim dari klien.
 * Nomor itu kini DISALIN BACKEND DARI AKUN, sehingga tak ada lagi rantai klien
 * yang perlu dijaga untuknya; yang tersisa justru menjadi pagar: memastikan
 * nomor tak pernah lagi berangkat dari sini.
 *
 * Yang mudah putus bukan medannya satu per satu melainkan JALANNYA: gerbang ->
 * halaman -> store -> pemanggilan API. Komponen gerbangnya punya ujinya
 * sendiri, backend punya miliknya; bagian tengah inilah yang selama ini tak
 * dijaga siapa pun.
 */
describe('useSurveyStore — pilihan gerbang bersesi diteruskan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSurveyStore.getState().resetSurvey();
  });

  const kirim = async (opsi) => {
    useSurveyStore.getState().initSurvey(survei, opsi);
    useSurveyStore.getState().setAnswer(1, '4');
    await useSurveyStore.getState().submitSurvey();
    return submitSurveyResponse.mock.calls[0];
  };

  it('pilihan anonim sampai ke pemanggilan API', async () => {
    const panggilan = await kirim({ tanpaDataDiri: true });

    expect(panggilan[3]).toBe(true);
  });

  it('tanpa pilihan anonim: false yang diteruskan, bukan undefined', async () => {
    const panggilan = await kirim({});

    expect(panggilan[3]).toBe(false);
  });

  /**
   * PAGAR, bukan sekadar kerapian. Selama klien masih mengirim nomor HP, siapa
   * pun dapat menaruh nomor orang lain pada responsnya sendiri. Sejak nomor
   * disalin backend dari akun, argumen itu tak boleh ada lagi -- dan uji ini
   * yang menahannya kembali.
   */
  it('TIDAK mengirim nomor HP dari klien sama sekali', async () => {
    const panggilan = await kirim({});

    expect(panggilan).toHaveLength(4);
    expect(panggilan[4]).toBeUndefined();
  });

  it('store tak lagi menyimpan nomor HP', () => {
    useSurveyStore.getState().initSurvey(survei, { tanpaDataDiri: false });

    expect(useSurveyStore.getState()).not.toHaveProperty('nomorHp');
  });

  it('resetSurvey mengembalikan pilihan anonim ke false', async () => {
    // Pilihan dari survei sebelumnya yang tertinggal akan diam-diam berlaku
    // pada survei berikutnya, tanpa pengisi pernah memilihnya lagi.
    useSurveyStore.getState().initSurvey(survei, { tanpaDataDiri: true });
    useSurveyStore.getState().resetSurvey();

    expect(useSurveyStore.getState().tanpaDataDiri).toBe(false);
  });
});

/**
 * Draf jawaban saat sesi berakhir (23 November 2026).
 *
 * Sebelumnya 401 pada pengiriman hanya menyisakan pesan galat, dan jawaban
 * yang hanya ada di memori store hilang begitu responden masuk ulang. Kini
 * jawaban disimpan ke sessionStorage dengan id akun pemiliknya, dan dituangkan
 * kembali saat survei yang sama dimulai oleh akun yang sama.
 */
describe('useSurveyStore — draf saat sesi berakhir (401)', () => {
  const KUNCI = 'skema:draf-survei:5';
  const draf = () => JSON.parse(sessionStorage.getItem(KUNCI) ?? 'null');
  const galat401 = () =>
    Object.assign(new Error('Autentikasi diperlukan'), { response: { status: 401 } });
  const surveiTiga = {
    id: 5,
    title: 'S',
    questions: [
      { id: 1, type: 'scale_1_to_4' },
      { id: 2, type: 'text' },
      { id: 3, type: 'scale_1_to_4' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    useSurveyStore.getState().resetSurvey();
  });

  it('401 menyimpan jawaban beserta id akun pemiliknya', async () => {
    submitSurveyResponse.mockRejectedValueOnce(galat401());
    useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });
    useSurveyStore.getState().setAnswer(1, '4');
    useSurveyStore.getState().setAnswer(2, 'Cepat');

    await useSurveyStore.getState().submitSurvey();

    expect(draf()).toEqual({ answers: { 1: '4', 2: 'Cepat' }, pemilik: 10 });
    expect(useSurveyStore.getState().submitError).toMatch(/sesi anda sudah berakhir/i);
    expect(useSurveyStore.getState().submitError).toMatch(/disimpan sementara/i);
  });

  it('401 tanpa pemilik yang diketahui TIDAK menyimpan apa pun', async () => {
    submitSurveyResponse.mockRejectedValueOnce(galat401());
    useSurveyStore.getState().initSurvey(surveiTiga);
    useSurveyStore.getState().setAnswer(1, '4');

    await useSurveyStore.getState().submitSurvey();

    expect(draf()).toBeNull();
    expect(useSurveyStore.getState().submitError).toMatch(/sesi anda sudah berakhir/i);
  });

  it('galat selain 401 TIDAK menyimpan apa pun', async () => {
    submitSurveyResponse.mockRejectedValueOnce(
      Object.assign(new Error('Terjadi kesalahan pada server.'), { response: { status: 500 } }),
    );
    useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });
    useSurveyStore.getState().setAnswer(1, '4');

    await useSurveyStore.getState().submitSurvey();

    expect(draf()).toBeNull();
  });

  it('survei yang dimulai lagi oleh akun yang sama memulihkan jawabannya', () => {
    sessionStorage.setItem(KUNCI, JSON.stringify({ answers: { 1: '4', 2: 'Cepat' }, pemilik: 10 }));

    useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });

    const keadaan = useSurveyStore.getState();
    expect(keadaan.answers).toEqual({ 1: '4', 2: 'Cepat' });
    expect(keadaan.jawabanDipulihkan).toBe(true);
    // Diantar ke pertanyaan terakhir, tempat ia menekan Kirim sebelumnya.
    expect(keadaan.currentStepIndex).toBe(2);
    expect(draf()).toBeNull();
  });

  /**
   * Admin dapat mengubah kuesioner di antara dua waktu itu. Jawaban untuk
   * pertanyaan yang sudah tiada akan ditolak backend sebagai id tak dikenal.
   */
  it('hanya jawaban untuk pertanyaan yang masih ada yang dipulihkan', () => {
    sessionStorage.setItem(KUNCI, JSON.stringify({ answers: { 1: '4', 99: 'Lama' }, pemilik: 10 }));

    useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });

    expect(useSurveyStore.getState().answers).toEqual({ 1: '4' });
  });

  it('draf milik akun LAIN dibuang tanpa dituangkan', () => {
    sessionStorage.setItem(KUNCI, JSON.stringify({ answers: { 1: '4' }, pemilik: 10 }));

    useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 11 });

    expect(useSurveyStore.getState().answers).toEqual({});
    expect(useSurveyStore.getState().jawabanDipulihkan).toBe(false);
    expect(draf()).toBeNull();
  });

  it('pengiriman yang berhasil membuang draf survei itu', async () => {
    sessionStorage.setItem(KUNCI, JSON.stringify({ answers: { 1: '4' }, pemilik: 10 }));
    useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });
    sessionStorage.setItem(KUNCI, JSON.stringify({ answers: { 1: '3' }, pemilik: 10 }));

    await useSurveyStore.getState().submitSurvey();

    expect(draf()).toBeNull();
  });

  it('resetSurvey mengembalikan tanda pemulihan dan pemilik', () => {
    sessionStorage.setItem(KUNCI, JSON.stringify({ answers: { 1: '4' }, pemilik: 10 }));
    useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });

    useSurveyStore.getState().resetSurvey();

    expect(useSurveyStore.getState().jawabanDipulihkan).toBe(false);
    expect(useSurveyStore.getState().pemilik).toBeNull();
  });
});
