import { defineConfig, devices } from '@playwright/test';

/**
 * Konfigurasi Playwright.
 *
 * `baseURL` menunjuk `http://skema.local`, BUKAN `http://localhost:3000` seperti
 * pada kerangka bawaan. Aplikasi ini dilayani lewat reverse proxy satu-origin di
 * port 80 supaya frontend dan backend berbagi asal yang sama
 * (`NEXT_PUBLIC_API_URL=/api/v1`, relatif). Membuka port 3000 secara langsung
 * membalas 404 pada praktis semua rute, sehingga alamat lama itu membuat setiap
 * spec gagal tanpa sebab yang jelas.
 *
 * Blok `webServer` bawaan DIHAPUS, bukan sekadar disesuaikan: Playwright hanya
 * bisa menyalakan `next dev`, sedangkan yang harus hidup di `skema.local` adalah
 * reverse proxy beserta API-nya. Menyalakan `next dev` dari sini juga berbahaya —
 * proses build/dev kedua menimpa direktori `.next` milik server yang sedang
 * berjalan dan membuat seluruh rute 404. Lingkungan pengembangan dinyalakan
 * sendiri sebelum suite dijalankan; bila belum hidup, helper `masukApi()`
 * menjelaskan hal itu dalam pesan galatnya.
 */
export default defineConfig({
  testDir: './e2e',
  // Menyiapkan survei uji SEKALI, sebelum worker mana pun menyala — lihat
  // catatan pada pastikanSurveiUji() soal dua worker yang berlomba membuatnya.
  globalSetup: './e2e/support/global-setup.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  // Server pengembangan Next.js mengompilasi rute saat pertama diminta; kunjungan
  // pertama ke halaman wizard survei bisa memakan belasan detik pada mesin biasa.
  // Batas bawaan 30 detik membuat suite merah karena kompilasi, bukan karena bug.
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://skema.local',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      // Memakai Chrome yang sudah terpasang di mesin, bukan Chromium unduhan
      // Playwright — penyiapan di komputer tim jadi tak menuntut unduhan peramban
      // ratusan megabita lewat jaringan kantor.
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
