/**
 * Pangkas log audit yang sudah melewati masa retensi.
 *
 * MENGAPA ADA, padahal penjadwal di dalam aplikasi menjalankannya sendiri
 * setiap hari. Dua kebutuhan yang tak dilayani penjadwal:
 *
 *   1. MELIHAT DAMPAKNYA SEBELUM MENYALAKAN. Penghapusannya permanen, jadi
 *      angka "berapa baris akan hilang" pantas diketahui lebih dulu. Mode
 *      kering adalah BAKUNYA di sini; menghapus menuntut `--hapus` tersurat.
 *   2. MENJALANKANNYA SEKARANG. Saat mengosongkan ruang atau memeriksa
 *      perilakunya, menunggu jam 03.00 bukan pilihan.
 *
 * KODENYA SAMA, bukan salinan: yang dipakai AuditRetensiService yang persis
 * dipanggil penjadwal, dan pembacaan env-nya memakai `configuration()` yang
 * persis dipakai aplikasi. Menyalin hitungan batas waktu ke sini berarti dua
 * tempat yang dapat berbeda tanpa ada satu uji pun yang memerah.
 *
 * TIDAK MEM-BOOT NEST, dan itu bukan pilihan gaya melainkan keharusan yang
 * terukur. Skrip ini dijalankan `tsx`, dan esbuild di dalamnya TIDAK memancarkan
 * `emitDecoratorMetadata`. Tanpa metadata itu, DI Nest kehilangan
 * `design:paramtypes` dan `enableImplicitConversion` pada validasi env
 * kehilangan `design:type` -- sudah dicoba, dan hasilnya boot gagal dengan
 * "THROTTLE_TTL_MS must be an integer number" pada env yang sebenarnya benar.
 * Karena itu layanannya dirakit dengan tangan di sini; yang berbeda hanya
 * perakitannya, bukan logikanya.
 *
 *   pnpm --filter @skm-spm/api pangkas:audit              # kering: hanya melaporkan
 *   pnpm --filter @skm-spm/api pangkas:audit -- --hapus   # benar-benar menghapus
 */
import type { ConfigService } from '@nestjs/config';
import configuration from '../src/config/configuration';
import {
  AuditRetensiService,
  RETENSI_MINIMUM_HARI,
} from '../src/modules/audit/audit-retensi.service';
import { PrismaService } from '../src/prisma/prisma.service';

/** Pembacaan konfigurasi yang SAMA dengan aplikasi, tanpa ConfigModule. */
function bacaKonfigurasi(): ConfigService {
  const nilai = configuration();
  return {
    get: (kunci: string) => {
      if (kunci === 'audit.retentionDays') return nilai.audit.retentionDays;
      if (kunci === 'audit.retentionAllowShort') return nilai.audit.retentionAllowShort;
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
  const service = new AuditRetensiService(prisma, bacaKonfigurasi());

  try {
    const hari = service.hariRetensi();
    if (hari === null) {
      tulis(
        'AUDIT_RETENTION_DAYS tidak disetel, jadi retensi MATI dan tak ada yang dipangkas.\n' +
          'Setel nilainya di .env lebih dulu — lihat .env.example.',
      );
      return;
    }

    const hasil = await service.pangkas({ kering: !hapus });

    if (!hasil.dijalankan) {
      if (hasil.alasan === 'terlalu-pendek') {
        tulis(
          `DITOLAK: AUDIT_RETENTION_DAYS=${hasil.hari} di bawah batas ${RETENSI_MINIMUM_HARI} hari.\n` +
            'Bila nilai itu memang disengaja, setel AUDIT_RETENTION_ALLOW_SHORT=true.',
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
        `MODE KERING — tak ada yang dihapus.\n` +
          `Retensi ${hasil.hari} hari; ${hasil.jumlah} baris lebih tua dari ${batas} AKAN terhapus.\n` +
          'Jalankan ulang dengan --hapus untuk benar-benar menghapusnya.',
      );
    } else {
      tulis(
        `Selesai. Retensi ${hasil.hari} hari; ` +
          `${hasil.jumlah} baris lebih tua dari ${batas} dihapus.`,
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
