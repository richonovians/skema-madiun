import { expect } from '@playwright/test';

/**
 * Masuk LEWAT ANTARMUKA, bukan dengan menyuntikkan sesi.
 *
 * Penyuntikan sesi pernah dicoba dan menyesatkan: cookie saja tidak cukup —
 * `services/api.js` membaca token dari localStorage, sedangkan `proxy.js`
 * membaca cookie. Sesi yang dipalsukan setengah jalan membuat rute pertama
 * lolos lalu aplikasi menghapus sesinya sendiri, dan pengujian tampak
 * "menemukan" penjagaan akses yang sebenarnya tak pernah bekerja.
 *
 * Menekan tombolnya sendiri membuat `saveSession()` yang menulis keduanya —
 * dan sekaligus menjadikan formulir masuk bagian dari yang diuji.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} identifier email akun seed
 * @param {string} tujuan path yang seharusnya dibuka setelah masuk (ROLE_HOME)
 */
export async function masukSebagai(page, identifier, tujuan) {
  // Batas laju backend adalah 100 permintaan per 60 detik per IP
  // (`ThrottlerModule`, app.module.ts). Menjalankan suite ini dua kali beruntun
  // menembusnya, dan tanpa pengintai di bawah kegagalannya muncul sebagai
  // "expect(locator).toBeVisible() failed" — pesan yang tak menyebut sebab
  // sesungguhnya sama sekali, dan pernah membuat waktu terbuang menduga-duga
  // formulir masuk yang sebenarnya baik-baik saja.
  const kena429 = [];
  page.on('response', (res) => {
    if (res.status() === 429) kena429.push(res.url());
  });
  const pastikanBukan429 = () => {
    if (kena429.length) {
      throw new Error(
        `Batas laju backend tertembus saat masuk sebagai "${identifier}" ` +
          `(100 permintaan/60 detik per IP). Tunggu satu menit lalu jalankan ulang — ` +
          `menjalankan suite ini dua kali beruntun memang melewatinya.`,
      );
    }
  };

  await page.goto('/');

  // Tombol ini hanya dirender di lingkungan non-produksi (SSOLoginButton.jsx).
  // Ketiadaannya berarti build yang diuji adalah build produksi — katakan itu,
  // jangan biarkan berupa galat "selector tidak ditemukan" yang membingungkan.
  const tombolAkunDev = page.getByRole('button', { name: 'akun dev' });
  await tombolAkunDev.waitFor({ state: 'visible', timeout: 20000 }).catch((err) => {
    pastikanBukan429();
    throw err;
  });
  await expect(
    tombolAkunDev,
    'Tombol "akun dev" tidak ada. Jalur dev-login hanya dirender saat ' +
      'NODE_ENV != production — pastikan yang diuji adalah server pengembangan.',
  ).toBeVisible();
  // Kliknya diulang sampai formulir benar-benar terbuka.
  //
  // Tombol "akun dev" sudah terlihat sebelum React sempat memasang
  // penanganannya, jadi klik pertama bisa jatuh ke ruang hampa tanpa galat apa
  // pun — Playwright melihat elemen yang terlihat dan dapat ditekan, lalu
  // menekannya, dan tak ada yang terjadi. Gejalanya kemudian muncul sebagai
  // batas waktu pada kolom isian, jauh dari sebabnya. Sudah dua kali menyesatkan
  // pada sesi eksploratori.
  const kolomIdentifier = page.getByPlaceholder('Email akun (dev-login)');
  for (let percobaan = 0; percobaan < 5; percobaan += 1) {
    await tombolAkunDev.click().catch(() => {});
    try {
      await kolomIdentifier.waitFor({ state: 'visible', timeout: 4000 });
      break;
    } catch {
      pastikanBukan429();
      // Belum terhidrasi — coba lagi.
    }
  }

  await kolomIdentifier.fill(identifier);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();

  // `window.location.href` (navigasi keras) — perlu ditunggu, bukan router.push.
  await page.waitForURL(`**${tujuan}`).catch((err) => {
    pastikanBukan429();
    throw err;
  });
}
