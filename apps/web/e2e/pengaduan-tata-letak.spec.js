import { test, expect } from '@playwright/test';
import { AKUN } from './support/api';
import { masukSebagai } from './support/masuk';

/**
 * Tata letak pengaduan Admin Kabupaten (7 November 2026, laporan pengguna).
 *
 * HANYA MEMBACA: tak ada pesan yang dikirim, tak ada status yang diubah. Teks
 * diketik ke kolom balasan lalu ditinggalkan.
 *
 * Kedua cacatnya tak terlihat oleh Jest, karena jsdom tak memuat CSS dan tak
 * pernah menata letak apa pun:
 *  1. Ruang solusi: toolbar Template/Lampirkan dulu `absolute` di atas
 *     textarea. Ruang di bawahnya disisihkan lewat `pb-12`, padahal padding
 *     itu ikut tergulir bersama isinya -- begitu teks melebihi tinggi kotak,
 *     baris yang terlihat jatuh tepat di bawah tombol.
 *  2. Tabel: `table-layout: auto` memeras kolom STATUS dan AKSI. Lencana
 *     dua kata ("Perlu Perbaikan", "Menunggu Verifikasi") patah menjadi dua
 *     baris di dalam kapsulnya, begitu juga "Monitor Tiket" dan tanggal.
 *     Terukur 1280px, sidebar lebar: lencana 40px, bukan 24px.
 */

/** Banyaknya baris visual sebuah elemen, dihitung dari kotak-kotak teksnya. */
async function jumlahBaris(locator) {
  return locator.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const puncak = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
    return puncak.size;
  });
}

const beririsan = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test.describe('Tata letak pengaduan Admin Kabupaten', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await masukSebagai(page, AKUN.adminKabupaten, '/admin-kab/dashboard');
    await page.goto('/admin-kab/complaints');
  });

  for (const sidebar of ['lebar', 'ciut']) {
    test(`tabel: status, tanggal, dan tombol aksi tak patah baris (sidebar ${sidebar})`, async ({
      page,
    }) => {
      const baris = page.locator('table tbody tr');
      await baris.first().waitFor();
      test.skip(
        (await page.locator('table tbody tr td:nth-child(5) span').count()) === 0,
        'Belum ada pengaduan: tak ada lencana untuk diukur.',
      );

      if (sidebar === 'ciut') {
        await page.getByRole('button', { name: 'Sidebar lebar' }).click();
        await expect(page.getByRole('button', { name: 'Sidebar lebar' })).toHaveAttribute(
          'aria-expanded',
          'false',
        );
      }
      // Sidebar bertransisi 300ms; ukuran kolom baru tetap sesudahnya.
      await page.waitForTimeout(500);

      // Larangan patah baris tak boleh dibayar dengan tombol aksi yang
      // terpotong: sebelum padding sel diperkecil, tabel ini meluap 63px di
      // 1280px bersidebar lebar.
      const luap = await page
        .locator('table')
        .evaluate((t) => t.parentElement.scrollWidth - t.parentElement.clientWidth);
      expect(luap, 'tabel meluap horizontal').toBeLessThanOrEqual(0);

      const n = Math.min(await baris.count(), 10);
      for (let i = 0; i < n; i += 1) {
        const tr = baris.nth(i);
        const status = tr.locator('td:nth-child(5) span').first();
        const tanggal = tr.locator('td:nth-child(4) div').first();
        const aksi = tr.getByRole('link', { name: 'Monitor Tiket' });

        expect(await jumlahBaris(status), `lencana "${await status.textContent()}"`).toBe(1);
        expect(await jumlahBaris(tanggal), `tanggal "${await tanggal.textContent()}"`).toBe(1);
        expect(await jumlahBaris(aksi), 'tombol Monitor Tiket').toBe(1);
      }
    });
  }

  test('ruang solusi: teks panjang tak tertutup toolbar Template/Lampirkan', async ({ page }) => {
    const tautan = page.getByRole('link', { name: 'Monitor Tiket' }).first();
    await page.locator('table tbody tr').first().waitFor();
    test.skip((await tautan.count()) === 0, 'Belum ada pengaduan untuk dibuka.');
    await tautan.click();

    const kolom = page.getByPlaceholder('Tulis jawaban solusi atau update status di sini...');
    await kolom.waitFor();
    // Cukup panjang untuk melampaui tinggi kotak di jendela setinggi 800px.
    await kolom.fill(Array.from({ length: 12 }, (_, i) => `Baris uji tata letak ke-${i + 1}`).join('\n'));

    const kotakTeks = await kolom.boundingBox();
    for (const nama of ['Template pesan', 'Lampirkan Dokumen/Foto']) {
      const kotakTombol = await page.getByRole('button', { name: nama }).boundingBox();
      expect(
        beririsan(kotakTeks, kotakTombol),
        `tombol "${nama}" menindih area teks`,
      ).toBe(false);
    }
  });
});
