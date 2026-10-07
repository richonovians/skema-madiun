import { badanPermintaan } from '../lib/snippet';

/**
 * CONTOH BADAN PERMINTAAN SEBAGAI BLOK TERSENDIRI (6 Oktober 2026, permintaan
 * pengguna: "tambahkan request body di halaman dokumentasi api").
 *
 * Sebelum ini contohnya HANYA terbenam di dalam snippet curl/fetch. Orang yang
 * memakai klien lain -- Postman, kode bahasa lain -- harus menambangnya dari
 * perintah shell, dan itu bentuk yang menyuruh pembaca bekerja.
 *
 * MEMAKAI PENYUSUN YANG SAMA dengan snippetnya, bukan penyusun kedua. Dua
 * penyusun berarti dua contoh yang cepat atau lambat menyimpang, dan yang
 * menyimpang tak akan terlihat siapa pun -- keduanya tampak masuk akal.
 */
describe('badanPermintaan', () => {
  const operasi = (over = {}) => ({
    metode: 'POST',
    path: '/api/v1/complaints',
    parameterQuery: [],
    parameterPath: [],
    jenisBadan: 'application/json',
    skemaBadan: {
      wajib: ['judul', 'uraian'],
      properti: [
        { nama: 'judul', tipe: 'string', contoh: 'Jalan rusak', batasan: {} },
        { nama: 'uraian', tipe: 'string', contoh: null, batasan: {} },
        { nama: 'opdId', tipe: 'integer', contoh: null, batasan: {} },
      ],
    },
    ...over,
  });

  it('mengembalikan JSON berindentasi untuk badan application/json', () => {
    const teks = badanPermintaan(operasi());

    expect(teks).toContain('"judul": "Jalan rusak"');
    expect(teks.startsWith('{')).toBe(true);
  });

  it('memuat kolom WAJIB saja, sama seperti snippetnya', () => {
    // `opdId` opsional: menampilkannya di sini akan menyarankan nilai yang tak
    // diminta API, dan membuat blok ini berbeda dari curl/fetch di sebelahnya.
    const teks = badanPermintaan(operasi());

    expect(teks).toContain('uraian');
    expect(teks).not.toContain('opdId');
  });

  it('multipart digambarkan sebagai daftar medan, bukan JSON', () => {
    // `multipart/form-data` tak pernah dikirim sebagai JSON; menampilkannya
    // sebagai JSON akan menyesatkan orang yang menyalinnya.
    const teks = badanPermintaan(operasi({ jenisBadan: 'multipart/form-data' }));

    expect(teks).toContain('judul=');
    expect(teks).not.toContain('{');
  });

  it('operasi tanpa badan mengembalikan null, bukan string kosong', () => {
    // `null` dibedakan dari string kosong supaya komponennya dapat
    // MENYEMBUNYIKAN tabnya, bukan menampilkan blok kosong tanpa keterangan.
    expect(badanPermintaan(operasi({ skemaBadan: null }))).toBeNull();
  });

  it('badan yang seluruh kolomnya opsional juga null', () => {
    expect(badanPermintaan(operasi({ skemaBadan: { wajib: [], properti: [] } }))).toBeNull();
  });
});
