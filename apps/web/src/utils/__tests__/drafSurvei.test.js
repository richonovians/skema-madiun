import { ambilDrafSurvei, hapusDrafSurvei, simpanDrafSurvei } from '../drafSurvei';

/**
 * Draf jawaban survei saat sesi berakhir (23 November 2026).
 *
 * Pasangan `drafPengaduan.js` untuk pengisian survei bersesi. Sama-sama di
 * sessionStorage, sebab jawaban uraian dapat memuat data pribadi dan tab yang
 * ditutup harus ikut membuangnya. Berbeda dalam satu hal: draf ini SELALU
 * berpemilik, karena satu-satunya keadaan yang menyimpannya melewati
 * keluar-masuk akun.
 */
const JAWABAN = { 1: '4', 2: 'Pelayanannya cepat', 3: '17' };

beforeEach(() => {
  sessionStorage.clear();
});

describe('drafSurvei', () => {
  it('jawaban dan pemiliknya dapat diambil kembali utuh', () => {
    simpanDrafSurvei(5, JAWABAN, 10);

    expect(ambilDrafSurvei(5)).toEqual({ answers: JAWABAN, pemilik: 10 });
  });

  it('draf terpisah per survei', () => {
    simpanDrafSurvei(5, JAWABAN, 10);

    expect(ambilDrafSurvei(6)).toBeNull();
  });

  /** Draf tanpa pemilik akan dituangkan ke akun siapa pun yang masuk berikutnya. */
  it('tanpa pemilik, tidak ada yang disimpan', () => {
    simpanDrafSurvei(5, JAWABAN, null);
    simpanDrafSurvei(5, JAWABAN, undefined);

    expect(ambilDrafSurvei(5)).toBeNull();
  });

  it('draf yang dihapus tak dapat diambil lagi', () => {
    simpanDrafSurvei(5, JAWABAN, 10);
    hapusDrafSurvei(5);

    expect(ambilDrafSurvei(5)).toBeNull();
  });

  it('isi rusak diperlakukan sebagai tak ada draf', () => {
    sessionStorage.setItem('skema:draf-survei:5', '{bukan json');
    expect(ambilDrafSurvei(5)).toBeNull();

    sessionStorage.setItem('skema:draf-survei:5', JSON.stringify({ answers: 'teks', pemilik: 10 }));
    expect(ambilDrafSurvei(5)).toBeNull();

    sessionStorage.setItem('skema:draf-survei:5', JSON.stringify({ answers: JAWABAN }));
    expect(ambilDrafSurvei(5)).toBeNull();
  });

  it('penyimpanan yang diblokir tidak menjatuhkan apa pun', () => {
    const asli = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('akses ditolak');
      },
    });

    expect(() => simpanDrafSurvei(5, JAWABAN, 10)).not.toThrow();
    expect(() => hapusDrafSurvei(5)).not.toThrow();
    expect(ambilDrafSurvei(5)).toBeNull();

    Object.defineProperty(window, 'sessionStorage', asli);
  });
});
