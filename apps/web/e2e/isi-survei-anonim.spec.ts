import { expect, test } from '@playwright/test';

/**
 * Alur pengisian survei TANPA sesi lewat rute `/isi/:id`.
 *
 * URL ABSOLUT, bukan `baseURL`: origin pengujian proyek ini `http://skema.local`
 * (port 80), sementara `playwright.config.ts` di branch ini masih menunjuk
 * `localhost:3000` yang selalu 404. Berkas config itu bagian dari pekerjaan
 * penguji, jadi tidak disentuh dari sini.
 *
 * PRASYARAT: satu survei berstatus AKTIF dengan `izinkanAnonim = true`, id-nya
 * diberikan lewat env `E2E_SURVEY_ANONIM_ID`. Tanpa itu berkas ini DILEWATI --
 * bukan dinyatakan lulus. Menjalankannya:
 *
 *   E2E_SURVEY_ANONIM_ID=<id> pnpm test:e2e --workers=1
 */
const ORIGIN = process.env.E2E_ORIGIN ?? 'http://skema.local';
const surveyId = process.env.E2E_SURVEY_ANONIM_ID;

test.describe('/isi/:id tanpa sesi', () => {
  test.skip(!surveyId, 'E2E_SURVEY_ANONIM_ID belum disetel — uji dilewati, bukan lulus');

  // Kedua tahap berada dalam SATU test dan satu konteks peramban dengan sengaja:
  // tahap kedua bergantung pada `localStorage` yang ditinggalkan tahap pertama.
  // Memecahnya menjadi dua `test` membuat Playwright memberi konteks bersih dan
  // penanda itu hilang -- uji akan gagal karena isolasi, bukan karena cacat.
  test('mengisi sampai tersimpan, lalu pengisian kedua ditolak di antarmuka', async ({ page }) => {
    await page.goto(`${ORIGIN}/isi/${surveyId}`);

    // Bukti pertama: TIDAK dipantulkan ke '/' oleh proxy.
    await expect(page).toHaveURL(new RegExp(`/isi/${surveyId}$`));
    await expect(page.getByText('Memuat survei...')).toHaveCount(0, { timeout: 20_000 });

    // Jawab setiap pertanyaan lalu lanjut, sampai tombol kirim muncul.
    for (let i = 0; i < 25; i += 1) {
      const kirim = page.getByRole('button', { name: /^Kirim( Survei)?$/ });
      if (await kirim.isVisible().catch(() => false)) {
        const respons = page.waitForResponse(
          (r) =>
            r.url().includes(`/public/surveys/${surveyId}/responses`) &&
            r.request().method() === 'POST',
        );
        await kirim.click();
        expect((await respons).status()).toBe(201);
        break;
      }

      const pilihan = page.getByRole('radio');
      if ((await pilihan.count()) > 0) {
        await pilihan.first().click();
      }
      await page.getByRole('button', { name: /Selanjutnya|Pertanyaan Selanjutnya/ }).click();
    }

    await expect(page.getByText('Terima Kasih!')).toBeVisible();
    // Pengisi anonim tak boleh diberi tautan ke rute khusus warga -- proxy akan
    // memantulkannya ke beranda dan itu terasa seperti aplikasi rusak.
    await expect(page.getByRole('button', { name: /Kembali ke Beranda/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Daftar Survei/ })).toHaveCount(0);

    // Tahap kedua: penanda peramban menolak pengisian ulang.
    await page.goto(`${ORIGIN}/isi/${surveyId}`);
    await expect(page.getByText('Anda Sudah Mengisi Survei Ini')).toBeVisible({
      timeout: 20_000,
    });
  });

  test('KONTROL: peramban baru (tanpa penanda) masih dapat mengisi', async ({ browser }) => {
    // Batas penanda peramban dinyatakan terus terang di surveyFillMarker.js:
    // berpindah peramban mengalahkannya. Uji ini merekam batas itu sebagai
    // perilaku yang DIKETAHUI, bukan cacat yang tak sengaja lolos.
    const konteks = await browser.newContext();
    const halaman = await konteks.newPage();

    await halaman.goto(`${ORIGIN}/isi/${surveyId}`);

    await expect(halaman.getByText('Anda Sudah Mengisi Survei Ini')).toHaveCount(0, {
      timeout: 20_000,
    });
    await konteks.close();
  });
});
