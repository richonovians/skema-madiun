import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('OPD (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    const opd = await prisma.opd.upsert({
      where: { kode: 'E2ETEST' },
      update: { externalId: 'E2E-1', nama: 'OPD E2E Test', isActive: true },
      create: { externalId: 'E2E-1', kode: 'E2ETEST', nama: 'OPD E2E Test', isActive: true },
    });
    opdId = opd.id;
  }, 60000);

  afterAll(async () => {
    await prisma.opd.deleteMany({ where: { kode: 'E2ETEST' } });
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

  it('GET /opd (opd) -> 403 (list hanya Kabupaten)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/opd')
      .set(devHeaders({ role: Role.opd, opdId }));

    expect(res.status).toBe(403);
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
  });

  it('OPD hasil sync memiliki externalId & syncedAt', async () => {
    const dinkes = await prisma.opd.findUnique({ where: { kode: 'DINKES' } });

    expect(dinkes?.externalId).toBe('HD-001');
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
});
