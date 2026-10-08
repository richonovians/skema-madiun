import { BadRequestException } from '@nestjs/common';
import { JenisSurvei, Survey, SurveyStatus } from '@prisma/client';

/**
 * Aturan ganti jenis survei (8 Oktober 2026, permintaan pengguna: "tambah tombol
 * ganti jenis ketika terlanjur memilih SKM").
 *
 * Jenis survei tadinya tak dapat diganti sama sekali. Yang dilonggarkan hanya
 * SATU arah dan SATU keadaan: SKM -> Custom, selagi survei masih DRAF dan belum
 * menerima jawaban apa pun. Di luar itu aturan lama berlaku utuh: `PATCH
 * /surveys/:id` tetap menolak `jenis`, dan Custom tak pernah menjadi SKM
 * (itu berarti menambah sembilan unsur ke survei yang sudah berisi).
 *
 * Murni dan tanpa basis data, supaya tiap sebab penolakan dapat diuji sendiri.
 * Pesannya menyebut SEBAB, bukan aturan: petugas yang membaca "sudah menerima 3
 * jawaban" langsung paham mengapa tombolnya ditolak.
 *
 * Urutan pemeriksaan mengikat: Sampah, jenis tujuan, sudah custom, status,
 * jawaban -- sehingga pesan yang muncul selalu sebab yang paling mendasar.
 */
export function assertBolehGantiJenis(
  survey: Pick<Survey, 'jenis' | 'status' | 'deletedAt'>,
  jumlahJawaban: number,
  jenisTujuan: JenisSurvei,
): void {
  if (survey.deletedAt !== null) {
    throw new BadRequestException(
      'Survei ini berada di Sampah. Pulihkan lebih dulu sebelum mengganti jenisnya.',
    );
  }
  if (jenisTujuan !== JenisSurvei.custom) {
    throw new BadRequestException('Jenis survei hanya dapat diganti menjadi Custom.');
  }
  if (survey.jenis === JenisSurvei.custom) {
    throw new BadRequestException('Survei ini sudah berjenis Custom.');
  }
  if (survey.status !== SurveyStatus.draft) {
    throw new BadRequestException(
      'Jenis survei hanya dapat diganti selagi survei berstatus draf. Gandakan survei ini bila ingin memulai ulang.',
    );
  }
  if (jumlahJawaban > 0) {
    throw new BadRequestException(
      `Jenis survei tidak dapat diganti karena survei ini sudah menerima ${jumlahJawaban} jawaban. Gandakan survei ini bila ingin memulai ulang.`,
    );
  }
}
