import { simpanBlob, unduhDariUrl, PESAN_KEDALUWARSA } from '../unduhBerkas';

/**
 * Unduh lampiran dari API (lintas-origin, ber-URL bertanda tangan).
 *
 * KENAPA TIDAK CUKUP `<a download href="...">`: atribut `download` DIABAIKAN
 * peramban untuk URL lintas-origin. Frontend di skema.local mengambil berkas
 * dari api.* / localhost:3001, jadi tautan biasa hanya MEMBUKA gambarnya di tab
 * baru dengan nama acak, bukan menyimpannya. Karena itu berkasnya diambil lewat
 * `fetch` lalu disimpan sebagai blob — dan itu hanya mungkin karena `/uploads`
 * mengirim header CORS (terukur: `Access-Control-Allow-Origin: http://skema.local`).
 *
 * Tautannya juga dapat KEDALUWARSA (baku 1 jam sejak T1, 7 September 2026), jadi
 * 403 harus dibedakan dan diterjemahkan menjadi anjuran yang bisa dikerjakan
 * pengguna, bukan "gagal mengunduh" tanpa keterangan.
 */
describe('simpanBlob', () => {
  let objectUrl;
  let dicabut;
  let diklik;

  beforeEach(() => {
    objectUrl = 'blob:uji-123';
    dicabut = [];
    diklik = [];
    // jsdom tak punya createObjectURL sama sekali.
    URL.createObjectURL = jest.fn(() => objectUrl);
    URL.revokeObjectURL = jest.fn((u) => dicabut.push(u));
    jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function tiruKlik() {
        diklik.push({ href: this.href, download: this.getAttribute('download') });
      });
  });

  afterEach(() => jest.restoreAllMocks());

  it('mengeklik tautan ber-atribut download dengan nama berkasnya', () => {
    simpanBlob(new Blob(['x']), 'Probis_Pengaduan.png');

    expect(diklik).toHaveLength(1);
    expect(diklik[0].href).toBe(objectUrl);
    expect(diklik[0].download).toBe('Probis_Pengaduan.png');
  });

  it('mencabut object URL sesudahnya', () => {
    // Tanpa ini setiap unduhan menahan seluruh berkas di memori tab sampai
    // halaman ditutup -- pada lampiran 5MB itu terasa.
    simpanBlob(new Blob(['x']), 'a.png');

    expect(dicabut).toEqual([objectUrl]);
  });

  it('tidak meninggalkan elemen tautan di dokumen', () => {
    simpanBlob(new Blob(['x']), 'a.png');

    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  });
});

describe('unduhDariUrl', () => {
  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => 'blob:uji');
    URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('mengambil berkasnya lalu menyimpannya', async () => {
    const blob = new Blob(['isi']);
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, blob: async () => blob }));

    await unduhDariUrl('http://api/uploads/complaints/a.png?exp=1&sig=z', 'a.png');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://api/uploads/complaints/a.png?exp=1&sig=z',
      // Tanda tangan di URL SUDAH kredensialnya; cookie sesi tak perlu ikut
      // dikirim ke rute statis.
      expect.objectContaining({ credentials: 'omit' }),
    );
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('403 -> galat yang menyuruh memuat ulang halaman, bukan pesan mentah', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 403, blob: async () => null }));

    await expect(unduhDariUrl('http://api/uploads/a.png?exp=1&sig=z', 'a.png')).rejects.toThrow(
      PESAN_KEDALUWARSA,
    );
  });

  it('galat lain tetap dilaporkan, tidak disunyikan', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500, blob: async () => null }));

    await expect(unduhDariUrl('http://api/uploads/a.png', 'a.png')).rejects.toThrow(/gagal/i);
  });

  it('jaringan mati -> galat, bukan janji yang menggantung', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(unduhDariUrl('http://api/uploads/a.png', 'a.png')).rejects.toThrow(/gagal/i);
  });
});
