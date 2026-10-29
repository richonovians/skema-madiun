import { expect, test } from '@playwright/test';
import { BASE_URL } from './support/api.js';

/**
 * Pagar regresi BUG-019 — layar "Gagal masuk lewat SSO Helpdesk" menampilkan
 * teks yang datang dari luar, apa adanya.
 *
 * `auth.controller.ts` meneruskan `query.error_description` ke
 * `buildFailureRedirect`, yang menaruhnya di fragment `#error=`. `AuthCallbackLoader`
 * merendernya sebagai pesan galat. DTO-nya mengizinkan **1024 karakter** bebas.
 * Akibatnya siapa pun yang dapat membuat warga membuka satu tautan dapat memilih
 * kalimat apa pun yang muncul di layar masuk — di domain pemerintah yang asli,
 * di dalam alur yang paling dipercaya pengguna.
 *
 * Ini **bukan XSS**: React merender pesannya sebagai teks, bukan HTML. Yang
 * disuntikkan kalimatnya, bukan kodenya — dan justru itu yang membuatnya
 * meyakinkan.
 *
 * ── Kenapa di lapisan ini ───────────────────────────────────────────────────
 * Yang diperiksa keputusan BACKEND: apa yang boleh ikut ke alamat pengalihan.
 * Memeriksanya lewat peramban hanya menambah halaman yang bisa gagal karena
 * sebab lain. Pengalihannya sengaja TIDAK diikuti (`maxRedirects: 0`) — yang
 * diuji isi header `Location`-nya, bukan halaman tujuannya.
 *
 * ── `test.fail()` SUDAH DICABUT (26 Oktober 2026) ───────────────────────────
 * Sampai hari itu uji kedua dipasangi `test.fail()`, sebab cacatnya belum
 * diperbaiki: selama ia ada suite tetap hijau, dan begitu pesan dari Helpdesk
 * dipetakan ke kalimat milik aplikasi sendiri uji itu MERAH dan menuntut
 * anotasinya dicabut. Itulah yang terjadi. BUG-019 diperbaiki di `main`
 * (`3fb335f`, 22 Oktober), dan jalan pertama spec ini terhadap kode `main`
 * berbunyi "Expected to fail, but passed" dua kali. Kini ia pagar regresi
 * sungguhan.
 *
 * ── Data uji ────────────────────────────────────────────────────────────────
 * Nihil. Tak ada baris basis data yang tersentuh; keduanya hanya membaca
 * pengalihan.
 */

/** Kalimat yang tak mungkin datang dari Helpdesk sungguhan. */
const KALIMAT_KARANGAN = 'Akun Anda diblokir. Hubungi 0812-PENIPU untuk membukanya.';

const alamatCallback = (params) => `${BASE_URL}/api/v1/auth/sso/callback?${params}`;

test.describe('BUG-019 — teks luar pada layar gagal masuk SSO', () => {
  test.describe.configure({ mode: 'serial' });

  test('kendali — callback tanpa state ditolak dengan kalimat milik aplikasi sendiri', async ({
    request,
  }) => {
    const res = await request.get(alamatCallback('error=access_denied'), { maxRedirects: 0 });

    // Alat ukurnya: jalur gagal memang hidup dan memang mengalihkan ke layar
    // galat frontend. Tanpa ini, uji berikutnya bisa hijau karena endpoint-nya
    // tak pernah menjawab apa pun.
    expect(res.status()).toBe(302);
    expect(res.headers().location).toContain('/sso/callback#error=');
  });

  test('keterangan galat dari luar tidak ikut apa adanya ke layar warga', async ({ request }) => {
    const res = await request.get(
      alamatCallback(
        `error=access_denied&error_description=${encodeURIComponent(KALIMAT_KARANGAN)}`,
      ),
      { maxRedirects: 0 },
    );

    // `Location` memuat fragment ter-encode; didekode dulu supaya yang
    // dibandingkan kalimat yang benar-benar dibaca warga di layar.
    const terbaca = decodeURIComponent(res.headers().location ?? '');
    expect(
      terbaca,
      'kalimat karangan dari tautan ikut ke layar "Gagal masuk lewat SSO Helpdesk"',
    ).not.toContain('0812-PENIPU');
  });
});
