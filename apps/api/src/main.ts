import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { periksaPenyimpanan } from './config/gerbang-penyimpanan';

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
    const swaggerConfig = new DocumentBuilder()
      .setTitle('API SKM & Pengaduan Masyarakat')
      .setDescription('Kontrak REST API — Sistem SKM & Pengaduan Masyarakat (Diskominfo)')
      .setVersion('1.0')
      .addBearerAuth() // disiapkan untuk autentikasi bearer (SSO) di masa depan
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
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
