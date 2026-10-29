import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { devHeaders } from './helpers/auth.helper';

/**
 * QA-SECURITY-UAT #8: batas laju yang belum dibuktikan memukul 429 di angkanya.
 *
 * Sudah diuji di tempat lain dan tidak diulang: dev-login 30/menit, SSO login
 * dan callback 60/menit, ember per endpoint, IP lain tetap dilayani
 * (`auth-throttle`), penghitung per pengguna lawan per IP
 * (`throttle-per-pengguna`), penghitung per survei (`throttle-per-survei`),
 * dan batas harian pengaduan (`pengaduan-batas-harian`).
 *
 * Yang belum: tiga angka lain yang tak pernah diasersikan 429-nya -- isi survei
 * publik 20/menit, kirim jawaban responden 10/menit, batas global 100/menit --
 * dan apakah `X-Forwarded-For` yang dikarang klien dapat dipakai menghindari
 * penghitung per IP. Yang terakhir itulah serangan sungguhan terhadap batas
 * per IP: nginx MENAMBAHKAN alamat klien di ujung kanan header itu
 * (`$proxy_add_x_forwarded_for`), dan `trust proxy` = 1 hop membuat Express
 * hanya mempercayai entri paling kanan. Bila hop-nya disetel `true`, entri
 * paling kiri -- karangan klien -- yang dipakai.
 *
 * IP dan id pengguna diacak per jalan. Penghitungnya tinggal di Redis bila
 * `REDIS_URL` terisi, jadi menjalankan berkas ini dua kali dalam satu menit
 * dengan alamat yang sama akan memukul 429 lebih awal.
 */
describe('Batas laju yang belum terbukti (e2e)', () => {
  let app: INestApplication;
  const originalEnv = { ...process.env };
  const acak = () => Math.floor(Math.random() * 250) + 2;
  const ipAcak = () => `198.51.${acak()}.${acak()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    // Permintaan di bawah sengaja ditolak (404/400) puluhan kali.
    app = moduleFixture.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
    process.env = originalEnv;
  }, 30000);

  const http = () => request(app.getHttpServer());

  /** Kirim `batas` permintaan, lalu satu lagi; kembalikan status semuanya. */
  async function rentet(kirim: () => request.Test, batas: number): Promise<number[]> {
    const status: number[] = [];
    for (let i = 0; i <= batas; i++) status.push((await kirim()).status);
    return status;
  }

  it('GET /public/surveys/:id/fill: 20 dilayani, ke-21 ditolak 429', async () => {
    const ip = ipAcak();
    const status = await rentet(
      () => http().get('/api/v1/public/surveys/999999/fill').set('X-Forwarded-For', ip),
      20,
    );
    expect(status.slice(0, 20)).not.toContain(429);
    expect(status[20]).toBe(429);
  });

  it('POST /public/surveys/:id/responses: 20 dilayani, ke-21 ditolak 429', async () => {
    const ip = ipAcak();
    const status = await rentet(
      () =>
        http().post('/api/v1/public/surveys/999999/responses').set('X-Forwarded-For', ip).send({}),
      20,
    );
    expect(status.slice(0, 20)).not.toContain(429);
    expect(status[20]).toBe(429);
  });

  it('POST /surveys/:id/responses (responden): 10 dilayani, ke-11 ditolak 429', async () => {
    const pengguna = devHeaders({ role: Role.responden, userId: 900000 + acak() * 1000 + acak() });
    const status = await rentet(
      () => http().post('/api/v1/surveys/999999/responses').set(pengguna).send({}),
      10,
    );
    expect(status.slice(0, 10)).not.toContain(429);
    expect(status[10]).toBe(429);
  });

  it('batas global: 100 dilayani, ke-101 ditolak 429 (GET /opd)', async () => {
    const pengguna = devHeaders({ role: Role.kabupaten, userId: 800000 + acak() * 1000 + acak() });
    const status = await rentet(() => http().get('/api/v1/opd?limit=1').set(pengguna), 100);
    expect(status.slice(0, 100)).not.toContain(429);
    expect(status[100]).toBe(429);
  });

  it('X-Forwarded-For karangan klien di sebelah kiri tidak membuka ember baru', async () => {
    // Bentuk yang tiba di aplikasi bila klien mengirim `X-Forwarded-For: <acak>`
    // lewat nginx: `<acak>, <IP klien sungguhan>`.
    const klien = ipAcak();
    const status = await rentet(
      () =>
        http()
          .get('/api/v1/public/surveys/999999/fill')
          .set('X-Forwarded-For', `${ipAcak()}, ${klien}`),
      20,
    );
    expect(status.slice(0, 20)).not.toContain(429);
    expect(status[20]).toBe(429);
  });

  it('429 menyebut kapan boleh mencoba lagi (Retry-After)', async () => {
    const ip = ipAcak();
    const kirim = () => http().get('/api/v1/public/surveys/999999/fill').set('X-Forwarded-For', ip);
    for (let i = 0; i < 20; i++) await kirim();
    const res = await kirim();
    expect(res.status).toBe(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });
});
