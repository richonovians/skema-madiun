import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { devHeaders } from './helpers/auth.helper';

/**
 * Kunci penghitung batas laju: id pengguna bila sesinya ada, IP bila tidak
 * (14 September 2026).
 *
 * SEBELUMNYA seluruhnya per IP. Dua akibatnya berlawanan arah, dan keduanya
 * buruk:
 *
 * - satu akun yang berganti-ganti jaringan (data seluler, proxy) mendapat
 *   penghitung baru tiap ganti IP, sehingga batas apa pun tak pernah tersentuh;
 * - sebaliknya, seluruh pengunjung satu WiFi loket berbagi satu penghitung,
 *   sehingga orang yang tak melakukan apa-apa ikut kena 429.
 *
 * KETERGANTUNGAN YANG DIUJI DI SINI: `req.user` ditempelkan oleh RolesGuard,
 * sedangkan yang membacanya ThrottlerGuard -- keduanya guard global dari modul
 * berbeda. Bila urutannya terbalik, `req.user` masih kosong saat penghitungnya
 * dipilih dan seluruh perubahan ini tak berefek apa pun TANPA satu pun galat.
 * Berkas ini memerah persis pada keadaan itu.
 *
 * Diuji lewat sisa kuota (`X-RateLimit-Remaining`), bukan dengan menghabiskan
 * 100 permintaan: yang dipersoalkan adalah KUNCI embernya, bukan besarnya.
 */
describe('Kunci batas laju per pengguna (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * `GET /auth/me` dipilih karena murah dan berpenjaga sesi, tanpa efek samping
   * apa pun -- berkas ini tak boleh meninggalkan baris di basis data.
   * StubAuthProvider membentuk penggunanya dari header `x-dev-*`, jadi tak ada
   * akun yang perlu dibuat.
   */
  const panggil = async (userId: number, ip: string) => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set(devHeaders({ role: Role.responden, userId }))
      .set('X-Forwarded-For', ip);
    return { status: res.status, sisa: Number(res.headers['x-ratelimit-remaining']) };
  };

  it('dua akun dari SATU IP tidak berbagi penghitung', async () => {
    const ip = '203.0.113.71';

    const pertama = await panggil(9001, ip);
    const kedua = await panggil(9001, ip);
    // Prasyarat: penghitungnya memang berjalan untuk akun yang sama.
    expect(kedua.sisa).toBe(pertama.sisa - 1);

    const akunLain = await panggil(9002, ip);

    expect(akunLain.sisa).toBe(pertama.sisa);
  });

  it('satu akun dari DUA IP tetap berbagi penghitung', async () => {
    const pertama = await panggil(9003, '203.0.113.81');
    const kedua = await panggil(9003, '203.0.113.82');

    expect(kedua.sisa).toBe(pertama.sisa - 1);
  });

  /**
   * Kendali. Jalur tanpa sesi TIDAK punya `req.user`, dan harus tetap dihitung
   * per IP -- kalau tidak, seluruh pengirim anonim jatuh ke satu ember bersama
   * dan batas publiknya berubah menjadi batas global.
   */
  it('tanpa sesi tetap dihitung per IP', async () => {
    const kirim = (ip: string) =>
      request(app.getHttpServer())
        .post('/api/v1/auth/dev-login')
        .set('X-Forwarded-For', ip)
        .send({ identifier: 'tak-ada@throttle.test' });

    const pertama = await kirim('203.0.113.91');
    const ipLain = await kirim('203.0.113.92');

    expect(Number(ipLain.headers['x-ratelimit-remaining'])).toBe(
      Number(pertama.headers['x-ratelimit-remaining']),
    );
  });
});
