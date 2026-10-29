import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Kalimat apa yang boleh sampai ke layar "Gagal masuk lewat SSO Helpdesk".
 *
 * BUG-019 (22 Oktober 2026). Sebelum berkas ini ada, `auth.controller.ts`
 * meneruskan `query.error_description` dari Helpdesk ke `buildFailureRedirect`
 * apa adanya, dan `AuthCallbackLoader.jsx` merendernya sebagai pesan galat.
 * DTO-nya mengizinkan 1024 karakter bebas, jadi siapa pun yang dapat membuat
 * warga membuka satu tautan memilih kalimat yang muncul di layar masuk -- di
 * domain pemerintah yang asli, di dalam alur yang paling dipercaya pengguna.
 *
 * Bukan XSS: React merender pesannya sebagai teks, bukan HTML. Yang
 * disuntikkan kalimatnya, bukan kodenya, dan justru itu yang membuatnya
 * meyakinkan -- tak ada tanda teknis apa pun yang mencurigakan bagi pembaca.
 *
 * Keterangan aslinya TIDAK hilang: `auth.controller.ts` tetap mencatatnya ke
 * log lewat `logger.warn`, dan di situlah tempatnya -- operator
 * membutuhkannya, warga tidak.
 *
 * DUA jalur bermuara ke fragment `#error=` yang sama, jadi keduanya diatur di
 * sini: galat yang DILAPORKAN Helpdesk lewat query (`pesanGalatSso`), dan galat
 * yang DILEMPAR kode kita sendiri ketika proses masuk gagal
 * (`pesanKegagalanMasuk`). Menyebarkan keputusannya ke dua blok `catch` berarti
 * yang satu diperbaiki sementara yang lain tidak.
 */

/** Kalimat umum untuk kode galat yang tak dikenal. */
const UMUM = 'Proses masuk lewat SSO Helpdesk gagal. Coba lagi.';

/**
 * Kode galat endpoint otorisasi menurut RFC 6749 §4.1.2.1, dipetakan ke
 * kalimat milik aplikasi sendiri.
 *
 * Kode yang tak ada di sini jatuh ke `UMUM` dan isinya TIDAK dipantulkan.
 * Memantulkannya menggoda -- operator jadi melihat kodenya tanpa membuka log --
 * tetapi `error` pun medan bebas 256 karakter, jadi itu hanya memperkecil
 * cacatnya, bukan menutupnya. Keputusan tersurat pengguna, 22 Oktober 2026.
 */
const PESAN: Record<string, string> = {
  access_denied: 'Anda membatalkan proses masuk di halaman Helpdesk.',

  invalid_request: 'Konfigurasi masuk lewat Helpdesk tidak diterima. Hubungi Diskominfo.',
  invalid_scope: 'Konfigurasi masuk lewat Helpdesk tidak diterima. Hubungi Diskominfo.',
  unauthorized_client: 'Konfigurasi masuk lewat Helpdesk tidak diterima. Hubungi Diskominfo.',
  unsupported_response_type: 'Konfigurasi masuk lewat Helpdesk tidak diterima. Hubungi Diskominfo.',

  server_error: 'Layanan Helpdesk sedang bermasalah. Coba lagi beberapa saat lagi.',
  temporarily_unavailable: 'Layanan Helpdesk sedang bermasalah. Coba lagi beberapa saat lagi.',
};

/**
 * Kalimat untuk galat yang DILAPORKAN Helpdesk pada query callback.
 *
 * @param kode Nilai `error` dari query; `undefined` ketika tak dikirim.
 */
export function pesanGalatSso(kode?: string): string {
  if (!kode) {
    return UMUM;
  }
  return PESAN[kode] ?? UMUM;
}

/**
 * Kalimat untuk galat yang DILEMPAR kode kita sendiri saat proses masuk gagal.
 *
 * Dipisahkan BERDASARKAN STATUS, bukan berdasarkan jenis galat, dan itu
 * koreksi atas rancangan pertama yang salah (22 Oktober 2026). Dugaan pertama
 * saya: kebocorannya datang sebagai `Error` biasa, jadi cukup melewatkan pesan
 * `HttpException`. Kode membantahnya -- `helpdesk-sso.client.ts` membungkus
 * SETIAP kegagalan jaringan menjadi `ServiceUnavailableException`, yang juga
 * `HttpException` -- sehingga aturan itu justru melewatkan kalimat yang bocor
 * dan hanya menutup kasus yang tak pernah terjadi di produksi.
 *
 * Yang sungguh terbit hari ini, semuanya `HttpException` ber-status 503:
 * `Tidak dapat menghubungi Helpdesk (<url>): TypeError: fetch failed` (URL
 * internal berikut pesan pustaka), `Konfigurasi SSO "<kunci>" belum diisi` dan
 * `SSO Helpdesk belum dikonfigurasi. Kunci yang masih kosong: ...` (nama kunci
 * konfigurasi).
 *
 * Batasnya 500: di bawahnya kalimat yang kita sendiri tulis untuk warga --
 * `Akun tidak aktif`, `Parameter state tidak sah atau kedaluwarsa` -- dan
 * mencabutnya justru merugikan pembacanya. Di atasnya pihak kita atau Helpdesk
 * yang bermasalah, dan penjelasannya milik log. `auth.controller.ts` tetap
 * mencatat pesan aslinya lewat `logger.error` sebelum mengalihkan.
 */
export function pesanKegagalanMasuk(err: unknown): string {
  if (err instanceof HttpException && err.getStatus() < HttpStatus.INTERNAL_SERVER_ERROR) {
    return err.message;
  }
  return 'Proses masuk gagal. Coba lagi.';
}
