import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Prefiks versi API: seluruh endpoint di bawah /api/v1 (kontrak arsitektur).
  app.setGlobalPrefix('api/v1');

  // Validasi & transformasi DTO global.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // buang properti yang tidak dideklarasikan di DTO
      forbidNonWhitelisted: true, // tolak request dengan properti asing
      transform: true, // ubah payload menjadi instance DTO bertipe
      transformOptions: { enableImplicitConversion: true },
    }),
  );

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
