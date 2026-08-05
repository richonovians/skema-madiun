import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('Questions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let surveyId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EQ' },
      update: {},
      create: { kode: 'E2EQ', nama: 'OPD E2E Questions', isActive: true },
    });
    opdId = opd.id;
    const survey = await prisma.survey.create({
      data: { opdId, judul: 'Survei Pertanyaan', periode: '2026-Q1' },
    });
    surveyId = survey.id;
  }, 60000);

  afterAll(async () => {
    await prisma.survey.deleteMany({ where: { opdId } });
    await prisma.opd.deleteMany({ where: { kode: 'E2EQ' } });
    await app.close();
  }, 30000);

  const opdHeaders = () => devHeaders({ role: Role.opd, opdId });

  it('POST question skala -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders())
      .send({ teks: 'Bagaimana pelayanannya?', tipe: 'skala', isIkmUnsur: true });
    expect(res.status).toBe(201);
    expect(res.body.data.tipe).toBe('skala');
    expect(res.body.data.urutan).toBeGreaterThan(0);
  });

  it('POST question pilihan tanpa opsi -> 400 (minimal 2 opsi)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders())
      .send({ teks: 'Pilih salah satu', tipe: 'pilihan' });
    expect(res.status).toBe(400);
  });

  it('POST question pilihan dengan opsi -> 201, opsi tersimpan terurut', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders())
      .send({
        teks: 'Bagaimana kepuasan Anda?',
        tipe: 'pilihan',
        options: [
          { label: 'Puas', nilai: 1 },
          { label: 'Tidak puas', nilai: 0 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.options).toHaveLength(2);
    expect(res.body.data.options[0].label).toBe('Puas');
    expect(res.body.data.options[0].urutan).toBe(1);
  });

  it('POST question pilihan dengan isIkmUnsur=true -> 400 (unsur IKM hanya skala)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders())
      .send({
        teks: 'X',
        tipe: 'pilihan',
        isIkmUnsur: true,
        options: [{ label: 'A' }, { label: 'B' }],
      });
    expect(res.status).toBe(400);
  });

  it('POST question skala dengan options terisi -> 400 (options hanya untuk pilihan)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders())
      .send({ teks: 'X', tipe: 'skala', options: [{ label: 'A' }, { label: 'B' }] });
    expect(res.status).toBe(400);
  });

  it('POST template -> 200 dan memuat 9 unsur (U1..U9)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/questions/template`)
      .set(opdHeaders());
    expect(res.status).toBe(200);
    const kodes = res.body.data
      .map((q: { kodeUnsur: string | null }) => q.kodeUnsur)
      .filter(Boolean);
    expect(kodes).toEqual(expect.arrayContaining(['U1', 'U9']));
  });

  it('GET questions -> 200 terurut', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders());
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(10); // 1 skala + 9 unsur
  });

  it('PATCH reorder -> 200', async () => {
    const list = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders());
    const ids = list.body.data.map((q: { id: number }) => q.id).reverse();
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${surveyId}/questions/reorder`)
      .set(opdHeaders())
      .send({ orderedIds: ids });
    expect(res.status).toBe(200);
    expect(res.body.data[0].id).toBe(ids[0]);
  });

  it('GET questions Admin OPD lain -> 403', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyId}/questions`)
      .set(devHeaders({ role: Role.opd, opdId: opdId + 99999 }));
    expect(res.status).toBe(403);
  });

  it('PATCH & DELETE question (draft) -> 200', async () => {
    const created = await prisma.question.create({
      data: { surveyId, teks: 'Sementara', tipe: 'teks', urutan: 99 },
    });
    const upd = await request(app.getHttpServer())
      .patch(`/api/v1/questions/${created.id}`)
      .set(opdHeaders())
      .send({ teks: 'Diubah' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.teks).toBe('Diubah');

    const del = await request(app.getHttpServer())
      .delete(`/api/v1/questions/${created.id}`)
      .set(opdHeaders());
    expect(del.status).toBe(200);
  });

  it('POST question pada survei aktif -> 400 (bukan draft)', async () => {
    const aktif = await prisma.survey.create({
      data: { opdId, judul: 'Survei Aktif', periode: '2026-Q1', status: 'aktif' },
    });
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${aktif.id}/questions`)
      .set(opdHeaders())
      .send({ teks: 'X', tipe: 'skala' });
    expect(res.status).toBe(400);
  });
});
