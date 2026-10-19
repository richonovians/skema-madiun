import { test, expect } from './fixtures/responsif';

/**
 * URUTAN KARTU PADA DETAIL PENGADUAN ADMIN KABUPATEN (22 September 2026,
 * permintaan pengguna).
 *
 * Halaman ini bersusun dua kolom pada layar lebar: kiri berisi Ringkasan, Isi
 * Pengaduan, Lampiran, dan percakapan; kanan berisi Profil Pelapor, Status
 * Progres, dan Kontrol Status. Pada layar sempit gridnya runtuh menjadi satu
 * kolom, dan urutan DOM-lah yang menentukan siapa di atas -- sehingga tiga
 * kartu kanan itu terkubur di bawah percakapan yang panjang. Petugas yang
 * membuka tiket dari ponsel harus menggulir melewati seluruh riwayat hanya
 * untuk mengubah status.
 *
 * KENAPA DI SINI, BUKAN DI JEST. Yang diperiksa adalah URUTAN TEGAK SUNGGUHAN,
 * dan jsdom tak menghitung tata letak sama sekali: di sana `order-first` dan
 * `order-last` menghasilkan pohon DOM yang sama persis. Asersi atas nama kelas
 * Tailwind pun tak membuktikan apa-apa -- kelas yang benar dapat dikalahkan
 * kelas lain yang menang di breakpoint tertentu, dan itu persis yang pernah
 * terjadi pada tinggi panel percakapan.
 */
test.describe.configure({ timeout: 120_000 });

const TIKET = 'PGD20260916CGAO';

/** Ordinat atas tiap kartu, dibaca dari tajuknya. */
async function letak(page: import('@playwright/test').Page, nama: string) {
  const kotak = await page
    .getByRole('heading', { name: nama, exact: true })
    .first()
    .boundingBox();
  expect(kotak, `kartu "${nama}" tak ditemukan di halaman`).toBeTruthy();
  return kotak as { x: number; y: number; width: number; height: number };
}

const SEMPIT = [
  { nama: 'ponsel 320x720', width: 320, height: 720 },
  { nama: 'jendela lebar tapi pendek 760x520', width: 760, height: 520 },
];

test('di layar sempit, tiga kartu kerja berada di atas ringkasan', async ({
  page,
  bukaSebagai,
}) => {
  await bukaSebagai('kabupaten', `/admin-kab/complaints/${TIKET}`);
  await page.getByRole('heading', { name: 'Ringkasan Pengaduan' }).waitFor({ timeout: 30_000 });

  // Pelanggarannya dikumpulkan lalu dibandingkan dengan larik kosong: saat
  // gagal, pesannya menyebut kartu mana pada layar mana, beserta selisih
  // ordinatnya -- tepat yang dibutuhkan tanpa membuka peramban sendiri.
  const salah: string[] = [];
  for (const l of SEMPIT) {
    await page.setViewportSize({ width: l.width, height: l.height });
    await page.waitForTimeout(300);

    const ringkasan = await letak(page, 'Ringkasan Pengaduan');
    for (const kartu of ['Profil Pelapor', 'Status Progres', 'Kontrol Status']) {
      const k = await letak(page, kartu);
      if (k.y >= ringkasan.y) {
        salah.push(
          `${l.nama}: "${kartu}" di y=${Math.round(k.y)} masih di bawah Ringkasan Pengaduan (y=${Math.round(ringkasan.y)})`,
        );
      }
    }
  }

  expect(salah).toEqual([]);
});

/**
 * Sisi sebaliknya, dan inilah yang membuat uji di atas bukan sekadar "pindahkan
 * ke atas": pada layar lebar susunan dua kolomnya harus TETAP seperti semula.
 * Penyelesaian yang asal memindahkan kartunya ke atas akan lulus uji pertama
 * sambil merusak tampilan yang selama ini sudah benar.
 */
test('di layar lebar, susunan dua kolomnya tidak berubah', async ({ page, bukaSebagai }) => {
  await bukaSebagai('kabupaten', `/admin-kab/complaints/${TIKET}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('heading', { name: 'Ringkasan Pengaduan' }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(300);

  const ringkasan = await letak(page, 'Ringkasan Pengaduan');
  const profil = await letak(page, 'Profil Pelapor');

  // Bersebelahan, bukan bertumpuk: keduanya berawal pada ketinggian yang
  // kira-kira sama, dan Ringkasan berada di kolom kiri.
  expect(Math.abs(profil.y - ringkasan.y)).toBeLessThan(80);
  expect(ringkasan.x).toBeLessThan(profil.x);
});

/**
 * KONTROL. Kedua uji di atas mencari tajuk; bila halamannya gagal dimuat, yang
 * terjadi adalah kegagalan yang benar dengan sebab yang salah. `letak` memang
 * menolak kartu yang hilang, tetapi kontrol ini menyatakan secara tersurat
 * bahwa halamannya memang berisi tiket yang dimaksud.
 */
test('KONTROL: halaman detailnya memang termuat', async ({ page, bukaSebagai }) => {
  await bukaSebagai('kabupaten', `/admin-kab/complaints/${TIKET}`);

  await expect(page.getByText(`#${TIKET}`)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Isi Pengaduan' })).toBeVisible();
});
