import { BadRequestException } from '@nestjs/common';
import { TingkatPengaduan } from '@prisma/client';
import { tingkatKategoriPengaduan } from '../reference/reference.constants';
import { tingkatOpd } from '../opd/tingkat-opd.util';

/**
 * Penegakan sisi server untuk pemisahan tingkat pengaduan (4 November 2026).
 *
 * MENGAPA DI SINI DAN BUKAN DI DTO. `@IsIn` hanya dapat memeriksa satu medan
 * terhadap daftar tetap; yang perlu dijaga di sini adalah KECOCOKAN antara dua
 * medan (`tingkat` dengan `kategori`, lalu `tingkat` dengan OPD tujuan). Tanpa
 * penjaga ini, formulir yang disaring di peramban tetap dapat dilewati siapa
 * pun yang mengirim multipart-nya sendiri -- dan hasilnya adalah pengaduan
 * tingkat kecamatan yang ditujukan ke Dinas Kesehatan dengan kategori
 * "Pelayanan Administrasi Kecamatan", yang tak dapat ditindaklanjuti siapa pun.
 */

const LABEL_TINGKAT: Record<TingkatPengaduan, string> = {
  [TingkatPengaduan.kabupaten]: 'kabupaten',
  [TingkatPengaduan.kecamatan]: 'kecamatan',
};

/** Kategori yang dikirim harus milik tingkat yang dikirim. */
export function assertKategoriSesuaiTingkat(kode: string, tingkat: TingkatPengaduan): void {
  const tingkatKategori = tingkatKategoriPengaduan(kode);
  // `null` berarti kodenya tak dikenal SAMA SEKALI. DTO sudah menolaknya lewat
  // `@IsIn`, jadi cabang ini hanya terlewati oleh pemanggil internal -- tetapi
  // ia tetap harus berbunyi beda, karena "kategori tidak dikenal" dan
  // "kategori salah tingkat" menuntut perbaikan yang berbeda dari pengirimnya.
  if (tingkatKategori === null) {
    throw new BadRequestException(`Kategori pengaduan "${kode}" tidak dikenal`);
  }
  if (tingkatKategori !== tingkat) {
    throw new BadRequestException(
      `Kategori "${kode}" adalah kategori tingkat ${LABEL_TINGKAT[tingkatKategori]}, ` +
        `tidak dapat dipakai pada pengaduan tingkat ${LABEL_TINGKAT[tingkat]}`,
    );
  }
}

/**
 * OPD tujuan harus berada pada tingkat yang dikirim.
 *
 * TIDAK dipanggil untuk pengaduan tanpa tujuan ("Lainnya", `opdId` NULL): di
 * sana memang tak ada OPD untuk diperiksa, dan `tingkat` justru menjadi
 * satu-satunya petunjuk triase bagi Admin Kabupaten.
 */
export function assertOpdSesuaiTingkat(namaOpd: string, tingkat: TingkatPengaduan): void {
  const tingkatTujuan = tingkatOpd(namaOpd);
  if (tingkatTujuan !== tingkat) {
    throw new BadRequestException(
      `"${namaOpd}" adalah instansi tingkat ${LABEL_TINGKAT[tingkatTujuan]}, ` +
        `tidak dapat dipilih pada pengaduan tingkat ${LABEL_TINGKAT[tingkat]}`,
    );
  }
}
