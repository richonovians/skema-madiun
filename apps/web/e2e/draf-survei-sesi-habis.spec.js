import { test, expect } from '@playwright/test';
import {
  AKUN,
  SURVEI_UJI,
  bacaSurveiUji,
  buatSurveiUjiSendiri,
  cariResponsDenganTeks,
  masukApi,
  musnahkanSurveiUji,
} from './support/api';
import { panaskanRute } from './support/pemanasan';
import { masukSebagai } from './support/masuk';
import { bacaDrafIdb, tanamDrafIdb } from './support/drafIdb';

/**
 * Draf jawaban survei saat sesi berakhir di tengah pengisian (23 November 2026).
 *
 * Pasangan `draf-pengaduan-sesi-habis.spec.js`. Sesi berakhir DITIRU dengan
 * merusak tanda tangan token dev-login, sehingga peramban masih menganggap
 * sesinya hidup sedangkan backend menjawab 401.
 *
 * Surveinya dibuat dan dimusnahkan oleh spec ini sendiri, pola yang sama
 * dengan `isi-survei.spec.js`; respons yang terkirim ikut musnah bersamanya.
 */

const [KE_1, KE_2, KE_3] = SURVEI_UJI.pertanyaan;
const opsi = (page, label) =>
  page.locator('label').filter({ has: page.getByText(label, { exact: true }) });
const tombolLanjut = (page) => page.getByRole('button', { name: 'Pertanyaan Selanjutnya' });
const tombolKirim = (page) => page.getByRole('button', { name: 'Kirim Survei' });
const kunciDraf = (id) => `survei:${id}`;
const bacaDraf = (page, id) => bacaDrafIdb(page, kunciDraf(id));

async function bukaSurvei(page, surveyId) {
  await page.goto(`/surveys/${surveyId}`);
  const mulai = page.getByRole('button', { name: 'Mulai Isi Survei' });
  const berpintu = await mulai
    .waitFor({ state: 'visible', timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  if (berpintu) await mulai.click();
}

test.describe('Draf jawaban survei saat sesi berakhir', () => {
  let surveyId;

  test.beforeAll(async () => {
    surveyId = await buatSurveiUjiSendiri();
    await bacaSurveiUji(surveyId);
    await panaskanRute(['/dashboard', `/surveys/${surveyId}`]);
  });

  test.afterAll(async () => {
    if (surveyId) await musnahkanSurveiUji(surveyId);
  });

  test('jawaban selamat melewati sesi yang berakhir dan terkirim sesudah masuk kembali', async ({
    page,
  }) => {
    // Halaman survei memasang `beforeunload`; pindah halaman sesudah menjawab
    // memunculkan dialog konfirmasi yang harus diterima, seperti warga yang
    // memilih meninggalkan halaman untuk masuk kembali.
    page.on('dialog', (d) => d.accept());
    const saran = `[UJI E2E] saran draf sesi habis ${Date.now()}`;
    const { user } = await masukApi(AKUN.warga);

    await masukSebagai(page, AKUN.warga, '/dashboard');
    await bukaSurvei(page, surveyId);
    await opsi(page, KE_1.opsi[3]).click();
    await tombolLanjut(page).click();
    await opsi(page, KE_2.opsi[1]).click();
    await tombolLanjut(page).click();
    await page.getByPlaceholder('Tuliskan jawaban Anda di sini...').fill(saran);

    // Sesi berakhir di server, peramban belum tahu.
    await page.evaluate(() => {
      const token = localStorage.getItem('token');
      localStorage.setItem('token', `${token.slice(0, -6)}AAAAAA`);
    });
    const jawaban = page.waitForResponse(
      (r) => r.url().endsWith(`/surveys/${surveyId}/responses`) && r.request().method() === 'POST',
    );
    await tombolKirim(page).click();
    expect((await jawaban).status()).toBe(401);

    await expect(page.getByText(/sesi anda sudah berakhir/i)).toBeVisible();
    const draf = await bacaDraf(page, surveyId);
    expect(draf?.pemilik).toBe(user.id);
    expect(Object.values(draf?.isi.answers ?? {})).toContain(saran);

    // Masuk kembali di TAB YANG SAMA, lalu buka survei yang sama.
    await masukSebagai(page, AKUN.warga, '/dashboard');
    await bukaSurvei(page, surveyId);

    await expect(page.getByText(/jawaban anda sebelumnya dipulihkan/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: `3. ${KE_3.teks}` })).toBeVisible();
    await expect(page.getByPlaceholder('Tuliskan jawaban Anda di sini...')).toHaveValue(saran);
    await expect.poll(() => bacaDraf(page, surveyId)).toBeNull();

    // Yang menentukan: jawaban yang dipulihkan benar-benar sampai ke backend.
    await tombolKirim(page).click();
    await expect(page.getByRole('heading', { name: 'Terima Kasih!' })).toBeVisible();
    const respons = await cariResponsDenganTeks(surveyId, saran);
    expect(respons, `Respons berteks "${saran}" tidak ditemukan di backend`).not.toBeNull();
    expect(respons.answers).toHaveLength(3);
  });

  /**
   * Drafnya ditanam di /dashboard, bukan di halaman survei, dengan alasan yang
   * sama seperti spec draf pengaduan: menanamnya di halaman yang sedang
   * terhidrasi membuat halaman sebelum reload memakannya lebih dulu.
   */
  test('draf milik akun lain tidak dituangkan dan dibuang', async ({ page }) => {
    await masukSebagai(page, AKUN.warga, '/dashboard');
    const { questions } = await bacaSurveiUji(surveyId);
    await tanamDrafIdb(page, {
      kunci: kunciDraf(surveyId),
      pemilik: 999999,
      kedaluwarsa: Date.now() + 60 * 60 * 1000,
      isi: { answers: { [questions[0].id]: '[UJI E2E] orang lain' } },
    });

    await bukaSurvei(page, surveyId);

    await expect(page.getByRole('heading', { name: `1. ${KE_1.teks}` })).toBeVisible();
    await expect.poll(() => bacaDraf(page, surveyId)).toBeNull();
    await expect(page.getByText(/jawaban anda sebelumnya dipulihkan/i)).toHaveCount(0);
    await expect(tombolLanjut(page)).toBeDisabled();
  });
});
