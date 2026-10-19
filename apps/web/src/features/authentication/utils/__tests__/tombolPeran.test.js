import { KUNCI_TOMBOL, peranUntukTombol, tombolUntukRoles } from '../tombolPeran';

/**
 * TIGA TOMBOL PERAN.
 *
 * Berkas ini lahir dari permintaan 8 September 2026 ("pilihan tombol peran hanya
 * ada 3"), ketika `superuser` masih peran tersendiri dan tombol Admin Kabupaten
 * mewakili DUA role sekaligus. Sejak peleburan 15 September 2026 percabangan itu
 * hilang: setiap tombol memetakan ke peran senama.
 *
 * Yang diuji tetap PEMETAANNYA, bukan tampilannya — dan itu sengaja: peran yang
 * dikirim ke `POST /auth/acting-role` menjadi klaim `act` di token, dan klaim
 * itulah yang menentukan hak akses sesungguhnya (acting-role.util.ts:
 * hak = `act` ∩ `roles`). Salah memetakan di sini berarti salah memberi hak,
 * bukan cuma salah label.
 */
describe('tombolUntukRoles', () => {
  it('akun Admin Kabupaten melihat tombolnya', () => {
    expect(tombolUntukRoles(['kabupaten'])).toEqual([KUNCI_TOMBOL.KABUPATEN]);
  });

  it('akun ber-peran jamak melihat satu tombol per peran', () => {
    const semua = tombolUntukRoles(['kabupaten', 'opd', 'responden']);

    expect(semua).toEqual([KUNCI_TOMBOL.KABUPATEN, KUNCI_TOMBOL.OPD, KUNCI_TOMBOL.WARGA]);
  });

  /**
   * Peran `superuser` dihapus 15 September 2026, termasuk nilai enumnya di basis
   * data. Token lama yang masih menyebutnya tak boleh menghasilkan tombol hantu
   * -- sama seperti nama peran salah ketik mana pun.
   */
  it('nama peran yang sudah dihapus tidak menghasilkan tombol', () => {
    expect(tombolUntukRoles(['superuser'])).toEqual([]);
  });

  it('urutannya tetap, tidak mengikuti urutan `roles` yang datang dari server', () => {
    expect(tombolUntukRoles(['responden', 'opd'])).toEqual([KUNCI_TOMBOL.OPD, KUNCI_TOMBOL.WARGA]);
  });

  it('role yang tak dikenal diabaikan, tidak menghasilkan tombol hantu', () => {
    expect(tombolUntukRoles(['entah-apa'])).toEqual([]);
    expect(tombolUntukRoles([])).toEqual([]);
  });
});

describe('peranUntukTombol', () => {
  it('setiap tombol memetakan ke peran senama', () => {
    expect(peranUntukTombol(KUNCI_TOMBOL.KABUPATEN)).toBe('kabupaten');
    expect(peranUntukTombol(KUNCI_TOMBOL.OPD)).toBe('opd');
    expect(peranUntukTombol(KUNCI_TOMBOL.WARGA)).toBe('responden');
  });

  /**
   * PENJAGA yang tetap berlaku sesudah peleburan: pemetaannya tak boleh
   * bergantung pada daftar role yang dimiliki akun. Seorang Admin Kabupaten
   * yang memilih "Masyarakat" harus benar-benar menjadi warga -- termasuk
   * terkena gerbang persetujuan UU PDP. Menaikkan haknya di sini akan melewati
   * gerbang itu tanpa satu pun galat.
   */
  it('TIDAK menaikkan hak, berapa pun peran yang dimiliki akun', () => {
    expect(peranUntukTombol(KUNCI_TOMBOL.WARGA, ['kabupaten', 'responden'])).toBe('responden');
    expect(peranUntukTombol(KUNCI_TOMBOL.OPD, ['kabupaten', 'opd'])).toBe('opd');
  });
});
