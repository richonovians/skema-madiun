import { IDBFactory } from 'fake-indexeddb';
import { ambilDrafSurvei, hapusDrafSurvei, simpanDrafSurvei } from '../drafSurvei';

/**
 * Draf jawaban survei saat sesi berakhir (23 November 2026; pindah ke
 * IndexedDB hari yang sama). Pasangan `drafPengaduan.js`, tanpa lampiran dan
 * selalu ber-TTL 2 jam. SELALU berpemilik.
 */

const T = Date.parse('2026-11-23T08:00:00Z');
const DUA_JAM = 2 * 60 * 60 * 1000;
const JAWABAN = { 1: '4', 2: 'Pelayanannya cepat', 3: '17' };

beforeEach(() => {
  global.indexedDB = new IDBFactory();
});

describe('drafSurvei', () => {
  it('jawaban dan pemiliknya dapat diambil kembali utuh', async () => {
    expect(await simpanDrafSurvei(5, JAWABAN, 10, { sekarang: T })).toBe(true);

    expect(await ambilDrafSurvei(5, { sekarang: T })).toEqual({ answers: JAWABAN, pemilik: 10 });
  });

  it('draf terpisah per survei', async () => {
    await simpanDrafSurvei(5, JAWABAN, 10, { sekarang: T });

    expect(await ambilDrafSurvei(6, { sekarang: T })).toBeNull();
  });

  it('tanpa pemilik, tidak ada yang disimpan', async () => {
    expect(await simpanDrafSurvei(5, JAWABAN, null, { sekarang: T })).toBe(false);
    expect(await simpanDrafSurvei(5, JAWABAN, undefined, { sekarang: T })).toBe(false);

    expect(await ambilDrafSurvei(5, { sekarang: T })).toBeNull();
  });

  it('kedaluwarsa tepat dua jam sesudah disimpan', async () => {
    await simpanDrafSurvei(5, JAWABAN, 10, { sekarang: T });

    expect(await ambilDrafSurvei(5, { sekarang: T + DUA_JAM - 1 })).not.toBeNull();
    expect(await ambilDrafSurvei(5, { sekarang: T + DUA_JAM })).toBeNull();
  });

  it('draf yang dihapus tak dapat diambil lagi', async () => {
    await simpanDrafSurvei(5, JAWABAN, 10, { sekarang: T });
    await hapusDrafSurvei(5);

    expect(await ambilDrafSurvei(5, { sekarang: T })).toBeNull();
  });

  it('jawaban yang bukan objek diperlakukan sebagai tak ada draf', async () => {
    await simpanDrafSurvei(5, 'teks', 10, { sekarang: T });

    expect(await ambilDrafSurvei(5, { sekarang: T })).toBeNull();
  });
});
