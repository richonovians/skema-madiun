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
  // SATU worker secara bawaan, dan angka ini hasil pengukuran -- bukan kehati-hatian.
  //
  // Bawaan Playwright (`undefined`) adalah separuh prosesor logis; di mesin ini
  // berarti EMPAT peramban sekaligus. Diukur 15 September 2026 pada satu jalan
  // penuh yang sama, berulang:
  //
  //   4 worker : 5 dari 19 GAGAL, 4,0 menit
  //   2 worker : 0 gagal, lalu 1 gagal pada ulangan, 2,2 / 1,9 menit
  //   1 worker : 0 gagal, 2,3 menit
  //
  // Perhatikan kolom waktunya: satu worker TIDAK lebih lambat daripada empat.
  // Paralelisme di sini tak memberi apa pun untuk ditukar -- ia hanya menukar
  // kestabilan dengan ketiadaan keuntungan.
  //
  // Sebabnya terukur terpisah, dan letaknya di SISI PERAMBAN, bukan di server:
  // memuat `/`, `/surveys`, dan `/complaints/new` memakan ~1,5 detik bila satu
  // konteks dijalankan sendirian, dan ~12 detik bila empat konteks berjalan
  // serentak -- delapan kali lipat. Pada saat yang sama, EMPAT permintaan HTTP
  // serentak tanpa peramban dilayani dalam 0,09-0,47 detik. Jadi yang kehabisan
  // napas empat Chrome yang berebut satu mesin (4 inti fisik, RAM bebas ~2,7 GB)
  // sambil mengurai bundel Next.js mode dev, bukan `next dev` maupun proxy-nya.
  //
  // Bentuk kegagalannya menegaskan hal yang sama: `domcontentloaded` menyala,
  // `load` tak pernah tuntas, lalu 60 detik habis. Inilah "kegoyahan yang belum
  // terjelaskan" di TEST_CASES §Y.3.
  //
  // Mesin yang lebih lapang boleh menaikkannya: `E2E_WORKERS=4 pnpm test:e2e`.
  // Naikkan hanya bila jalan penuh terbukti hijau berulang kali di mesin itu.
  workers: Number(process.env.E2E_WORKERS ?? 1),
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
