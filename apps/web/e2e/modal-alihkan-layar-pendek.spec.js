import { test, expect } from '@playwright/test';
import { AKUN, masukApi, panggilApi } from './support/api';
import { masukSebagai } from './support/masuk';

/**
 * Modal "Alihkan ke instansi berwenang" di layar pendek (BUG-084, TC-CMP-090).
 *
 * MENULIS SATU PENGADUAN berpenanda `[UJI BUG-084]` bila belum ada, karena
 * modal ini hanya muncul pada pengaduan yang belum tuntas dan basis data lokal
 * bisa tak memuat satu pun (17 November 2026: tujuh pengaduan, semuanya
 * `selesai` atau `ditolak`). Pengaduannya ditinggalkan untuk
 * `bersihkan-data-uji.mjs`, sama seperti `ajukan-pengaduan`. Selebihnya hanya
 * membaca: modal dibuka, instansi dipilih, lalu ditinggalkan. Tombol
 * "Alihkan Pengaduan" tak pernah ditekan.
 *
 * Cacatnya tak terlihat oleh Jest karena jsdom tak menata letak apa pun.
 * `useBodyScrollLock` mengunci `body`, sedangkan kartu dan latarnya tak punya
 * wilayah gulir, sehingga kartu yang lebih tinggi daripada layar terpotong di
 * atas dan di bawah tanpa ada cara mencapainya. Laporan QA pada `a1e3c1f`:
 * tepi atas kartu -65 pada 320x568 dan -100 pada 640x360. Spec ini sendiri
 * memerah pada `b259ec4` di ketiga ukuran, dengan tepi atas JUDUL -4, -48,
 * dan -75.
 *
 * Yang diperiksa adalah janji kepada pengguna, bukan cara memenuhinya: judul
 * dan kedua tombol dapat DIGULIR hingga utuh terlihat, dan daftar instansi
 * tetap dapat dibuka dan dipilih. Pemeriksaan terakhir menjaga perbaikannya,
 * karena wilayah gulir yang memotong panel dropdown absolut adalah cara
 * termudah memperbaiki yang satu sambil merusak yang lain.
 */

const LAYAR = [
  { width: 360, height: 640 },
  { width: 320, height: 568 },
  { width: 640, height: 360 },
];

const JUDUL_UJI = '[UJI BUG-084] Modal alihkan layar pendek';

/** Gulir elemen ke dalam pandangan, lalu kembalikan kotaknya. */
async function kotakSesudahGulir(locator) {
  await locator.scrollIntoViewIfNeeded();
  return locator.boundingBox();
}

function utuhTerlihat(kotak, tinggi, lebar) {
  return (
    kotak !== null &&
    kotak.y >= -0.5 &&
    kotak.y + kotak.height <= tinggi + 0.5 &&
    kotak.x >= -0.5 &&
    kotak.x + kotak.width <= lebar + 0.5
  );
}

test.describe('Modal alihkan di layar pendek (BUG-084)', () => {
  /** Nomor tiket pengaduan uji, dibuat sekali untuk ketiga ukuran layar. */
  let tiket = null;

  test.beforeAll(async () => {
    const { token: tokenKabupaten } = await masukApi(AKUN.adminKabupaten, 'kabupaten');

    // Pengaduan uji dari jalan sebelumnya DIPAKAI ULANG bila masih ada.
    // `beforeAll` diulang setiap kali sebuah uji gagal (pekerja baru), dan
    // warga hanya boleh mengirim 10 pengaduan per hari: tanpa ini tiga jalan
    // merah beruntun sudah menghabiskan jatahnya.
    const terbuka =
      (await panggilApi(
        tokenKabupaten,
        'GET',
        '/complaints?status=menunggu_verifikasi&limit=100',
      )) ?? [];
    const lama = terbuka.find((c) => c.judul?.startsWith(JUDUL_UJI) && c.opdId);
    if (lama) {
      tiket = lama.ticketNo;
      return;
    }

    const daftarOpd = (await panggilApi(tokenKabupaten, 'GET', '/opd?limit=100')) ?? [];
    const opdKabupaten = daftarOpd.find((o) => o.tingkat === 'kabupaten');
    expect(opdKabupaten, 'tak ada OPD tingkat kabupaten untuk dijadikan tujuan').toBeTruthy();

    const { token: tokenWarga } = await masukApi(AKUN.warga, 'responden');
    const pengaduan = await panggilApi(tokenWarga, 'POST', '/complaints', {
      judul: `${JUDUL_UJI} ${Date.now()}`,
      uraian: 'Dibuat otomatis oleh pagar regresi BUG-084 untuk membuka modal alihkan.',
      tingkat: 'kabupaten',
      kategori: 'kab_lainnya',
      opdId: opdKabupaten.id,
      tanggalKejadian: '2026-11-01',
      lokasiKejadian: '[UJI E2E] Balai desa',
    });
    tiket = pengaduan.ticketNo;
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await masukSebagai(page, AKUN.adminKabupaten, '/admin-kab/dashboard');
  });

  for (const { width, height } of LAYAR) {
    test(`${width}x${height}: judul, tombol, dan daftar instansi dapat dicapai`, async ({
      page,
    }) => {
      await page.goto(`/admin-kab/complaints/${tiket}`);
      await page.setViewportSize({ width, height });
      const pemicu = page.getByRole('button', { name: 'Alihkan ke instansi lain' });
      await pemicu.scrollIntoViewIfNeeded();
      await pemicu.click();

      const dialog = page.getByRole('dialog', { name: 'Alihkan ke instansi berwenang' });
      await dialog.waitFor();
      // Daftar instansi dimuat asinkron; tinggi kartu baru tetap sesudahnya.
      const pemicuOpd = dialog.getByRole('button', { name: /Instansi tujuan|Pilih instansi tujuan/ });
      await expect(pemicuOpd).toBeEnabled();

      const judul = dialog.getByRole('heading', { name: 'Alihkan ke instansi berwenang' });
      const batal = dialog.getByRole('button', { name: 'Batal' });
      const kirim = dialog.getByRole('button', { name: 'Alihkan Pengaduan' });

      for (const [nama, el] of [
        ['judul', judul],
        ['tombol Batal', batal],
        ['tombol Alihkan Pengaduan', kirim],
        ['judul (kembali ke atas)', judul],
      ]) {
        const kotak = await kotakSesudahGulir(el);
        expect(
          utuhTerlihat(kotak, height, width),
          `${nama} tak dapat digulir hingga utuh terlihat: ${JSON.stringify(kotak)}`,
        ).toBe(true);
      }

      // Daftar instansi: panelnya harus terbuka dengan setidaknya satu pilihan
      // utuh terlihat, dan pilihan itu harus dapat ditekan.
      await pemicuOpd.scrollIntoViewIfNeeded();
      await pemicuOpd.click();
      const panel = pemicuOpd.locator('xpath=..');
      const pilihan = panel
        .getByRole('button')
        .filter({ hasNotText: /Pilih instansi tujuan/ })
        .nth(1);
      await pilihan.waitFor();
      const namaPilihan = (await pilihan.textContent()).trim();
      const kotakPilihan = await kotakSesudahGulir(pilihan);
      expect(
        utuhTerlihat(kotakPilihan, height, width),
        `pilihan instansi "${namaPilihan}" terpotong: ${JSON.stringify(kotakPilihan)}`,
      ).toBe(true);
      await pilihan.click();
      await expect(pemicuOpd).toContainText(namaPilihan);
    });
  }
});
