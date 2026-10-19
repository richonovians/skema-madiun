import { DocumentBuilder } from '@nestjs/swagger';

/**
 * SATU sumber konfigurasi OpenAPI, dipakai DUA pemanggil:
 *
 *   - `main.ts` untuk menyajikan UI Swagger, dan HANYA bila `SWAGGER_ENABLED`
 *     -- UI itu wajib mati di produksi;
 *   - `app.setup.ts` untuk endpoint `GET /dokumentasi/openapi`, yang justru
 *     hidup juga di produksi karena halaman Dokumentasi API Admin Kabupaten
 *     memakainya.
 *
 * Dipisah ke berkas sendiri supaya keduanya tak dapat diam-diam berbeda judul,
 * versi, atau skema autentikasi. Sebelumnya konfigurasi ini ditulis inline di
 * `main.ts`; menyalinnya ke pemanggil kedua akan melahirkan dua kebenaran.
 */
export function bangunKonfigOpenApi() {
  return new DocumentBuilder()
    .setTitle('API SKM & Pengaduan Masyarakat')
    .setDescription('Kontrak REST API — Sistem SKM & Pengaduan Masyarakat (Diskominfo)')
    .setVersion('1.0')
    .addBearerAuth() // disiapkan untuk autentikasi bearer (SSO) di masa depan
    .build();
}
