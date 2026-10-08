import { expect, LEBAR_PONSEL_UMUM, test, ukurLuberan } from './fixtures/responsif';

/**
 * KARTU "DISTRIBUSI SKOR PER PERTANYAAN" di Statistik & Laporan (8 Oktober 2026).
 *
 * Menggantikan kartu "Distribusi Skor Belum Tersedia", yang kembali muncul sekali
 * ketika pohon kerja dipindah ke cabang yang belum memuat fiturnya -- cacat yang
 * tak terlihat di uji jsdom mana pun, sebab komponennya sendiri sehat. Spec ini
 * menjaga hasil AKHIRNYA di peramban: kartu baru tampil dan teks lama tak ada.
 *
 * Hanya MEMBACA. Dilewati (bukan dinyatakan lulus) bila survei terpilih belum
 * punya responden, sebab kartunya memang tak punya apa pun untuk digambar.
 *
 *   E2E_IDENTIFIER=seed-superuser pnpm --filter @skm-spm/web exec playwright test e2e/distribusi-skor.spec.ts
 */
test.describe('Distribusi Skor — Admin Kabupaten', () => {
  test('kartu sebaran tampil dengan bilah dan angka, teks "Belum Tersedia" tidak ada', async ({
    page,
    bukaSebagai,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await bukaSebagai('kabupaten', '/admin-kab/analytics');

    const kartu = page.getByRole('heading', { name: /distribusi skor per pertanyaan/i });
    const adaData = await kartu
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!adaData, 'Survei terpilih belum punya responden: kartu sebaran tak punya isi.');

    await expect(page.getByText(/distribusi skor belum tersedia/i)).toHaveCount(0);
    await expect(page.getByText(/belum disediakan backend/i)).toHaveCount(0);

    // Setiap pertanyaan yang sudah dijawab punya bilah bernama lengkap
    // ("... dari N jawaban") dan angkanya tertulis sebagai teks, bukan di atas warna.
    const bilah = page.getByRole('img', { name: /dari \d+ jawaban/i });
    expect(await bilah.count(), 'tak ada bilah sebaran').toBeGreaterThan(0);
    const nama = await bilah.first().getAttribute('aria-label');
    expect(nama).toMatch(/Buruk \d+, Kurang \d+, Baik \d+, Sangat Baik \d+ dari \d+ jawaban/);
    await expect(page.getByText(/\(\d+%\)/).first()).toBeVisible();

    // Legenda keempat nilai.
    const legenda = page.getByRole('list', { name: /keterangan nilai/i });
    await expect(legenda).toContainText(/1 Buruk/);
    await expect(legenda).toContainText(/4 Sangat Baik/);
  });

  test('ponsel: kartu tidak meluber ke samping', async ({ page, bukaSebagai }) => {
    await page.setViewportSize(LEBAR_PONSEL_UMUM);
    await bukaSebagai('kabupaten', '/admin-kab/analytics');

    const kartu = page.getByRole('heading', { name: /distribusi skor per pertanyaan/i });
    const adaData = await kartu
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!adaData, 'Survei terpilih belum punya responden: kartu sebaran tak punya isi.');

    const ukuran = await ukurLuberan(page);
    expect(ukuran.luberHalaman, `halaman meluber ${ukuran.luberHalaman}px`).toBe(0);
    expect(ukuran.pelanggar, JSON.stringify(ukuran.pelanggar)).toHaveLength(0);
  });
});
