import type { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Hapus notifikasi jawaban survei milik OPD ini (13 September 2026).
 *
 * Perlu helper tersendiri karena penerimanya BUKAN hanya akun buatan uji:
 * `notifySurveyResponse` juga menyiarkan ke seluruh akun kabupaten & superuser
 * yang ADA DI BASIS DATA LOKAL. Membersihkan akun buatan uji saja meninggalkan
 * baris yatim atas nama akun sungguhan -- persis yang terjadi pada run pertama
 * (108 baris menunjuk 27 survei e2e yang sudah lenyap).
 *
 * Disaring lewat `link`, yang memuat id survei, sebab `notifications` memang
 * tak punya kolom relasi ke survei.
 *
 * PANGGIL SEBELUM surveinya dihapus: sesudah itu idnya tak dapat ditemukan lagi.
 */
export async function bersihkanNotifikasiSurvei(
  prisma: PrismaService,
  opdId: number,
): Promise<void> {
  const surveys = await prisma.survey.findMany({ where: { opdId }, select: { id: true } });
  if (surveys.length === 0) return;
  await prisma.notification.deleteMany({
    where: { OR: surveys.map((s) => ({ link: { contains: `/surveys/${s.id}/responses` } })) },
  });
}
