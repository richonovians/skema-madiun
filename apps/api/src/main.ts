import * as path from 'path';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Prefiks + ValidationPipe global (konfigurasi bersama dengan e2e).
  configureApp(app);

  // Sajikan lampiran pengaduan yg sudah ditulis ke disk (ComplaintsService,
  // fs.writeFile ke `uploadDir/complaints/`) sbg file statis di `/uploads/*`
  // (2026-08-05, bug ditemukan: fileUrl SUDAH benar terisi & tersimpan sejak
  // awal, tapi TAK ADA route/middleware apa pun yg menyajikannya -- setiap
  // request ke fileUrl selalu 404, gambar lampiran tak pernah bisa tampil).
  // Publik/tanpa-auth SENGAJA (bukan lupa) -- nama file UUID tak tertebak,
  // dan membangun endpoint file terautentikasi adalah pekerjaan terpisah yg
  // lebih besar (lihat catatan gap CMP-2 di complaint.adapter.js frontend).
  const uploadDir = path.resolve(process.cwd(), config.get<string>('upload.dir') ?? 'uploads');
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

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
}

void bootstrap();
