import * as net from 'node:net';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { SessionService } from '../src/modules/auth/session/session.service';
import { signAttachmentPath } from '../src/modules/complaints/attachment-url.util';

/**
 * BUG-070 dan BUG-071: API di atas Redis yang hang.
 *
 * `REDIS_URL` menunjuk peladen TCP yang menerima sambungan lalu tak pernah
 * menjawab, keadaan yang sama dengan `docker pause` pada kontainer Redis. Empat
 * koneksi Redis aplikasi masing-masing punya satu rute yang tertahan olehnya:
 *
 * | Koneksi            | Rute yang membuktikan pemasangannya |
 * | ------------------ | ----------------------------------- |
 * | Penghitung laju    | `/health`                           |
 * | Singgahan          | `/statistics`                       |
 * | Daftar sesi        | `/auth/me`                          |
 * | Pencabutan tautan  | `/uploads/*`                        |
 *
 * NODE_ENV dipaksa `development` seperti `session-auth.e2e-spec.ts`, karena
 * StubAuthProvider yang dipakai saat `test` tak pernah bertanya ke Redis.
 */
describe('API di atas Redis yang hang (e2e)', () => {
  /** Di atas batas ini kliennya menyerah, supaya kegagalan tak menunggu 30 detik. */
  const BATAS_KLIEN_MS = 8_000;
  const originalEnv = { ...process.env };
  const soket = new Set<net.Socket>();
  let peladen: net.Server;
  let app: INestApplication;

  const lama = (mulai: number) => Date.now() - mulai;

  beforeAll(async () => {
    peladen = net.createServer((s) => {
      soket.add(s);
      s.on('error', () => undefined);
    });
    await new Promise<void>((siap) => peladen.listen(0, '127.0.0.1', siap));

    process.env.NODE_ENV = 'development';
    process.env.REDIS_URL = `redis://127.0.0.1:${(peladen.address() as net.AddressInfo).port}`;

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  }, 60_000);

  afterAll(async () => {
    process.env = originalEnv;
    soket.forEach((s) => s.destroy());
    await new Promise((selesai) => peladen.close(selesai));
  }, 30_000);

  it('/health tetap menjawab', async () => {
    const mulai = Date.now();
    const res = await request(app.getHttpServer()).get('/api/v1/health').timeout(BATAS_KLIEN_MS);

    expect(res.status).toBe(200);
    expect(lama(mulai)).toBeLessThan(3_000);
  });

  it('/statistics dijawab dari basis data, singgahan dilewati', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/statistics')
      .timeout(BATAS_KLIEN_MS);

    expect(res.status).toBe(200);
  });

  it('sesi sah dijawab 503, bukan 401, supaya frontend tidak membuang sesinya', async () => {
    const token = app.get(SessionService).issue(1);

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${token}`)
      .timeout(BATAS_KLIEN_MS);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('PENYIMPAN_SESI_TAK_MENJAWAB');
  });

  it('tautan lampiran sah dijawab 503, tanpa mengaku tautannya dicabut', async () => {
    const config = app.get(ConfigService);
    const tautan = signAttachmentPath(
      '/uploads/complaints/tak-perlu-ada.png',
      config.get<string>('session.jwtSecret') ?? '',
      config.get<number>('upload.signedUrlTtlSeconds') ?? 3600,
      1,
    );

    const res = await request(app.getHttpServer()).get(tautan).timeout(BATAS_KLIEN_MS);

    expect(res.status).toBe(503);
    expect(String(res.body.message)).not.toMatch(/dicabut/i);
  });

  it('aplikasi dapat ditutup walau QUIT tak terjawab', async () => {
    await expect(app.close()).resolves.toBeUndefined();
  }, 20_000);
});
