import { test, expect } from '@playwright/test';
import {
  AKUN,
  SURVEI_UJI,
  buatSurveiUjiSendiri,
  masukApi,
  musnahkanSurveiUji,
  panggilApi,
} from './support/api';
import { masukSebagai } from './support/masuk';
import { kotakSesudahGulir, utuhTerlihat } from './support/tata-letak';

/**
 * Tiga modal di layar pendek: BUG-087 (`ShareSurveyModal`), BUG-088
 * (`ConfirmStatusModal`), dan BUG-089 (`ForwardComplaintModal`).
 *
 * Akar ketiganya sama dengan BUG-084. `useBodyScrollLock` mengunci `body`,
 * sedangkan latar `fixed inset-0 flex items-center` memusatkan kartu tanpa
 * wilayah gulir: kartu yang lebih tinggi daripada layar meluap rata ke atas
 * dan ke bawah tanpa cara mencapainya.
 *
 * Empat ukuran: tiga dari BUG-084, ditambah 568x320 (ponsel kecil mendatar).
 * Yang terakhir itulah yang memerahkan modal Teruskan, yang pada tiga ukuran
 * lain masih muat (pada 640x360 dengan sisa 1 px).
 *
 * Satu uji per MODAL, bukan per ukuran, dan `expect.soft` per ukuran: setiap
 * uji masuk lewat antarmuka, dan dua belas kali masuk berturut-turut
 * menembus batas laju backend (100 permintaan per 60 detik per IP).
 *
 * MENULIS DATA: satu survei uji (dimusnahkan di `afterAll`) dan dua pengaduan
 * `[UJI MODAL-LAYAR]`, satu bertujuan dan satu tanpa tujuan, dibuat bila
 * belum ada dan dipakai ulang bila masih tersisa (jatah warga 10 pengaduan
 * per hari, dan `beforeAll` diulang setiap kali sebuah uji gagal). Pengaduan
 * ditinggalkan untuk `bersihkan-data-uji.mjs`. Tak satu pun tombol kirim
 * ditekan.
 */

const LAYAR = [
  { width: 360, height: 640 },
  { width: 320, height: 568 },
  { width: 640, height: 360 },
  { width: 568, height: 320 },
];

const JUDUL_PENGADUAN = '[UJI MODAL-LAYAR]';

/** Pastikan satu pengaduan uji belum tuntas ada; kembalikan nomor tiketnya. */
async function pengaduanUji(tokenKabupaten, bertujuan) {
  const terbuka =
    (await panggilApi(
      tokenKabupaten,
      'GET',
      '/complaints?status=menunggu_verifikasi&limit=100',
    )) ?? [];
  const lama = terbuka.find(
    (c) => c.judul?.startsWith(JUDUL_PENGADUAN) && Boolean(c.opdId) === bertujuan,
  );
  if (lama) return lama.ticketNo;

  let opdId;
  if (bertujuan) {
    const daftarOpd = (await panggilApi(tokenKabupaten, 'GET', '/opd?limit=100')) ?? [];
    opdId = daftarOpd.find((o) => o.tingkat === 'kabupaten')?.id;
    expect(opdId, 'tak ada OPD tingkat kabupaten untuk dijadikan tujuan').toBeTruthy();
  }

  const { token: tokenWarga } = await masukApi(AKUN.warga, 'responden');
  const pengaduan = await panggilApi(tokenWarga, 'POST', '/complaints', {
    judul: `${JUDUL_PENGADUAN} ${bertujuan ? 'bertujuan' : 'tanpa tujuan'} ${Date.now()}`,
    uraian: 'Dibuat otomatis oleh pagar regresi BUG-088 dan BUG-089.',
    tingkat: 'kabupaten',
    kategori: 'kab_lainnya',
    ...(opdId ? { opdId } : {}),
    tanggalKejadian: '2026-11-01',
    lokasiKejadian: '[UJI E2E] Balai desa',
  });
  return pengaduan.ticketNo;
}

/**
 * Periksa setiap elemen dapat digulir hingga utuh terlihat, lalu kembali ke
 * elemen pertama -- sehingga yang terbukti adalah gulir dua arah, bukan hanya
 * satu loncatan ke bawah.
 */
async function periksaTerjangkau(daftar, { width, height }) {
  for (const [nama, el] of [...daftar, [`${daftar[0][0]} (kembali ke atas)`, daftar[0][1]]]) {
    const kotak = await kotakSesudahGulir(el);
    expect
      .soft(
        utuhTerlihat(kotak, height, width),
        `${width}x${height}: ${nama} tak dapat digulir hingga utuh terlihat: ${JSON.stringify(kotak)}`,
      )
      .toBe(true);
  }
}

/**
 * Klik pada latar, di pojok kiri atas layar, harus menutup modal.
 *
 * Penjaga perbaikannya, bukan cacatnya: kedua modal ini menutup lewat
 * `e.target === e.currentTarget` pada latarnya. Begitu latar diberi
 * pembungkus dalam, area kosong di sekitar kartu menjadi pembungkus itu, dan
 * penangan yang tertinggal di lapisan luar tak pernah terpicu lagi.
 */
async function periksaKlikLatarMenutup(page, dialog, { width, height }) {
  await page.mouse.click(4, 4);
  await expect
    .soft(dialog, `${width}x${height}: klik latar tidak menutup modal`)
    .toBeHidden({ timeout: 3000 });
}

test.describe('Modal di layar pendek (BUG-087, BUG-088, BUG-089)', () => {
  let surveyId = null;
  let tiketBertujuan = null;
  let tiketTanpaTujuan = null;

  test.beforeAll(async () => {
    const { token } = await masukApi(AKUN.adminKabupaten, 'kabupaten');
    tiketBertujuan = await pengaduanUji(token, true);
    tiketTanpaTujuan = await pengaduanUji(token, false);
    surveyId = await buatSurveiUjiSendiri();
  });

  test.afterAll(async () => {
    if (surveyId) await musnahkanSurveiUji(surveyId);
  });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await masukSebagai(page, AKUN.adminKabupaten, '/admin-kab/dashboard');
  });

  test('BUG-087: modal Bagikan survei dapat digulir dan ditutup lewat latar', async ({ page }) => {
    await page.goto('/admin-kab/surveys');
    const menu = page.getByRole('button', { name: `Aksi untuk ${SURVEI_UJI.judul}` }).first();
    await menu.waitFor();

    for (const layar of LAYAR) {
      await page.setViewportSize(layar);
      await menu.scrollIntoViewIfNeeded();
      await menu.click();
      await page.getByRole('menuitem', { name: 'Bagikan' }).click();

      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      // Kartu beranimasi `zoom-in-95` 200 ms; ukurannya baru tetap sesudahnya.
      await page.waitForTimeout(400);

      await periksaTerjangkau(
        [
          ['judul', dialog.getByRole('heading', { name: SURVEI_UJI.judul })],
          ['tombol Tutup', dialog.getByRole('button', { name: 'Tutup' })],
          ['tombol Unduh QR', dialog.getByRole('button', { name: /Unduh QR|Menyiapkan/ })],
        ],
        layar,
      );
      await periksaKlikLatarMenutup(page, dialog, layar);
      if (await dialog.isVisible()) await page.keyboard.press('Escape');
    }
  });

  test('BUG-088: modal Ubah Status dapat digulir dan ditutup lewat latar', async ({ page }) => {
    await page.goto(`/admin-kab/complaints/${tiketBertujuan}`);
    const kontrol = page.locator('section', { hasText: 'Kontrol Status' });
    const pemicu = kontrol.locator('button[aria-haspopup="listbox"]');
    await pemicu.waitFor();

    for (const layar of LAYAR) {
      await page.setViewportSize(layar);
      await pemicu.scrollIntoViewIfNeeded();
      await pemicu.click();
      await kontrol.getByRole('button', { name: 'Ditolak', exact: true }).click();

      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await page.waitForTimeout(400);

      await periksaTerjangkau(
        [
          ['judul', dialog.getByRole('heading').first()],
          ['kolom catatan', dialog.locator('textarea')],
          ['tombol Batal', dialog.getByRole('button', { name: 'Batal' })],
          ['tombol Ya, Tolak Pengaduan', dialog.getByRole('button', { name: 'Ya, Tolak Pengaduan' })],
        ],
        layar,
      );
      await periksaKlikLatarMenutup(page, dialog, layar);
      if (await dialog.isVisible()) await page.keyboard.press('Escape');
    }
  });

  test('BUG-089: modal Teruskan dapat digulir dan daftar OPD tetap dapat dipilih', async ({
    page,
  }) => {
    await page.goto('/admin-kab/complaints');
    const baris = page.locator('table tbody tr', { hasText: tiketTanpaTujuan });
    await baris.waitFor();

    for (const layar of LAYAR) {
      await page.setViewportSize(layar);
      const teruskan = baris.getByRole('button', { name: /Teruskan/ });
      await teruskan.scrollIntoViewIfNeeded();
      await teruskan.click();

      const dialog = page.getByRole('dialog', { name: 'Teruskan ke OPD berwenang' });
      await dialog.waitFor();
      const pemicuOpd = dialog.getByRole('button', { name: /OPD yang berwenang|Pilih OPD/ });
      // Daftar OPD dimuat asinkron; tinggi kartu baru tetap sesudahnya.
      await expect(pemicuOpd).toBeEnabled();

      await periksaTerjangkau(
        [
          ['judul', dialog.getByRole('heading', { name: 'Teruskan ke OPD berwenang' })],
          ['tombol Batal', dialog.getByRole('button', { name: 'Batal' })],
          ['tombol Teruskan', dialog.getByRole('button', { name: 'Teruskan', exact: true })],
        ],
        layar,
      );

      // Daftar OPD: perbaikan tak boleh memenggal panel dropdown absolut.
      await pemicuOpd.scrollIntoViewIfNeeded();
      await pemicuOpd.click();
      const pilihan = pemicuOpd
        .locator('xpath=..')
        .getByRole('button')
        .filter({ hasNotText: /Pilih OPD/ })
        .nth(1);
      await pilihan.waitFor();
      const namaPilihan = (await pilihan.textContent()).trim();
      const kotakPilihan = await kotakSesudahGulir(pilihan);
      expect
        .soft(
          utuhTerlihat(kotakPilihan, layar.height, layar.width),
          `${layar.width}x${layar.height}: pilihan OPD "${namaPilihan}" terpotong: ${JSON.stringify(kotakPilihan)}`,
        )
        .toBe(true);
      await pilihan.click();
      await expect.soft(pemicuOpd).toContainText(namaPilihan);

      await dialog.getByRole('button', { name: 'Batal' }).click();
      await expect(dialog).toBeHidden();
    }
  });
});
