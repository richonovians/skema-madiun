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
import type { PeranBeban } from './lib/akun-beban';

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
   * Peran yang harus dibawa sesinya. Baku `kabupaten`. Peran lain ada karena
   * `@Roles` menolak lintas peran: satu akun memegang semuanya dan pelarinya
   * menerbitkan satu sesi per peran (`PERAN_BEBAN`).
   */
  peran?: PeranBeban;
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
  {
    nama: 'dashboard-opd',
    alasan:
      'Ringkasan satu OPD di layar Admin OPD: hitungan respons dan pengaduan, ' +
      'jawaban teks, tren IKM. Tanpa singgahan, jadi setiap permintaan adalah ' +
      'jalan dingin. Ikut menerima penyaring Sampah BUG-013.',
    method: 'GET',
    jalur: '/api/v1/dashboard/opd',
    peran: 'opd',
  },
];

/**
 * SKENARIO TULIS (§11 `docs/TEST_BEBAN.md`, dijalankan 19 November 2026).
 *
 * DAFTAR TERPISAH dari `SKENARIO`, dan itu dijaga uji. `--semua` sudah tercatat
 * di dokumen sebagai perintah pengukuran baca dengan syarat selisih baris nol;
 * menyatukannya membuat perintah lama diam-diam menulis ribuan baris. Skenario
 * tulis dipilih lewat `--skenario=` atau `--semua-tulis`.
 *
 * Bentuk permintaannya disusun pelari menurut `jenis`, karena tak satu pun dari
 * keempatnya muat di tubuh statis: lampiran butuh multipart berisi PNG, jawaban
 * butuh id pertanyaan dari basis data dan sesi yang diputar, dan batas harian
 * bukan autocannon sama sekali melainkan 50 permintaan `Promise.all`.
 */
export interface SkenarioTulis {
  nama: string;
  alasan: string;
  method: 'POST';
  /** `:survei` diganti id survei `allow_multiple_submit` di basis data beban. */
  jalur: string;
  jenis: 'pengaduan' | 'pengaduan-lampiran' | 'jawaban' | 'batas-harian';
  /**
   * `true` = server dinyalakan dengan `COMPLAINT_DAILY_LIMIT` BAKU (10), bukan
   * yang dilonggarkan. Hanya skenario ketepatan batas harian yang memakainya.
   */
  batasHarianAsli?: boolean;
  /**
   * Jumlah permintaan autocannon, menggantikan durasi. Lihat uji "jumlah tetap
   * skenario tulis": durasi meninggalkan permintaan yang masih terbang saat
   * berhenti, dan baris yang ditulisnya tak punya jawaban 2xx pasangannya.
   * Dapat ditimpa `--jumlah=`. `kirim-jawaban` tak memakainya; jumlahnya
   * ditentukan batas `@Throttle` (akun x 10).
   */
  jumlahBaku?: number;
}

export const SKENARIO_TULIS: SkenarioTulis[] = [
  {
    nama: 'kirim-pengaduan',
    alasan:
      'POST /complaints multipart tanpa lampiran, satu akun, batas harian dilonggarkan. ' +
      'Dua kolom dienkripsi, satu baris riwayat, notifikasi, dan audit per permintaan.',
    method: 'POST',
    jalur: '/api/v1/complaints',
    jenis: 'pengaduan',
    jumlahBaku: 1000,
  },
  {
    nama: 'kirim-pengaduan-lampiran',
    alasan:
      'Sama, dengan satu PNG 1 MB yang diperiksa isinya, dienkripsi AES-256-GCM, lalu ' +
      'ditulis ke UPLOAD_DIR khusus beban.',
    method: 'POST',
    jalur: '/api/v1/complaints',
    jenis: 'pengaduan-lampiran',
    // 500 x 1 MB terenkripsi = sekitar 500 MB di `uploads-beban/` sebelum dihapus.
    jumlahBaku: 500,
  },
  {
    nama: 'kirim-jawaban',
    alasan:
      'POST /surveys/:id/responses atas survei allow_multiple_submit, sembilan jawaban ' +
      'skala; sesi diputar di antara akun responden beban supaya @Throttle 10/menit ' +
      'per pengguna tak tersentuh.',
    method: 'POST',
    jalur: '/api/v1/surveys/:survei/responses',
    jenis: 'jawaban',
  },
  {
    nama: 'batas-harian-serentak',
    alasan:
      'KETEPATAN, bukan kecepatan: 50 pengaduan serentak dari satu akun dengan batas ' +
      'harian ASLI 10. Batasnya dihitung lalu ditulis; lebih dari 10 diterima = temuan.',
    method: 'POST',
    jalur: '/api/v1/complaints',
    jenis: 'batas-harian',
    batasHarianAsli: true,
  },
];
