import { BadRequestException } from '@nestjs/common';
import { Survey, SurveyStatus } from '@prisma/client';

/**
 * Penyaring "belum dibuang" untuk seluruh pembacaan survei (11 September 2026).
 *
 * DITULIS TERSURAT di tiap pemanggil, bukan dipasang sebagai middleware Prisma
 * global. Middleware seperti itu tak terlihat saat membaca kode pemanggilnya,
 * dan justru melawan satu-satunya fitur yang memang harus membaca baris
 * terbuang: halaman Sampah.
 *
 * `findUnique` TIDAK menerima medan non-unik pada `where`, jadi tiap
 * `findUnique({ where: { id } })` menjadi `findFirst({ where: { id, ...TIDAK_DIBUANG } })`.
 */
export const TIDAK_DIBUANG = { deletedAt: null } as const;

/**
 * Jenis perubahan, dibedakan menurut AKIBATNYA pada data yang sudah terkumpul,
 * bukan menurut endpoint yang memanggilnya.
 *
 * - `meta`    : judul, izin pengisian tanpa login, multi-submit. Hanya mengatur
 *               pengisian berikutnya.
 * - `periode` : bagian kunci unik `ikm_results(surveyId, periode)`.
 * - `susunan` : tambah/hapus/urut pertanyaan & ubah opsi. Skor 1-4 yang
 *               tersimpan menunjuk label opsi, jadi mengubahnya mengubah arti
 *               jawaban lama tanpa jejak.
 * - `teks`    : memperbaiki kalimat pertanyaan. Nilai jawaban tak bergeser.
 */
export type AksiUbah = 'meta' | 'periode' | 'susunan' | 'teks';

const NAMA_AKSI: Record<AksiUbah, string> = {
  meta: 'Pengaturan survei',
  periode: 'Periode survei',
  susunan: 'Susunan pertanyaan',
  teks: 'Teks pertanyaan',
};

/**
 * Penjaga tunggal aturan ubah (tabel §2.4 spec). Dipakai SurveysService maupun
 * QuestionsService supaya kedua modul tak pernah berbeda pendapat tentang apa
 * yang boleh diubah.
 *
 * Pesan galatnya menyebut SEBAB, bukan aturan: petugas yang membaca "status
 * tidak valid" tak tahu harus berbuat apa, sedangkan yang membaca "sudah
 * menerima 142 jawaban" langsung paham mengapa tombolnya mati.
 */
export function assertSurveyEditable(
  survey: Pick<Survey, 'status' | 'deletedAt'>,
  jumlahJawaban: number,
  aksi: AksiUbah,
): void {
  if (survey.deletedAt !== null) {
    throw new BadRequestException(
      'Survei ini berada di Sampah. Pulihkan lebih dulu sebelum mengubahnya.',
    );
  }
  if (survey.status === SurveyStatus.ditutup) {
    throw new BadRequestException(
      'Survei yang sudah ditutup tidak dapat diubah karena hasil IKM-nya sudah terbit. Aktifkan kembali lebih dulu bila memang perlu diubah.',
    );
  }
  if (jumlahJawaban > 0 && (aksi === 'periode' || aksi === 'susunan')) {
    throw new BadRequestException(
      `${NAMA_AKSI[aksi]} tidak dapat diubah karena survei ini sudah menerima ${jumlahJawaban} jawaban. Mengubahnya akan mengubah arti jawaban yang sudah masuk.`,
    );
  }
}
