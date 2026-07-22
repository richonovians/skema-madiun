import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Konfigurasi aplikasi bersama — dipakai `main.ts` (runtime) DAN e2e test, agar
 * perilaku (prefiks + ValidationPipe) identik dan e2e representatif terhadap produksi.
 */
export function configureApp(app: INestApplication): void {
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
}
