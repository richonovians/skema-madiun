import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

/**
 * Batas laju endpoint autentikasi, DAN identitas IP klien di belakang reverse
 * proxy (2026-08-28). Keduanya diuji di satu berkas karena satu tak berguna
 * tanpa yang lain: batas per-IP yang mengira SELURUH pengguna berasal dari satu
 * IP (yaitu IP nginx) bukan batas per-IP sama sekali — ia satu ember bersama
 * yang menjatuhkan 429 kepada orang yang tak melakukan apa-apa.
 *
 * Itulah keadaan sebelum berkas ini ada. Buktinya diambil lewat proxy sungguhan:
 * empat permintaan dari dua `X-Forwarded-For` berbeda menghasilkan sisa kuota
 * 99, 98, 97, 96 — turun berurutan, jadi satu ember.
 *
 * KENAPA PENGUJIANNYA DI SINI, BUKAN LEWAT nginx: setelah `trust proxy`
 * dinyalakan, `X-Forwarded-For` yang dikarang klien TIDAK LAGI dipercaya —
 * nginx MENAMBAHKAN IP asli di ujung kanan (`$proxy_add_x_forwarded_for`), dan
 * `trust proxy = 1` membaca ujung kanan itu. Jadi memalsukan XFF lewat nginx
 * tetap menghasilkan satu ember, dan itu justru sifat yang kita inginkan.
 * Satu-satunya tempat yang dapat membedakan dua klien adalah di depan aplikasi
 * langsung, tanpa nginx — persis posisi supertest di bawah.
 */

/**
 * Angka-angka ini adalah PERILAKU yang diuji, bukan detail penyetelan; ia
 * disalin dari dekorator `@Throttle` di AuthController. Bila kelak diubah di
 * sana, berkas ini memang harus ikut berubah. Keduanya lebih ketat daripada
 * batas global 100/menit (THROTTLE_LIMIT), dan alasan angkanya ada di
 * AuthController.
 */
const DEV_LOGIN_LIMIT = 30;
const SSO_LIMIT = 60;

describe('Batas laju autentikasi & IP klien di belakang proxy (e2e)', () => {
  let app: INestApplication;
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    // Dikosongkan supaya GET /auth/sso/login & /auth/sso/callback berhenti di
    // `assertConfigured()` (503) SEBELUM menyentuh jaringan. Yang diuji di sini
    // batas lajunya, dan ThrottlerGuard menghitung permintaan sebelum handler
    // berjalan — jadi 503 pun tetap memakai kuota. Tanpa ini, berkas ini akan
    // menghubungi Helpdesk sungguhan begitu `.env` terisi kredensial.
    //
    // Diisi string kosong, bukan `delete`: dotenv (ConfigModule) TIDAK menimpa
    // nilai yang sudah ada di process.env, sedangkan kunci yang dihapus akan
    // diisinya kembali dari `.env`.
    process.env.HELPDESK_SSO_CLIENT_ID = '';
    process.env.HELPDESK_SSO_CLIENT_SECRET = '';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // `logger: false`: berkas ini sengaja mengirim >120 permintaan yang memang
    // ditolak (503/404/302), dan masing-masing dicatat sebagai ERROR oleh Nest.
    // Tanpa ini keluaran tesnya tenggelam di ratusan baris galat yang justru
    // diharapkan, sehingga galat yang SUNGGUHAN tak lagi terlihat.
    app = moduleFixture.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env = originalEnv;
  });

  /**
   * `identifier` yang pasti tak ada → 404 tanpa menulis apa pun ke basis data
   * (lihat AuthService.devLogin: penolakan terjadi sebelum `user.update` dan
   * sebelum baris audit). Penting karena berkas ini mengirim puluhan
   * permintaan; memakai akun sungguhan berarti puluhan baris audit yang lalu
   * mengunci penghapusan penggunanya (audit_logs.actor_id ber-RESTRICT).
   */
  const devLogin = (ip: string) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/dev-login')
      .set('X-Forwarded-For', ip)
      .send({ identifier: 'tak-ada@throttle.test' });

  const ssoLogin = (ip: string) =>
    request(app.getHttpServer()).get('/api/v1/auth/sso/login').set('X-Forwarded-For', ip);

  const ssoCallback = (ip: string) =>
    request(app.getHttpServer())
      .get('/api/v1/auth/sso/callback')
      .query({ code: 'kode-palsu', state: 'state-palsu' })
      .set('X-Forwarded-For', ip);

  /** Habiskan kuota satu endpoint dari satu IP; mengembalikan status terakhir. */
  async function habiskan(
    kirim: (ip: string) => request.Test,
    ip: string,
    batas: number,
  ): Promise<number[]> {
    const statuses: number[] = [];
    for (let i = 0; i < batas; i++) {
      statuses.push((await kirim(ip)).status);
    }
    return statuses;
  }

  describe('POST /auth/dev-login', () => {
    it(`melayani ${DEV_LOGIN_LIMIT} permintaan lalu menolak 429`, async () => {
      const ip = '203.0.113.11';
      const statuses = await habiskan(devLogin, ip, DEV_LOGIN_LIMIT);

      expect(statuses).not.toContain(429);
      expect((await devLogin(ip)).status).toBe(429);
    });
  });

  describe('GET /auth/sso/login', () => {
    it(`melayani ${SSO_LIMIT} permintaan lalu menolak 429`, async () => {
      const ip = '203.0.113.21';
      const statuses = await habiskan(ssoLogin, ip, SSO_LIMIT);

      expect(statuses).not.toContain(429);
      expect((await ssoLogin(ip)).status).toBe(429);
    });
  });

  describe('GET /auth/sso/callback', () => {
    it(`melayani ${SSO_LIMIT} permintaan lalu menolak 429`, async () => {
      const ip = '203.0.113.31';
      const statuses = await habiskan(ssoCallback, ip, SSO_LIMIT);

      expect(statuses).not.toContain(429);
      expect((await ssoCallback(ip)).status).toBe(429);
    });
  });

  describe('kuota dihitung per IP KLIEN, bukan per IP proxy', () => {
    it('IP lain tetap dilayani setelah satu IP kehabisan kuota', async () => {
      const habis = '203.0.113.41';
      const lain = '203.0.113.42';

      await habiskan(devLogin, habis, DEV_LOGIN_LIMIT);
      expect((await devLogin(habis)).status).toBe(429);

      // INI inti perbaikannya. Tanpa `trust proxy`, `req.ip` bernilai IP soket
      // (yaitu IP nginx di produksi) untuk SEMUA orang, sehingga permintaan di
      // bawah ini ikut memakai ember yang sudah habis dan balasannya 429 —
      // padahal klien ini belum pernah mengirim apa pun.
      expect((await devLogin(lain)).status).not.toBe(429);
    });

    it('ember tiap endpoint terpisah: kuota sso/login tak terpakai oleh dev-login', async () => {
      const ip = '203.0.113.51';

      await habiskan(devLogin, ip, DEV_LOGIN_LIMIT);
      expect((await devLogin(ip)).status).toBe(429);

      // Endpoint berbeda, ember berbeda (kunci ThrottlerGuard memuat nama
      // handler). Diuji supaya batas ketat pada satu endpoint tak pernah
      // diam-diam mengunci seluruh jalur masuk.
      expect((await ssoLogin(ip)).status).not.toBe(429);
    });
  });
});
