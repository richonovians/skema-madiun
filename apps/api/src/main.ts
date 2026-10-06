import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { periksaPenyimpanan } from './config/gerbang-penyimpanan';
import { anotasiRute } from './modules/dokumentasi/anotasi-rute';
import { bangunKonfigOpenApi } from './modules/dokumentasi/openapi.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // GERBANG ENKRIPSI PENYIMPANAN (23 September 2026). Paling awal, sebelum
  // apa pun mendengarkan porta: aplikasi yang sudah melayani permintaan lalu
  // mati karena konfigurasi adalah aplikasi yang sempat menulis data ke disk
  // yang mungkin tak terenkripsi. Ini PERNYATAAN, bukan verifikasi -- alasan
  // lengkapnya di gerbang-penyimpanan.ts.
  periksaPenyimpanan(process.env.NODE_ENV ?? 'development', process.env.DB_STORAGE_ENCRYPTED);

  // Prefiks + ValidationPipe global (konfigurasi bersama dengan e2e).
  configureApp(app);

  // Panggil onModuleDestroy (mis. PrismaService.$disconnect) saat aplikasi berhenti.
  app.enableShutdownHooks();

  // Dokumentasi OpenAPI/Swagger sebagai kontrak API yang selalu sinkron dengan kode.
  const swaggerEnabled = config.get<boolean>('swagger.enabled');
  if (swaggerEnabled) {
    // Konfigurasinya dibagi dengan endpoint `/dokumentasi/openapi` lewat
    // `openapi.config.ts`. UI di bawah ini tetap HANYA untuk non-produksi;
    // yang hidup di produksi adalah endpointnya, bukan UI-nya.
    // DIANOTASI SAMA seperti `/dokumentasi/openapi`. Tanpa ini kedua dokumen
    // menyimpang: Swagger UI tak akan menyebut peran, status publik, maupun
    // batas laju sama sekali -- persis percabangan yang `openapi.config.ts`
    // dibuat untuk mencegahnya.
    const document = anotasiRute(app, SwaggerModule.createDocument(app, bangunKonfigOpenApi()));
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('app.port') ?? 3001;
  await app.listen(port);

  logger.log(`API berjalan di http://localhost:${port}/api/v1`);
  if (swaggerEnabled) {
    logger.log(`Swagger tersedia di http://localhost:${port}/api/docs`);
  }

  // Alamat BAKU sejak reverse proxy dev aktif (2026-08-27). Dicetak terpisah
  // karena berbeda dari port di atas dan justru inilah yang harus dipakai:
  // hanya lewat origin tunggal ini cookie sesi terbaca frontend MAUPUN backend,
  // dan hanya alamat inilah yang cocok dengan `redirect_uri` terdaftar di SSO
  // Helpdesk. Membuka :3000/:3001 langsung tetap bisa, tapi alur SSO tidak.
  const webUrl = config.get<string>('app.webUrl');
  const redirectUri = config.get<string>('helpdesk.ssoRedirectUri');
  if (webUrl) {
    logger.log(`Origin aplikasi (pakai ini): ${webUrl}`);
  }
  if (redirectUri) {
    logger.log(`redirect_uri SSO terdaftar: ${redirectUri}`);
  }
}

void bootstrap();
