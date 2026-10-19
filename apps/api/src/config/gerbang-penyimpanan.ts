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
 * POLA YANG SAMA dipakai proyek ini pada `TURNSTILE_SECRET_KEY`
 * (`turnstile.service.ts`) dan, SEJAK 9 OKTOBER 2026, pada `SWAGGER_ENABLED`.
 * Docblock ini sebelumnya menyebut Swagger sudah bergerbang padahal belum:
 * bawaannya `'true'` dan `NODE_ENV` tak dilihat sama sekali. Sebuah naskah
 * yang mengklaim sifat keamanan yang tak dimiliki kodenya lebih buruk
 * daripada naskah yang diam, sebab ia menghentikan orang dari memeriksanya.
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

/**
 * Gerbang boot untuk penyimpan daftar pencabutan sesi (7 Oktober 2026).
 *
 * MENGAPA PRODUKSI MENOLAK PENYIMPAN DALAM MEMORI. Pemeriksaan sesi gagal
 * tertutup, dan penyimpan dalam memori tidak dibagi antarproses. Dua pekerja
 * API berarti sesi yang diterbitkan satu pekerja ditolak pekerja lainnya, dan
 * gejalanya bagi pengguna adalah aplikasi yang melemparnya keluar secara acak.
 * Satu pekerja pun tetap kehilangan seluruh sesi pada setiap penggelaran.
 *
 * SATU GERBANG, DUA PENYIMPAN (7 Oktober 2026). `REDIS_URL` yang sama juga
 * memilih penyimpan batas laju (lihat ThrottlerModule di app.module.ts). Jadi
 * gerbang ini sekaligus mencegah penghitung laju jatuh ke `Map` per-proses di
 * produksi -- di sana dua pekerja berarti batas yang dapat ditembus dengan
 * berpindah pekerja. Keduanya dijaga satu syarat karena keduanya butuh Redis
 * yang sama.
 *
 * Pola yang sama dengan `periksaPenyimpanan` di atas: kelalaian yang sunyi
 * diubah menjadi kegagalan boot yang berisik, saat orang yang tepat masih
 * memperhatikan.
 */
export function periksaPenyimpanSesi(nodeEnv: string, redisUrl: string | undefined): void {
  if (nodeEnv !== 'production') {
    return;
  }
  if ((redisUrl ?? '').trim() !== '') {
    return;
  }
  throw new Error(
    [
      'REDIS_URL belum diisi.',
      '',
      'Daftar pencabutan sesi DAN penghitung batas laju akan jatuh ke penyimpan ' +
        'DALAM MEMORI, yang tidak dibagi antarproses dan hilang pada setiap ' +
        'penggelaran. Karena pemeriksaan sesi gagal tertutup, akibatnya pengguna ' +
        'terlempar keluar tanpa sebab yang terlihat; dan batas lajunya dapat ' +
        'ditembus dengan berpindah pekerja.',
      '',
      'Isi REDIS_URL, dan pastikan Redis-nya berjalan dengan AOF menyala.',
    ].join('\n'),
  );
}
