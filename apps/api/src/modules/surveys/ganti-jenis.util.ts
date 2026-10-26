import { BadRequestException } from '@nestjs/common';
import { JenisSurvei, Survey, SurveyStatus } from '@prisma/client';

/**
 * Aturan ganti jenis survei.
 *
 * 8 Oktober 2026 (permintaan pengguna: "tambah tombol ganti jenis ketika
 * terlanjur memilih SKM") melonggarkan SATU arah, SKM -> Custom.
 * 26 Oktober 2026 (permintaan pengguna) membuka arah sebaliknya, Custom -> SKM,
 * dengan syarat yang sama persis: survei masih DRAF, belum menerima jawaban apa
 * pun, dan tidak di Sampah. Sebelumnya berkas ini menolaknya dengan alasan "itu
 * berarti menambah sembilan unsur ke survei yang sudah berisi" -- dan memang
 * itulah yang kini dilakukan `SurveysService.gantiJenis`: U1-U9 ditambahkan di
 * depan, pertanyaan milik OPD dipertahankan sebagai pertanyaan tambahan.
 * `PATCH /surveys/:id` tetap menolak `jenis`.
 *
 * Murni dan tanpa basis data, supaya tiap sebab penolakan dapat diuji sendiri.
 * Pesannya menyebut SEBAB, bukan aturan: petugas yang membaca "sudah menerima 3
 * jawaban" langsung paham mengapa tombolnya ditolak.
 *
 * Urutan pemeriksaan mengikat: Sampah, jenis yang sama, status, jawaban --
 * sehingga pesan yang muncul selalu sebab yang paling mendasar.
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
  if (survey.jenis === jenisTujuan) {
    throw new BadRequestException(
      `Survei ini sudah berjenis ${jenisTujuan === JenisSurvei.custom ? 'Custom' : 'SKM'}.`,
    );
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
