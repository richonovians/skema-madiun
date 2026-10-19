/**
 * Penjaga untuk `jest.setup.js`, bukan untuk kode produk.
 *
 * `global.File` dirusak oleh penyiapannya sendiri. Barisnya berbunyi
 * `const { ..., File } = require('undici')`, dan sejak undici 8 paket itu tak
 * lagi mengekspor `File` — nilainya `undefined`. Baris `global.File = File`
 * berikutnya lalu MENIMPA implementasi jsdom yang sebenarnya berfungsi.
 *
 * Terukur di `main` pada 19 Oktober 2026: `undici` 8.10.0, `undici.File`
 * bernilai `undefined`, sementara `node:buffer.File` sebuah fungsi.
 *
 * Gejalanya menyesatkan, dan itu sebabnya penjaga ini ada. Yang memerah adalah
 * uji yang kebetulan membangun sebuah berkas, dengan pesan "File is not a
 * constructor" yang menuding uji itu — padahal penyiapan inilah yang
 * merusaknya. Selama itu terjadi, seluruh permukaan lampiran (unggahan
 * pengaduan dan balasan percakapan) mustahil diuji.
 *
 * Penjaganya sengaja langsung dan kecil. Tanpa ia, satu-satunya yang menangkap
 * kekambuhan adalah uji komponen yang memakai `File` secara kebetulan, dan
 * kegagalannya akan menuding tempat yang salah sekali lagi.
 */
describe('penyiapan Jest — global.File', () => {
  it('menyediakan `File` sebagai konstruktor, bukan `undefined`', () => {
    expect(typeof global.File).toBe('function');
  });

  it('membangun berkas yang nama, tipe, dan ukurannya terbaca', () => {
    const berkas = new File(['isi'], 'bukti.png', { type: 'image/png' });

    expect(berkas.name).toBe('bukti.png');
    expect(berkas.type).toBe('image/png');
    // 'isi' = tiga byte. Diperiksa supaya penjaga ini tak lulus atas boneka
    // yang hanya berpura-pura menjadi konstruktor.
    expect(berkas.size).toBe(3);
  });
});
