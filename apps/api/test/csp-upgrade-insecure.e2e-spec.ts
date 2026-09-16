import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

/**
 * `upgrade-insecure-requests` DI LINGKUNGAN HTTP (16 September 2026, laporan
 * pengguna: http://skema.local/api/docs "hanya menampilkan halaman putih").
 *
 * Halamannya sendiri 200, tetapi direktif itu memerintahkan peramban menaikkan
 * setiap permintaan http:// pada halaman tsb menjadi https://. Proxy
 * pengembangan hanya mendengarkan port 80, jadi seluruh berkas Swagger ditolak
 * sambungannya. Terekam di Chrome sebelum perbaikan:
 *
 *   [gagal] https://skema.local/api/docs/swagger-ui.css       ERR_CONNECTION_REFUSED
 *   [gagal] https://skema.local/api/docs/swagger-ui-bundle.js ERR_CONNECTION_REFUSED
 *   isi <div id="swagger-ui"> = 0 karakter
 *
 * `curl` TIDAK mematuhi CSP, jadi seluruh berkas itu terlihat 200 dari baris
 * perintah. Cacat sejenis pernah terjadi pada Cross-Origin-Resource-Policy
 * (catatan 6 Agustus 2026 di app.setup.ts) dengan sebab yang sama persis:
 * verifikasi manual lewat curl meloloskannya.
 *
 * Yang dijaga berkas ini adalah SYARATNYA, bukan sekadar ketiadaan direktif:
 * ia harus hilang saat aplikasi disajikan lewat http, dan harus tetap ada saat
 * disajikan lewat https. Tanpa pasangan kedua, "perbaikan" berupa membuang
 * direktif itu selamanya juga akan lulus, sambil melemahkan produksi.
 */
const DIREKTIF = 'upgrade-insecure-requests';

async function buatApp(webAppUrl: string): Promise<INestApplication> {
  const sebelumnya = process.env.WEB_APP_URL;
  process.env.WEB_APP_URL = webAppUrl;

  try {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    return app;
  } finally {
    if (sebelumnya === undefined) delete process.env.WEB_APP_URL;
    else process.env.WEB_APP_URL = sebelumnya;
  }
}

async function ambilCsp(app: INestApplication): Promise<string> {
  const response = await request(app.getHttpServer()).get('/api/v1/health');
  return response.headers['content-security-policy'] ?? '';
}

describe('CSP upgrade-insecure-requests mengikuti skema WEB_APP_URL', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  }, 30000);

  it('http: direktifnya tidak dipasang, sehingga berkas Swagger tak dinaikkan ke https', async () => {
    app = await buatApp('http://skema.local');

    expect(await ambilCsp(app)).not.toContain(DIREKTIF);
  }, 60000);

  it('https: direktifnya tetap dipasang, produksi tidak dilemahkan', async () => {
    app = await buatApp('https://skema.madiunkab.go.id');

    expect(await ambilCsp(app)).toContain(DIREKTIF);
  }, 60000);

  it('KONTROL: header CSP lain tetap utuh di lingkungan http', async () => {
    app = await buatApp('http://skema.local');
    const csp = await ambilCsp(app);

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
  }, 60000);
});
