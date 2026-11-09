import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Apa yang boleh sampai ke layar "Gagal masuk lewat SSO Helpdesk".
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
 * FRAGMENT KINI HANYA MEMBAWA KODE (9 November 2026, temuan audit
 * `sso-callback-fragment-text-injection`). Perbaikan 22 Oktober menyaring
 * kalimat yang DITULIS server, dan itu tak cukup: fragment dapat ditulis siapa
 * saja. Tautan `/sso/callback#error=<teks>` tak pernah melewati server, jadi
 * penyaring di sini tak pernah melihatnya, dan layar merendernya apa adanya
 * -- terukur di Chrome hari itu juga. Kini server hanya menulis salah satu
 * `KODE_GALAT_MASUK`, dan kalimatnya tinggal di frontend
 * (`features/authentication/utils/galatSso.js`), yang menolak kode asing.
 * Kosakata ini KONTRAK antara keduanya: menambah kode di sini tanpa kalimatnya
 * di sana membuat warga melihat kalimat umum, bukan kalimat yang dimaksud.
 *
 * Keterangan aslinya TIDAK hilang: `auth.controller.ts` tetap mencatatnya ke
 * log lewat `logger.warn`/`logger.error`, dan di situlah tempatnya --
 * operator membutuhkannya, warga tidak.
 *
 * DUA jalur bermuara ke fragment `#error=` yang sama, jadi keduanya diatur di
 * sini: galat yang DILAPORKAN Helpdesk lewat query (`kodeGalatSso`), dan galat
 * yang DILEMPAR kode kita sendiri ketika proses masuk gagal
 * (`kodeKegagalanMasuk`). Menyebarkan keputusannya ke dua blok `catch` berarti
 * yang satu diperbaiki sementara yang lain tidak.
 */

/**
 * Seluruh kode yang boleh muncul di fragment `#error=`.
 *
 * Empat yang pertama untuk galat yang DILAPORKAN Helpdesk, sisanya untuk galat
 * yang dilempar kode kita sendiri. `SSO_GAGAL` adalah cadangan bagi semua
 * yang tak boleh atau tak dapat dijelaskan kepada warga.
 */
export const KODE_GALAT_MASUK = [
  'SSO_DIBATALKAN',
  'SSO_KONFIGURASI_DITOLAK',
  'SSO_HELPDESK_GANGGUAN',
  'SSO_GALAT_HELPDESK',
  'SSO_STATE_TIDAK_SAH',
  'SSO_TANPA_CODE',
  'SSO_EMAIL_BELUM_TERVERIFIKASI',
  'SSO_AKUN_DIHAPUS',
  'SSO_AKUN_TIDAK_AKTIF',
  'SSO_GAGAL',
] as const;

export type KodeGalatMasuk = (typeof KODE_GALAT_MASUK)[number];

/**
 * Kode galat endpoint otorisasi menurut RFC 6749 §4.1.2.1, dipetakan ke kode
 * milik aplikasi sendiri.
 *
 * Kode yang tak ada di sini jatuh ke `SSO_GALAT_HELPDESK` dan isinya TIDAK
 * dipantulkan. Memantulkannya menggoda -- operator jadi melihat kodenya tanpa
 * membuka log -- tetapi `error` pun medan bebas 256 karakter, jadi itu hanya
 * memperkecil cacatnya, bukan menutupnya. Keputusan tersurat pengguna,
 * 22 Oktober 2026.
 */
const KODE_HELPDESK: Record<string, KodeGalatMasuk> = {
  access_denied: 'SSO_DIBATALKAN',

  invalid_request: 'SSO_KONFIGURASI_DITOLAK',
  invalid_scope: 'SSO_KONFIGURASI_DITOLAK',
  unauthorized_client: 'SSO_KONFIGURASI_DITOLAK',
  unsupported_response_type: 'SSO_KONFIGURASI_DITOLAK',

  server_error: 'SSO_HELPDESK_GANGGUAN',
  temporarily_unavailable: 'SSO_HELPDESK_GANGGUAN',
};

/**
 * Kode untuk galat yang DILAPORKAN Helpdesk pada query callback.
 *
 * `Object.hasOwn`, bukan `KODE_HELPDESK[kode] ?? ...`: masukan `constructor`
 * atau `__proto__` akan mengembalikan anggota prototipe, bukan `undefined`.
 *
 * @param kode Nilai `error` dari query; `undefined` ketika tak dikirim.
 */
export function kodeGalatSso(kode?: string): KodeGalatMasuk {
  if (!kode || !Object.hasOwn(KODE_HELPDESK, kode)) {
    return 'SSO_GALAT_HELPDESK';
  }
  return KODE_HELPDESK[kode];
}

/**
 * Kode untuk galat yang DILEMPAR kode kita sendiri saat proses masuk gagal.
 *
 * Dipisahkan BERDASARKAN STATUS, bukan berdasarkan jenis galat, dan itu
 * koreksi atas rancangan pertama yang salah (22 Oktober 2026).
 * `helpdesk-sso.client.ts` membungkus SETIAP kegagalan jaringan menjadi
 * `ServiceUnavailableException`, yang juga `HttpException`, dan pesannya
 * memuat URL internal atau nama kunci konfigurasi. 5xx karena itu SELALU
 * `SSO_GAGAL`: penjelasannya milik log.
 *
 * Di bawah 500, yang dipakai KODE yang dibawa exception-nya (`{ message, code }`
 * pada badannya), bukan kalimatnya. Exception tanpa kode, atau berkode di luar
 * `KODE_GALAT_MASUK`, juga jatuh ke `SSO_GAGAL` -- pelemparan baru yang lupa
 * memberi kode gagal tertutup, bukan diam-diam membocorkan kalimatnya.
 */
export function kodeKegagalanMasuk(err: unknown): KodeGalatMasuk {
  if (!(err instanceof HttpException) || err.getStatus() >= HttpStatus.INTERNAL_SERVER_ERROR) {
    return 'SSO_GAGAL';
  }
  const badan = err.getResponse();
  const kode =
    typeof badan === 'object' && badan !== null ? (badan as { code?: unknown }).code : undefined;
  return typeof kode === 'string' && (KODE_GALAT_MASUK as readonly string[]).includes(kode)
    ? (kode as KodeGalatMasuk)
    : 'SSO_GAGAL';
}
