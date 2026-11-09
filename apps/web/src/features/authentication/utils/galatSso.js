/**
 * Kalimat untuk layar "Gagal masuk lewat SSO Helpdesk", dipilih dari KODE.
 *
 * Temuan audit `sso-callback-fragment-text-injection` (9 November 2026).
 * Sebelum ini backend menaruh KALIMAT di fragment `#error=`, dan
 * `AuthCallbackLoader` merendernya apa adanya. Fragment dapat ditulis siapa
 * saja: tautan `/sso/callback#error=<teks>` tak pernah melewati server, jadi
 * penyaring BUG-019 di backend tak pernah melihatnya -- dan kalimat pilihan
 * pengarang tautan tampil di bawah judul resmi, di domain pemerintah yang
 * asli (terukur di Chrome hari itu juga). Kini backend hanya mengirim kode,
 * dan kode yang tak ada di tabel ini jatuh ke kalimat umum.
 *
 * KONTRAK dengan `KODE_GALAT_MASUK` di
 * `apps/api/src/modules/auth/sso-galat.util.ts`. Diketik ulang di sini karena
 * `apps/web` tak mengimpor apa pun dari `apps/api`. Kode baru di backend tanpa
 * kalimatnya di sini membuat warga melihat kalimat umum -- gagal tertutup,
 * bukan bocor. Kalimat tiap kode sama persis dengan yang dikirim backend
 * sebelum perubahan ini, jadi warga tak melihat perbedaan apa pun.
 */

/** Kalimat bagi kode yang tak dikenal, termasuk teks bebas dari tautan. */
export const KALIMAT_UMUM_GALAT_SSO = 'Proses masuk lewat SSO Helpdesk gagal. Coba lagi.';

const KALIMAT = {
  SSO_DIBATALKAN: 'Anda membatalkan proses masuk di halaman Helpdesk.',
  SSO_KONFIGURASI_DITOLAK: 'Konfigurasi masuk lewat Helpdesk tidak diterima. Hubungi Diskominfo.',
  SSO_HELPDESK_GANGGUAN: 'Layanan Helpdesk sedang bermasalah. Coba lagi beberapa saat lagi.',
  SSO_GALAT_HELPDESK: KALIMAT_UMUM_GALAT_SSO,
  SSO_STATE_TIDAK_SAH: 'Parameter state tidak sah atau kedaluwarsa. Silakan ulangi proses masuk.',
  SSO_TANPA_CODE: 'Callback SSO tanpa parameter code',
  SSO_EMAIL_BELUM_TERVERIFIKASI:
    'Alamat email pada akun Helpdesk Anda belum terverifikasi, sehingga tidak dapat ' +
    'ditautkan ke akun SKEMA yang sudah ada. Hubungi Admin Kabupaten.',
  SSO_AKUN_DIHAPUS:
    'Akun dengan email ini pernah dihapus. Hubungi Admin Kabupaten untuk mengaktifkannya kembali.',
  SSO_AKUN_TIDAK_AKTIF: 'Akun tidak aktif',
  SSO_GAGAL: 'Proses masuk gagal. Coba lagi.',
};

/**
 * @param {string | null | undefined} kode nilai `error` dari fragment
 * @returns {string} kalimat milik aplikasi; tak pernah teks dari masukan
 */
export function kalimatGalatSso(kode) {
  // `Object.hasOwn`, bukan `KALIMAT[kode] ?? ...`: `constructor` dan
  // `__proto__` ada di prototipe objek biasa dan akan mengembalikan fungsi.
  if (typeof kode !== 'string' || !Object.hasOwn(KALIMAT, kode)) {
    return KALIMAT_UMUM_GALAT_SSO;
  }
  return KALIMAT[kode];
}
