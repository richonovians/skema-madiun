import { TingkatPengaduan } from '@prisma/client';

/**
 * Tingkat pemerintahan sebuah OPD, DITURUNKAN DARI NAMANYA (4 November 2026).
 *
 * MENGAPA DARI NAMA, dan bukan dari sebuah kolom. Tabel `opd` disinkronkan dari
 * Helpdesk dan BERSIFAT BACA SAJA (lihat CLAUDE.md): tak ada tempat untuk
 * menuliskan penanda tingkat yang tak akan tertimpa sinkronisasi berikutnya.
 * `jenis_layanan` pun bukan jalan keluar -- terukur di basis data pengembangan,
 * 60 dari 63 baris mengosongkannya, termasuk SELURUH 15 kecamatan.
 *
 * Yang tersisa adalah nama, dan di sana polanya konsisten: 15 baris berawalan
 * "Kecamatan " dan 8 baris berawalan "Kelurahan ", sementara tak satu pun dari
 * 40 baris lain mengandung kata itu di awal. Konsekuensinya tersurat -- bila
 * Helpdesk kelak mengubah konvensi penamaannya, kecamatan akan terbaca sebagai
 * OPD kabupaten dan tak ada yang memerah. Gejalanya: formulir tingkat kecamatan
 * kehilangan pilihan tujuannya.
 *
 * KELURAHAN IKUT TINGKAT KECAMATAN (keputusan pengguna 4 November 2026).
 * Kelurahan bukan kecamatan, tetapi urusan yang diadukan warga kepada keduanya
 * sama: pelayanan administrasi wilayah. Salah satu kategori kecamatan bahkan
 * menyebutnya tersurat ("Koordinasi & Fasilitasi Pemerintahan Desa/Kelurahan").
 */
const POLA_TINGKAT_KECAMATAN = /^(kecamatan|kelurahan)(\s|$)/i;

export function tingkatOpd(nama: string | null | undefined): TingkatPengaduan {
  return POLA_TINGKAT_KECAMATAN.test((nama ?? '').trim())
    ? TingkatPengaduan.kecamatan
    : TingkatPengaduan.kabupaten;
}
