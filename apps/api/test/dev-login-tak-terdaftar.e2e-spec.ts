import type { INestApplication } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { nyalakanDenganEnv } from './helpers/aplikasi-ber-env.helper';

/**
 * BUG-066 (16 November 2026, charter TC-AUTH-010): `POST /auth/dev-login` yang
 * dimatikan harus TAK DAPAT DIBEDAKAN dari rute yang tak pernah ada.
 *
 * Sebelumnya rutenya tetap terdaftar dan ditolak penjaga dengan 404. Kodenya
 * benar, tetapi tiga hal lain membocorkan keberadaannya, semuanya karena
 * penjaga global `ThrottlePenggunaGuard` berjalan lebih dulu daripada penjaga
 * tingkat rute: pesan "Not Found" alih-alih "Cannot POST <jalur>", header
 * `X-RateLimit-Limit: 30`, dan 429 sesudah permintaan ke-30. Rute yang tak
 * terdaftar tak pernah melewati penjaga mana pun.
 *
 * Yang dibandingkan adalah respons rute karangan di aplikasi yang SAMA, bukan
 * teks yang ditulis tangan di sini: uji ini menuntut kesamaan, apa pun bunyi
 * bawaan Express kelak.
 *
 * Dua keadaan mati diuji. Produksi adalah keadaan yang dilaporkan; saklar
 * `DEV_LOGIN_ENABLED` yang mati di pengembangan (7 November 2026) memakai
 * penolakan yang sama dan bocor dengan cara yang sama.
 *
 * Tak menyentuh basis data: rute yang tak terdaftar tak pernah sampai ke
 * layanan, dan kontrolnya memakai pengenal yang tak ada.
 */
describe('dev-login yang mati tak dapat dibedakan dari rute karangan (e2e, BUG-066)', () => {
  // Salinan UTUH, bukan dua kunci: kasus produksi ikut menyetel
  // `TURNSTILE_SECRET_KEY`, dan nilai yang tertinggal akan mengubah perilaku
  // berkas berikutnya di proses Jest yang sama.
  const envAsli = { ...process.env };
  const PENGENAL = 'tak-ada-di-mana-pun@e2e.test';
  // Satu di atas batas `DEV_LOGIN_PER_MINUTE` (30): rute yang diam-diam masih
  // dihitung penjaga batas laju menjawab 429 pada permintaan ini.
  const MELAMPAUI_BATAS = 31;

  let app: INestApplication | undefined;
  // IP klien SENDIRI untuk tiap kasus. Penghitung batas laju dapat tinggal di
  // Redis dan bertahan antaraplikasi; tanpa ini kuota yang dihabiskan kasus
  // pertama membuat kasus berikutnya menjawab 429 karena warisan, bukan
  // karena keadaannya sendiri (terukur pada jalan merah pertama). IPv6
  // dokumentasi (2001:db8::/32) supaya jalan ulang dalam semenit hampir pasti
  // mendapat alamat lain; 254 alamat IPv4 terlalu mudah bertabrakan.
  let ip = '';

  beforeEach(() => {
    ip = `2001:db8::${randomBytes(6).toString('hex').match(/.{4}/g)!.join(':')}`;
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
    process.env = { ...envAsli };
  });

  const kirim = (jalur: string) =>
    request(app!.getHttpServer())
      .post(`/api/v1/auth/${jalur}`)
      .set('X-Forwarded-For', ip)
      .send({ identifier: PENGENAL });

  it.each([
    [
      'produksi',
      {
        NODE_ENV: 'production',
        DEV_LOGIN_ENABLED: 'false',
        // `TurnstileService` menolak menyala di produksi tanpa rahasia. Di
        // mesin pengembang `.env` kebetulan mengisinya, di CI tidak -- dan
        // jalan CI pertama memerah karena itu (16 November 2026). Nilainya
        // tak pernah dipakai: tak satu pun permintaan di sini menyentuh
        // captcha.
        TURNSTILE_SECRET_KEY: 'rahasia-uji-tak-pernah-dipakai',
      },
    ],
    ['pengembangan, saklar mati', { NODE_ENV: 'development', DEV_LOGIN_ENABLED: 'false' }],
  ])(
    '%s: status, pesan, header batas laju, dan 429 sama dengan rute karangan',
    async (_keadaan, env) => {
      app = await nyalakanDenganEnv(env);

      // Ketiga pembeda dikumpulkan lalu dibandingkan sekaligus, supaya satu
      // jalan merah menampilkan semuanya, bukan berhenti di yang pertama.
      const sidikJari = async (jalur: string) => {
        const pertama = await kirim(jalur);
        const sisanya: number[] = [];
        for (let i = 1; i < MELAMPAUI_BATAS; i++) sisanya.push((await kirim(jalur)).status);
        return {
          status: pertama.status,
          pesan: String(pertama.body.message).replace(jalur, '<jalur>'),
          headerBatasLaju: pertama.headers['x-ratelimit-limit'] ?? null,
          statusSelain404: sisanya.filter((s) => s !== 404),
        };
      };

      const karangan = await sidikJari('rute-karangan');
      expect(karangan).toEqual({
        status: 404,
        pesan: 'Cannot POST /api/v1/auth/<jalur>',
        headerBatasLaju: null,
        statusSelain404: [],
      });
      expect(await sidikJari('dev-login')).toEqual(karangan);
    },
    60000,
  );

  it('KONTROL: saklar "true" di pengembangan -> rute terdaftar dan berjalan', async () => {
    app = await nyalakanDenganEnv({ NODE_ENV: 'development', DEV_LOGIN_ENABLED: 'true' });

    const res = await kirim('dev-login');

    // Sampai ke pencarian pengguna, dan dihitung penjaga batas laju.
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).toMatch(/pengguna/i);
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
  }, 30000);
});
