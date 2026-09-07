/**
 * Redaksi badan permintaan sebelum masuk `audit_logs.detail`
 * (temuan audit T8, 7 September 2026).
 *
 * MASALAHNYA: `AuditInterceptor` menyalin SELURUH `request.body`. Untuk
 * `POST /users` & `PATCH /users/:id` itu berarti nama dan email yang diketik
 * admin ikut tersalin ke tabel kedua — tanpa daftar redaksi, tanpa batas ukuran,
 * dan tabel itu dapat dibaca superuser lewat `GET /audit-logs`. Di sistem yang
 * membangun gerbang persetujuan UU PDP, menggandakan data pribadi tanpa alasan
 * adalah kebalikan dari minimalisasi data.
 *
 * PRINSIPNYA: audit log perlu tahu APA YANG DISENTUH, bukan ISI datanya. Karena
 * itu KUNCInya dipertahankan dan hanya NILAInya disunting — "nama diubah" tetap
 * terekam, "diubah menjadi Budi Santoso" tidak. Membuang kuncinya sekalian akan
 * merusak gunanya audit log.
 *
 * DAFTAR TOLAK, bukan daftar izin, dan itu pilihan yang disadari. Daftar izin
 * lebih aman secara baku, tapi ia membuat setiap field baru hilang dari audit
 * sampai seseorang ingat menambahkannya — kegagalan yang sunyi, dan yang hilang
 * justru bukti penyalahgunaan wewenang. Daftar tolak gagal ke arah "terlalu
 * banyak tercatat", yang terlihat dan dapat diperbaiki. Konsekuensinya: daftar
 * ini WAJIB ditambah ketika ada field pribadi baru.
 */

/** Pengganti nilai yang disunting. Tersurat, supaya tak terbaca sebagai data. */
export const PENANDA_DISUNTING = '[disunting]';

/**
 * Nama kunci yang nilainya tak boleh masuk audit log.
 *
 * Tiga kelompok:
 *  - identitas orang (`nama`, `email`, `ssoSubject`);
 *  - teks bebas yang dapat memuat cerita pribadi (`catatan`, `uraian`, `pesan`,
 *    `jawaban`, `komentar`, `saran`) — di sistem pengaduan, isi keluhan justru
 *    bagian paling pribadinya;
 *  - kredensial (`password`, `token`, `secret`, `sig`, `authorization`) —
 *    belum ada endpoint teraudit yang menerimanya, dan itulah gunanya: begitu
 *    ada, ia tak ikut tercetak ke tabel yang dibaca manusia.
 *
 * SENGAJA TIDAK di sini: `roles`, `opdId`, `isActive`, `status`, `kategori`.
 * Justru itulah yang harus terbaca saat memeriksa penyalahgunaan wewenang —
 * peran apa yang diberikan, ke OPD mana, status apa yang diubah.
 */
const KUNCI_SENSITIF = new Set([
  'nama',
  'email',
  'ssosubject',
  'catatan',
  'uraian',
  'pesan',
  'jawaban',
  'komentar',
  'saran',
  'password',
  'token',
  'secret',
  'sig',
  'authorization',
]);

/** Panjang teks maksimum per nilai sebelum dipangkas. */
const MAKS_TEKS = 200;

/**
 * Kedalaman maksimum. Bukan cuma perlindungan dari struktur patologis: tanpa
 * batas, satu badan bersarang dalam dapat membuat `detail` membesar tak wajar
 * pada setiap penyuntingan.
 */
const MAKS_KEDALAMAN = 6;

export function redactAuditBody(value: unknown, kedalaman = 0): unknown {
  if (kedalaman > MAKS_KEDALAMAN) {
    return '[terlalu dalam]';
  }

  if (typeof value === 'string') {
    return value.length > MAKS_TEKS
      ? `${value.slice(0, MAKS_TEKS)}… [dipangkas dari ${value.length} karakter]`
      : value;
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactAuditBody(item, kedalaman + 1));
  }

  // Objek baru, BUKAN penyuntingan di tempat: interceptor berjalan pada
  // `request.body` yang masih dipakai handler, jadi menyunting objek aslinya
  // akan merusak permintaan yang sedang berjalan.
  const keluar: Record<string, unknown> = {};
  for (const [kunci, isi] of Object.entries(value as Record<string, unknown>)) {
    keluar[kunci] = KUNCI_SENSITIF.has(kunci.toLowerCase())
      ? PENANDA_DISUNTING
      : redactAuditBody(isi, kedalaman + 1);
  }
  return keluar;
}
