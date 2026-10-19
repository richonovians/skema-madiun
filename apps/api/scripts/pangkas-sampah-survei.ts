/**
 * Musnahkan survei di Sampah yang sudah melewati umur kebijakan.
 *
 * MENGAPA ADA, padahal penjadwal di dalam aplikasi menjalankannya sendiri
 * setiap hari. Dua kebutuhan yang tak dilayani penjadwal:
 *
 *   1. MELIHAT DAMPAKNYA SEBELUM MEMPERCAYAINYA. Pemusnahannya permanen dan
 *      ikut membawa pertanyaan serta hasil IKM, jadi angka "berapa survei akan
 *      hilang" pantas diketahui lebih dulu. Mode kering adalah BAKUNYA di sini;
 *      memusnahkan menuntut `--hapus` tersurat.
 *   2. MENJALANKANNYA SEKARANG, tanpa menunggu jam 04.00.
 *
 * KODENYA SAMA, bukan salinan: SurveiPemusnahanService yang persis dipanggil
 * penjadwal, dan pembacaan env lewat `configuration()` yang persis dipakai
 * aplikasi. Menyalin hitungan batas waktu ke sini berarti dua tempat yang dapat
 * berbeda tanpa ada satu uji pun yang memerah.
 *
 * TIDAK MEM-BOOT NEST, alasannya sama persis dengan pangkas-audit.ts: skrip ini
 * dijalankan `tsx`, dan esbuild di dalamnya tidak memancarkan
 * `emitDecoratorMetadata`, sehingga DI Nest maupun validasi env gagal. Yang
 * berbeda hanya perakitannya, bukan logikanya.
 *
 *   pnpm --filter @skm-spm/api pangkas:sampah              # kering: hanya melaporkan
 *   pnpm --filter @skm-spm/api pangkas:sampah -- --hapus   # benar-benar memusnahkan
 */
import type { ConfigService } from '@nestjs/config';
import configuration from '../src/config/configuration';
import {
  PEMUSNAHAN_MINIMUM_HARI,
  SurveiPemusnahanService,
} from '../src/modules/surveys/survei-pemusnahan.service';
import { PrismaService } from '../src/prisma/prisma.service';

/** Pembacaan konfigurasi yang SAMA dengan aplikasi, tanpa ConfigModule. */
function bacaKonfigurasi(): ConfigService {
  const nilai = configuration();
  return {
    get: (kunci: string) => {
      if (kunci === 'survey.purgeDays') return nilai.survey.purgeDays;
      if (kunci === 'survey.purgeEnabled') return nilai.survey.purgeEnabled;
      if (kunci === 'survey.purgeAllowShort') return nilai.survey.purgeAllowShort;
      return undefined;
    },
  } as unknown as ConfigService;
}

function tulis(pesan: string): void {
  process.stdout.write(`${pesan}\n`);
}

async function utama(): Promise<void> {
  const hapus = process.argv.includes('--hapus');
  const prisma = new PrismaService();
  const service = new SurveiPemusnahanService(prisma, bacaKonfigurasi());

  try {
    const hari = service.hariPemusnahan();
    if (hari === null) {
      tulis(
        'SURVEY_PURGE_ENABLED=false, jadi pemusnahan otomatis MATI dan tak ada yang dibuang.\n' +
          'Hapus nilai itu dari .env untuk menyalakannya kembali — lihat .env.example.',
      );
      return;
    }

    const hasil = await service.pangkas({ kering: !hapus });

    if (!hasil.dijalankan) {
      if (hasil.alasan === 'terlalu-pendek') {
        tulis(
          `DITOLAK: SURVEY_PURGE_DAYS=${hasil.hari} di bawah batas ${PEMUSNAHAN_MINIMUM_HARI} hari.\n` +
            'Bila nilai itu memang disengaja, setel SURVEY_PURGE_ALLOW_SHORT=true.',
        );
      }
      // `exitCode`, BUKAN process.exit(): keluar paksa dengan soket Prisma yang
      // masih terbuka pernah memicu assertion libuv di repo ini.
      process.exitCode = 1;
      return;
    }

    const batas = hasil.batas.toISOString();
    if (hasil.kering) {
      tulis(
        `MODE KERING — tak ada yang dimusnahkan.\n` +
          `Umur Sampah ${hasil.hari} hari; ${hasil.jumlah} survei TANPA RESPONS yang dibuang ` +
          `sebelum ${batas} AKAN dimusnahkan.\n` +
          'Survei yang sudah dijawab warga tidak pernah ikut terhitung di sini.\n' +
          'Jalankan ulang dengan --hapus untuk benar-benar memusnahkannya.',
      );
    } else {
      tulis(
        `Selesai. Umur Sampah ${hasil.hari} hari; ` +
          `${hasil.jumlah} survei tanpa respons yang dibuang sebelum ${batas} dimusnahkan.`,
      );
    }
  } catch (err) {
    process.stderr.write(`Gagal: ${(err as Error)?.message ?? err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void utama();
