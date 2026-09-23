import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Origin pengujian (16 September 2026). SEBELUMNYA `http://localhost:3000`, dan
 * itu alamat yang justru TIDAK melayani API di proyek ini: reverse proxy
 * menyatukan frontend & backend pada satu origin, dan `NEXT_PUBLIC_API_URL`
 * bernilai relatif (`/api/v1`), sehingga membuka port 3000 langsung membuat
 * setiap panggilan API jatuh ke Next.js dan dijawab 404. Uji yang berjalan di
 * sana memakai aplikasi yang tak pernah mendapat data.
 *
 * Dapat ditimpa lewat `E2E_ORIGIN`, dan nilainya sengaja sama dengan yang
 * dipakai berkas spec supaya keduanya tak bisa berselisih diam-diam.
 */
const ORIGIN = process.env.E2E_ORIGIN ?? 'http://skema.local';

export default defineConfig({
  testDir: './e2e',
  /**
   * Sesi diterbitkan SEKALI di sini, bukan di tiap worker: setiap dev-login
   * menulis satu baris `audit_logs` ke basis data yang dipakai tim (lihat
   * e2e/global-setup.ts). Berjalan tanpa `E2E_IDENTIFIER` pun aman -- spec yang
   * butuh sesi melewati dirinya sendiri dengan pesan yang menyebutkan caranya.
   */
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /**
   * SATU worker, juga di mesin sendiri. Sebelumnya lokal memakai bawaan
   * Playwright (setengah jumlah inti -- empat di mesin 8 inti), dan empat
   * peramban yang meminta rute berbeda serentak melampaui satu kompilator
   * `next dev`: halamannya tersaji sebelum CSS dan bundel JS-nya jadi.
   *
   * Terukur 21 September 2026, satu variabel diubah:
   *
   *   4 worker -> 4, lalu 2, lalu 1 gagal; 3, 4, 5 dilewati
   *   1 worker -> 0 gagal, 75 lulus, 3 dilewati
   *
   * Yang paling berbahaya bukan kegagalannya melainkan penyamarannya:
   * beberapa uji memakai `test.skip((await tombol.count()) === 0, ...)`,
   * sehingga tombol yang BELUM SEMPAT DIRENDER menjadi "dilewati", bukan
   * "gagal". Angkanya lalu tampak membaik tiap jalan padahal yang tak terukur
   * tetap sama banyaknya.
   *
   * Harganya ~6 menit, bukan ~3. Yang 3 menit itu tak ada gunanya.
   */
  workers: 1,

  /**
   * SATU PERCOBAAN ULANG (23 September 2026).
   *
   * MENGAPA, DAN BUKAN "SUPAYA HIJAU". Suite ini memerah pada 1-3 uji dari ~85
   * setiap lari penuh, SELALU uji yang berbeda, dan seluruhnya hijau ketika
   * berkasnya dijalankan sendirian. Akibatnya lari penuh tak pernah dapat
   * hijau -- dan suite yang selalu merah mengajari orang mengabaikannya, yang
   * berarti regresi sungguhan pun ikut lewat tanpa dilihat. Itu bahaya yang
   * sedang berlangsung, bukan hipotetis.
   *
   * INI TIDAK MENYEMBUNYIKAN KEGAGALAN. Uji yang gagal DUA KALI tetap `failed`
   * dan kode keluarnya tetap 1. Yang lulus pada percobaan kedua masuk kategori
   * `flaky` yang TERPISAH dari `passed` -- jadi kegoyahannya tercatat dan dapat
   * dihitung, bukan lenyap.
   *
   * ONGKOSNYA NOL PADA LARI SEHAT: uji yang lulus tak pernah diulang.
   *
   * SEBABNYA SUDAH DICARI DAN BUKAN KOMPILASI. Dugaan bahwa `next dev`
   * mengompilasi rute saat pertama diminta sempat diuji dengan menjalankan
   * seluruh suite terhadap build produksi (lihat scripts/server-e2e.mjs):
   * hasilnya 1/2/1 kegagalan versus 1/0/3 pada server dev -- tidak lebih baik.
   * Gejalanya pun tak seragam; salah satunya tombol yang terender rapi tetapi
   * `disabled` selama 15 detik, yang mematahkan seluruh teori "halaman belum
   * siap". Akar masalah tunggal tampaknya memang tidak ada.
   *
   * Menghidupkan ini sekaligus menghidupkan `trace: 'on-first-retry'` di bawah,
   * yang selama ini tak pernah dapat berjalan karena percobaan ulangnya tak
   * pernah ada. Jejak itulah yang akan menjelaskan kegoyahan berikutnya.
   */
  retries: 1,

  reporter: 'html',
  use: {
    baseURL: ORIGIN,
    trace: 'on-first-retry',
  },
  /**
   * `channel: 'chrome'` memakai Chrome yang SUDAH terpasang di mesin, bukan
   * chromium bawaan Playwright. Tanpa itu `pnpm test:e2e` berhenti seketika di
   * mesin mana pun yang belum menjalankan `playwright install`, dengan galat
   * "Executable doesn't exist" alih-alih hasil uji. Terukur 16 September 2026:
   * itulah yang terjadi di sini.
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  /**
   * Dijalankan dari AKAR repositori, bukan dari apps/web: `pnpm dev` di sini
   * hanya menyalakan frontend, sementara uji e2e menempuh jalur yang sama
   * dengan pengguna dan karenanya butuh backend juga.
   *
   * Nginx (docker compose) TIDAK ikut dinyalakan dari sini, dan memang tak
   * bisa: ia yang menyajikan origin di atas. Bila Docker mati, Playwright
   * menunggu `url` sampai batas waktu lalu berhenti dengan jelas, bukan
   * menjalankan uji terhadap alamat yang tak melayani apa-apa.
   */
  webServer: {
    command: 'pnpm dev',
    cwd: resolve(__dirname, '../..'),
    url: ORIGIN,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
