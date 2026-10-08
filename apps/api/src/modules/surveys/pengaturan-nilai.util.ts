import { BadRequestException } from '@nestjs/common';
import { JenisSurvei, MetodeNilai, TujuanSurvei } from '@prisma/client';

/**
 * Aturan LINTAS-BIDANG jenis + tujuan + metode nilai (8 Oktober 2026), murni
 * dan tanpa basis data supaya dapat diuji tersendiri. Validator DTO tak cukup:
 * `jenis` dan `tujuan` hidup di bidang berbeda, dan pada pembaruan `jenis`
 * berasal dari baris tersimpan, bukan dari badan permintaan.
 *
 * Tujuan dan metode hanya bermakna untuk survei `custom`; survei SKM
 * menghasilkan Nilai IKM menurut PermenPANRB dan tak memakainya. Basis data
 * ikut menjaga setengah aturan ini lewat CHECK `surveys_nilai_survei_ck`
 * (SKM tak boleh membawa keduanya), tetapi TIDAK menuntut custom wajib
 * memilikinya -- itu ditegakkan di sini saat membuat.
 */
const PESAN_SKM = 'Survei SKM tidak memakai tujuan dan metode nilai';

/** Membuat survei: custom WAJIB keduanya, SKM tidak boleh satu pun. */
export function assertPengaturanNilaiBuat(
  jenis: JenisSurvei,
  tujuan: TujuanSurvei | undefined,
  metode: MetodeNilai | undefined,
): void {
  if (jenis === JenisSurvei.custom) {
    if (tujuan === undefined || metode === undefined) {
      throw new BadRequestException('Tujuan dan metode nilai wajib dipilih untuk survei custom');
    }
    return;
  }
  if (tujuan !== undefined || metode !== undefined) {
    throw new BadRequestException(PESAN_SKM);
  }
}

/**
 * Mengubah survei: custom boleh mengubah salah satunya (atau keduanya, atau
 * tidak sama sekali); SKM tidak boleh menyebut satu pun.
 */
export function assertPengaturanNilaiUbah(
  jenis: JenisSurvei,
  tujuan: TujuanSurvei | undefined,
  metode: MetodeNilai | undefined,
): void {
  if (jenis !== JenisSurvei.custom && (tujuan !== undefined || metode !== undefined)) {
    throw new BadRequestException(PESAN_SKM);
  }
}
