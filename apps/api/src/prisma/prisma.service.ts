import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const MAX_CONNECT_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 1000;

/**
 * Membungkus PrismaClient sebagai provider NestJS.
 * Membuka koneksi (dengan retry backoff eksponensial) saat modul init, menutupnya
 * saat aplikasi shutdown.
 *
 * Retry mengatasi race cold-start: saat `docker compose up` + aplikasi start hampir
 * bersamaan, Postgres bisa belum benar-benar siap menerima koneksi meski container
 * sudah "running" — tanpa retry ini menyebabkan e2e/dev gagal di percobaan pertama
 * dan baru sukses saat dijalankan ulang.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
    this.logger.log('Prisma terhubung ke database PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  private async connectWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt++) {
      try {
        await this.$connect();
        return;
      } catch (err) {
        if (attempt === MAX_CONNECT_ATTEMPTS) {
          throw err;
        }
        const delayMs = BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
        this.logger.warn(
          `Gagal terhubung ke database (percobaan ${attempt}/${MAX_CONNECT_ATTEMPTS}), ` +
            `coba lagi dalam ${delayMs}ms: ${String(err)}`,
        );
        await this.sleep(delayMs);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
