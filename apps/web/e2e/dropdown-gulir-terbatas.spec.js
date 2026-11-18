import { test, expect } from '@playwright/test';
import { AKUN, masukApi, panggilApi } from './support/api';
import { masukSebagai } from './support/masuk';

/**
 * BUG-092: daftar dropdown yang tingginya dibatasi `useKeepInViewport` harus
 * tetap dapat digulir.
 *
 * Kait itu memasang `max-height` pada panel yang tak muat di bawah pemicunya,
 * lalu mengukur ulang pada setiap peristiwa `scroll`. Pengukuran ulangnya
 * mengosongkan batas tinggi dulu, dan selama kosong, daftar yang lebih pendek
 * daripada `max-h-80`-nya tak lagi meluap: peramban memangkas `scrollTop`-nya
 * ke 0. Karena gulir daftar itu sendiri ikut memicu pengukuran ulang, daftar
 * tak pernah dapat digulir dan pilihan terbawahnya tak tercapai.
 *
 * Keadaannya ditiru dari basis data CI, tempat cacat ini pertama terlihat:
 * hanya tiga OPD (seed), lewat `page.route` atas `GET /opd`. Dengan 62 OPD di
 * `skm_db` lokal daftarnya tetap meluap tanpa batas panel dan cacatnya
 * tersembunyi. Layar 640x360 memaksa panel modal Teruskan dibatasi.
 *
 * MENULIS DATA: satu pengaduan `[UJI DROPDOWN-GULIR]` tanpa tujuan, dibuat bila
 * belum ada dan dipakai ulang bila masih tersisa; ditinggalkan untuk
 * `bersihkan-data-uji.mjs`. Tombol Teruskan di modal tidak pernah ditekan.
 */

const JUDUL_PENGADUAN = '[UJI DROPDOWN-GULIR]';
const LAYAR = { width: 640, height: 360 };

async function pengaduanTanpaTujuan() {
  const { token } = await masukApi(AKUN.adminKabupaten, 'kabupaten');
  const terbuka =
    (await panggilApi(token, 'GET', '/complaints?status=menunggu_verifikasi&limit=100')) ?? [];
  const lama = terbuka.find((c) => c.judul?.startsWith(JUDUL_PENGADUAN) && !c.opdId);
  if (lama) return lama.ticketNo;

  const { token: tokenWarga } = await masukApi(AKUN.warga, 'responden');
  const pengaduan = await panggilApi(tokenWarga, 'POST', '/complaints', {
    judul: `${JUDUL_PENGADUAN} tanpa tujuan ${Date.now()}`,
    uraian: 'Dibuat otomatis oleh pagar regresi BUG-092.',
    tingkat: 'kabupaten',
    kategori: 'kab_lainnya',
    tanggalKejadian: '2026-11-01',
    lokasiKejadian: '[UJI E2E] Balai desa',
  });
  return pengaduan.ticketNo;
}

test.describe('Dropdown yang dibatasi tinggi (BUG-092)', () => {
  let tiket = null;

  test.beforeAll(async () => {
    tiket = await pengaduanTanpaTujuan();
  });

  test('daftar OPD pendek tetap dapat digulir dengan roda tetikus', async ({ page }) => {
    test.setTimeout(120_000);

    // Tiga OPD pertama saja, seperti basis data CI yang hanya berisi seed.
    await page.route(/\/api\/v1\/opd(\?|$)/, async (route) => {
      const jawaban = await route.fetch();
      const isi = await jawaban.json();
      isi.data = isi.data.slice(0, 3);
      await route.fulfill({ response: jawaban, json: isi });
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await masukSebagai(page, AKUN.adminKabupaten, '/admin-kab/dashboard');
    await page.goto('/admin-kab/complaints');
    const baris = page.locator('table tbody tr', { hasText: tiket });
    await baris.waitFor();

    await page.setViewportSize(LAYAR);
    const teruskan = baris.getByRole('button', { name: /Teruskan/ });
    await teruskan.scrollIntoViewIfNeeded();
    await teruskan.click();

    const dialog = page.getByRole('dialog', { name: 'Teruskan ke OPD berwenang' });
    const pemicu = dialog.getByRole('button', { name: /OPD yang berwenang|Pilih OPD/ });
    await expect(pemicu).toBeEnabled();
    await pemicu.click();

    const daftar = dialog.locator('ul').first();
    const opsi = daftar.getByRole('button');
    await expect(opsi).toHaveCount(4); // "Pilih OPD" + tiga OPD
    // Panel beranimasi `zoom-in-95` 200 ms; ukurannya baru tetap sesudahnya.
    await page.waitForTimeout(400);

    // PRASYARAT: keadaan yang diuji benar-benar terjadi. Tanpanya uji ini
    // hijau atas daftar yang memang tak perlu digulir.
    const keadaanAwal = await daftar.evaluate((ul) => ({
      batasPanel: ul.parentElement.style.maxHeight,
      tinggiIsi: ul.scrollHeight,
      tinggiTampak: ul.clientHeight,
    }));
    expect(keadaanAwal.batasPanel, 'panel tidak dibatasi tingginya').not.toBe('');
    expect(
      keadaanAwal.tinggiIsi,
      `daftar tidak meluap: ${JSON.stringify(keadaanAwal)}`,
    ).toBeGreaterThan(keadaanAwal.tinggiTampak);

    const gulirDaftar = () => daftar.evaluate((ul) => ul.scrollTop);

    // 1. Gulir roda sungguhan di atas daftar menggerakkannya.
    const kotakDaftar = await daftar.boundingBox();
    await page.mouse.move(kotakDaftar.x + 40, kotakDaftar.y + 10);
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(300);
    const sesudahRoda = await gulirDaftar();
    expect(sesudahRoda, 'daftar OPD tak bergerak oleh roda tetikus').toBeGreaterThan(0);

    // 2. Pilihan terbawah kini utuh di dalam daftar yang tampak.
    const terakhir = opsi.last();
    const [kotakTerakhir, kotakDaftarKini] = await Promise.all([
      terakhir.boundingBox(),
      daftar.boundingBox(),
    ]);
    expect(
      kotakTerakhir.y + kotakTerakhir.height,
      `pilihan terbawah di luar daftar yang tampak: ${JSON.stringify({ kotakTerakhir, kotakDaftarKini })}`,
    ).toBeLessThanOrEqual(kotakDaftarKini.y + kotakDaftarKini.height + 0.5);

    // 3. Latar yang digulir sesudahnya tidak mengembalikan daftar ke atas.
    const latarBergulir = await dialog.evaluate((el) => {
      const latar = el.closest('.overflow-y-auto');
      const sebelum = latar.scrollTop;
      latar.scrollTop = sebelum === 0 ? latar.scrollHeight : 0;
      return latar.scrollTop !== sebelum;
    });
    expect(latarBergulir, 'latar modal tidak dapat digulir di layar ini').toBe(true);
    await page.waitForTimeout(300);
    expect(await gulirDaftar(), 'gulir latar mengembalikan daftar ke atas').toBeGreaterThan(0);

    // 4. Pilihan terbawah dapat dipilih.
    const nama = (await terakhir.textContent()).trim();
    await terakhir.click();
    await expect(pemicu).toContainText(nama);

    await dialog.getByRole('button', { name: 'Batal' }).click();
    await expect(dialog).toBeHidden();
  });
});
