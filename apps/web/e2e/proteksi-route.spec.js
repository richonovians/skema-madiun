import { test, expect } from '@playwright/test';
import { AKUN } from './support/api';
import { masukSebagai } from './support/masuk';
import { KOLOM, MATRIKS } from './support/rute';

/**
 * TC-FE-002 & TC-AUTH-055 — matriks proteksi route `proxy.js` (TEST_CASES A.5.1).
 *
 * Kerusakan yang ditangkap: satu baris `proxy.js` yang hilang atau salah urut
 * membuka seluruh area admin bagi peran yang tak berhak — dan tak ada satu pun
 * uji komponen yang bisa melihatnya, karena proxy berjalan di Edge Runtime,
 * bukan di dalam React.
 *
 * Peran `superuser` sengaja TIDAK ada di sini: kurungan areanya punya aturan
 * sendiri (cookie `area`/`opd`) dan sudah diperiksa pada sesi eksploratori C-10.
 */

/**
 * Jeda setelah setiap navigasi.
 *
 * Dua gunanya sekaligus. Pertama, pantulan bisa datang belakangan dari sisi
 * klien, bukan hanya dari proxy — memeriksa alamat seketika akan melewatkannya.
 * Kedua, ini menahan laju permintaan: backend membatasi 100 permintaan per 60
 * detik per IP, dan sapuan rute tanpa jeda pernah menembusnya.
 */
const JEDA_SETELAH_NAVIGASI = 1200;

/**
 * Pasang pengintai 429.
 *
 * Ini menjaga dari jebakan yang pernah menghasilkan kesimpulan palsu: begitu
 * batas laju tertembus, `GET /auth/me` membalas 429, aplikasi menyimpulkan
 * sesinya mati, dan SELURUH rute memantul ke `/` — persis seperti penjagaan
 * akses yang bekerja sempurna. Tanpa pengintai ini sebuah sapuan yang kena
 * batas laju akan terbaca hijau untuk alasan yang sama sekali salah.
 */
function intaiBatasLaju(page) {
  const kena = [];
  page.on('response', (res) => {
    if (res.status() === 429) kena.push(res.url());
  });
  return kena;
}

/**
 * Matikan cache HTTP peramban untuk sapuan.
 *
 * Sapuan ini menyimpulkan keputusan `proxy.js` dari ALAMAT AKHIR sebuah
 * navigasi. Kesimpulan itu hanya sah bila navigasinya benar-benar sampai ke
 * server: halaman yang dilayani dari cache peramban tak pernah melewati proxy
 * sama sekali, sehingga tampak "tidak dialihkan" — tak terbedakan dari
 * penjagaan akses yang jebol.
 *
 * Bukan kekhawatiran teoretis. Suite ini pernah merah dengan pola SELURUH
 * delapan rute tinggal di tempat, termasuk kombinasi yang tak dapat dihasilkan
 * oleh keadaan cookie mana pun — jadi mustahil berasal dari proxy. Sisi server
 * sudah dikesampingkan: 125 permintaan serentak dengan cookie `kabupaten`
 * seluruhnya dijawab 307 yang benar. Yang tersisa adalah cache peramban, dan
 * baris ini menutupnya.
 */
async function matikanCache(page) {
  await page.context().setExtraHTTPHeaders({
    'Cache-Control': 'no-cache, no-store, max-age=0',
    Pragma: 'no-cache',
  });
}

async function sapuMatriks(page, kolom) {
  await matikanCache(page);
  const kena429 = intaiBatasLaju(page);
  const menyimpang = [];

  for (const baris of MATRIKS) {
    const rute = baris[0];
    const diharapkan = baris[kolom];

    // `domcontentloaded`, bukan `load` bawaan: yang diperiksa di sini adalah
    // ALAMAT AKHIR setelah semua pantulan, bukan selesainya seluruh sumber daya
    // halaman. Menunggu `load` membuat sapuan ini bergantung pada gambar, font,
    // dan kompilasi rute oleh server pengembangan — pernah membuatnya melewati
    // batas waktu di `/dashboard` padahal pantulannya sudah selesai sejak awal.
    await page.goto(rute, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(JEDA_SETELAH_NAVIGASI);
    const sampai = new URL(page.url()).pathname;

    if (sampai !== diharapkan) {
      menyimpang.push(`  ${rute} → ${sampai} (seharusnya ${diharapkan})`);
    }
  }

  expect(
    kena429,
    'Batas laju backend (100 permintaan/60 detik) tertembus di tengah sapuan. ' +
      'Hasilnya tak dapat dipercaya: sesi yang ditolak 429 membuat semua rute ' +
      'memantul seolah penjagaan akses bekerja. Jalankan ulang setelah menunggu semenit.',
  ).toEqual([]);

  expect(menyimpang.join('\n'), 'Rute yang menyimpang dari matriks A.5.1:').toBe('');
}

test.describe('Matriks proteksi route (A.5.1)', () => {
  // Satu uji di sini menyapu 8 rute berturut-turut, masing-masing dengan jeda
  // penenang 1,2 detik. Di bawah batas bawaan 60 detik anggarannya terlalu mepet:
  // ketika keempat uji peran berjalan paralel, satu server `next dev` melayani
  // semuanya sekaligus dan tiap navigasi melar menjadi beberapa detik — sapuan
  // pun kehabisan waktu tepat di rute TERAKHIRNYA, bukan karena ada rute yang
  // bermasalah. Batas yang lebih longgar memberi kelonggaran itu tanpa perlu
  // mengorbankan paralelisme yang membuat suite tetap cepat.
  test.describe.configure({ timeout: 150_000 });

  test('tanpa sesi — seluruh halaman terlindungi memantul ke beranda publik', async ({ page }) => {
    await sapuMatriks(page, KOLOM.tanpaToken);
  });

  test('responden — area warga terbuka, area admin tertutup', async ({ page }) => {
    await masukSebagai(page, AKUN.warga, '/dashboard');
    await sapuMatriks(page, KOLOM.responden);
  });

  test('admin OPD — area OPD terbuka, area kabupaten & warga tertutup', async ({ page }) => {
    await masukSebagai(page, AKUN.adminOpd, '/admin-opd/dashboard');
    await sapuMatriks(page, KOLOM.opd);
  });

  test('admin kabupaten — terkurung di areanya sendiri, seluruh area OPD tertutup', async ({
    page,
  }) => {
    // BERUBAH 15 September 2026 bersama peran jamak. Sampai `62e9cdc`, peran
    // `kabupaten` boleh menengok `/admin-opd/*` kecuali dashboard-nya
    // (keputusan 6 Agustus 2026); kini `ROLE_PREFIXES` di `proxy.js`
    // mengurungnya pada `/admin-kab` dan SELURUH area OPD memantul ke
    // `/admin-kab/dashboard`.
    //
    // Sejalan dengan rancangan peran jamak: yang butuh area OPD berganti peran,
    // bukan menembus batas areanya. Lihat matriks di `support/rute.js`.
    await masukSebagai(page, AKUN.adminKabupaten, '/admin-kab/dashboard');
    await sapuMatriks(page, KOLOM.kabupaten);
  });
});
