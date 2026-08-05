import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('Surveys (e2e)', () => {
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
      where: { kode: 'E2ESVY' },
      update: {},
      create: { kode: 'E2ESVY', nama: 'OPD E2E Surveys', isActive: true },
    });
    opdId = opd.id;
  }, 60000);

  afterAll(async () => {
    await prisma.survey.deleteMany({ where: { opdId } });
    await prisma.opd.deleteMany({ where: { kode: 'E2ESVY' } });
    await app.close();
  }, 30000);

  const opdHeaders = () => devHeaders({ role: Role.opd, opdId });

  it('POST /surveys (Admin OPD) -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({ judul: 'Survei E2E', periode: '2026-Q1' });

    expect(res.status).toBe(201);
    expect(res.body.data.opdId).toBe(opdId);
    expect(res.body.data.status).toBe('draft');
  });

  // Kabupaten (= superuser, 2026-08-05) melampaui @Roles(Role.opd) via bypass
  // RolesGuard -- bukan lagi read-only, tapi wajib kirim opdId sendiri (tidak
  // seperti Admin OPD yang opdId-nya tersirat dari akun).
  it('POST /surveys (Kabupaten) tanpa opdId -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(devHeaders({ role: Role.kabupaten }))
      .send({ judul: 'X', periode: '2026-Q1' });

    expect(res.status).toBe(400);
  });

  it('POST /surveys (Kabupaten) dengan opdId -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(devHeaders({ role: Role.kabupaten }))
      .send({ judul: 'Survei Kabupaten E2E', periode: '2026-Q1', opdId });

    expect(res.status).toBe(201);
    expect(res.body.data.opdId).toBe(opdId);
  });

  it('GET /surveys (Admin OPD) -> 200 paginated milik OPD', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/surveys').set(opdHeaders());
    expect(res.status).toBe(200);
    expect(res.body.meta.pagination).toBeDefined();
    expect(res.body.data.every((s: { opdId: number }) => s.opdId === opdId)).toBe(true);
  });

  it('GET /surveys/:id Admin OPD lain -> 403', async () => {
    const created = await prisma.survey.create({
      data: { opdId, judul: 'Milik OPD ini', periode: '2026-Q1' },
    });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${created.id}`)
      .set(devHeaders({ role: Role.opd, opdId: opdId + 99999 }));
    expect(res.status).toBe(403);
  });

  it('lifecycle: create → update → status draft→aktif → update ditolak', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({ judul: 'Lifecycle', periode: '2026-Q1' });
    const id = created.body.data.id;

    const upd = await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${id}`)
      .set(opdHeaders())
      .send({ judul: 'Lifecycle updated' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.judul).toBe('Lifecycle updated');

    const pub = await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${id}/status`)
      .set(opdHeaders())
      .send({ status: 'aktif' });
    expect(pub.status).toBe(200);
    expect(pub.body.data.status).toBe('aktif');

    // setelah aktif, update ditolak (bukan draft)
    const updAfter = await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${id}`)
      .set(opdHeaders())
      .send({ judul: 'nope' });
    expect(updAfter.status).toBe(400);
  });

  it('POST /surveys/:id/duplicate -> 201 status draft', async () => {
    const created = await prisma.survey.create({
      data: { opdId, judul: 'Untuk Duplikasi', periode: '2025-Q1' },
    });
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${created.id}/duplicate`)
      .set(opdHeaders());
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.judul).toContain('Salinan');
  });

  it('DELETE /surveys/:id draft -> 200', async () => {
    const created = await prisma.survey.create({
      data: { opdId, judul: 'Untuk Dihapus', periode: '2026-Q1' },
    });
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/surveys/${created.id}`)
      .set(opdHeaders());
    expect(res.status).toBe(200);
  });
});
