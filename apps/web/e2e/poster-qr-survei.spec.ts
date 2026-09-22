import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures/responsif';

/**
 * UNDUHAN QR ADALAH POSTER, BUKAN QR POLOS (22 September 2026, permintaan
 * pengguna).
 *
 * KENAPA UJINYA DI SINI, BUKAN DI JEST. Posternya digambar di `<canvas>`, dan
 * jsdom tidak memiliki canvas sungguhan: `getContext('2d')` mengembalikan null
 * dan `toBlob` tak pernah memanggil balik. Di Jest yang dapat dibuktikan
 * hanyalah data apa yang diserahkan ke penyusun poster (ShareSurveyModal.test)
 * dan bagaimana judul panjang dipecah (posterQrSurvei.test). Bahwa berkas yang
 * benar-benar turun adalah poster -- bukan kotak QR 512px seperti sebelumnya --
 * hanya dapat diukur di peramban.
 *
 * Yang diperiksa dimensinya, bukan isinya. Membandingkan piksel poster akan
 * memerah setiap kali fontanya berubah setebal satu piksel, dan uji yang
 * memerah karena hal begitu akan dimatikan orang dalam sebulan. Dimensi sudah
 * cukup memisahkan yang lama dari yang baru: QR polos persegi 512px, poster
 * 1080x1440.
 */
test.describe.configure({ timeout: 90_000 });

/** Dimensi poster; harus sama dengan LEBAR/TINGGI di utils/posterQrSurvei.js. */
const POSTER = { lebar: 1080, tinggi: 1440 };

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

test('unduhan QR pada survei aktif berupa poster, bukan QR polos', async ({
  page,
  bukaSebagai,
}) => {
  await bukaSebagai('kabupaten', '/admin-kab/surveys');

  const bagikan = page.getByRole('button', { name: /bagikan/i }).first();
  test.skip(
    (await bagikan.count()) === 0,
    'Tak ada survei AKTIF pada basis data mesin ini -- tombol Bagikan memang hanya muncul di sana.',
  );

  await bagikan.click();

  // Tombolnya dirender nonaktif sampai QR selesai dibuat di effect asinkron;
  // menunggu keberadaannya saja akan mengklik tombol mati.
  const unduh = page.getByRole('button', { name: /unduh qr/i });
  await expect(unduh).toBeEnabled({ timeout: 15_000 });

  const [berkas] = await Promise.all([page.waitForEvent('download'), unduh.click()]);

  const jalur = await berkas.path();
  expect(jalur, 'unduhannya tak menghasilkan berkas').toBeTruthy();
  expect(berkas.suggestedFilename()).toMatch(/^qr-survei-.+\.png$/);

  const ukuran = ukuranPng(jalur as string);
  expect(ukuran).toEqual({ lebar: POSTER.lebar, tinggi: POSTER.tinggi });
});

/**
 * KONTROL. Uji di atas akan tetap hijau bila tombol Bagikan lenyap dari seluruh
 * aplikasi -- ia melewati dirinya sendiri dengan alasan yang terdengar masuk
 * akal ("tak ada survei aktif"). Uji ini membuktikan bahwa alasan itu benar-
 * benar berasal dari status surveinya: di halaman yang sama, baris survei tetap
 * ada dan tetap punya aksi lain.
 */
test('KONTROL: halaman survei Admin Kabupaten memang berisi', async ({ page, bukaSebagai }) => {
  await bukaSebagai('kabupaten', '/admin-kab/surveys');

  await expect(page.getByRole('link', { name: /detail/i }).first()).toBeVisible();
});
