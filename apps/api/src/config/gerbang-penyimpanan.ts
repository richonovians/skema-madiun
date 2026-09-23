/**
 * Gerbang boot untuk enkripsi penyimpanan basis data (23 September 2026).
 *
 * INI PERNYATAAN, BUKAN VERIFIKASI, dan kalimat itu harus tetap ada di sini
 * sependek ini. Aplikasi tak dapat memeriksa LUKS atau BitLocker pada host --
 * apalagi dari dalam container. Yang dilakukannya hanyalah menolak menyala di
 * produksi sampai seseorang menyatakan bahwa disknya terenkripsi.
 *
 * MENGAPA ITU TETAP BERGUNA. PostgreSQL versi open source tak punya enkripsi
 * at-rest bawaan, jadi perlindungan satu-satunya adalah enkripsi volume di
 * tingkat sistem operasi -- dan hal yang dikerjakan di luar repositori adalah
 * hal yang paling mudah tak pernah dikerjakan sama sekali. Kelalaian semacam
 * itu tak bergejala: basis datanya jalan sempurna tanpa enkripsi disk. Gerbang
 * ini mengubah kelalaian yang sunyi menjadi kegagalan boot yang berisik, pada
 * saat penggelaran, ketika orang yang tepat masih memperhatikan.
 *
 * POLA YANG SAMA sudah dipakai proyek ini pada `SWAGGER_ENABLED` dan
 * `TURNSTILE_SECRET_KEY`: keduanya menolak keadaan produksi yang berbahaya
 * alih-alih menyala diam-diam.
 *
 * HANYA `'true'` YANG LOLOS. Nilai lain -- kosong, `'mungkin'`, salah ketik --
 * ditolak. Sebuah pernyataan yang tak terbaca sebagai "ya" bukan pernyataan.
 */
const DOKUMEN = 'docs/keamanan/enkripsi-at-rest.md';

export function periksaPenyimpanan(nodeEnv: string, nilai: string | undefined): void {
  if (nodeEnv !== 'production') {
    return;
  }
  if ((nilai ?? '').toLowerCase() === 'true') {
    return;
  }
  throw new Error(
    'DB_STORAGE_ENCRYPTED belum dinyatakan "true".\n' +
      '\n' +
      'PostgreSQL tak punya enkripsi at-rest bawaan, jadi yang melindungi berkas ' +
      'basis data hanyalah enkripsi volume di tingkat sistem operasi (LUKS di ' +
      'Linux, BitLocker di Windows) pada disk yang memuat direktori datanya.\n' +
      '\n' +
      'Aplikasi TIDAK DAPAT memeriksanya sendiri. Baris ini adalah PERNYATAAN ' +
      'Anda bahwa hal itu sudah dikerjakan, bukan verifikasi bahwa ia benar. ' +
      `Cara memastikannya ada di ${DOKUMEN}.\n` +
      '\n' +
      'Setelah benar-benar diperiksa, setel DB_STORAGE_ENCRYPTED=true.',
  );
}
