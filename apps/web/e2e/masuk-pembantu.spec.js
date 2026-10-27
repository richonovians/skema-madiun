import { expect, test } from '@playwright/test';
import { AKUN } from './support/api.js';
import { masukSebagai } from './support/masuk.js';

/**
 * Pagar pembantu masuk `masukSebagai` (27 Oktober 2026). Hanya membaca.
 *
 * Pembantu itu dulu menunggu pemilih peran dalam jendela TETAP 5 detik sesudah
 * tombol Masuk ditekan. Akun ber-peran jamak yang pemilihnya muncul sesudah
 * jendela itu tak pernah memilih peran, sehingga uji menggantung sampai batas
 * waktunya habis dengan galat `waitForURL` yang tak menyebut pemilih peran
 * sama sekali. Jawaban `dev-login` yang lambat -- kompilasi dingin, basis data
 * sibuk -- sudah cukup untuk memicunya.
 *
 * Jawaban `dev-login` di sini ditahan 7 detik, melewati jendela lama itu.
 */
test('pemilih peran yang muncul terlambat tetap dipilih', async ({ page }) => {
  // Permintaannya diteruskan seketika, JAWABANNYA yang ditahan: meniru server
  // yang lambat. Menunda `route.continue()` justru dijawab 502 lewat nginx.
  await page.route('**/api/v1/auth/dev-login', async (route) => {
    const jawaban = await route.fetch();
    await new Promise((selesai) => setTimeout(selesai, 7000));
    await route.fulfill({ response: jawaban });
  });

  await masukSebagai(page, AKUN.adminOpd, '/admin-opd/dashboard');

  await expect(page).toHaveURL(/\/admin-opd\/dashboard/);
});
