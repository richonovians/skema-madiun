import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Rangkaian penghapusan sebuah survei beserta seluruh turunannya
 * (30 September 2026).
 *
 * DIANGKAT KE SINI dari `SurveysService.purge` ketika pemusnahan otomatis
 * ditambahkan. Alasannya bukan kerapian: dua salinan rangkaian penghapusan
 * berantai adalah dua hal yang pasti menyimpang suatu hari, dan yang tertinggal
 * saat menyimpang bukan galat yang terbaca melainkan baris tanpa induk di tabel
 * anak -- jawaban yang menunjuk survei yang sudah tiada. Satu-satunya cara
 * menjamin jalur manual dan jalur terjadwal menghapus hal yang sama persis
 * adalah membuat keduanya memanggil daftar yang sama.
 *
 * URUTANNYA DARI DAUN KE AKAR, dan itu bukan kehati-hatian berlebih:
 * `answers.question_id` tanpa `onDelete` alias RESTRICT, sehingga menghapus
 * `questions` selagi jawabannya masih ada akan ditolak Postgres. Urutan ini
 * pernah ditulis tersurat di `purge` dengan alasan yang sama, dan ia ikut
 * pindah bersama kodenya.
 *
 * MENGEMBALIKAN DAFTAR, bukan menjalankannya sendiri. Dengan begitu pemanggil
 * yang menentukan batas transaksinya: `purge` membungkus satu survei,
 * sedangkan pemusnahan terjadwal membungkus satu survei per transaksi pula
 * supaya satu survei bermasalah tidak menggagalkan seluruh lintasan malam itu.
 */
export function operasiPemusnahanSurvei(
  prisma: PrismaService,
  surveyId: number,
): Prisma.PrismaPromise<unknown>[] {
  return [
    prisma.answer.deleteMany({ where: { response: { surveyId } } }),
    prisma.surveyResponse.deleteMany({ where: { surveyId } }),
    prisma.questionOption.deleteMany({ where: { question: { surveyId } } }),
    prisma.question.deleteMany({ where: { surveyId } }),
    prisma.ikmResult.deleteMany({ where: { surveyId } }),
    prisma.survey.delete({ where: { id: surveyId } }),
  ];
}
