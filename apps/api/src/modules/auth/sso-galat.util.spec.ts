import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { KODE_GALAT_MASUK, kodeGalatSso, kodeKegagalanMasuk } from './sso-galat.util';

/**
 * BUG-019 — layar "Gagal masuk lewat SSO Helpdesk" menampilkan teks yang
 * datang dari luar, apa adanya.
 *
 * `auth.controller.ts` meneruskan `query.error_description` ke
 * `buildFailureRedirect`, yang menaruhnya di fragment `#error=`;
 * `AuthCallbackLoader.jsx` merendernya sebagai pesan galat. DTO-nya mengizinkan
 * 1024 karakter bebas. Akibatnya siapa pun yang dapat membuat warga membuka
 * satu tautan memilih kalimat yang muncul di layar masuk -- di domain
 * pemerintah yang asli, di dalam alur yang paling dipercaya pengguna.
 *
 * Ini BUKAN XSS: React merender pesannya sebagai teks, bukan HTML. Yang
 * disuntikkan kalimatnya, bukan kodenya, dan justru itu yang membuatnya
 * meyakinkan.
 *
 * Dua jalur bermuara ke fragment `#error=` yang sama, jadi keduanya diatur di
 * sini: galat yang DILAPORKAN Helpdesk lewat query, dan galat yang DILEMPAR
 * kode kita sendiri ketika proses masuk gagal.
 *
 * KONTRAK BERUBAH 9 November 2026 (temuan audit
 * `sso-callback-fragment-text-injection`). Perbaikan 22 Oktober menyaring
 * kalimat yang DITULIS server, padahal fragment dapat ditulis siapa saja:
 * tautan `/sso/callback#error=<teks>` tak pernah melewati server, dan layar
 * merender teksnya apa adanya. Fragment kini hanya membawa KODE dari
 * `KODE_GALAT_MASUK`; kalimatnya milik frontend, yang menolak kode asing.
 */

/** Kalimat yang tak mungkin datang dari Helpdesk sungguhan. */
const KALIMAT_KARANGAN = 'Akun Anda diblokir. Hubungi 0812-PENIPU untuk membukanya.';

describe('kodeGalatSso', () => {
  it('access_denied -> SSO_DIBATALKAN', () => {
    expect(kodeGalatSso('access_denied')).toBe('SSO_DIBATALKAN');
  });

  it.each(['unauthorized_client', 'invalid_request', 'invalid_scope', 'unsupported_response_type'])(
    '%s -> SSO_KONFIGURASI_DITOLAK',
    (kode) => {
      expect(kodeGalatSso(kode)).toBe('SSO_KONFIGURASI_DITOLAK');
    },
  );

  it.each(['server_error', 'temporarily_unavailable'])('%s -> SSO_HELPDESK_GANGGUAN', (kode) => {
    expect(kodeGalatSso(kode)).toBe('SSO_HELPDESK_GANGGUAN');
  });

  // `constructor` dan `__proto__` ada di prototipe objek biasa: pencarian
  // `peta[kode]` yang polos mengembalikan fungsi, bukan undefined.
  it.each([undefined, '', 'kode_masa_depan', 'constructor', '__proto__'])(
    '%p -> SSO_GALAT_HELPDESK',
    (kode) => {
      expect(kodeGalatSso(kode)).toBe('SSO_GALAT_HELPDESK');
    },
  );

  /**
   * INTI BUG-019. Kode galat itu sendiri medan bebas 256 karakter, jadi
   * memantulkannya hanya memperkecil cacatnya, bukan menutupnya.
   */
  it('KENDALI: apa pun masukannya, yang terbit salah satu kode milik aplikasi', () => {
    const masukan = [
      undefined,
      '',
      'access_denied',
      'server_error',
      KALIMAT_KARANGAN,
      'a'.repeat(256),
      '<script>alert(1)</script>',
    ];

    for (const kode of masukan) {
      expect(KODE_GALAT_MASUK).toContain(kodeGalatSso(kode));
    }
  });
});

/**
 * Cacat BERDAMPINGAN, terukur selagi BUG-019 dibaca (22 Oktober 2026): dua blok
 * `catch` di `auth.controller.ts` meneruskan `err.message` ke fragment yang
 * sama. `helpdesk-sso.client.ts` membungkus SETIAP kegagalan jaringan menjadi
 * `ServiceUnavailableException` berisi URL internal, dan konfigurasi yang
 * kosong membocorkan nama kuncinya.
 *
 * Aturannya tetap BERBASIS STATUS: 5xx berarti pihak kita atau Helpdesk yang
 * bermasalah, dan penjelasannya milik log. Yang berubah 9 November 2026: galat
 * di bawah 500 pun tak lagi menyumbang kalimatnya ke fragment, melainkan KODE
 * yang dibawanya (`{ message, code }` pada badan exception, pola yang sama
 * dengan `CONSENT_REQUIRED`). Exception 4xx tanpa kode yang dikenal jatuh ke
 * `SSO_GAGAL` -- gagal tertutup bagi pelemparan baru yang lupa memberi kode.
 */
describe('kodeKegagalanMasuk', () => {
  it('4xx berkode milik kita -> kodenya lewat', () => {
    expect(
      kodeKegagalanMasuk(
        new ForbiddenException({ message: 'Akun tidak aktif', code: 'SSO_AKUN_TIDAK_AKTIF' }),
      ),
    ).toBe('SSO_AKUN_TIDAK_AKTIF');
  });

  it('400 berkode state -> kodenya lewat', () => {
    expect(
      kodeKegagalanMasuk(
        new BadRequestException({
          message: 'Parameter state tidak sah atau kedaluwarsa. Silakan ulangi proses masuk.',
          code: 'SSO_STATE_TIDAK_SAH',
        }),
      ),
    ).toBe('SSO_STATE_TIDAK_SAH');
  });

  it('4xx TANPA kode -> SSO_GAGAL, kalimatnya tidak ikut', () => {
    expect(kodeKegagalanMasuk(new ForbiddenException('Akun tidak aktif'))).toBe('SSO_GAGAL');
  });

  it('4xx berkode ASING -> SSO_GAGAL, kodenya tidak dipantulkan', () => {
    expect(
      kodeKegagalanMasuk(new ForbiddenException({ message: 'x', code: 'HUBUNGI_0812_PENIPU' })),
    ).toBe('SSO_GAGAL');
  });

  /**
   * 5xx tidak pernah menyumbang kodenya sekalipun membawa kode yang sah:
   * penolakan konfigurasi atau jaringan bukan urusan pembaca layar.
   */
  it('503 yang memuat URL internal -> SSO_GAGAL', () => {
    expect(
      kodeKegagalanMasuk(
        new ServiceUnavailableException(
          'Tidak dapat menghubungi Helpdesk (https://api.madiunkab.go.id/api/oauth/token): TypeError: fetch failed',
        ),
      ),
    ).toBe('SSO_GAGAL');
  });

  it('503 berkode sah tetap SSO_GAGAL', () => {
    expect(
      kodeKegagalanMasuk(
        new ServiceUnavailableException({ message: 'x', code: 'SSO_AKUN_TIDAK_AKTIF' }),
      ),
    ).toBe('SSO_GAGAL');
  });

  it.each([
    new Error('fetch failed'),
    new TypeError('Cannot read properties of undefined'),
    'galat berupa string',
    null,
    undefined,
    { message: 'objek yang menyerupai galat', code: 'SSO_AKUN_TIDAK_AKTIF' },
  ])('galat bukan HttpException %p -> SSO_GAGAL', (err) => {
    expect(kodeKegagalanMasuk(err)).toBe('SSO_GAGAL');
  });
});
