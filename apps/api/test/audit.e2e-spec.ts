import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('Audit Log (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let opdUserId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EAUD' },
      update: {},
      create: { kode: 'E2EAUD', nama: 'OPD E2E Audit', isActive: true },
    });
    opdId = opd.id;

    const opdUser = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-audit-opd' },
      update: {},
      create: {
        ssoSubject: 'e2e-audit-opd',
        nama: 'Admin OPD Audit',
        email: 'e2e-audit-opd@example.go.id',
        role: Role.opd,
        opdId,
      },
    });
    opdUserId = opdUser.id;
  }, 60000);

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorId: opdUserId } });
    await prisma.survey.deleteMany({ where: { opdId } });
    await prisma.user.deleteMany({ where: { ssoSubject: 'e2e-audit-opd' } });
    await prisma.opd.deleteMany({ where: { kode: 'E2EAUD' } });
    await app.close();
  }, 30000);

  const opdHeaders = () => devHeaders({ role: Role.opd, opdId, userId: opdUserId });
  const kabupatenHeaders = () => devHeaders({ role: Role.kabupaten });

  it('POST /surveys (aksi tercatat) -> GET /audit-logs (Kabupaten) menampilkannya', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({ judul: 'Survei Audit E2E', periode: '2026' });
    expect(created.status).toBe(201);

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ entitas: 'survey' })
      .set(kabupatenHeaders());

    expect(res.status).toBe(200);
    const entry = (
      res.body.data as {
        actorId: number;
        actorNama: string;
        aksi: string;
        entitas: string;
        detail: { body?: { judul?: string } };
      }[]
    ).find((e) => e.detail?.body?.judul === 'Survei Audit E2E');

    expect(entry).toBeDefined();
    expect(entry?.aksi).toBe('create');
    expect(entry?.actorId).toBe(opdUserId);
    expect(entry?.actorNama).toBe('Admin OPD Audit');
  });

  it('PATCH status memakai aksi eksplisit "update_status" (bukan default "update")', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({ judul: 'Survei Status Audit', periode: '2026' });
    const id = created.body.data.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${id}/status`)
      .set(opdHeaders())
      .send({ status: 'aktif' });

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ entitas: 'survey' })
      .set(kabupatenHeaders());

    const entry = (res.body.data as { aksi: string; detail: { params?: { id?: string } } }[]).find(
      (e) => e.aksi === 'update_status' && String(e.detail?.params?.id) === String(id),
    );
    expect(entry).toBeDefined();
  });

  it('DELETE survei tercatat dengan aksi "delete" (disimpulkan dari HTTP method)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({ judul: 'Survei Hapus Audit', periode: '2026' });
    const id = created.body.data.id;

    await request(app.getHttpServer()).delete(`/api/v1/surveys/${id}`).set(opdHeaders());

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ entitas: 'survey', actorId: opdUserId })
      .set(kabupatenHeaders());

    const entry = (res.body.data as { aksi: string; detail: { params?: { id?: string } } }[]).find(
      (e) => e.aksi === 'delete' && String(e.detail?.params?.id) === String(id),
    );
    expect(entry).toBeDefined();
  });

  it('GET /audit-logs (Admin OPD) -> 403 (hanya Kabupaten)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/audit-logs').set(opdHeaders());
    expect(res.status).toBe(403);
  });

  it('GET /audit-logs (Responden) -> 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set(devHeaders({ role: Role.responden, userId: 1 }));
    expect(res.status).toBe(403);
  });

  it('filter actorId membatasi hasil ke satu pelaku', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ actorId: opdUserId })
      .set(kabupatenHeaders());

    expect(res.status).toBe(200);
    expect((res.body.data as { actorId: number }[]).every((e) => e.actorId === opdUserId)).toBe(
      true,
    );
  });

  it('aksi non-mutasi (GET) TIDAK tercatat ke audit log', async () => {
    await request(app.getHttpServer()).get('/api/v1/surveys').set(opdHeaders());

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ actorId: opdUserId })
      .set(kabupatenHeaders());

    const hasGetEntry = (res.body.data as { aksi: string }[]).some((e) => e.aksi === 'get');
    expect(hasGetEntry).toBe(false);
  });

  it('GET /audit-logs/:id (Kabupaten) mengembalikan satu entri sesuai id', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({ judul: 'Survei Detail Audit', periode: '2026' });

    const list = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ entitas: 'survey', actorId: opdUserId })
      .set(kabupatenHeaders());
    const entry = (list.body.data as { id: number; detail: { body?: { judul?: string } } }[]).find(
      (e) => e.detail?.body?.judul === 'Survei Detail Audit',
    );
    expect(entry).toBeDefined();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/audit-logs/${entry?.id}`)
      .set(kabupatenHeaders());

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(entry?.id);
    expect(res.body.data.actorNama).toBe('Admin OPD Audit');
  });

  it('GET /audit-logs/:id tidak ditemukan -> 404', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs/999999999')
      .set(kabupatenHeaders());
    expect(res.status).toBe(404);
  });

  it('GET /audit-logs/:id (Admin OPD) -> 403 (hanya Kabupaten)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/audit-logs/1').set(opdHeaders());
    expect(res.status).toBe(403);
  });
});
