import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { nyalakanDenganEnv } from './helpers/aplikasi-ber-env.helper';

/**
 * `dev-login` hanya hidup bila DINYALAKAN TERSURAT (7 November 2026, audit
 * `auth.non-production-guard.unset-node-env-opens-dev-login`).
 *
 * Sebelum ini satu-satunya penjaganya `NonProductionGuard`, yang menutup rute
 * hanya bila `NODE_ENV` persis `production`. `NODE_ENV` yang kosong jatuh ke
 * `development`, dan tak satu pun artefak repo menyetel `production` untuk API,
 * sehingga penggelaran yang lupa menyetelnya membuka login tanpa kata sandi
 * bagi akun mana pun. Saklarnya kini `DEV_LOGIN_ENABLED=true`; kosong atau
 * nilai lain berarti 404.
 *
 * Nilainya DISETEL `'false'`, bukan dihapus: `ConfigModule` memuat `.env`
 * pengembang ke `process.env` tanpa menimpa nilai yang sudah ada, jadi
 * menghapusnya hanya membuat `.env` mengisinya kembali.
 *
 * Tak menyentuh basis data: pengenal yang dikirim sengaja tak ada, sehingga
 * saklar hidup menjawab 404 "pengguna tidak ditemukan" dan saklar mati menjawab
 * 404 tanpa pesan. Yang membedakan keduanya pesannya, bukan kodenya.
 *
 * Sejak 16 November 2026 (BUG-066) saklar mati berarti rutenya TIDAK
 * DIDAFTARKAN, dan keputusan itu diambil saat `AppModule` dimuat. Karena itu
 * aplikasinya dinyalakan lewat `nyalakanDenganEnv`, yang memuat ulang modulnya;
 * dengan `AppModule` yang di-import sekali di kepala berkas, kasus "mati" di
 * bawah tetap hijau tetapi hanya membuktikan lapis penjaga keduanya.
 * Kesamaan penuh dengan rute karangan diuji di dev-login-tak-terdaftar.
 */
describe('dev-login: saklar DEV_LOGIN_ENABLED (e2e)', () => {
  const envAsli = { NODE_ENV: process.env.NODE_ENV, SAKLAR: process.env.DEV_LOGIN_ENABLED };
  const PENGENAL = 'tak-ada-di-mana-pun@e2e.test';

  const nyalakan = (saklar: string): Promise<INestApplication> =>
    nyalakanDenganEnv({ NODE_ENV: 'development', DEV_LOGIN_ENABLED: saklar });

  afterEach(() => {
    process.env.NODE_ENV = envAsli.NODE_ENV;
    if (envAsli.SAKLAR === undefined) delete process.env.DEV_LOGIN_ENABLED;
    else process.env.DEV_LOGIN_ENABLED = envAsli.SAKLAR;
  });

  it.each(['false', '', '1', 'TRUE'])(
    'saklar "%s" di pengembangan -> rute tertutup (404 tanpa pesan pengguna)',
    async (saklar) => {
      const app = await nyalakan(saklar);
      try {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/dev-login')
          .send({ identifier: PENGENAL });

        expect(res.status).toBe(404);
        expect(JSON.stringify(res.body)).not.toMatch(/pengguna/i);
      } finally {
        await app.close();
      }
    },
    30000,
  );

  it('KONTROL: saklar "true" di pengembangan -> rute terbuka', async () => {
    const app = await nyalakan('true');
    try {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/dev-login')
        .send({ identifier: PENGENAL });

      // Rutenya berjalan sampai pencarian pengguna -- itu buktinya terbuka.
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).toMatch(/pengguna/i);
    } finally {
      await app.close();
    }
  }, 30000);
});
