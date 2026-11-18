import { expect, test } from '@playwright/test';
import { AKUN, masukApi, panggilApi } from './support/api.js';
import { masukSebagai } from './support/masuk';

/**
 * Pagar regresi BUG-086 (TC-CMP-054): penerusan pengaduan tampil di linimasa
 * pelapor.
 *
 * Penerusan oleh Admin Kabupaten dulu hanya mengisi `opd_id`. Linimasa pelapor
 * tetap berbunyi "Terkirim" saja, sehingga ia tak pernah tahu kapan dan ke
 * instansi mana tiketnya sampai -- padahal notifikasinya menyebut itu. Sejak
 * 18 November 2026 penerusan menulis baris riwayat `diteruskan` yang membawa
 * OPD tujuannya, dan linimasa menulisnya "Diteruskan ke <instansi>".
 *
 * Penyiapan lewat API, pemeriksaan lewat peramban: yang dijaga di sini
 * tampilannya bagi pelapor. Bentuk barisnya sendiri dijaga
 * `apps/api/test/alihkan-pengaduan.e2e-spec.ts`.
 *
 * Pengaduannya berjudul `[UJI ` dan ditinggalkan untuk
 * `support/bersihkan-data-uji.mjs`: aplikasi tak punya jalur hapus pengaduan.
 */
test('pelapor melihat baris "Diteruskan ke" sesudah Admin Kabupaten meneruskan', async ({
  page,
}) => {
  const { token: tokenKab } = await masukApi(AKUN.adminKabupaten, 'kabupaten');
  const daftarOpd = (await panggilApi(tokenKab, 'GET', '/opd?limit=100')) ?? [];
  // Setingkat dengan pengaduannya, supaya penerusan tak menuntut kategori baru.
  const tujuan = daftarOpd.find((o) => o.tingkat === 'kabupaten' && o.isActive !== false);
  expect(tujuan, 'tak ada OPD tingkat kabupaten yang dapat dijadikan tujuan').toBeTruthy();

  const { token: tokenWarga } = await masukApi(AKUN.warga, 'responden');
  const pengaduan = await panggilApi(tokenWarga, 'POST', '/complaints', {
    judul: `[UJI BUG-086] Riwayat penerusan ${Date.now().toString(36)}`,
    uraian:
      'Dibuat otomatis oleh pagar regresi BUG-086. Sengaja TANPA OPD tujuan, ' +
      'supaya dapat diteruskan Admin Kabupaten.',
    tingkat: 'kabupaten',
    kategori: 'kab_lainnya',
    tanggalKejadian: '2026-11-01',
    lokasiKejadian: 'Balai Desa Bangunsari',
  });
  await panggilApi(tokenKab, 'PATCH', `/complaints/${pengaduan.id}/opd`, { opdId: tujuan.id });

  await masukSebagai(page, AKUN.warga, '/dashboard');
  await page.goto(`/complaints/${pengaduan.ticketNo.toLowerCase()}`);

  const linimasa = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Riwayat Status' }) })
    .getByRole('list');
  // KONTROL: linimasanya memang termuat. Tanpa ini, "Diteruskan" yang tak
  // muncul tak terbedakan dari halaman yang gagal dimuat.
  await expect(linimasa.getByText('Terkirim', { exact: true })).toBeVisible({ timeout: 20000 });

  await expect(linimasa.getByText('Diteruskan', { exact: true })).toBeVisible();
  await expect(linimasa.getByText(`Diteruskan ke ${tujuan.nama}`)).toBeVisible();
});
