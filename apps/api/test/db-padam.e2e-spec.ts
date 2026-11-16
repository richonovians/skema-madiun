import * as net from 'node:net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

/**
 * BUG-072: `GET /health` menjawab 200 selama basis data mati.
 *
 * Basis data uji tidak dimatikan; yang dimatikan sebuah proksi TCP di dalam
 * proses ini, yang berdiri di antara API dan Postgres. Aplikasinya harus
 * menyala lebih dulu -- `PrismaService` menolak boot tanpa basis data -- jadi
 * proksinya meneruskan dulu, lalu:
 *
 *  1. MACET: sambungan tetap terbuka tetapi tak ada byte yang diteruskan,
 *     seperti `docker pause`. Kueri tidak melempar, ia menunggu.
 *  2. MATI: seluruh sambungan diputus dan porta ditutup. Kueri ditolak.
 *
 * Keduanya menempuh jalur berbeda di `KesiapanService`: batas waktu dan
 * penolakan. `/health` harus tetap 200 di keduanya -- penyelia tak boleh
 * merestart API hanya karena basis data padam.
 */
describe('API di atas basis data yang padam (e2e)', () => {
  const BATAS_KLIEN_MS = 8_000;
  const urlAsli = process.env.DATABASE_URL ?? '';
  const sambungan = new Set<net.Socket>();
  let macet = false;
  let proksi: net.Server;
  let app: INestApplication;

  const lama = (mulai: number) => Date.now() - mulai;
  const siap = () =>
    request(app.getHttpServer()).get('/api/v1/health/siap').timeout(BATAS_KLIEN_MS);

  beforeAll(async () => {
    const tujuan = new URL(urlAsli);
    proksi = net.createServer((klien) => {
      const peladen = net.connect(Number(tujuan.port || 5432), tujuan.hostname);
      for (const s of [klien, peladen]) {
        sambungan.add(s);
        s.on('error', () => undefined);
        s.on('close', () => sambungan.delete(s));
      }
      klien.on('data', (b) => macet || peladen.write(b));
      peladen.on('data', (b) => macet || klien.write(b));
      klien.on('close', () => peladen.destroy());
      peladen.on('close', () => klien.destroy());
    });
    await new Promise<void>((selesai) => proksi.listen(0, '127.0.0.1', selesai));

    const lewatProksi = new URL(urlAsli);
    lewatProksi.hostname = '127.0.0.1';
    lewatProksi.port = String((proksi.address() as net.AddressInfo).port);
    process.env.DATABASE_URL = lewatProksi.toString();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  }, 60_000);

  afterAll(async () => {
    process.env.DATABASE_URL = urlAsli;
    sambungan.forEach((s) => s.destroy());
    await new Promise((selesai) => proksi.close(selesai));
    await app.close().catch(() => undefined);
  }, 30_000);

  it('prasyarat: lewat proksi yang meneruskan, API siap', async () => {
    const res = await siap();

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ status: 'siap', db: 'ok', redis: 'ok' });
  });

  describe('basis data MACET', () => {
    beforeAll(() => {
      macet = true;
    });

    it('/health/siap menjawab 503 dan menyebut basis data, tidak menunggu kolam koneksi', async () => {
      const mulai = Date.now();
      const res = await siap();

      expect(res.status).toBe(503);
      expect(res.body.error).toEqual({ code: 'TIDAK_SIAP', details: { db: 'gagal', redis: 'ok' } });
      expect(lama(mulai)).toBeLessThan(5_000);
    });

    it('/health tetap 200', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health').timeout(BATAS_KLIEN_MS);

      expect(res.status).toBe(200);
    });
  });

  describe('basis data MATI', () => {
    beforeAll(async () => {
      sambungan.forEach((s) => s.destroy());
      await new Promise((selesai) => proksi.close(selesai));
    });

    it('/health/siap menjawab 503 dan menyebut basis data', async () => {
      const res = await siap();

      expect(res.status).toBe(503);
      expect(res.body.error).toEqual({ code: 'TIDAK_SIAP', details: { db: 'gagal', redis: 'ok' } });
    });

    it('/health tetap 200', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health').timeout(BATAS_KLIEN_MS);

      expect(res.status).toBe(200);
    });
  });
});
