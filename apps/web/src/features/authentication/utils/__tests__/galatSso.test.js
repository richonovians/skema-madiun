import { KALIMAT_UMUM_GALAT_SSO, kalimatGalatSso } from '../galatSso';

/**
 * Temuan audit `sso-callback-fragment-text-injection` (9 November 2026).
 *
 * Fragment `#error=` dapat ditulis siapa saja: tautan
 * `/sso/callback#error=<teks>` tak pernah melewati server, dan sebelum ini
 * layarnya merender teks itu apa adanya di bawah judul resmi "Gagal masuk
 * lewat SSO Helpdesk" -- terukur di Chrome hari itu juga. Backend kini hanya
 * menulis KODE; berkas inilah satu-satunya yang memilih kalimatnya.
 *
 * Kosakatanya kontrak dengan `KODE_GALAT_MASUK` di
 * `apps/api/src/modules/auth/sso-galat.util.ts`. `apps/web` tak mengimpor apa
 * pun dari `apps/api`, jadi tabel di bawah menyalinnya; kalimat tiap kode
 * sama persis dengan yang dikirim backend sebelum 9 November.
 */
describe('kalimatGalatSso', () => {
  it.each([
    ['SSO_DIBATALKAN', 'Anda membatalkan proses masuk di halaman Helpdesk.'],
    [
      'SSO_KONFIGURASI_DITOLAK',
      'Konfigurasi masuk lewat Helpdesk tidak diterima. Hubungi Diskominfo.',
    ],
    ['SSO_HELPDESK_GANGGUAN', 'Layanan Helpdesk sedang bermasalah. Coba lagi beberapa saat lagi.'],
    ['SSO_GALAT_HELPDESK', 'Proses masuk lewat SSO Helpdesk gagal. Coba lagi.'],
    [
      'SSO_STATE_TIDAK_SAH',
      'Parameter state tidak sah atau kedaluwarsa. Silakan ulangi proses masuk.',
    ],
    ['SSO_TANPA_CODE', 'Callback SSO tanpa parameter code'],
    [
      'SSO_EMAIL_BELUM_TERVERIFIKASI',
      'Alamat email pada akun Helpdesk Anda belum terverifikasi, sehingga tidak dapat ' +
        'ditautkan ke akun SKEMA yang sudah ada. Hubungi Admin Kabupaten.',
    ],
    [
      'SSO_AKUN_DIHAPUS',
      'Akun dengan email ini pernah dihapus. Hubungi Admin Kabupaten untuk mengaktifkannya kembali.',
    ],
    ['SSO_AKUN_TIDAK_AKTIF', 'Akun tidak aktif'],
    ['SSO_GAGAL', 'Proses masuk gagal. Coba lagi.'],
  ])('%s -> kalimatnya sendiri', (kode, kalimat) => {
    expect(kalimatGalatSso(kode)).toBe(kalimat);
  });

  /**
   * INTI temuannya. Bukan sekadar "tak memuat 0812-PENIPU" -- kalimat kosong
   * pun lulus asersi itu. Yang terbit wajib kalimat umum milik aplikasi.
   */
  it.each([
    'Akun Anda diblokir. Hubungi 0812-PENIPU untuk membukanya.',
    'akses ditolak',
    'sso_dibatalkan',
    '',
    null,
    undefined,
    // Anggota prototipe objek biasa: pencarian `peta[kode]` yang polos
    // mengembalikan fungsi, bukan undefined.
    'constructor',
    '__proto__',
    'toString',
  ])('kode asing %p -> kalimat umum', (kode) => {
    expect(kalimatGalatSso(kode)).toBe(KALIMAT_UMUM_GALAT_SSO);
  });

  it('kalimat umumnya kalimat galat Helpdesk yang sudah dikenal warga', () => {
    expect(KALIMAT_UMUM_GALAT_SSO).toBe('Proses masuk lewat SSO Helpdesk gagal. Coba lagi.');
  });
});
