import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

/**
 * Perilaku kedua endpoint SSO KETIKA KREDENSIAL BELUM ADA — yaitu keadaan
 * proyek ini saat berkas ini ditulis (28 Agu 2026), dan keadaan yang akan
 * bertahan sampai tim Helpdesk mengirim `client_id`/`client_secret`.
 *
 * Diberi berkas sendiri, bukan digabung ke sso.e2e-spec.ts, karena yang diuji
 * adalah aplikasi yang di-boot TANPA kredensial. sso.e2e-spec.ts justru
 * menyetelnya di `beforeAll` supaya jalur berhasilnya dapat diuji, dan satu
 * aplikasi tak bisa berada di kedua keadaan sekaligus.
 *
 * Cacat yang membuatnya ada: sampai 28 Agu 2026 tombol utama aplikasi ("Masuk
 * via SSO Helpdesk") menampilkan JSON mentah kepada pengguna —
 * `{"success":false,"statusCode":503,...}` di tab kosong — karena
 * `GET /auth/sso/login` melempar galat seperti endpoint JSON biasa, padahal ia
 * SELALU dibuka lewat navigasi peramban. Prinsip yang benar sudah tertulis di
 * `ssoCallback` sejak awal ("melempar 400 berarti warga menatap JSON galat di
 * tab kosong"); ia hanya belum diterapkan ke `ssoLogin`.
 */
describe('SSO tanpa kredensial: gagal yang tetap terbaca manusia (e2e)', () => {
  let app: INestApplication;
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    // String kosong, bukan `delete`: dotenv (ConfigModule) tak menimpa nilai
    // yang sudah ada di process.env, sedangkan kunci yang dihapus akan diisinya
    // kembali dari `.env` — dan berkas itu bisa saja sudah terisi kredensial.
    process.env.HELPDESK_SSO_CLIENT_ID = '';
    process.env.HELPDESK_SSO_CLIENT_SECRET = '';
    process.env.WEB_APP_URL = 'http://web.uji';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env = originalEnv;
  });

  describe('GET /auth/sso/login', () => {
    it('mengalihkan ke halaman galat frontend, BUKAN membalas 503 JSON', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/sso/login');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('http://web.uji/sso/callback#error=');
    });

    it('badannya bukan JSON envelope — pengguna tak pernah menatap JSON', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/sso/login');

      expect(res.body).not.toHaveProperty('statusCode');
      expect(res.text).not.toContain('"success":false');
    });

    it('alasannya ikut terbawa ke frontend, bukan hilang jadi "terjadi kesalahan"', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/sso/login');
      const pesan = decodeURIComponent(
        new URL(res.headers.location as string).hash.replace('#error=', ''),
      );

      // Halaman /sso/callback menampilkan pesan ini apa adanya, jadi pesannya
      // harus benar-benar memberi tahu apa yang kurang -- bukan sekadar gagal.
      expect(pesan).toMatch(/belum dikonfigurasi/i);
      expect(pesan).toMatch(/ssoClientId/);
    });

    it('tak ada cookie state yang dipasang pada percobaan yang gagal', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/sso/login');

      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('GET /auth/sso/callback', () => {
    it('juga mengalihkan, bukan 503 — perilakunya sudah benar sejak awal', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/sso/callback')
        .query({ code: 'kode', state: 'state' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('http://web.uji/sso/callback#error=');
    });
  });
});
