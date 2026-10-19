import { JenisKelamin } from '@prisma/client';

/**
 * Jenis kelamin dari klaim Helpdesk ke enum `JenisKelamin` (1 Oktober 2026).
 *
 * KENAPA ADA PEMETA SENDIRI. Dua payload sungguhan dari penyedia yang sama
 * mengirim medan ini dalam DUA PENGKODEAN YANG BERBEDA:
 *
 *   GET /api/oauth/userinfo -> demographics.jenis_kelamin = "Laki-laki"
 *   GET /api/me             -> jenis_kelamin             = "L"
 *
 * Menyimpan nilainya apa adanya berarti kolom yang isinya campur aduk dan
 * rekapitulasi yang menghitung "L" dan "Laki-laki" sebagai dua kelompok
 * berbeda. Enum `JenisKelamin` sudah ada dan dipakai jalur publik; pemeta ini
 * yang menyatukan keduanya ke sana.
 *
 * MENOLAK, BUKAN MENEBAK. Nilai di luar daftar menjadi `null`, dan tampilan
 * menyembunyikan barisnya. Menebak berarti mencatat jenis kelamin yang salah
 * pada data seseorang -- kesalahan yang tak terlihat siapa pun, berbeda dengan
 * medan kosong yang terlihat. Daftar di bawah berisi persis bentuk yang
 * TERUKUR, ditambah bentuk enum SKEMA sendiri supaya nilai yang sudah pernah
 * tersimpan tetap terbaca bila kelak dialirkan ulang lewat jalur ini.
 */
const PETA: Record<string, JenisKelamin> = {
  l: JenisKelamin.laki_laki,
  'laki-laki': JenisKelamin.laki_laki,
  laki_laki: JenisKelamin.laki_laki,
  p: JenisKelamin.perempuan,
  perempuan: JenisKelamin.perempuan,
};

export function petakanJenisKelamin(nilai: unknown): JenisKelamin | null {
  if (typeof nilai !== 'string') {
    return null;
  }
  return PETA[nilai.trim().toLowerCase()] ?? null;
}
