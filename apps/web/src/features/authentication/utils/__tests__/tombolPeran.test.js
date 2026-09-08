import { KUNCI_TOMBOL, peranUntukTombol, tombolUntukRoles } from '../tombolPeran';

/**
 * TIGA TOMBOL, BUKAN EMPAT (permintaan pengguna 8 September 2026).
 *
 * Kata penggunanya: "role superuser masuk melewati tombol admin kabupaten bukan
 * tombol superuser tetapi hak aksesnya tetap berbeda dengan admin kabupaten
 * (bisa manajemen user dan audit log). Jadi pilihan tombol peran hanya ada 3."
 *
 * Yang diuji di sini PEMETAANNYA, bukan tampilannya — dan itu sengaja: peran
 * yang dikirim ke `POST /auth/acting-role` menjadi klaim `act` di token, dan
 * klaim itulah yang menentukan hak akses sesungguhnya (acting-role.util.ts:
 * hak = `act` ∩ `roles`). Salah memetakan di sini berarti salah memberi hak,
 * bukan cuma salah label.
 */
describe('tombolUntukRoles', () => {
  it('akun HANYA superuser tetap punya jalan masuk — lewat tombol Admin Kabupaten', () => {
    // Kegagalan yang paling mudah terlewat: kalau daftar tombol disaring dengan
    // `roles.includes(kunciTombol)` seperti sebelumnya, akun ber-role
    // `[superuser]` melihat NOL tombol dan terkunci di luar aplikasi.
    expect(tombolUntukRoles(['superuser'])).toEqual([KUNCI_TOMBOL.KABUPATEN]);
  });

  it('akun superuser DAN kabupaten hanya menghasilkan SATU tombol, bukan dua', () => {
    expect(tombolUntukRoles(['superuser', 'kabupaten'])).toEqual([KUNCI_TOMBOL.KABUPATEN]);
  });

  it('tak ada lagi tombol "superuser" di daftar mana pun', () => {
    const semua = tombolUntukRoles(['superuser', 'kabupaten', 'opd', 'responden']);

    expect(semua).not.toContain('superuser');
    expect(semua).toEqual([KUNCI_TOMBOL.KABUPATEN, KUNCI_TOMBOL.OPD, KUNCI_TOMBOL.WARGA]);
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
  it('tombol Admin Kabupaten pada akun superuser -> act=superuser (hak tertinggi)', () => {
    // Inti permintaannya: tombolnya sama, haknya berbeda.
    expect(peranUntukTombol(KUNCI_TOMBOL.KABUPATEN, ['superuser'])).toBe('superuser');
  });

  it('tombol yang SAMA pada akun kabupaten biasa -> act=kabupaten', () => {
    expect(peranUntukTombol(KUNCI_TOMBOL.KABUPATEN, ['kabupaten'])).toBe('kabupaten');
  });

  it('akun ber-DUA role itu -> act=superuser, bukan kabupaten', () => {
    // Akibat yang disadari & disetujui pengguna: pemegang kedua role kehilangan
    // pilihan sengaja TURUN menjadi kabupaten biasa. Satu tombol, selalu hak
    // tertinggi. Diuji supaya perubahan arah itu tak terjadi diam-diam.
    expect(peranUntukTombol(KUNCI_TOMBOL.KABUPATEN, ['kabupaten', 'superuser'])).toBe('superuser');
  });

  it('tombol lain memetakan ke peran senama', () => {
    expect(peranUntukTombol(KUNCI_TOMBOL.OPD, ['opd'])).toBe('opd');
    expect(peranUntukTombol(KUNCI_TOMBOL.WARGA, ['responden'])).toBe('responden');
  });

  it('TIDAK menaikkan hak pada tombol selain Admin Kabupaten', () => {
    // Penjaga: seorang superuser yang memilih "Warga" harus benar-benar menjadi
    // warga — termasuk terkena gerbang persetujuan UU PDP. Kalau di sini
    // dinaikkan menjadi `superuser`, gerbang itu terlewati.
    expect(peranUntukTombol(KUNCI_TOMBOL.WARGA, ['superuser', 'responden'])).toBe('responden');
    expect(peranUntukTombol(KUNCI_TOMBOL.OPD, ['superuser', 'opd'])).toBe('opd');
  });
});
