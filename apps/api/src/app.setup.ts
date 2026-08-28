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

  // IP klien di belakang reverse proxy (2026-08-28). HARUS diset sebelum apa pun
  // yang membaca `req.ip` -- yaitu ThrottlerGuard, yang memakainya sebagai kunci
  // penghitung. Tanpa ini seluruh pengguna terhitung sebagai satu IP (IP nginx)
  // dan batas laju per-IP berhenti menjadi per-IP; alasan lengkap, bukti, serta
  // bahaya menyetelnya `true` ada di configuration.ts (`app.trustProxyHops`).
  //
  // Lewat `getHttpAdapter().getInstance()`, bukan `app.set()`: tanda tangan
  // fungsi ini `INestApplication` supaya dapat dipakai bersama seluruh e2e
  // (17 berkas) yang membuat aplikasinya lewat `createNestApplication()`.
  // Menyempitkannya ke `NestExpressApplication` hanya demi satu pemanggil akan
  // memaksa ke-17 berkas itu ikut berubah.
  const hops = config.get<number>('app.trustProxyHops') ?? 1;
  (app.getHttpAdapter().getInstance() as { set: (k: string, v: unknown) => void }).set(
    'trust proxy',
    hops,
  );

  // Header keamanan baku (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, dst.) — OWASP baseline.
  app.use(helmet());

  // CORS eksplisit: hanya origin frontend yang diizinkan (bukan wildcard `*`),
  // `credentials: true` disiapkan untuk sesi cookie httpOnly saat SSO nyata aktif.
  // `exposedHeaders: Content-Disposition` WAJIB (INT-21) -- browser sembunyikan
  // header ini dari JS cross-origin secara default (bukan di "safe list" CORS),
  // jadi frontend (exportSurveyResults, ikm.api.js) tak bisa baca nama file asli
  // dari server & diam-diam jatuh ke nama fallback tanpa periode/ekstensi benar.
  app.enableCors({
    origin: config.get<string[]>('cors.origin'),
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
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
