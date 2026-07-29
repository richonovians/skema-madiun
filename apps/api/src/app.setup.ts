import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

/**
 * Konfigurasi aplikasi bersama — dipakai `main.ts` (runtime) DAN e2e test, agar
 * perilaku (prefiks + ValidationPipe + header keamanan + CORS) identik dan e2e
 * representatif terhadap produksi.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  // Header keamanan baku (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, dst.) — OWASP baseline.
  app.use(helmet());

  // CORS eksplisit: hanya origin frontend yang diizinkan (bukan wildcard `*`),
  // `credentials: true` disiapkan untuk sesi cookie httpOnly saat SSO nyata aktif.
  app.enableCors({
    origin: config.get<string[]>('cors.origin'),
    credentials: true,
  });

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
