import { BadRequestException } from '@nestjs/common';

/**
 * Aturan lampiran pengaduan — dipisahkan dari ComplaintsService (temuan audit
 * T2, 7 September 2026) supaya dapat diuji sebagai fungsi murni, tanpa satu pun
 * tulisan ke disk. Aturan keamanan yang hanya bisa diuji lewat efek samping
 * cenderung tak diuji sama sekali.
 */

/** Tipe yang diterima, beserta ekstensi TUNGGAL yang dipakai di disk. */
const ALLOWED: Record<string, { ext: string; cocok: (b: Buffer) => boolean }> = {
  'image/jpeg': {
    ext: 'jpg',
    cocok: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  'image/png': {
    ext: 'png',
    cocok: (b) =>
      b.length >= 8 &&
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/webp': {
    ext: 'webp',
    // WEBP = wadah RIFF: "RIFF" + 4 bita panjang + "WEBP".
    cocok: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  'application/pdf': {
    ext: 'pdf',
    cocok: (b) => b.length >= 5 && b.subarray(0, 5).toString('latin1') === '%PDF-',
  },
};

export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set(Object.keys(ALLOWED));

/** Batas panjang nama di disk (kolom `file_url` VarChar(500) menampung UUID + ini). */
const MAX_NAME = 100;

/**
 * Isi berkas harus BENAR-BENAR bertipe seperti yang diakukan.
 *
 * `file.mimetype` datang dari header `Content-Type` pada bagian multipart —
 * yaitu dari PENGIRIM. Memeriksa daftar izin terhadap nilai itu saja hanya
 * menyaring pengirim yang jujur. Angka ajaib di awal berkas datang dari
 * berkasnya sendiri, jadi itulah yang diperiksa di sini.
 *
 * Terbukti dibutuhkan: sebelum ini `probe.svg` berisi `<script>` dengan
 * `Content-Type: image/png` lolos, tersimpan `.svg`, lalu disajikan
 * `image/svg+xml` oleh `express.static` (yang membaca ekstensi).
 */
export function assertAllowedContent(file: Express.Multer.File): void {
  const aturan = ALLOWED[file.mimetype];
  if (!aturan) {
    throw new BadRequestException(
      `Tipe berkas "${file.mimetype}" tidak diizinkan (hanya JPEG/PNG/WEBP/PDF)`,
    );
  }

  const buffer = file.buffer;
  // Buffer kosong DITOLAK, bukan diloloskan: kalau tak ada yang bisa diperiksa,
  // pemeriksaan ini dapat dilewati hanya dengan mengirim 0 bita.
  if (!buffer || buffer.length === 0 || !aturan.cocok(buffer)) {
    throw new BadRequestException(
      `Isi berkas "${file.originalname}" tidak cocok dengan tipe "${file.mimetype}" yang dinyatakan`,
    );
  }
}

/**
 * Nama berkas untuk di disk: dibersihkan, DIPANGKAS, dan ekstensinya diturunkan
 * dari MIME yang sudah divalidasi — bukan dari nama kiriman.
 *
 * Ekstensi itulah yang menentukan `Content-Type` saat `express.static`
 * menyajikannya, jadi membiarkan pengirim memilihnya berarti membiarkan
 * pengirim memilih bagaimana berkasnya dieksekusi di peramban korban.
 *
 * Aturannya SATU dan berlaku seragam: buang ekstensi terakhir apa pun, lalu
 * tambahkan ekstensi milik MIME. Jadi `probe.svg` -> `probe.png`,
 * `foto.png.html` -> `foto.png`, `a.jpeg` -> `a.jpg`. Aturan seragam dipilih
 * atas "tambahkan saja di belakang" karena `foto.png.svg.png` tak dapat dibaca
 * siapa pun, sementara nama pokoknya tetap terjaga di kedua aturan.
 */
export function safeFilename(originalname: string, mimetype: string): string {
  const aturan = ALLOWED[mimetype];
  if (!aturan) {
    // Tak terjangkau lewat jalur normal (assertAllowedContent berjalan lebih
    // dahulu), tapi fungsi ini publik — lebih baik gagal keras daripada
    // menghasilkan nama tanpa ekstensi yang tipenya jadi ditebak peramban.
    throw new BadRequestException(`Tipe berkas "${mimetype}" tidak diizinkan`);
  }
  const ext = `.${aturan.ext}`;

  // Hanya huruf, angka, titik, minus, garis bawah. Ini pula yang melumpuhkan
  // `../` dan pemisah jalur — `path.join` dengan nama ber-`../` akan menulis
  // di luar direktori unggahan.
  let dasar = originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  // Deretan titik diruntuhkan menjadi satu. `/` sudah menjadi `_` di atas
  // sehingga penjelajahan direktori sebenarnya sudah mati, tapi nama yang masih
  // memuat `..` tetap merepotkan alat lain yang membaca kolom ini -- dan
  // menyisakan keraguan yang tak perlu.
  dasar = dasar.replace(/\.{2,}/g, '.');
  // Buang ekstensi TERAKHIR apa pun (1-8 alfanumerik), lalu ekstensi yang benar
  // ditambahkan di bawah. Inilah yang membuat `probe.svg` tak dapat memilih
  // sendiri bagaimana ia disajikan.
  dasar = dasar.replace(/\.[a-zA-Z0-9]{1,8}$/, '');
  // Titik di ujung membuat hasilnya `a..png`; dibuang supaya selalu `nama.ext`.
  dasar = dasar.replace(/\.+$/, '');
  // Sesudah pembuangan di atas, sisanya bisa SUDAH berakhir dengan ekstensi yang
  // benar (`foto.png.html` -> `foto.png`). Menambahkannya lagi menghasilkan
  // `foto.png.png` -- benar secara keamanan, tapi tak terbaca. Kalau sudah pas,
  // biarkan.
  if (dasar.toLowerCase().endsWith(ext)) {
    return dasar.length > MAX_NAME ? dasar.slice(-MAX_NAME) : dasar;
  }
  if (dasar.length === 0) {
    dasar = 'lampiran';
  }
  // Dipangkas dari DEPAN (menyisakan ujung nama, yang biasanya lebih menjelaskan),
  // dan ekstensinya ditambahkan SESUDAH pemangkasan supaya tak pernah terpotong.
  if (dasar.length > MAX_NAME) {
    dasar = dasar.slice(-MAX_NAME);
  }
  return `${dasar}${ext}`;
}
