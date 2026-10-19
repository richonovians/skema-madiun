import { JenisPengguna } from '@prisma/client';
import { bolehJadiAdminOpd } from './boleh-admin-opd';

/**
 * Satu aturan, satu tempat (6 Oktober 2026).
 *
 * MENGAPA FUNGSI TERSENDIRI, bukan dua pemeriksaan serupa. Aturan ini dipakai
 * DUA KALI dengan akibat yang berbeda: `UsersService` memakainya untuk MENOLAK
 * permintaan, dan `UserEntity` memakainya untuk memberi tahu antarmuka apakah
 * kotak centang Admin OPD boleh ditekan. Bila keduanya menghitungnya sendiri,
 * yang pasti terjadi adalah antarmuka menawarkan pilihan yang backend-nya
 * tolak -- dan penggunanya akan menyalahkan aplikasinya, bukan aturannya.
 */
describe('bolehJadiAdminOpd', () => {
  it('di produksi: akun ASN boleh', () => {
    expect(bolehJadiAdminOpd({ jenisPengguna: JenisPengguna.asn, produksi: true })).toBe(true);
  });

  it('di produksi: akun yang dinyatakan warga TIDAK boleh', () => {
    expect(bolehJadiAdminOpd({ jenisPengguna: JenisPengguna.masyarakat, produksi: true })).toBe(
      false,
    );
  });

  it('di produksi: akun yang jenis penggunanya belum diketahui TIDAK boleh', () => {
    // GAGAL TERTUTUP. `null` berarti belum diberitahu, bukan "bukan ASN" --
    // dan ketidaktahuan tidak pernah menjadi dasar memberi hak.
    expect(bolehJadiAdminOpd({ jenisPengguna: null, produksi: true })).toBe(false);
  });

  it('di luar produksi: siapa pun boleh, termasuk yang belum diketahui', () => {
    // Syarat tersurat pengguna: akun seed/pending di pengembangan tetap bisa
    // mengambil peran opd.
    expect(bolehJadiAdminOpd({ jenisPengguna: null, produksi: false })).toBe(true);
    expect(bolehJadiAdminOpd({ jenisPengguna: JenisPengguna.masyarakat, produksi: false })).toBe(
      true,
    );
  });
});
