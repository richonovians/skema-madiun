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
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
