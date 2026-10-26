import { BASE_URL } from './api';

/**
 * Minta setiap rute sekali supaya `next dev` selesai mengompilasinya.
 *
 * DIPINDAH KE SINI DARI `support/global-setup.js` (20 Oktober 2026), dan
 * pemindahannya bukan kerapian. Sejak merge `fbdf85c`, `playwright.config.ts`
 * memakai `e2e/global-setup.ts` milik `main`, sehingga `global-setup.js` milik
 * cabang ini tidak pernah dipanggil lagi — dan pemanasan ini ikut hilang
 * bersamanya tanpa ada yang menyadarinya. Dengan berdiri sebagai modul
 * sendiri, ia dapat dipanggil dari `beforeAll` tiap spec yang membuka
 * peramban, tanpa menyunting `playwright.config.ts` (berkas milik `main` di
 * cabang ini; menyuntingnya berarti membangun kembali divergensi cabang).
 *
 * Bukan penghias kecepatan, melainkan perbaikan atas kegagalan sungguhan.
 * Server pengembangan Next.js mengompilasi rute saat pertama diminta, dan
 * kunjungan pertama ke halaman berat pernah melewati batas waktu sehingga spec
 * merah. Gejalanya menyesatkan: yang merah BERPINDAH-PINDAH tiap kali
 * dijalankan — begitu satu rute selesai dikompilasi ia tak pernah lambat lagi,
 * lalu giliran rute berikutnya yang belum pernah dibuka. Mudah salah dibaca
 * sebagai proteksi route yang goyah, padahal kompilasilah yang lambat.
 *
 * Gejala itu terlihat lagi pada 20 Oktober 2026, sesudah pemanasannya hilang:
 * `isi-survei` lulus dengan `1 flaky` — percobaan pertama gagal tepat di
 * pernyataan halaman PERTAMA, lalu lulus saat diulang — dan `proteksi-route`
 * memerlukan percobaan ulang pada dua ujinya.
 *
 * Cookie di bawah sengaja PALSU. `proxy.js` hanya memeriksa ADA atau TIDAK
 * cookie sesinya — keabsahannya ditegakkan backend pada tiap panggilan API —
 * jadi cookie ini cukup untuk melewati penjaga navigasi agar halamannya
 * benar-benar dirender dan terkompilasi. Tak satu pun pernyataan uji
 * bergantung padanya: yang dihasilkan pemanasan ini semata-mata cache
 * kompilasi milik server pengembangan.
 *
 * @param {string[]} daftar Rute yang akan diminta, masing-masing sekali.
 */
export async function panaskanRute(daftar) {
  const cookie = 'token=pemanasan; role=kabupaten; consent=1';
  await Promise.all(
    daftar.map((rute) =>
      fetch(`${BASE_URL}${rute}`, { headers: { cookie } }).catch(() => {
        // Kegagalan di sini tak boleh menjatuhkan suite: pemanasan hanyalah
        // pengoptimalan. Bila servernya memang mati, spec-lah yang akan
        // mengatakannya dengan pesan yang jauh lebih jelas.
      }),
    ),
  );
}
