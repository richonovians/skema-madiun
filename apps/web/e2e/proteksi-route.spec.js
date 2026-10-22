import { test, expect } from '@playwright/test';
import { AKUN } from './support/api';
import { masukSebagai } from './support/masuk';
import { panaskanRute } from './support/pemanasan';
import { KOLOM, MATRIKS, RUTE_UNTUK_PEMANASAN } from './support/rute';

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
  const gagalServer = [];

  for (const baris of MATRIKS) {
    const rute = baris[0];
    const diharapkan = baris[kolom];

    // `domcontentloaded`, bukan `load` bawaan: yang diperiksa di sini adalah
    // ALAMAT AKHIR setelah semua pantulan, bukan selesainya seluruh sumber daya
    // halaman. Menunggu `load` membuat sapuan ini bergantung pada gambar, font,
    // dan kompilasi rute oleh server pengembangan — pernah membuatnya melewati
    // batas waktu di `/dashboard` padahal pantulannya sudah selesai sejak awal.
    const res = await page.goto(rute, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(JEDA_SETELAH_NAVIGASI);
    const sampai = new URL(page.url()).pathname;

    // Status dibaca, bukan diabaikan. Halaman galat server tinggal di
    // alamatnya sendiri, jadi tanpa baris ini 5xx menyamar sebagai keputusan
    // proxy -- terbaca "tidak dipantulkan" bila alamatnya berbeda dari yang
    // diharapkan, dan terbaca LULUS bila kebetulan sama.
    const status = res?.status();
    if (typeof status === 'number' && status >= 500) {
      gagalServer.push(`  ${rute} → HTTP ${status}`);
    }

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

  // DIPERIKSA SEBELUM matriksnya, sealasan dengan pengintai 429 di atas:
  // bila servernya sendiri tak menjawab, hasil matriks apa pun tak bermakna,
  // dan melaporkannya sebagai pelanggaran RBAC mengirim pembaca ke arah yang
  // salah -- itu sungguh terjadi, dan butuh cuplikan halaman untuk dibantah.
  expect(
    gagalServer.join('\n'),
    'Server membalas 5xx di tengah sapuan, jadi hasilnya TIDAK dapat dipercaya. ' +
      'Halaman galat tinggal di alamatnya sendiri, sehingga tampak seperti rute ' +
      'yang tidak dipantulkan -- dan bila alamat itu kebetulan sama dengan yang ' +
      'diharapkan, sapuan ini bahkan LULUS tanpa memeriksa apa pun. Terjadi ' +
      'sungguhan 22 Oktober 2026: `apps/api` memuat ulang di tengah jalan dan ' +
      'tiga rute admin terbaca seolah terbuka bagi responden. Pastikan ' +
      '`http://skema.local/api/v1/health` menjawab 200, lalu jalankan ulang. ' +
      'Rute yang gagal:',
  ).toBe('');

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

  /**
   * Berkas inilah yang paling dirugikan hilangnya pemanasan: satu uji menyapu
   * SELURUH baris matriks, jadi tiap rute yang belum terkompilasi menambah
   * waktunya pada uji yang sama. Pada 20 Oktober 2026 dua ujinya habis tenggat
   * 150 detik lalu lulus saat diulang dalam 28,6 dan 21,3 detik -- selisih itu
   * ukuran biaya kompilasinya, bukan kegoyahan aplikasi.
   */
  test.beforeAll(async () => {
    await panaskanRute(RUTE_UNTUK_PEMANASAN);
  });

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

/**
 * KENDALI atas sapuannya sendiri, ditambahkan 22 Oktober 2026 sesudah sebuah
 * kegagalan yang salah dibaca.
 *
 * Malam itu `sapuMatriks` melaporkan sesi responden membuka
 * `/admin-kab/dashboard`, `/admin-opd/dashboard`, dan `/admin-opd/complaints`.
 * Dibaca apa adanya itu lubang kontrol akses tingkat Critical. Cuplikan halaman
 * yang Playwright simpan membantahnya: ketiganya `502 Bad Gateway` dari nginx,
 * sebab `apps/api` sedang memuat ulang di tengah jalan. Pada 502 alamatnya tidak
 * berubah, dan sapuan ini menyimpulkan keputusan proxy DARI ALAMAT AKHIR -- jadi
 * alamat yang tidak berubah terbaca sebagai "tidak dipantulkan".
 *
 * Uji di bawah memilih kasus yang LEBIH TAJAM daripada kegagalan itu. Merah
 * palsu setidaknya berisik dan tertangkap. Yang berbahaya kebalikannya: bila
 * rute yang dijawab 502 kebetulan SAMA dengan alamat yang diharapkan, matriksnya
 * cocok dan sapuan ini hijau sambil tak memeriksa apa pun. Baris `/` pada kolom
 * `tanpaToken` tepat begitu -- diharapkan `/`, dan halaman galat pun tinggal
 * di `/`.
 *
 *
 * DITARUH DI AKHIR BERKAS dengan sengaja. Uji ini menambah delapan navigasi
 * pada anggaran permintaan berkas ini, dan backend membatasi 100 permintaan
 * per 60 detik. Ketika ia berada di AWAL, dua percobaan uji `responden`
 * sesudahnya kehabisan 150 detik di `masukSebagai` -- bukan di matriksnya.
 * Sebabnya TIDAK terbukti: artefak `test-results` sudah terhapus oleh jalan
 * berikutnya sebelum sempat dibaca, jadi 429 hanya dugaan yang paling masuk
 * akal, bukan hasil pengukuran. Yang pasti hanya ini: uji yang sama lulus
 * 30,8 detik bila dijalankan sendiri, dan menaruh pagar ini di belakang
 * membuat uji berlogin memakai anggaran yang masih utuh.
 * Tak ada sesi yang dibutuhkan dan tak ada baris basis data yang tersentuh.
 */
test.describe('KENDALI sapuMatriks: 5xx tidak boleh menyamar sebagai hasil yang sah', () => {
  test.describe.configure({ timeout: 150_000 });

  test('rute yang dijawab 502 dilaporkan sebagai kegagalan infrastruktur', async ({ page }) => {
    // Hanya `/` yang dipalsukan, dan justru itu baris yang diharapkan `/`.
    await page.route(
      (url) => new URL(url).pathname === '/',
      (route) =>
        route.fulfill({
          status: 502,
          contentType: 'text/html',
          body: '<h1>502 Bad Gateway</h1>',
        }),
    );

    await expect(sapuMatriks(page, KOLOM.tanpaToken)).rejects.toThrow(/502/);
  });
});
