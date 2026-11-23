import useSurveyStore from '../useSurveyStore';
import { submitSurveyResponse, submitPublicSurveyResponse } from '../../services/surveys.api';
import { tandaiSudahMengisi } from '@/utils/surveyFillMarker';
import { IDBFactory } from 'fake-indexeddb';
import { ambilDrafSurvei, simpanDrafSurvei } from '@/utils/drafSurvei';

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
 * Draf jawaban saat sesi berakhir (23 November 2026; IndexedDB sejak hari
 * yang sama).
 *
 * 401 pada pengiriman menyimpan jawaban dengan id akun pemiliknya, dan survei
 * yang sama dimulai lagi oleh akun yang sama menuangkannya kembali. Karena
 * pembacaannya kini async, dua hal baru dikunci: jawaban yang sempat diisi
 * sebelum draf terbaca tidak ditimpa, dan survei yang sudah ditinggalkan
 * tidak menerima draf yang terlambat datang.
 */
describe('useSurveyStore — draf saat sesi berakhir (401)', () => {
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
    global.indexedDB = new IDBFactory();
    useSurveyStore.getState().resetSurvey();
  });

  it('401 menyimpan jawaban beserta id akun pemiliknya, dan menyebut peramban ini', async () => {
    submitSurveyResponse.mockRejectedValueOnce(galat401());
    await useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });
    useSurveyStore.getState().setAnswer(1, '4');
    useSurveyStore.getState().setAnswer(2, 'Cepat');

    await useSurveyStore.getState().submitSurvey();

    expect(await ambilDrafSurvei(5)).toEqual({ answers: { 1: '4', 2: 'Cepat' }, pemilik: 10 });
    expect(useSurveyStore.getState().submitError).toMatch(/sesi anda sudah berakhir/i);
    expect(useSurveyStore.getState().submitError).toMatch(/disimpan di peramban ini selama 2 jam/i);
  });

  it('401 tanpa pemilik yang diketahui TIDAK menyimpan apa pun', async () => {
    submitSurveyResponse.mockRejectedValueOnce(galat401());
    await useSurveyStore.getState().initSurvey(surveiTiga);
    useSurveyStore.getState().setAnswer(1, '4');

    await useSurveyStore.getState().submitSurvey();

    expect(await ambilDrafSurvei(5)).toBeNull();
    expect(useSurveyStore.getState().submitError).toMatch(/masuk kembali untuk mengirim jawaban/i);
  });

  /** Layar tidak boleh mengaku menyimpan ketika penyimpanannya menolak. */
  it('401 saat IndexedDB tak tersedia tidak mengaku menyimpan', async () => {
    submitSurveyResponse.mockRejectedValueOnce(galat401());
    await useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });
    useSurveyStore.getState().setAnswer(1, '4');
    global.indexedDB = undefined;

    await useSurveyStore.getState().submitSurvey();

    expect(useSurveyStore.getState().submitError).toMatch(/masuk kembali untuk mengirim jawaban/i);
    expect(useSurveyStore.getState().submitError).not.toMatch(/disimpan/i);
  });

  it('galat selain 401 TIDAK menyimpan apa pun', async () => {
    submitSurveyResponse.mockRejectedValueOnce(
      Object.assign(new Error('Terjadi kesalahan pada server.'), { response: { status: 500 } }),
    );
    await useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });
    useSurveyStore.getState().setAnswer(1, '4');

    await useSurveyStore.getState().submitSurvey();

    expect(await ambilDrafSurvei(5)).toBeNull();
  });

  it('survei yang dimulai lagi oleh akun yang sama memulihkan jawabannya', async () => {
    await simpanDrafSurvei(5, { 1: '4', 2: 'Cepat' }, 10);

    await useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });

    const keadaan = useSurveyStore.getState();
    expect(keadaan.answers).toEqual({ 1: '4', 2: 'Cepat' });
    expect(keadaan.jawabanDipulihkan).toBe(true);
    // Diantar ke pertanyaan terakhir, tempat ia menekan Kirim sebelumnya.
    expect(keadaan.currentStepIndex).toBe(2);
    expect(await ambilDrafSurvei(5)).toBeNull();
  });

  it('hanya jawaban untuk pertanyaan yang masih ada yang dipulihkan', async () => {
    await simpanDrafSurvei(5, { 1: '4', 99: 'Lama' }, 10);

    await useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });

    expect(useSurveyStore.getState().answers).toEqual({ 1: '4' });
  });

  it('draf milik akun LAIN dibuang tanpa dituangkan', async () => {
    await simpanDrafSurvei(5, { 1: '4' }, 10);

    await useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 11 });

    expect(useSurveyStore.getState().answers).toEqual({});
    expect(useSurveyStore.getState().jawabanDipulihkan).toBe(false);
    expect(await ambilDrafSurvei(5)).toBeNull();
  });

  it('jawaban yang diisi sebelum draf terbaca tidak ditimpa', async () => {
    await simpanDrafSurvei(5, { 1: '4', 2: 'Lama' }, 10);

    const janji = useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });
    useSurveyStore.getState().setAnswer(2, 'Baru');
    await janji;

    const keadaan = useSurveyStore.getState();
    expect(keadaan.answers).toEqual({ 1: '4', 2: 'Baru' });
    // Responden sudah mulai menjawab, jadi posisinya tidak dipindah.
    expect(keadaan.currentStepIndex).toBe(0);
  });

  it('survei yang direset selagi draf dibaca tidak menerima draf itu', async () => {
    await simpanDrafSurvei(5, { 1: '4' }, 10);

    const janji = useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });
    useSurveyStore.getState().resetSurvey();
    await janji;

    expect(useSurveyStore.getState().answers).toEqual({});
    expect(useSurveyStore.getState().jawabanDipulihkan).toBe(false);
    // Draf dibiarkan, supaya masih ada saat survei itu dibuka lagi.
    expect(await ambilDrafSurvei(5)).not.toBeNull();
  });

  it('pengiriman yang berhasil membuang draf survei itu', async () => {
    await useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });
    await simpanDrafSurvei(5, { 1: '3' }, 10);

    await useSurveyStore.getState().submitSurvey();

    expect(await ambilDrafSurvei(5)).toBeNull();
  });

  it('resetSurvey mengembalikan tanda pemulihan dan pemilik', async () => {
    await simpanDrafSurvei(5, { 1: '4' }, 10);
    await useSurveyStore.getState().initSurvey(surveiTiga, { pemilik: 10 });

    useSurveyStore.getState().resetSurvey();

    expect(useSurveyStore.getState().jawabanDipulihkan).toBe(false);
    expect(useSurveyStore.getState().pemilik).toBeNull();
  });
});
