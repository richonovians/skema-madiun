import { ambilDrafPengaduan, hapusDrafPengaduan, simpanDrafPengaduan } from '../drafPengaduan';

/**
 * Permintaan pengguna 14 September 2026: pengaduan yang ditolak karena
 * persetujuan PDP belum diberikan tak boleh hilang ketika pelapornya pergi ke
 * halaman persetujuan.
 *
 * Cakupannya disepakati sempit dengan sengaja:
 * - disimpan HANYA saat penolakan itu terjadi, bukan pada tiap ketikan --
 *   menyimpan terus-menerus berarti isi pengaduan warga menetap di peramban
 *   sepanjang waktu demi masalah yang hanya muncul di satu alur;
 * - LAMPIRAN DIKECUALIKAN. Objek File tak dapat disimpan di sessionStorage, dan
 *   memindahkannya ke IndexedDB berarti menaruh berkas milik warga di disk
 *   peramban -- di komputer bersama itu persis kekhawatiran yang membuat
 *   penyimpanan terus-menerus ditolak.
 */
const ISI = {
  department: '7',
  category: 'lainnya',
  title: 'Lampu jalan mati',
  description: 'Sudah tiga malam lampu di depan balai desa tidak menyala.',
  isAnonim: true,
};

beforeEach(() => {
  sessionStorage.clear();
});

describe('drafPengaduan', () => {
  it('yang disimpan dapat diambil kembali utuh', () => {
    simpanDrafPengaduan(ISI);

    expect(ambilDrafPengaduan()).toEqual(ISI);
  });

  /**
   * Inti dari batas yang disepakati. Lampiran yang ikut tersimpan bukan sekadar
   * gagal -- ia menaruh berkas warga di penyimpanan peramban tanpa ada yang
   * memutuskannya.
   */
  it('hanya medan teks yang ikut; apa pun selain itu dibuang', () => {
    simpanDrafPengaduan({ ...ISI, files: ['berkas.pdf'], token: 'rahasia' });

    const draf = ambilDrafPengaduan();
    expect(draf.files).toBeUndefined();
    expect(draf.token).toBeUndefined();
    expect(draf.title).toBe(ISI.title);
  });

  it('tanpa draf tersimpan mengembalikan null, bukan objek kosong', () => {
    expect(ambilDrafPengaduan()).toBeNull();
  });

  it('draf yang dihapus tak dapat diambil lagi', () => {
    simpanDrafPengaduan(ISI);
    hapusDrafPengaduan();

    expect(ambilDrafPengaduan()).toBeNull();
  });

  /**
   * Isi yang rusak bisa datang dari versi lama atau dari suntingan tangan. Ia
   * harus diperlakukan seperti "tak ada draf", bukan menjatuhkan seluruh
   * formulir -- kehilangan draf jauh lebih murah daripada halaman yang mati.
   */
  it('isi yang bukan JSON diperlakukan sebagai tak ada draf', () => {
    sessionStorage.setItem('skema:draf-pengaduan', '{bukan json');

    expect(() => ambilDrafPengaduan()).not.toThrow();
    expect(ambilDrafPengaduan()).toBeNull();
  });

  it('JSON sah yang bukan objek juga ditolak', () => {
    sessionStorage.setItem('skema:draf-pengaduan', '"sekadar teks"');

    expect(ambilDrafPengaduan()).toBeNull();
  });

  /**
   * sessionStorage dapat dilarang sepenuhnya (mode privat, kebijakan situs).
   * Menyimpan draf bukan alasan menjatuhkan formulir pengaduan.
   */
  it('penyimpanan yang diblokir tidak menjatuhkan apa pun', () => {
    const asli = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('akses ditolak');
      },
    });

    expect(() => simpanDrafPengaduan(ISI)).not.toThrow();
    expect(() => hapusDrafPengaduan()).not.toThrow();
    expect(ambilDrafPengaduan()).toBeNull();

    Object.defineProperty(window, 'sessionStorage', asli);
  });
});
