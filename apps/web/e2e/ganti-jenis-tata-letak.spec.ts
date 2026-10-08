import { expect, LEBAR_PONSEL_UMUM, test, ukurLuberan } from './fixtures/responsif';

/**
 * TATA LETAK KOLOM TABEL SURVEI DAN PENYARING JENIS STATISTIK (8 Oktober 2026).
 *
 * Tabel survei Admin Kabupaten kini sembilan kolom (JENIS SURVEI ditambahkan), dan
 * Statistik & Laporan mendapat kontrol "Jenis survei" di slot kanan tab. jsdom tak
 * memuat CSS, jadi luapan di dua tempat itu hanya tertangkap di peramban.
 *
 * Suite ini hanya MEMBACA: fixture `responsif` membatalkan setiap permintaan
 * non-GET di tingkat jaringan. (Modal ganti jenis diukur di ganti-jenis-alur.spec,
 * yang membuat sendiri survei SKM drafnya.) Menjalankannya (butuh akun
 * ber-tiga-peran):
 *
 *   E2E_IDENTIFIER=seed-superuser pnpm --filter @skm-spm/web exec playwright test e2e/ganti-jenis-tata-letak.spec.ts
 */
const KOLOM = [
  'JUDUL SURVEI',
  'OPD PENYELENGGARA',
  'JENIS SURVEI',
  'PERIODE',
  'RESPONDEN',
  'NILAI IKM',
  'NILAI SURVEI',
  'STATUS',
  'AKSI',
];

test.describe('tabel survei Admin Kabupaten — kolom Jenis Survei dan Nilai Survei', () => {
  test('desktop: sembilan kolom berurutan, tanpa "NILAI RATA-RATA"', async ({
    page,
    bukaSebagai,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await bukaSebagai('kabupaten', '/admin-kab/surveys');

    const headers = page.getByRole('columnheader');
    await expect(headers.first()).toBeVisible({ timeout: 20_000 });
    expect((await headers.allTextContents()).map((t) => t.trim())).toEqual(KOLOM);
    await expect(page.getByRole('columnheader', { name: 'NILAI RATA-RATA' })).toHaveCount(0);

    // Kolom baru tak boleh mendorong AKSI keluar dari wadah di 1366x768: sebelum
    // padding sel dirapatkan, tabelnya 105px lebih lebar dari wadahnya.
    const meluap = await page.evaluate(() => {
      const tabel = document.querySelector('table')!;
      return tabel.scrollWidth - tabel.parentElement!.clientWidth;
    });
    expect(meluap, 'tabel menggulir mendatar di 1366px').toBeLessThanOrEqual(0);
  });

  test('aturan pada data sungguhan: baris SKM selalu "-" di NILAI SURVEI, custom tak pernah memuat IKM', async ({
    page,
    bukaSebagai,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await bukaSebagai('kabupaten', '/admin-kab/surveys');
    await expect(page.getByRole('columnheader').first()).toBeVisible({ timeout: 20_000 });

    const baris = page.locator('tbody tr');
    const n = await baris.count();
    test.skip(n === 0, 'Tidak ada survei di basis data lokal.');
    for (let i = 0; i < n; i += 1) {
      const sel = await baris.nth(i).locator('td').allTextContents();
      if (sel.length !== KOLOM.length) continue; // baris pesan kosong
      const [jenis, ikm, nilaiSurvei] = [sel[2].trim(), sel[5].trim(), sel[6].trim()];
      if (jenis === 'SKM') {
        expect(nilaiSurvei, `baris ${i + 1}: SKM harus "-" di NILAI SURVEI`).toBe('-');
      }
      if (jenis === 'Custom') {
        expect(ikm, `baris ${i + 1}: Custom harus "-" di NILAI IKM`).toBe('-');
      }
    }
  });

  test('ponsel: halaman tidak meluber ke samping (tabel menggulir di dalam wadahnya)', async ({
    page,
    bukaSebagai,
  }) => {
    await page.setViewportSize(LEBAR_PONSEL_UMUM);
    await bukaSebagai('kabupaten', '/admin-kab/surveys');
    await expect(page.getByRole('columnheader').first()).toBeVisible({ timeout: 20_000 });

    const ukuran = await ukurLuberan(page);
    expect(ukuran.luberHalaman, `halaman meluber ${ukuran.luberHalaman}px`).toBe(0);
    expect(ukuran.pelanggar, JSON.stringify(ukuran.pelanggar)).toHaveLength(0);
  });
});

test.describe('Statistik & Laporan — penyaring jenis survei', () => {
  for (const [nama, peran, rute] of [
    ['Admin Kabupaten', 'kabupaten', '/admin-kab/analytics'],
    ['Admin OPD', 'opd', '/admin-opd/analytics'],
  ] as const) {
    for (const [ukuranNama, ukuran] of [
      ['desktop', { width: 1366, height: 768 }],
      ['ponsel', LEBAR_PONSEL_UMUM],
    ] as const) {
      test(`${nama} ${ukuranNama}: penyaring terlihat, tab bernama "Analisis Survei", tanpa luberan`, async ({
        page,
        bukaSebagai,
      }) => {
        await page.setViewportSize(ukuran);
        await bukaSebagai(peran, rute);

        await expect(page.getByRole('button', { name: 'Analisis Survei' })).toBeVisible({
          timeout: 20_000,
        });
        await expect(page.getByRole('button', { name: 'Analisis SKM' })).toHaveCount(0);

        const penyaring = page.getByLabel(/jenis survei/i);
        const ada = await penyaring
          .waitFor({ state: 'visible', timeout: 15_000 })
          .then(() => true)
          .catch(() => false);
        test.skip(!ada, 'Tak ada survei aktif/ditutup: penyaring jenis memang tak ditampilkan.');

        await expect(penyaring).toBeInViewport();
        if (ukuran.width >= 1024) {
          // Teks "Semua jenis" terbaca utuh, tidak terpotong "Semua je...".
          const terpotong = await penyaring.evaluate((el) =>
            [el, ...Array.from(el.querySelectorAll('*'))].some(
              (n) => n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflow !== 'visible',
            ),
          );
          expect(terpotong, 'label penyaring jenis terpotong').toBe(false);
        }
        expect((await penyaring.boundingBox())!.height).toBeGreaterThanOrEqual(40);
        const hasil = await ukurLuberan(page);
        expect(hasil.luberHalaman, `halaman meluber ${hasil.luberHalaman}px`).toBe(0);
        expect(hasil.pelanggar, JSON.stringify(hasil.pelanggar)).toHaveLength(0);
      });
    }
  }
});
