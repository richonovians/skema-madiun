import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { OPD_SOURCE } from '../src/modules/opd/opd.constants';
import { StubOpdSource } from '../src/modules/opd/providers/stub-opd-source';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('OPD (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  // Snapshot externalId OPD yang AKTIF sebelum test ini jalan (2026-08-06,
  // bug ditemukan user: dropdown OPD di frontend "tak sinkron" -- ternyata
  // BUKAN bug frontend sama sekali. `POST /opd/sync` (OPD-4) menonaktifkan
  // SEMUA OPD ber-externalId yang "hilang" dari hasil fetch source SAAT itu.
  // Test ini SENGAJA override ke StubOpdSource (3 fixture determinstik, demi
  // tak bergantung jaringan/kredensial Helpdesk asli di CI) lalu memanggil
  // endpoint sync SUNGGUHAN -- tapi jest-e2e TAK PAKAI DATABASE TERISOLASI
  // (DATABASE_URL sama dgn dev sungguhan), jadi tiap kali suite ini jalan,
  // SEMUA OPD asli hasil sync live Helpdesk (53 entri) ikut dinonaktifkan
  // secara permanen -- baru ketahuan setelah berkali-kali `npx jest
  // --config test/jest-e2e.json` dijalankan sepanjang sesi perbaikan bug
  // lain, korupsi datanya baru terlihat di dropdown OPD form pengaduan/survei.
  // Snapshot+restore di sini murni mencegah efek samping ini terulang --
  // BUKAN mengubah perilaku endpoint /opd/sync itu sendiri (memang seharusnya
  // menonaktifkan OPD yang hilang dari source, itu perilaku benar di produksi).
  let activeExternalIdsBeforeTest: string[] = [];

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Test ini sengaja bergantung pada bentuk fixture StubOpdSource yang deterministik
      // (3 item, kode "DINKES" dkk) -- pin eksplisit, jangan ikut default modul (yang
      // sekarang HelpdeskOpdClient, real & bergantung jaringan/kredensial, sejak INT-HD-1).
      .overrideProvider(OPD_SOURCE)
      .useClass(StubOpdSource)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    activeExternalIdsBeforeTest = (
      await prisma.opd.findMany({
        where: { isActive: true, externalId: { not: null } },
        select: { externalId: true },
      })
    ).map((o) => o.externalId as string);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2ETEST' },
      update: { externalId: 'E2E-1', nama: 'OPD E2E Test', isActive: true },
      create: { externalId: 'E2E-1', kode: 'E2ETEST', nama: 'OPD E2E Test', isActive: true },
    });
    opdId = opd.id;
  }, 60000);

  afterAll(async () => {
    await prisma.opd.deleteMany({ where: { kode: 'E2ETEST' } });
    // Pulihkan OPD asli yang dinonaktifkan stub sync test ini (lihat catatan di atas).
    if (activeExternalIdsBeforeTest.length > 0) {
      await prisma.opd.updateMany({
        where: { externalId: { in: activeExternalIdsBeforeTest } },
        data: { isActive: true },
      });
    }
    await app.close();
  }, 30000);

  it('GET /opd (kabupaten) -> 200, paginated, memuat OPD test', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/opd?search=E2ETEST&limit=10')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(200);
    expect(res.body.meta.pagination).toBeDefined();
    expect(res.body.data.some((o: { kode: string }) => o.kode === 'E2ETEST')).toBe(true);
    expect(res.body.data[0]).toHaveProperty('externalId');
    expect(res.body.data[0]).toHaveProperty('syncedAt');
  });

  it('GET /opd (opd) -> 200 (INT-18: list terbuka semua peran terautentikasi, bukan hanya Kabupaten)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/opd')
      .set(devHeaders({ role: Role.opd, opdId }));

    expect(res.status).toBe(200);
  });

  it('GET /opd (responden) -> 200 (INT-18: dibutuhkan dropdown OPD tujuan saat buat pengaduan)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/opd')
      .set(devHeaders({ role: Role.responden }));

    expect(res.status).toBe(200);
  });

  it('GET /opd/:id (kabupaten) -> 200', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/opd/${opdId}`)
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(200);
    expect(res.body.data.kode).toBe('E2ETEST');
  });

  it('GET /opd/:id (opd sendiri) -> 200', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/opd/${opdId}`)
      .set(devHeaders({ role: Role.opd, opdId }));

    expect(res.status).toBe(200);
  });

  it('GET /opd/:id (opd lain) -> 403', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/opd/${opdId}`)
      .set(devHeaders({ role: Role.opd, opdId: opdId + 999999 }));

    expect(res.status).toBe(403);
  });

  it('GET /opd/:id tidak ada (kabupaten) -> 404', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/opd/99999999')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(404);
  });

  it('POST /opd/sync (kabupaten) -> 200, sinkronisasi 3 fixture', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/opd/sync')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(200);
    expect(res.body.data.fetched).toBe(3);
    expect(res.body.data.created + res.body.data.updated).toBe(3);
    expect(res.body.data.skipped).toBe(0);
    expect(res.body.data).toHaveProperty('deactivated');
  });

  it('OPD hasil sync memiliki externalId & syncedAt', async () => {
    const dinkes = await prisma.opd.findUnique({ where: { kode: 'DINKES' } });

    // Nilai ASLI Helpdesk, bukan lagi penampung `HD-001` (2026-08-28). Berkas
    // ini memakai basis data yang SAMA dengan dev, dan sync mengadopsi baris
    // ber-kode sama -- selama fixture stub memakai penampung, setiap kali suite
    // ini jalan ia menimpa `external_id` OPD sungguhan dan pemetaan peran SSO
    // berhenti mengenali OPD-nya. Lihat catatan panjang di StubOpdSource.
    expect(dinkes?.externalId).toBe('e3152173-1ad7-424c-aed8-2cdf606a25c6');
    expect(dinkes?.syncedAt).not.toBeNull();
  });

  it('POST /opd/sync idempoten -> created 0, updated 3', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/opd/sync')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(0);
    expect(res.body.data.updated).toBe(3);
  });

  it('POST /opd/sync (opd) -> 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/opd/sync')
      .set(devHeaders({ role: Role.opd, opdId }));

    expect(res.status).toBe(403);
  });

  it('OPD-4: OPD tersinkron yang hilang dari source dinonaktifkan, BUKAN dihapus', async () => {
    // E2ETEST (externalId E2E-1) tidak ada di fixture stub → sync menonaktifkannya.
    const row = await prisma.opd.findUnique({ where: { kode: 'E2ETEST' } });

    expect(row).not.toBeNull(); // tidak dihapus → FK surveys/complaints aman
    expect(row?.isActive).toBe(false); // dinonaktifkan
  });
});
