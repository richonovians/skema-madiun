import path from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { assertAllowedContent, safeFilename } from './attachment.util';

/**
 * TEMUAN AUDIT T2 (7 September 2026), dan ini serangan yang SUDAH SAYA
 * BUKTIKAN berjalan sebelum perbaikan ini:
 *
 *   unggah `probe.svg` berisi `<svg><script>...</script></svg>` dengan
 *   `Content-Type: image/png`  ->  lolos daftar izin MIME (yang memeriksa
 *   header kiriman klien, bukan isinya)  ->  tersimpan `<uuid>-probe.svg`  ->
 *   `express.static` menentukan tipe dari EKSTENSI, jadi disajikan sebagai
 *   `image/svg+xml` dari origin API.
 *
 * Skripnya waktu itu diblokir CSP (`script-src 'self'`) — jadi belum
 * tereksploitasi. Tapi satu-satunya penghalangnya adalah sebuah header, dan
 * header di rute `/uploads` itu SUDAH pernah dilonggarkan sekali
 * (`Cross-Origin-Resource-Policy`, lihat main.ts). Bergantung pada satu lapis
 * yang sudah terbukti bisa digeser bukan pertahanan.
 *
 * Dua penutup, dan keduanya perlu:
 *   1. `assertAllowedContent` — isinya harus BENAR-BENAR bertipe seperti yang
 *      diakukan. Header kiriman datang dari penyerang; angka ajaib di awal
 *      berkas datang dari berkasnya sendiri.
 *   2. `safeFilename` — ekstensi di disk diturunkan dari MIME yang sudah
 *      divalidasi, bukan dari nama kiriman. Jadi walau kelak ada tipe yang
 *      lolos, ia tak dapat memilih sendiri bagaimana dirinya disajikan.
 */
const berkas = (mimetype: string, buffer: Buffer, originalname = 'a.bin') =>
  ({ mimetype, buffer, originalname, size: buffer.length }) as unknown as Express.Multer.File;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PDF = Buffer.from('%PDF-1.7\n...');
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x1a, 0, 0, 0]),
  Buffer.from('WEBP'),
  Buffer.from([1, 2, 3]),
]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const HTML = Buffer.from('<!doctype html><script>alert(1)</script>');

describe('assertAllowedContent — isi harus cocok dengan MIME yang diakukan', () => {
  it('SVG yang mengaku image/png DITOLAK (serangan yang terbukti)', () => {
    expect(() => assertAllowedContent(berkas('image/png', SVG, 'probe.svg'))).toThrow(
      BadRequestException,
    );
  });

  it('HTML yang mengaku image/jpeg DITOLAK', () => {
    expect(() => assertAllowedContent(berkas('image/jpeg', HTML, 'x.jpg'))).toThrow(
      BadRequestException,
    );
  });

  it('PDF yang mengaku image/png DITOLAK — walau keduanya tipe yang diizinkan', () => {
    // Bukan cuma "tipe terlarang" yang berbahaya: berkas yang tipenya benar
    // TAPI diakukan sebagai tipe lain tetap membuat sajiannya salah.
    expect(() => assertAllowedContent(berkas('image/png', PDF, 'x.png'))).toThrow(
      BadRequestException,
    );
  });

  it.each([
    ['image/png', PNG],
    ['image/jpeg', JPEG],
    ['image/webp', WEBP],
    ['application/pdf', PDF],
  ])('%s dengan isi yang benar DITERIMA', (mime, buf) => {
    expect(() => assertAllowedContent(berkas(mime, buf as Buffer))).not.toThrow();
  });

  it('berkas kosong ditolak, bukan diloloskan karena tak ada yang bisa dibaca', () => {
    // Angka ajaib tak dapat diperiksa pada buffer kosong; meloloskannya berarti
    // pemeriksaan ini dapat dilewati hanya dengan mengirim 0 bita.
    expect(() => assertAllowedContent(berkas('image/png', Buffer.alloc(0)))).toThrow(
      BadRequestException,
    );
  });

  it('tipe di luar daftar izin ditolak', () => {
    expect(() =>
      assertAllowedContent(berkas('application/zip', Buffer.from('PK\u0003\u0004'))),
    ).toThrow(BadRequestException);
  });
});

describe('safeFilename — ekstensi ditentukan MIME, bukan nama kiriman', () => {
  it('nama .svg pada berkas image/png disimpan sebagai .png', () => {
    expect(safeFilename('probe.svg', 'image/png')).toBe('probe.png');
  });

  it('ekstensi ganda tak menyelundupkan .html', () => {
    // `.html` dibuang sebagai ekstensi terakhir, lalu `.png` ditambahkan.
    expect(safeFilename('foto.png.html', 'image/png')).toBe('foto.png');
  });

  it('nama tanpa ekstensi tetap mendapat ekstensi yang benar', () => {
    expect(safeFilename('tanpa-ekstensi', 'application/pdf')).toBe('tanpa-ekstensi.pdf');
  });

  it('jpeg dinormalkan ke satu ekstensi', () => {
    expect(safeFilename('a.jpeg', 'image/jpeg')).toBe('a.jpg');
    expect(safeFilename('a.JPG', 'image/jpeg')).toBe('a.jpg');
  });

  it('penjelajahan direktori dilumpuhkan', () => {
    // `path.join` dengan nama ber-`../` akan keluar dari direktori unggahan.
    // Yang dijaga: hasilnya SATU segmen jalur, dan `path.join` tetap di dalam.
    const hasil = safeFilename('../../../etc/passwd', 'application/pdf');
    expect(hasil).not.toContain('..');
    // Satu pemeriksaan yang mencakup kedua pemisah jalur sekaligus: apa pun
    // isinya, hasil `path.join` harus tetap TEPAT di dalam direktori unggahan.
    const dir = path.join('/unggahan');
    expect(path.dirname(path.join(dir, hasil))).toBe(dir);
    expect(hasil.endsWith('.pdf')).toBe(true);
  });

  it('nama sangat panjang dipangkas tapi ekstensinya tetap utuh', () => {
    const hasil = safeFilename('x'.repeat(500) + '.png', 'image/png');
    expect(hasil.length).toBeLessThanOrEqual(104);
    expect(hasil.endsWith('.png')).toBe(true);
  });

  it('nama kosong tetap menghasilkan nama yang dapat dipakai', () => {
    expect(safeFilename('', 'image/png')).toBe('lampiran.png');
  });
});
