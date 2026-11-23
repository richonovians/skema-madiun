import { test, expect } from '@playwright/test';
import { AKUN } from './support/api';
import { masukSebagai } from './support/masuk';
import { panaskanRute } from './support/pemanasan';

/**
 * Peringatan lima menit sebelum sesi berakhir (23 November 2026).
 *
 * Waktu peramban dimajukan dengan `page.clock` ke dekat `exp` token dev-login;
 * backend tetap memakai jam sungguhan, jadi setiap panggilan API masih sah.
 * Hanya jalur dev-login yang dapat diuji di sini, dan tokennya memang tak
 * pernah diperpanjang server -- maka "Lanjutkan sesi" berakhir dengan pesan
 * batas maksimum. Perpanjangan jalur SSO diuji di tingkat komponen.
 *
 * Tak menulis data apa pun.
 */
const MENIT = 60 * 1000;

const expToken = (page) =>
  page.evaluate(() => {
    const [, isi] = localStorage.getItem('token').split('.');
    return JSON.parse(atob(isi.replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000;
  });

const dialog = (page) => page.getByRole('alertdialog', { name: /sesi anda akan berakhir/i });

test.describe('Peringatan sebelum sesi berakhir', () => {
  test.beforeAll(async () => {
    await panaskanRute(['/dashboard']);
  });

  test('muncul lima menit sebelum berakhir, lalu menyatakan sesi tak dapat diperpanjang', async ({
    page,
  }) => {
    await masukSebagai(page, AKUN.warga, '/dashboard');
    const exp = await expToken(page);

    // Sepuluh menit sebelum berakhir: belum ada peringatan.
    await page.clock.install({ time: exp - 10 * MENIT });
    await page.reload();
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(dialog(page)).toHaveCount(0);

    // Lima menit kemudian peringatannya muncul sendiri, tanpa muat ulang.
    await page.clock.fastForward(5 * MENIT);
    await expect(dialog(page)).toBeVisible();
    const jam = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(exp);
    await expect(dialog(page)).toContainText(`${jam} WIB`);

    const me = page.waitForResponse(
      (r) => r.url().endsWith('/auth/me') && r.request().method() === 'GET',
    );
    await dialog(page).getByRole('button', { name: 'Lanjutkan sesi' }).click();
    expect((await me).status()).toBe(200);
    await expect(dialog(page)).toContainText(/batas maksimum dan tidak dapat diperpanjang/i);
    await expect(dialog(page).getByRole('button', { name: 'Lanjutkan sesi' })).toHaveCount(0);

    await dialog(page).getByRole('button', { name: 'Tutup' }).click();
    await expect(dialog(page)).toHaveCount(0);
  });
});
