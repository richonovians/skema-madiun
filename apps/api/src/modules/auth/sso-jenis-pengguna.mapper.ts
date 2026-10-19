import { JenisPengguna } from '@prisma/client';

/**
 * Jenis pengguna dari klaim Helpdesk ke enum `JenisPengguna` (6 Oktober 2026).
 *
 * MENGAPA PEMETA SENDIRI, bukan nilai klaim disimpan apa adanya. Keluaran
 * fungsi ini menjadi SATU-SATUNYA ukuran gerbang "boleh dijadikan Admin OPD"
 * di produksi (UsersService). Kolom bertipe enum menolak nilai asing di
 * tingkat basis data; kolom teks akan menampung apa pun yang dikirim penyedia,
 * dan gerbangnya lalu membandingkan string dengan string -- bentuk yang gagal
 * sunyi begitu pengkodeannya bergeser.
 *
 * MENOLAK, BUKAN MENEBAK. Nilai di luar daftar menjadi `null`, dan `null`
 * TIDAK berarti warga: ia berarti SKEMA belum pernah diberitahu. Gerbangnya
 * menuntut `asn` tersurat, jadi nilai yang tak dikenali berakibat peran Admin
 * OPD tak dapat diberikan -- gagal tertutup, bukan gagal terbuka.
 *
 * Huruf kecil & spasi tepi dimaafkan. Alasannya terukur, bukan kehati-hatian
 * berlebihan: dua endpoint penyedia yang sama mengirim `jenis_kelamin` sebagai
 * "Laki-laki" dan "L" (lihat sso-jenis-kelamin.mapper.ts), jadi menuntut
 * bentuk persis berarti gerbangnya gagal karena perkara kapital.
 *
 * FUNGSI MURNI, tanpa Nest dan tanpa Prisma -- alasan yang sama seperti
 * `acting-role.util.ts`: ini titik tempat kesalahan berakibat seseorang
 * memperoleh atau kehilangan hak atas sebuah instansi.
 */
const PETA: Record<string, JenisPengguna> = {
  asn: JenisPengguna.asn,
  masyarakat: JenisPengguna.masyarakat,
};

export function petakanJenisPengguna(nilai: unknown): JenisPengguna | null {
  if (typeof nilai !== 'string') {
    return null;
  }
  return PETA[nilai.trim().toLowerCase()] ?? null;
}
