import { Inject, Injectable } from '@nestjs/common';
import { PENYIMPAN_SESI } from './modules/auth/session/penyimpan-sesi.interface';
import type { PenyimpanSesi } from './modules/auth/session/penyimpan-sesi.interface';
import { PrismaService } from './prisma/prisma.service';

/**
 * Batas tunggu tiap pemeriksaan, milidetik.
 *
 * Basis data yang MACET tidak melempar: kuerinya menunggu sampai kolam koneksi
 * Prisma menyerah, sekitar 10 detik. Pemantau lazimnya menyerah lebih dulu,
 * dan jawaban yang tak pernah tiba tak dapat dibedakan dari API yang mati.
 * Redis sudah dibatasi `BATAS_PERINTAH_MS` (1 detik) di `klien-redis.ts`; batas
 * di sini lapis kedua yang berlaku sama untuk keduanya.
 */
export const BATAS_PERIKSA_MS = 2_000;

export type KeadaanKomponen = 'ok' | 'gagal';

export interface HasilKesiapan {
  siap: boolean;
  db: KeadaanKomponen;
  redis: KeadaanKomponen;
}

/**
 * Kesiapan API melayani permintaan: basis data dan penyimpan sesi menjawab.
 *
 * BUG-072 (4 November 2026). `/health` menjawab 200 sebanyak 90 dari 90 kali
 * selama basis data mati, sementara `/auth/me` dan `/complaints` 500. `/health`
 * sengaja TETAP statis -- ia menjawab "prosesnya hidup", dan penyelia yang
 * memakainya tak boleh merestart API yang sehat hanya karena basis data padam.
 * Pertanyaan "dapatkah ia melayani" dijawab `/health/siap` lewat kelas ini.
 *
 * Redis yang diperiksa adalah koneksi PENYIMPAN SESI, satu dari empat koneksi
 * Redis aplikasi. Hanya kegagalan koneksi itu yang menolak pengguna (pemeriksaan
 * sesi gagal tertutup); singgahan dan penghitung laju gagal terbuka. Tanpa
 * `REDIS_URL` penyimpannya memori dan selalu menjawab.
 */
@Injectable()
export class KesiapanService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PENYIMPAN_SESI) private readonly penyimpanSesi: PenyimpanSesi,
  ) {}

  async periksa(): Promise<HasilKesiapan> {
    const [db, redis] = await Promise.all([
      keadaan(() => this.prisma.$queryRaw`SELECT 1`),
      keadaan(() => this.penyimpanSesi.periksa()),
    ]);
    return { siap: db === 'ok' && redis === 'ok', db, redis };
  }
}

/** `ok` bila `kerja` selesai dalam `BATAS_PERIKSA_MS`, selain itu `gagal`. Tak pernah melempar. */
async function keadaan(kerja: () => Promise<unknown>): Promise<KeadaanKomponen> {
  let pewaktu: NodeJS.Timeout | undefined;
  const habis = new Promise<KeadaanKomponen>((selesai) => {
    pewaktu = setTimeout(() => selesai('gagal'), BATAS_PERIKSA_MS);
  });
  try {
    return await Promise.race([
      kerja().then(
        (): KeadaanKomponen => 'ok',
        (): KeadaanKomponen => 'gagal',
      ),
      habis,
    ]);
  } finally {
    clearTimeout(pewaktu);
  }
}
