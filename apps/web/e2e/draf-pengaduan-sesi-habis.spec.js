import { test, expect } from '@playwright/test';
import { AKUN, masukApi } from './support/api';
import { masukSebagai } from './support/masuk';
import { panaskanRute } from './support/pemanasan';
import { bacaDrafIdb, tanamDrafIdb } from './support/drafIdb';

/**
 * Draf pengaduan saat sesi berakhir di tengah pengisian (23 November 2026).
 *
 * Uji komponen sudah mengunci keputusannya. Yang hanya terlihat di sini adalah
 * perjalanan sungguhan: interseptor 401 membuang sesi, pelapor masuk lagi
 * lewat halaman masuk, dan draf di IndexedDB harus masih ada sesudah
 * perpindahan halaman itu, juga sesudah tab ditutup (23 November 2026).
 *
 * SESI BERAKHIR DITIRU dengan merusak tanda tangan token dev-login di
 * localStorage. Isi tokennya tetap utuh, termasuk `exp`, jadi peramban masih
 * menganggap sesinya hidup (`isAuthenticated` hanya membaca `exp`), sedangkan
 * backend menolaknya 401. Itu bentuk yang sama dengan sesi yang kedaluwarsa
 * atau dicabut di server sementara tabnya masih terbuka.
 *
 * Tak ada baris yang ditulis ke basis data: pengirimannya ditolak 401 dan
 * draf yang dipulihkan tidak dikirim.
 */

const KUNCI = 'pengaduan';
// PNG 1x1 sah. Backend tidak pernah menerimanya (pengiriman ditolak 401),
// tetapi `saringBerkas` di frontend memeriksa tipe dan ukuran saat dipulihkan.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function isiFormulir(page, judul) {
  await page.getByLabel('Judul Laporan').fill(judul);
  await page.getByLabel('Uraian Detail Kejadian').fill('Lampu jalan mati sejak tiga malam.');
  await page.getByLabel('Tanggal Kejadian').fill('2026-11-01');
  await page.getByLabel('Lokasi Kejadian').fill('[UJI E2E] Depan balai desa');
  // Tujuan dan kategori sengaja dipilih supaya pengiriman benar-benar
  // berangkat; tanpa keduanya formulir menahannya sebelum ada permintaan.
  await page.locator('#department').click();
  await page.getByRole('button', { name: 'Lainnya (belum tahu tujuannya)', exact: true }).click();
  await page.locator('#category').click();
  await page.locator('#category').locator('..').getByRole('button', { name: 'Lainnya', exact: true }).click();
}

async function kirimDenganSesiBerakhir(page) {
  // Sesi berakhir di server, peramban belum tahu.
  await page.evaluate(() => {
    const token = localStorage.getItem('token');
    localStorage.setItem('token', `${token.slice(0, -6)}AAAAAA`);
  });
  const jawaban = page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/complaints') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Kirim Laporan' }).click();
  expect((await jawaban).status()).toBe(401);
}

test.describe('Draf pengaduan saat sesi berakhir', () => {
  test.beforeAll(async () => {
    await panaskanRute(['/dashboard', '/complaints/new']);
  });

  test('isian selamat melewati sesi yang berakhir dan masuk kembali', async ({ page }) => {
    const judul = `[UJI E2E] Draf sesi habis ${Date.now()}`;
    const { user } = await masukApi(AKUN.warga);

    await masukSebagai(page, AKUN.warga, '/dashboard');
    await page.goto('/complaints/new');
    await expect(
      page.getByRole('heading', { name: 'Sampaikan Keluhan & Pengaduan Anda' }),
    ).toBeVisible();

    await isiFormulir(page, judul);
    await kirimDenganSesiBerakhir(page);

    await expect(page.getByText(/sesi anda sudah berakhir/i)).toBeVisible();
    const draf = await bacaDrafIdb(page, KUNCI);
    expect(draf?.isi.medan.title).toBe(judul);
    expect(draf?.pemilik).toBe(user.id);

    // Masuk kembali di TAB YANG SAMA. Seperti warga sungguhan, ia mendarat di
    // berandanya dulu, lalu membuka formulir pengaduan lagi.
    await masukSebagai(page, AKUN.warga, '/dashboard');
    await page.goto('/complaints/new');
    await expect(page.getByLabel('Judul Laporan')).toHaveValue(judul);
    await expect(page.getByText(/isian anda sebelumnya dipulihkan/i)).toBeVisible();
    await expect.poll(() => bacaDrafIdb(page, KUNCI)).toBeNull();
  });

  /**
   * Inti perubahan 23 November 2026. Draf di sessionStorage mati bersama
   * tabnya; uji ini MERAH pada kode itu karena halaman baru memulai
   * sessionStorage kosong. Lampiran harus ikut kembali.
   */
  test('isian dan lampiran selamat sesudah tab ditutup', async ({ context }) => {
    const judul = `[UJI E2E] Draf tutup tab ${Date.now()}`;
    const page = await context.newPage();

    await masukSebagai(page, AKUN.warga, '/dashboard');
    await page.goto('/complaints/new');
    await expect(
      page.getByRole('heading', { name: 'Sampaikan Keluhan & Pengaduan Anda' }),
    ).toBeVisible();
    await isiFormulir(page, judul);
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'bukti-uji.png', mimeType: 'image/png', buffer: PNG_1X1 });
    await expect(page.getByText(/bukti-uji\.png/)).toBeVisible();

    await kirimDenganSesiBerakhir(page);
    await expect(
      page.getByText(/isian dan lampiran anda disimpan di peramban ini selama 2 jam/i),
    ).toBeVisible();
    await page.close();

    const halamanBaru = await context.newPage();
    await masukSebagai(halamanBaru, AKUN.warga, '/dashboard');
    await halamanBaru.goto('/complaints/new');

    await expect(halamanBaru.getByLabel('Judul Laporan')).toHaveValue(judul);
    await expect(halamanBaru.getByText(/bukti-uji\.png/)).toBeVisible();
    await expect(
      halamanBaru.getByText(/isian dan 1 lampiran anda sebelumnya dipulihkan/i),
    ).toBeVisible();
    await expect.poll(() => bacaDrafIdb(halamanBaru, KUNCI)).toBeNull();
  });

  /**
   * Drafnya DITANAM DI /dashboard, yang tak memuat formulir pengaduan, lalu
   * formulirnya dibuka dengan muatan segar.
   *
   * Versi pertama menanamnya di /complaints/new lalu memuat ulang, dan lulus
   * juga pada kode LAMA yang menuangkan draf siapa pun. Sebabnya,
   * `toBeVisible()` sudah terpenuhi oleh HTML server sebelum hidrasi, sehingga
   * draf yang ditanam sesudahnya dimakan halaman sebelum reload, dan reload
   * selalu menampilkan formulir kosong di kedua sisi.
   */
  test('draf milik akun lain tidak dituangkan dan dibuang', async ({ page }) => {
    await masukSebagai(page, AKUN.warga, '/dashboard');

    await tanamDrafIdb(page, {
      kunci: KUNCI,
      pemilik: 999999,
      kedaluwarsa: Date.now() + 60 * 60 * 1000,
      isi: {
        medan: { title: '[UJI E2E] Draf orang lain', category: 'kab_lainnya' },
        lampiran: [],
      },
    });
    await page.goto('/complaints/new');

    await expect(page.getByLabel('Judul Laporan')).toBeVisible();
    await expect.poll(() => bacaDrafIdb(page, KUNCI)).toBeNull();
    await expect(page.getByLabel('Judul Laporan')).toHaveValue('');
    await expect(page.getByText(/sebelumnya dipulihkan/i)).toHaveCount(0);
  });
});
