import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { pesanGalatSso, pesanKegagalanMasuk } from './sso-galat.util';

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
 */

/** Kalimat yang tak mungkin datang dari Helpdesk sungguhan. */
const KALIMAT_KARANGAN = 'Akun Anda diblokir. Hubungi 0812-PENIPU untuk membukanya.';

/** Seluruh kalimat yang boleh terbit; tak satu pun dibangun dari masukan. */
const KALIMAT_SAH = [
  'Anda membatalkan proses masuk di halaman Helpdesk.',
  'Konfigurasi masuk lewat Helpdesk tidak diterima. Hubungi Diskominfo.',
  'Layanan Helpdesk sedang bermasalah. Coba lagi beberapa saat lagi.',
  'Proses masuk lewat SSO Helpdesk gagal. Coba lagi.',
];

describe('pesanGalatSso', () => {
  it('access_denied -> kalimat pembatalan oleh pengguna sendiri', () => {
    expect(pesanGalatSso('access_denied')).toBe(
      'Anda membatalkan proses masuk di halaman Helpdesk.',
    );
  });

  it.each(['unauthorized_client', 'invalid_request', 'invalid_scope', 'unsupported_response_type'])(
    '%s -> kalimat salah konfigurasi',
    (kode) => {
      expect(pesanGalatSso(kode)).toBe(
        'Konfigurasi masuk lewat Helpdesk tidak diterima. Hubungi Diskominfo.',
      );
    },
  );

  it.each(['server_error', 'temporarily_unavailable'])(
    '%s -> kalimat gangguan sementara',
    (kode) => {
      expect(pesanGalatSso(kode)).toBe(
        'Layanan Helpdesk sedang bermasalah. Coba lagi beberapa saat lagi.',
      );
    },
  );

  it.each([undefined, '', 'kode_masa_depan'])('%p -> kalimat umum', (kode) => {
    expect(pesanGalatSso(kode)).toBe('Proses masuk lewat SSO Helpdesk gagal. Coba lagi.');
  });

  /**
   * INTI BUG-019. Kode galat itu sendiri medan bebas 256 karakter, jadi
   * memantulkannya ke layar hanya memperkecil cacatnya, bukan menutupnya.
   */
  it('kode yang berisi kalimat karangan TIDAK dipantulkan ke layar', () => {
    const hasil = pesanGalatSso(KALIMAT_KARANGAN);

    expect(hasil).not.toContain('0812-PENIPU');
    expect(hasil).not.toContain('diblokir');
  });

  /**
   * KENDALI yang membuat uji di atas bermakna: bukan sekadar "tak memuat
   * 0812-PENIPU" -- kalimat kosong pun lulus asersi itu. Yang terbit wajib
   * salah satu kalimat milik aplikasi sendiri.
   */
  it('KENDALI: apa pun masukannya, yang terbit salah satu kalimat milik aplikasi', () => {
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
      expect(KALIMAT_SAH).toContain(pesanGalatSso(kode));
    }
  });
});

/**
 * Cacat BERDAMPINGAN, terukur selagi BUG-019 dibaca, lalu diperbaiki atas
 * persetujuan tersurat pengguna (22 Oktober 2026).
 *
 * Dua blok `catch` di `auth.controller.ts` meneruskan `err.message` ke fragment
 * yang sama dengan BUG-019. Rancangan PERTAMA saya untuk ini SALAH dan dibatalkan:
 * saya menduga kebocorannya datang sebagai `Error` biasa, sehingga cukup
 * melewatkan pesan `HttpException` saja. Kode membantahnya --
 * `helpdesk-sso.client.ts` membungkus SETIAP kegagalan jaringan menjadi
 * `ServiceUnavailableException`, yang juga `HttpException` -- jadi aturan itu
 * justru melewatkan kalimat yang bocor dan hanya menutup kasus yang tak pernah
 * terjadi di produksi.
 *
 * Yang sungguh sampai ke layar warga hari ini, semuanya lewat `HttpException`:
 *
 * | sumber                      | kalimat yang dibaca warga                        |
 * | --------------------------- | ------------------------------------------------ |
 * | `fetchOrFail` baris 175     | `Tidak dapat menghubungi Helpdesk (<url>): TypeError: fetch failed` |
 * | `fetchOrFail` baris 186     | `Helpdesk membalas 403 dengan tipe "text/html", bukan JSON` |
 * | `helpdesk-sso.client.ts:95` | `Helpdesk tidak mengembalikan access_token: invalid_client` |
 * | `helpdesk-sso.client.ts:200`| `Konfigurasi SSO "helpdesk.ssoClientSecret" belum diisi` |
 * | `sso.service.ts:789`        | `SSO Helpdesk belum dikonfigurasi. Kunci yang masih kosong: ...` |
 *
 * Yang pertama memuat URL internal berikut pesan pustaka; dua yang terakhir
 * membocorkan nama kunci konfigurasi.
 *
 * Aturan yang dipakai karena itu BERBASIS STATUS, bukan jenis galat: status di
 * bawah 500 adalah kalimat yang kita tulis untuk warga, sedangkan 5xx berarti
 * pihak kita atau Helpdesk yang bermasalah -- penjelasannya milik log, bukan
 * milik layar warga. Satu aturan, dan ia membelah persis kedua kelompok di atas
 * tanpa menyentuh satu pun tempat pelemparan.
 */
describe('pesanKegagalanMasuk', () => {
  const UMUM = 'Proses masuk gagal. Coba lagi.';

  it('403 milik kita sendiri -> pesannya lewat, sebab memang ditulis untuk warga', () => {
    expect(pesanKegagalanMasuk(new ForbiddenException('Akun tidak aktif'))).toBe(
      'Akun tidak aktif',
    );
  });

  it('400 milik kita sendiri -> pesannya lewat', () => {
    expect(
      pesanKegagalanMasuk(
        new BadRequestException(
          'Parameter state tidak sah atau kedaluwarsa. Silakan ulangi proses masuk.',
        ),
      ),
    ).toBe('Parameter state tidak sah atau kedaluwarsa. Silakan ulangi proses masuk.');
  });

  it('503 yang memuat URL internal dan pesan pustaka -> kalimat umum', () => {
    const hasil = pesanKegagalanMasuk(
      new ServiceUnavailableException(
        'Tidak dapat menghubungi Helpdesk (https://api.madiunkab.go.id/api/oauth/token): TypeError: fetch failed',
      ),
    );

    expect(hasil).toBe(UMUM);
    expect(hasil).not.toContain('madiunkab.go.id');
    expect(hasil).not.toContain('fetch failed');
  });

  it('503 yang membocorkan nama kunci konfigurasi -> kalimat umum', () => {
    const hasil = pesanKegagalanMasuk(
      new ServiceUnavailableException('Konfigurasi SSO "helpdesk.ssoClientSecret" belum diisi'),
    );

    expect(hasil).toBe(UMUM);
    expect(hasil).not.toContain('ssoClientSecret');
  });

  it.each([
    new Error('fetch failed'),
    new TypeError('Cannot read properties of undefined'),
    'galat berupa string',
    null,
    undefined,
    { message: 'objek yang menyerupai galat' },
  ])('galat bukan HttpException %p -> kalimat umum', (err) => {
    expect(pesanKegagalanMasuk(err)).toBe(UMUM);
  });

  /**
   * KENDALI, dan inilah yang membuat uji 503 di atas bermakna: kalau aturannya
   * ditulis terlalu lebar sehingga SEMUA diganti kalimat umum, uji ini merah --
   * warga kehilangan kalimat yang memang berguna baginya.
   */
  it('KENDALI: 4xx TIDAK ikut diganti kalimat umum', () => {
    expect(pesanKegagalanMasuk(new ForbiddenException('Akun tidak aktif'))).not.toBe(UMUM);
  });
});
