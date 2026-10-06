import { test, expect } from './fixtures/responsif';

/**
 * HALAMAN DOKUMENTASI API DI PERAMBAN SUNGGUHAN.
 *
 * Tiga hal di halaman ini TIDAK DAPAT dibuktikan oleh Jest, dan ketiganya
 * pernah salah:
 *
 * 1. Tombol salin. `navigator.clipboard` bernilai `undefined` di
 *    `http://skema.local` karena `isSecureContext` di sana `false` -- Clipboard
 *    API hanya hidup di HTTPS dan `localhost`. Di jsdom hal itu tak terasa
 *    sama sekali; versi pertama tombolnya gagal tanpa suara di seluruh
 *    lingkungan pengembangan dan tetap hijau di Jest.
 * 2. Tautan langsung lewat hash. `scrollIntoView` tak ada di jsdom, dan
 *    `document.getElementById` di sana tak pernah diuji terhadap id yang
 *    memuat `/` dan `{}`.
 * 3. Unduhan berkas. Jest hanya dapat memeriksa `URL.createObjectURL`
 *    dipanggil; apakah peramban benar-benar menurunkan berkasnya tidak.
 *
 * SELURUHNYA HANYA MEMBACA. Fixture `bukaSebagai` memblokir setiap permintaan
 * non-GET di tingkat jaringan, dan halaman ini memang tak pernah menembakkan
 * permintaan selain mengambil dokumennya sendiri.
 *
 * Menjalankannya:
 *   E2E_IDENTIFIER=<email akun kabupaten> pnpm --filter @skm-spm/web test:e2e
 */
test.describe.configure({ timeout: 90_000 });

const HALAMAN = '/admin-kab/dokumentasi-api';
const ID_ENDPOINT = 'get-/api/v1/users';

test('mendarat dengan grup tertutup dan menampilkan jumlah endpoint', async ({
  page,
  bukaSebagai,
}) => {
  await bukaSebagai('kabupaten', HALAMAN);

  const kepala = page.locator('button[aria-label^="Grup "]');
  await expect(kepala.first()).toBeVisible();
  expect(await kepala.count()).toBeGreaterThan(10);

  // Tertutup berarti tak satu pun blok snippet tergambar.
  await expect(page.locator('pre')).toHaveCount(0);
});

test('pencarian membuka grup yang cocok tanpa diklik', async ({ page, bukaSebagai }) => {
  await bukaSebagai('kabupaten', HALAMAN);

  await page.getByLabel('Cari endpoint').fill('Daftar survei');
  await expect(page.locator('pre').first()).toBeVisible();
});

/**
 * Inilah uji yang tak dapat dipalsukan oleh jsdom. Event `copy` hanya terbit
 * bila peramban BENAR-BENAR menyalin; isinya dibaca dari elemen yang seleksinya
 * sedang disalin, karena `clipboardData` tulis-saja pada event itu dan
 * `execCommand('paste')` diblokir Chrome.
 */
test('tombol salin bekerja walau origin tidak aman', async ({ page, bukaSebagai }) => {
  await bukaSebagai('kabupaten', HALAMAN);

  expect(await page.evaluate(() => window.isSecureContext)).toBe(false);
  expect(await page.evaluate(() => typeof navigator.clipboard)).toBe('undefined');

  await page.evaluate(() => {
    (window as unknown as { __salin: string | null }).__salin = null;
    document.addEventListener('copy', () => {
      const el = document.activeElement as HTMLTextAreaElement | null;
      (window as unknown as { __salin: string | null }).__salin = el?.value ?? null;
    });
  });

  await page.getByLabel('Cari endpoint').fill('Daftar survei');
  const tombol = page.getByRole('button', { name: /^Salin snippet curl/ }).first();
  await tombol.click();

  await expect(tombol).toContainText('Tersalin');
  const tersalin = await page.evaluate(
    () => (window as unknown as { __salin: string | null }).__salin,
  );
  expect(tersalin).toContain('curl -X GET');
  // PAGAR KEAMANAN: yang tersalin adalah PENGISI, bukan nilai sesi sungguhan.
  expect(tersalin).toContain('<token>');

  // Textarea bantu jalur cadangan tak boleh tertinggal di DOM.
  expect(await page.locator('textarea').count()).toBe(0);
});

test('tautan langsung membuka grup yang memuat endpointnya', async ({ page, bukaSebagai }) => {
  await bukaSebagai('kabupaten', `${HALAMAN}#${encodeURIComponent(ID_ENDPOINT)}`);

  // DIUKUR BERULANG, bukan sekali. Grupnya dibuka oleh efek yang berjalan
  // setelah dokumennya tiba, dan pembacaan sekali jalan mendarat sebelum itu:
  // terukur 6 Oktober 2026, uji ini gagal di satu lari dan lulus di lari
  // berikutnya tanpa ada yang diubah. `expect.poll` membuat coba-ulang
  // Playwright benar-benar aktif.
  await expect
    .poll(
      () =>
        page.evaluate((id) => {
          const el = document.getElementById(id);
          if (!el) return 'JANGKAR TIDAK ADA';
          return el.querySelector('pre') ? 'terbuka' : 'tertutup';
        }, ID_ENDPOINT),
      { timeout: 30_000 },
    )
    .toBe('terbuka');
});

test('menyebut peran yang berwenang pada endpoint khusus Kabupaten', async ({
  page,
  bukaSebagai,
}) => {
  await bukaSebagai('kabupaten', `${HALAMAN}#${encodeURIComponent(ID_ENDPOINT)}`);

  await expect
    .poll(
      () => page.evaluate((id) => document.getElementById(id)?.textContent ?? '', ID_ENDPOINT),
      { timeout: 30_000 },
    )
    .toContain('Peran: kabupaten');
});

test('mengunduh dokumen OpenAPI sebagai berkas', async ({ page, bukaSebagai }) => {
  await bukaSebagai('kabupaten', HALAMAN);

  const [unduhan] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Unduh dokumen OpenAPI/ }).click(),
  ]);

  expect(unduhan.suggestedFilename()).toBe('openapi-skema.json');
});
