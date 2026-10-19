import { test, expect, ambilContoh, type Contoh, type Peran } from './fixtures/responsif';

/**
 * NAMA YANG DAPAT DIAKSES PADA TOMBOL YANG LABELNYA DISEMBUNYIKAN (21 September 2026).
 *
 * Pola yang berulang di seluruh aplikasi ini: ikon ditemani
 * `<span className="hidden sm:inline">Label</span>`. Di atas 640px tombolnya
 * bernama; di bawahnya labelnya `display: none`, dan elemen dengan
 * `display: none` tidak ikut menyusun nama yang dapat diakses. Yang tersisa
 * bagi pembaca layar hanyalah kata "tombol", dan bagi perintah suara tak ada
 * apa pun untuk diucapkan.
 *
 * KENAPA UJINYA DI SINI, BUKAN DI JEST. jsdom tak memuat Tailwind, sehingga
 * `hidden sm:inline` tak berpengaruh sama sekali di sana: span-nya tetap
 * terhitung, ujinya langsung hijau, dan tak pernah membuktikan apa pun. Nama
 * yang dapat diakses hanya dapat diukur jujur di peramban yang benar-benar
 * menerapkan CSS-nya, pada lebar yang benar-benar menyembunyikan labelnya.
 *
 * Polanya sendiri tidak dibuang. Menampilkan label penuh di 320px akan
 * mendorong tombol keluar layar -- persis cacat yang diperbaiki 17 September.
 * Yang ditambahkan hanya `aria-label` + `title`, seperti ResetFilterButton
 * yang sejak awal sudah benar.
 */
test.describe.configure({ timeout: 90_000 });

/** 320px: di sinilah seluruh label tersembunyi. */
test.use({ viewport: { width: 320, height: 720 } });

let contoh: Contoh = {};
test.beforeAll(async () => {
  contoh = await ambilContoh();
});

/**
 * Gagalnya menyebut apa yang sebenarnya ada di halaman, bukan sekadar
 * "tak ditemukan" -- daftar itulah yang memberi tahu tombol mana yang bisu.
 */
async function harusBernama(
  page: import('@playwright/test').Page,
  nama: RegExp,
  keterangan: string,
) {
  const tombol = page.getByRole('button', { name: nama });

  /**
   * URUTANNYA DIBALIK (23 September 2026). Sebelumnya `tombol.count()`
   * dipanggil LEBIH DULU -- satu kali baca DOM, tanpa coba-ulang. Pada lari
   * penuh, halaman yang belum selesai merender membuat hitungannya nol dan uji
   * ini memerah dengan sebab yang salah. Terukur: daftar yang tertangkap hanya
   * berisi tombol kerangka navbar -- "Tutup menu navigasi", "Keluar", "Buka
   * menu navigasi", "Notifikasi" -- tanpa satu pun tombol isi halaman.
   *
   * Kini gerbangnya asersi locator, yang memang mencoba ulang sampai batas
   * waktunya. Daftar diagnostiknya tetap ada dan tetap sama bergunanya, hanya
   * disusun SESUDAH gagal -- saat halamannya sudah pasti selesai.
   */
  try {
    await expect(tombol.first(), `${keterangan} tak bernama di 320px`).toBeVisible();
  } catch (galat) {
    const semua = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .filter((b) => b.offsetParent !== null)
        .map((b) => (b.getAttribute('aria-label') || b.innerText || '').trim() || '(tanpa nama)'),
    );
    expect(semua, `${keterangan}: tak ada tombol bernama ${nama}`).toContain(nama.source);
    // Namanya ADA di halaman tapi tombolnya tak terlihat: itu kegagalan yang
    // berbeda, dan galat aslinya yang menjelaskannya.
    throw galat;
  }
}

const HALAMAN: Array<{
  judul: string;
  peran: Peran;
  path: () => string | undefined;
  tombol: Array<[RegExp, string]>;
}> = [
  {
    judul: 'daftar survei Admin Kabupaten',
    peran: 'kabupaten',
    path: () => '/admin-kab/surveys',
    tombol: [
      [/^buat survei$/i, 'pemicu modal Buat Survei'],
      [/^ekspor$/i, 'menu ekspor daftar survei'],
    ],
  },
  {
    judul: 'daftar pengaduan Admin Kabupaten',
    peran: 'kabupaten',
    path: () => '/admin-kab/complaints',
    tombol: [[/^ekspor$/i, 'menu ekspor daftar pengaduan']],
  },
  {
    judul: 'daftar pengaduan Admin OPD',
    peran: 'opd',
    path: () => '/admin-opd/complaints',
    tombol: [[/^ekspor$/i, 'menu ekspor daftar pengaduan OPD']],
  },
  /**
   * ExportButton (features/analytics) TIDAK diukur di sini, dan sebabnya
   * ditemukan justru ketika ujinya gagal: satu-satunya yang merendernya adalah
   * AnalyticsHeader, dan AnalyticsHeader tak dipanggil dari mana pun di
   * seluruh `src/`. Halaman /admin-opd/analytics menyusun kepalanya sendiri.
   * Keduanya karena itu kode tanpa pemakai -- tak ada pengguna yang dapat
   * menekan tombol itu, jadi tak ada yang dapat diukur di peramban.
   * `aria-label`-nya tetap dipasang supaya tak lahir bisu bila kelak dirangkai.
   */
  {
    judul: 'detail pengaduan Admin Kabupaten',
    peran: 'kabupaten',
    path: () => (contoh.tiketKab ? `/admin-kab/complaints/${contoh.tiketKab}` : undefined),
    tombol: [
      [/^ekspor$/i, 'menu ekspor detail pengaduan'],
      [/lampirkan dokumen\/foto/i, 'tombol lampiran ruang kerja admin'],
    ],
  },
  {
    judul: 'detail pengaduan Admin OPD',
    peran: 'opd',
    path: () => (contoh.tiketOpd ? `/admin-opd/complaints/${contoh.tiketOpd}` : undefined),
    tombol: [[/lampirkan dokumen\/foto/i, 'tombol lampiran ruang kerja admin']],
  },
  {
    judul: 'detail pengaduan warga',
    peran: 'responden',
    path: () => (contoh.tiketResponden ? `/complaints/${contoh.tiketResponden}` : undefined),
    tombol: [
      [/^kirim pesan$/i, 'tombol kirim pada balasan warga'],
      [/lampirkan dokumen\/foto/i, 'tombol lampiran pada balasan warga'],
    ],
  },
  {
    judul: 'perancang survei',
    peran: 'kabupaten',
    path: () =>
      contoh.surveiDraf ? `/admin-kab/surveys/builder/${contoh.surveiDraf}` : undefined,
    tombol: [[/^publikasikan$/i, 'tombol publikasikan pada perancang']],
  },
];

for (const { judul, peran, path, tombol } of HALAMAN) {
  test(`tombol di ${judul} punya nama di 320px`, async ({ page, bukaSebagai }) => {
    const alamat = path();
    test.skip(!alamat, `Tak ada contoh data untuk ${judul} pada basis data mesin ini.`);

    await bukaSebagai(peran, alamat as string);

    for (const [nama, keterangan] of tombol) {
      await harusBernama(page, nama, keterangan);
    }
  });
}

/**
 * PENJAGA ALAT UKURNYA SENDIRI. Uji di atas mencari tombol; bila halamannya
 * gagal dimuat, yang terjadi adalah kegagalan yang benar dengan sebab yang
 * salah. Uji ini memastikan lebar 320px memang menyembunyikan label -- kalau
 * tidak, seluruh berkas ini lulus hanya karena labelnya kebetulan tampak, dan
 * takkan pernah menangkap `aria-label` yang terhapus.
 */
test('KONTROL: pada 320px label tombol memang tersembunyi', async ({ page, bukaSebagai }) => {
  await bukaSebagai('kabupaten', '/admin-kab/surveys');

  // Menunggu bilah penyaringnya DULU. Terukur 21 September 2026: sekali jalan,
  // pencacahan di bawah mendapat nol span dan kontrol ini memerah -- bukan
  // karena polanya hilang, melainkan karena bilahnya belum terpasang saat
  // dihitung. Kontrolnya bekerja sebagaimana mestinya (ia menolak hijau ketika
  // tak ada yang terukur); yang kurang adalah penanda kesiapan yang tersurat.
  await expect(page.getByRole('button', { name: /^buat survei$/i })).toBeVisible();

  const terlihat = await page.evaluate(() =>
    Array.from(document.querySelectorAll('span.hidden')).filter(
      (s) => getComputedStyle(s).display !== 'none',
    ).length,
  );
  const jumlahSpan = await page.evaluate(
    () => document.querySelectorAll('span.hidden').length,
  );

  expect(jumlahSpan, 'halaman ini tak lagi memakai pola label tersembunyi').toBeGreaterThan(0);
  expect(terlihat, 'label yang seharusnya tersembunyi justru tampak di 320px').toBe(0);
});
