import { expect, LEBAR_PONSEL_UMUM, test, ukurLuberan } from './fixtures/responsif';

/**
 * TATA LETAK TUJUAN + METODE NILAI survei custom (8 Oktober 2026).
 *
 * Survei Custom kini wajib memilih tujuan dan metode nilai. Dua isian baru itu
 * menambah tinggi pada dua layar yang sebelumnya sudah ketat:
 *  - pemilih jenis di `/admin-opd/surveys/builder/new` (kartu radio + tombol
 *    "Lanjutkan");
 *  - modal "Buat Survei" Admin Kabupaten, yang tingginya tetap dan nyaris penuh.
 *
 * jsdom tidak memuat CSS, jadi luapan semacam ini hanya tertangkap di peramban.
 *
 * Suite ini hanya MEMBACA: fixture `responsif` membatalkan setiap permintaan
 * non-GET di tingkat jaringan. Menjalankannya (butuh akun ber-tiga-peran):
 *
 *   E2E_IDENTIFIER=seed-superuser pnpm --filter @skm-spm/web exec playwright test e2e/nilai-survei-tata-letak.spec.ts
 */
test.describe('pemilih jenis survei baru — isian Nilai Survei (Admin OPD)', () => {
  for (const [nama, ukuran] of [
    ['desktop', { width: 1366, height: 768 }],
    ['ponsel', LEBAR_PONSEL_UMUM],
  ] as const) {
    test(`${nama}: memilih Custom menampilkan dua isian dan "Lanjutkan" menyala bila lengkap`, async ({
      page,
      bukaSebagai,
    }) => {
      await page.setViewportSize(ukuran);
      await bukaSebagai('opd', '/admin-opd/surveys/builder/new');

      // Klik kartunya (bukan `radio.check()`): lihat catatan di kerangka-unsur-tata-letak.
      await page.getByRole('radiogroup', { name: /jenis survei/i }).locator('label').nth(1).click();

      const tujuan = page.getByRole('radiogroup', { name: /tujuan survei/i });
      const metode = page.getByRole('radiogroup', { name: /metode nilai/i });
      await expect(tujuan).toBeVisible();
      await expect(metode).toBeVisible();
      // Tidak menyempit seperti kolom 64px dulu (`max-w-3xl`).
      expect((await tujuan.boundingBox())!.width, 'grup tujuan menyempit').toBeGreaterThanOrEqual(
        ukuran.width >= 768 ? 400 : 280,
      );
      await expect(page.getByRole('radio', { name: 'Kepuasan', exact: true })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Evaluasi', exact: true })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Penilaian', exact: true })).toBeVisible();

      const lanjutkan = page.getByRole('button', { name: /^lanjutkan$/i });
      await expect(lanjutkan).toBeDisabled();
      await page.getByRole('radio', { name: 'Evaluasi', exact: true }).check();
      await expect(lanjutkan).toBeDisabled();
      await page.getByRole('radio', { name: 'Indeks persen', exact: true }).check();
      await expect(lanjutkan).toBeEnabled();
      await expect(page.getByText(/contoh hasil/i)).toContainText('Indeks Evaluasi 85%');

      // Sasaran sentuh tombol layak, dan seluruhnya terjangkau tanpa menggulir ke samping.
      await lanjutkan.scrollIntoViewIfNeeded();
      await expect(lanjutkan).toBeInViewport();
      expect((await lanjutkan.boundingBox())!.height).toBeGreaterThanOrEqual(40);

      const hasil = await ukurLuberan(page);
      expect(hasil.luberHalaman, `halaman meluber ${hasil.luberHalaman}px`).toBe(0);
      expect(hasil.pelanggar, JSON.stringify(hasil.pelanggar)).toHaveLength(0);
    });
  }

  test('ponsel: dialog konfirmasi Custom merangkum pilihan dan muat di layar', async ({
    page,
    bukaSebagai,
  }) => {
    await page.setViewportSize(LEBAR_PONSEL_UMUM);
    await bukaSebagai('opd', '/admin-opd/surveys/builder/new');

    await page.getByRole('radiogroup', { name: /jenis survei/i }).locator('label').nth(1).click();
    await page.getByRole('radio', { name: 'Penilaian', exact: true }).check();
    await page.getByRole('radio', { name: 'Indeks persen', exact: true }).check();
    await page.getByRole('button', { name: /^lanjutkan$/i }).click();

    const dialog = page.getByRole('dialog', { name: /pilih survei custom/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/penilaian/i);
    await expect(dialog).toContainText(/indeks persen/i);
    const kotak = (await dialog.boundingBox())!;
    expect(kotak.x).toBeGreaterThanOrEqual(0);
    expect(kotak.x + kotak.width).toBeLessThanOrEqual(LEBAR_PONSEL_UMUM.width + 1);
    expect(kotak.y + kotak.height).toBeLessThanOrEqual(LEBAR_PONSEL_UMUM.height + 1);

    // Batal mempertahankan pilihan dan tidak membuat apa pun.
    await dialog.getByRole('button', { name: /^batal$/i }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'Penilaian', exact: true })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Indeks persen', exact: true })).toBeChecked();
  });
});

test.describe('modal Buat Survei — isian Nilai Survei (Admin Kabupaten)', () => {
  for (const [nama, lebar, tinggi] of [
    ['laptop 1366x768', 1366, 768],
    ['laptop 1280x720', 1280, 720],
    ['ponsel 320x568', 320, 568],
  ] as const) {
    test(`${nama}: dua isian terjangkau, footer tetap di layar, galat wajib terbaca`, async ({
      page,
      bukaSebagai,
    }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await bukaSebagai('kabupaten', '/admin-kab/surveys');
      await page
        .getByRole('button', { name: /buat survei/i })
        .first()
        .click();
      await expect(page.getByText('Buat Paket Survei')).toBeVisible();
      await page.setViewportSize({ width: lebar, height: tinggi });

      // Dibatasi ke KARTU modal: pemicu di halaman punya nama yang sama.
      const kartuModal = page
        .getByText('Buat Paket Survei')
        .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
      const footerTombol = kartuModal.getByRole('button', { name: /^buat survei$/i });

      await page.getByRole('radio', { name: /survei custom/i }).check();
      const tujuan = kartuModal.getByLabel(/tujuan survei/i);
      const metode = kartuModal.getByLabel(/metode nilai/i);
      await tujuan.scrollIntoViewIfNeeded();
      await expect(tujuan).toBeInViewport();
      await metode.scrollIntoViewIfNeeded();
      await expect(metode).toBeInViewport();

      // Dipoll: kartu modal beranimasi masuk dan menyesuaikan tingginya.
      await expect
        .poll(
          async () => {
            const k = await footerTombol.boundingBox();
            return k ? k.y + k.height : Number.POSITIVE_INFINITY;
          },
          { message: 'tombol Buat Survei di luar layar', timeout: 5000 },
        )
        .toBeLessThanOrEqual(tinggi + 1);

      // Isian bukan kolom sempit: bisa dibaca dan disentuh.
      for (const isian of [tujuan, metode]) {
        const k = (await isian.boundingBox())!;
        expect(k.height, 'isian terlalu pendek').toBeGreaterThanOrEqual(40);
        expect(k.width, 'isian terlalu sempit').toBeGreaterThanOrEqual(120);
        expect(k.x + k.width, 'isian keluar tepi kanan').toBeLessThanOrEqual(lebar + 1);
      }

      // Judul dan OPD dikosongkan, jadi galat pertama yang muncul menyangkut judul;
      // yang dijaga di sini hanya bahwa galatnya tidak tertutup footer.
      await footerTombol.click();
      const galat = kartuModal.getByText(/wajib/i).first();
      await galat.scrollIntoViewIfNeeded();
      await expect(galat, 'galat validasi tak terlihat').toBeInViewport();
      await expect
        .poll(
          async () => {
            const g = await galat.boundingBox();
            const f = await footerTombol.boundingBox();
            return g && f ? g.y + g.height - f.y : Number.POSITIVE_INFINITY;
          },
          { message: 'galat validasi tertutup footer', timeout: 5000 },
        )
        .toBeLessThanOrEqual(1);
    });
  }
});
