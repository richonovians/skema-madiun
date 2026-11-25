import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { test, expect, cariButirAksi, type Peran } from './fixtures/responsif';

/**
 * UNDUHAN QR: POSTER DAN QR POLOS, LEWAT MODAL PILIHAN.
 *
 * 22 September 2026: unduhan QR menjadi poster, bukan QR polos. 25 November
 * 2026 (permintaan pengguna): tombol "Unduh QR" membuka modal pilihan berisi
 * pratinjau poster survei itu sendiri dan dua tombol -- "QR Polos" dan "QR
 * dengan Desain" -- sehingga kedua berkas dapat diperoleh.
 *
 * KENAPA UJINYA DI SINI, BUKAN DI JEST. Posternya digambar di `<canvas>`, dan
 * jsdom tidak memiliki canvas sungguhan: `getContext('2d')` mengembalikan null
 * dan `toBlob` tak pernah memanggil balik. Di Jest yang dapat dibuktikan
 * hanyalah data apa yang diserahkan ke penyusun poster (UnduhQrModal.test)
 * dan bagaimana judul panjang dipecah (posterQrSurvei.test). Berkas yang
 * benar-benar turun hanya dapat diukur di peramban.
 *
 * Yang diperiksa dimensinya, bukan isinya. Membandingkan piksel poster akan
 * memerah setiap kali fontanya berubah setebal satu piksel, dan uji yang
 * memerah karena hal begitu akan dimatikan orang dalam sebulan. Dimensi sudah
 * cukup memisahkan keduanya: QR polos persegi 1024px, poster 1080x1440.
 */
test.describe.configure({ timeout: 90_000 });

/** Dimensi poster; harus sama dengan LEBAR/TINGGI di utils/posterQrSurvei.js. */
const POSTER = { lebar: 1080, tinggi: 1440 };
/** Harus sama dengan QR_PIXEL_SIZE di ShareSurveyModal.jsx. */
const QR_POLOS = { lebar: 1024, tinggi: 1024 };

/**
 * Baca lebar & tinggi dari kepala PNG.
 *
 * IHDR selalu potongan pertama, sehingga lebarnya ada di offset 16 dan
 * tingginya di 20, keduanya 32-bit big-endian. Membaca berkasnya langsung jauh
 * lebih murah daripada memuatnya kembali ke dalam peramban hanya untuk
 * menanyakan ukurannya.
 */
function ukuranPng(jalur: string): { lebar: number; tinggi: number } {
  const buf = readFileSync(jalur);
  expect(buf.subarray(1, 4).toString('ascii'), 'berkasnya bukan PNG').toBe('PNG');
  return { lebar: buf.readUInt32BE(16), tinggi: buf.readUInt32BE(20) };
}

/**
 * Buka modal Bagikan pada survei aktif pertama, lalu modal pilihan unduhan.
 * Memulangkan `null` bila mesin ini tak punya survei aktif.
 */
async function bukaPilihanUnduh(
  page: Page,
  bukaSebagai: (peran: Peran, path: string) => Promise<void>,
) {
  await bukaSebagai('kabupaten', '/admin-kab/surveys');

  // "Bagikan" ada di balik menu aksi baris sejak 30 September 2026 (`22b2d03`).
  // Sampai 26 Oktober uji di berkas ini masih mencari tombol lepas, tak
  // menemukannya, dan melewati dirinya -- padahal survei aktif ada.
  const bagikan = await cariButirAksi(page, /^bagikan$/i);
  if (!bagikan) return null;
  await bagikan.click();

  // Tombolnya dirender nonaktif sampai QR selesai dibuat di effect asinkron;
  // menunggu keberadaannya saja akan mengklik tombol mati. Jangkarnya `^...$`
  // karena kedua tombol di modal pilihan juga diawali "Unduh QR".
  const unduhQr = page.getByRole('button', { name: /^unduh qr$/i });
  await expect(unduhQr).toBeEnabled({ timeout: 15_000 });
  await unduhQr.click();

  const pilihan = page.getByRole('dialog', { name: /^unduh qr/i });
  await expect(pilihan).toBeVisible();
  return { pilihan, unduhQr };
}

const ALASAN_LEWAT =
  'Tak ada survei AKTIF pada basis data mesin ini -- butir Bagikan memang hanya muncul di sana.';

test('Unduh QR membuka modal pilihan dengan pratinjau poster survei itu', async ({
  page,
  bukaSebagai,
}) => {
  const buka = await bukaPilihanUnduh(page, bukaSebagai);
  test.skip(!buka, ALASAN_LEWAT);
  const { pilihan } = buka!;

  // Pratinjau adalah poster sungguhan yang selesai digambar, bukan kotak
  // kosong: ukuran aslinya sama dengan berkas poster yang akan turun.
  const pratinjau = pilihan.getByRole('img', { name: /pratinjau poster qr/i });
  await expect(pratinjau).toBeVisible({ timeout: 15_000 });
  const asli = await pratinjau.evaluate((img: HTMLImageElement) => ({
    lebar: img.naturalWidth,
    tinggi: img.naturalHeight,
  }));
  expect(asli).toEqual(POSTER);

  await expect(pilihan.getByRole('button', { name: /unduh qr polos/i })).toBeEnabled();
  await expect(pilihan.getByRole('button', { name: /unduh qr dengan desain/i })).toBeEnabled();
});

test('"QR dengan Desain" menurunkan poster 1080x1440', async ({ page, bukaSebagai }) => {
  const buka = await bukaPilihanUnduh(page, bukaSebagai);
  test.skip(!buka, ALASAN_LEWAT);
  const tombol = buka!.pilihan.getByRole('button', { name: /unduh qr dengan desain/i });
  await expect(tombol).toBeEnabled({ timeout: 15_000 });

  const [berkas] = await Promise.all([page.waitForEvent('download'), tombol.click()]);

  const jalur = await berkas.path();
  expect(jalur, 'unduhannya tak menghasilkan berkas').toBeTruthy();
  expect(berkas.suggestedFilename()).toMatch(/^qr-survei-.+-poster\.png$/);
  expect(ukuranPng(jalur as string)).toEqual(POSTER);
});

test('"QR Polos" menurunkan kotak QR 1024x1024 tanpa desain', async ({ page, bukaSebagai }) => {
  const buka = await bukaPilihanUnduh(page, bukaSebagai);
  test.skip(!buka, ALASAN_LEWAT);
  const tombol = buka!.pilihan.getByRole('button', { name: /unduh qr polos/i });

  const [berkas] = await Promise.all([page.waitForEvent('download'), tombol.click()]);

  const jalur = await berkas.path();
  expect(jalur, 'unduhannya tak menghasilkan berkas').toBeTruthy();
  expect(berkas.suggestedFilename()).toMatch(/^qr-survei-.+-polos\.png$/);
  expect(ukuranPng(jalur as string)).toEqual(QR_POLOS);
});

test('Escape menutup modal pilihan saja dan fokus kembali ke tombol Unduh QR', async ({
  page,
  bukaSebagai,
}) => {
  const buka = await bukaPilihanUnduh(page, bukaSebagai);
  test.skip(!buka, ALASAN_LEWAT);
  const { pilihan, unduhQr } = buka!;

  await page.keyboard.press('Escape');

  await expect(pilihan).toBeHidden();
  await expect(page.getByRole('dialog', { name: /bagikan survei/i })).toBeVisible();
  await expect(unduhQr).toBeFocused();
});

/**
 * Ponsel terkecil dan ponsel mendatar. Kartu modal ini lebih tinggi daripada
 * 568px, jadi yang diperiksa: tiap tombol dapat dicapai dengan menggulir latar
 * dan tak satu pun meluber keluar layar.
 */
for (const layar of [
  { width: 320, height: 568 },
  { width: 568, height: 320 },
]) {
  test(`modal pilihan dapat dipakai pada ${layar.width}x${layar.height}`, async ({
    page,
    bukaSebagai,
  }) => {
    await page.setViewportSize(layar);
    const buka = await bukaPilihanUnduh(page, bukaSebagai);
    test.skip(!buka, ALASAN_LEWAT);
    const { pilihan } = buka!;
    await expect(pilihan.getByRole('img', { name: /pratinjau poster qr/i })).toBeVisible({
      timeout: 15_000,
    });
    // Kartu beranimasi `zoom-in-95` 200 ms; ukurannya baru tetap sesudahnya.
    await page.waitForTimeout(400);

    for (const nama of [/unduh qr dengan desain/i, /unduh qr polos/i, /^tutup$/i]) {
      const tombol = pilihan.getByRole('button', { name: nama });
      await tombol.scrollIntoViewIfNeeded();
      const kotak = await tombol.boundingBox();
      expect(kotak, `${nama} tak tergambar`).not.toBeNull();
      expect(kotak!.x, `${nama} meluber ke kiri`).toBeGreaterThanOrEqual(0);
      expect(kotak!.x + kotak!.width, `${nama} meluber ke kanan`).toBeLessThanOrEqual(layar.width);
      expect(kotak!.y, `${nama} di atas layar`).toBeGreaterThanOrEqual(0);
      expect(kotak!.y + kotak!.height, `${nama} di bawah layar`).toBeLessThanOrEqual(
        layar.height,
      );
    }
  });
}

/**
 * KONTROL. Uji di atas akan tetap hijau bila tombol Bagikan lenyap dari seluruh
 * aplikasi -- ia melewati dirinya sendiri dengan alasan yang terdengar masuk
 * akal ("tak ada survei aktif"). Uji ini membuktikan bahwa alasan itu benar-
 * benar berasal dari status surveinya: di halaman yang sama, baris survei tetap
 * ada dan tetap punya aksi lain.
 */
test('KONTROL: halaman survei Admin Kabupaten memang berisi', async ({ page, bukaSebagai }) => {
  await bukaSebagai('kabupaten', '/admin-kab/surveys');

  // Aksinya ADA DI BALIK MENU TITIK-TIGA sejak 30 September 2026 (commit
  // 22b2d03, "aksi survei Kabupaten jadi menu titik-tiga"). Uji ini ditulis 22
  // September dan masih mencari tautan "Detail" di dalam baris tabel, padahal
  // tautan itu kini baru ada di DOM setelah menunya dibuka -- jadi ia merah
  // sejak hari pemindahan itu, bukan karena halamannya kosong. Dibetulkan 7
  // Oktober 2026.
  // Dua hal berubah, dan keduanya perlu disebut supaya pembaca berikutnya tak
  // mengira yang satu cukup. Pertama, butirnya baru masuk DOM setelah menunya
  // dibuka. Kedua, butir "Detail" memang `next/link`, tetapi ia membawa
  // `role="menuitem"` yang MENIMPA peran `link` implisitnya -- jadi
  // `getByRole('link')` tak akan pernah menemukannya berapa lama pun ditunggu.
  const pemicuAksi = page.getByRole('button', { name: /^Aksi untuk / }).first();
  await expect(pemicuAksi).toBeVisible();
  await pemicuAksi.click();

  await expect(page.getByRole('menuitem', { name: /detail/i }).first()).toBeVisible();
});
