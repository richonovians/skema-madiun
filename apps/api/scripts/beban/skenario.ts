/**
 * SKENARIO UJI BEBAN.
 *
 * Bobotnya ditentukan satu fakta dari pemilik produk: jumlah responden survei
 * TIDAK DAPAT diperkirakan, karena warga tak pasti mau mengisi. Kalau pengisian
 * memang jarang, maka risikonya hampir pasti BUKAN di jalur pengisian. Yang
 * tumbuh tanpa bergantung pada minat siapa pun adalah tabel yang diisi
 * pemakaian administratif -- `surveys`, `complaints`, `notifications` -- dan
 * justru itulah yang dipindai `groupBy` di `dashboard.service.ts`.
 *
 * Karena itu jalur baca administratif didahulukan, dan jalur tulis menyusul.
 *
 * SESI DITERBITKAN SEKALI lewat `dev-login`, lalu Bearer tokennya dipakai
 * ulang -- bukan cookie: `dev-login` mengembalikan token di badan jawaban,
 * sementara cookie `session` milik jalur SSO. Kalau tiap permintaan
 * masuk lebih dulu, yang terukur adalah penerbitan sesinya, bukan endpoint yang
 * dituju.
 *
 * Header `x-dev-*` TIDAK dipakai, dan itu hasil pengukuran bukan pilihan gaya:
 * `AUTH_PROVIDER` hanya mengikat `StubAuthProvider` ketika
 * `NODE_ENV === 'test'`, sedangkan pelari ini berjalan sebagai `development`
 * supaya yang diukur jalur produksi. Dengan header dev yang lengkap,
 * `GET /api/v1/dashboard/ikm` menjawab 401 pada jalan pertama.
 */

export interface Skenario {
  nama: string;
  /** Mengapa ia diukur. Dicetak bersama hasilnya supaya angkanya punya konteks. */
  alasan: string;
  method: 'GET' | 'POST';
  /** `:survei` diganti id survei nyata dari basis data beban. */
  jalur: string;
  /** Header tambahan. Bearer token disisipkan pelarinya, bukan ditulis di sini. */
  headers?: Record<string, string>;
  body?: string;
  /** `true` bila endpoint-nya `@Public()` dan sesi tak diperlukan. */
  publik?: boolean;
  /**
   * Peran yang harus dibawa sesinya. Baku `kabupaten`. `responden` ada karena
   * `@Roles` menolak lintas peran: satu akun memegang keduanya dan pelarinya
   * menerbitkan satu sesi per peran.
   */
  peran?: 'kabupaten' | 'responden';
}

export const SKENARIO: Skenario[] = [
  {
    nama: 'statistik',
    alasan:
      'groupBy seluruh tabel untuk tingkat kabupaten, tanpa penyaring OPD. Tumbuh ' +
      'linear terhadap jumlah pengaduan dan jawaban, dan tumbuhnya tak bergantung ' +
      'pada minat warga mengisi survei.',
    method: 'GET',
    jalur: '/api/v1/statistics',
    // `@Public()` -- terbuka tanpa autentikasi, dan karena itu jalur yang paling
    // terpapar beban dari luar.
    publik: true,
  },
  {
    nama: 'dashboard-ikm',
    alasan: 'Rekapitulasi IKM lintas OPD; pembaca terberat di layar Admin Kabupaten.',
    method: 'GET',
    jalur: '/api/v1/dashboard/ikm',
  },
  {
    nama: 'hasil-ikm',
    alasan:
      'Perhitungan sembilan unsur satu survei, disinggahkan di Redis. Diukur hangat; ' +
      'bedanya dengan jalan dingin itulah nilai singgahannya.',
    method: 'GET',
    jalur: '/api/v1/surveys/:survei/results',
  },
  {
    nama: 'daftar-pengaduan',
    alasan: 'Bacaan berdaftar dengan paginasi dan penyaring lingkup OPD.',
    method: 'GET',
    jalur: '/api/v1/complaints',
  },
  {
    nama: 'isi-survei-baca',
    alasan:
      'Halaman pengisian yang dilihat warga: memuat survei beserta sembilan ' +
      'pertanyaannya. Satu-satunya jalur di daftar ini yang dipukul publik.',
    method: 'GET',
    jalur: '/api/v1/surveys/:survei/fill',
    peran: 'responden',
  },
];
