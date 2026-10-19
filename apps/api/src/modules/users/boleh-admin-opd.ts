import { JenisPengguna } from '@prisma/client';

/**
 * Bolehkah akun ini DIBERI peran Admin OPD (6 Oktober 2026).
 *
 * SATU ATURAN, SATU TEMPAT. Dipakai dua kali dengan akibat berbeda:
 * `UsersService` memakainya untuk MENOLAK permintaan, `UsersService.findAll`
 * dan `findOne` menyalurkannya ke `UserEntity.bolehJadiAdminOpd` supaya
 * antarmuka tahu apakah kotak centangnya boleh ditekan. Kalau keduanya
 * menghitung sendiri, yang pasti terjadi adalah halaman menawarkan pilihan
 * yang backend-nya tolak -- dan penggunanya menyalahkan aplikasinya, bukan
 * aturannya.
 *
 * `produksi` dilewatkan, bukan dibaca sendiri dari `ConfigService`: fungsi ini
 * sengaja murni, karena ia menentukan hak akses dan uji semahal "butuh Nest"
 * cenderung tak ditulis lengkap.
 *
 * GAGAL TERTUTUP di produksi. `jenisPengguna === null` berarti SKEMA belum
 * pernah diberitahu -- bukan "orang ini warga" -- dan tetap ditolak.
 */
export function bolehJadiAdminOpd(input: {
  jenisPengguna: JenisPengguna | null;
  produksi: boolean;
}): boolean {
  if (!input.produksi) {
    return true;
  }
  return input.jenisPengguna === JenisPengguna.asn;
}
