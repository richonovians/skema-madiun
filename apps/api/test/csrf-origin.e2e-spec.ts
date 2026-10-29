import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

/**
 * BUG-052: mutasi dari origin di luar `cors.origin` ditolak 403 sebelum
 * mencapai rute mana pun.
 *
 * Semua permintaan diarahkan ke rute yang tidak ada. Penjaganya berjalan
 * sebelum perutean, jadi 403 berarti ditolak penjaga dan 404 berarti lolos
 * penjaga -- tanpa sesi, tanpa akun, dan tanpa satu baris pun ditulis.
 */
describe('Penjaga origin untuk mutasi (e2e)', () => {
  let app: INestApplication;
  let originSah: string;
  const RUTE = '/api/v1/__tidak-ada__';
  const ORIGIN_ASING = 'http://bukan-skema.example';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    originSah = app.get(ConfigService).get<string[]>('cors.origin')![0];
  }, 60000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  const http = () => request(app.getHttpServer());

  it.each(['post', 'put', 'patch', 'delete'] as const)(
    '%s dari origin asing ditolak 403',
    async (metode) => {
      const res = await http()[metode](RUTE).set('Origin', ORIGIN_ASING);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Origin permintaan tidak diizinkan');
    },
  );

  it('POST dari origin yang terdaftar di cors.origin lolos', async () => {
    const res = await http().post(RUTE).set('Origin', originSah);
    expect(res.status).toBe(404);
  });

  it('GET dari origin asing tetap dilayani (bukan mutasi)', async () => {
    const res = await http().get(RUTE).set('Origin', ORIGIN_ASING);
    expect(res.status).toBe(404);
  });

  it.each(['cross-site', 'same-site'])(
    'POST tanpa Origin dengan Sec-Fetch-Site %s ditolak 403',
    async (situs) => {
      const res = await http().post(RUTE).set('Sec-Fetch-Site', situs);
      expect(res.status).toBe(403);
    },
  );

  it.each(['same-origin', 'none'])(
    'POST tanpa Origin dengan Sec-Fetch-Site %s lolos',
    async (situs) => {
      const res = await http().post(RUTE).set('Sec-Fetch-Site', situs);
      expect(res.status).toBe(404);
    },
  );

  it('POST tanpa Origin dan tanpa Sec-Fetch-Site lolos (curl, antarserver)', async () => {
    const res = await http().post(RUTE);
    expect(res.status).toBe(404);
  });
});
