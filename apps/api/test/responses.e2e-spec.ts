import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QuestionType, Role, SurveyStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('Responses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let respondenId: number;
  let respondenId2: number;
  let surveyId: number; // aktif, single-submit
  let multiSurveyId: number; // aktif, multi-submit
  let draftSurveyId: number;
  let q1: number; // skala
  let q2: number; // teks

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2ERESP' },
      update: {},
      create: { kode: 'E2ERESP', nama: 'OPD E2E Responses', isActive: true },
    });
    opdId = opd.id;

    const r1 = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-resp-1' },
      update: {},
      create: {
        ssoSubject: 'e2e-resp-1',
        nama: 'Responden E2E 1',
        email: 'e2e-resp-1@example.go.id',
        role: Role.responden,
      },
    });
    respondenId = r1.id;
    const r2 = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-resp-2' },
      update: {},
      create: {
        ssoSubject: 'e2e-resp-2',
        nama: 'Responden E2E 2',
        email: 'e2e-resp-2@example.go.id',
        role: Role.responden,
      },
    });
    respondenId2 = r2.id;

    const survey = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Survei Aktif E2E',
        periode: '2026',
        status: SurveyStatus.aktif,
        questions: {
          create: [
            { teks: 'Kepuasan layanan', tipe: QuestionType.skala, urutan: 1, isIkmUnsur: true },
            { teks: 'Saran', tipe: QuestionType.teks, urutan: 2 },
          ],
        },
      },
      include: { questions: { orderBy: { urutan: 'asc' } } },
    });
    surveyId = survey.id;
    q1 = survey.questions[0].id;
    q2 = survey.questions[1].id;

    const multi = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Survei Multi E2E',
        periode: '2026',
        status: SurveyStatus.aktif,
        allowMultipleSubmit: true,
        questions: { create: [{ teks: 'Nilai', tipe: QuestionType.skala, urutan: 1 }] },
      },
    });
    multiSurveyId = multi.id;

    const draft = await prisma.survey.create({
      data: { opdId, judul: 'Draft E2E', periode: '2026', status: SurveyStatus.draft },
    });
    draftSurveyId = draft.id;
  }, 60000);

  afterAll(async () => {
    // Hapus respons dulu (cascade ke answers); jika tidak, hapus survey → cascade ke
    // questions terganjal RESTRICT answers_question_id_fkey.
    await prisma.surveyResponse.deleteMany({ where: { survey: { opdId } } });
    await prisma.survey.deleteMany({ where: { opdId } });
    await prisma.user.deleteMany({ where: { ssoSubject: { in: ['e2e-resp-1', 'e2e-resp-2'] } } });
    await prisma.opd.deleteMany({ where: { kode: 'E2ERESP' } });
    await app.close();
  }, 30000);

  const asResponden = (userId: number) => devHeaders({ role: Role.responden, userId });

  it('GET /surveys/active (Responden) -> 200 hanya survei aktif', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/surveys/active')
      .set(asResponden(respondenId));
    expect(res.status).toBe(200);
    expect(res.body.meta.pagination).toBeDefined();
    const ids = res.body.data.map((s: { id: number }) => s.id);
    expect(ids).toContain(surveyId);
    expect(ids).not.toContain(draftSurveyId);
  });

  it('GET /surveys/:id/fill (Responden) -> 200 dengan pertanyaan', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyId}/fill`)
      .set(asResponden(respondenId));
    expect(res.status).toBe(200);
    expect(res.body.data.questions).toHaveLength(2);
    expect(res.body.data.sudahMengisi).toBe(false);
  });

  it('GET /surveys/:id/fill survei draft -> 404', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${draftSurveyId}/fill`)
      .set(asResponden(respondenId));
    expect(res.status).toBe(404);
  });

  it('POST /surveys/:id/responses skala wajib kosong -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/responses`)
      .set(asResponden(respondenId))
      .send({ answers: [{ questionId: q2, teks: 'hanya saran' }] });
    expect(res.status).toBe(400);
  });

  it('POST /surveys/:id/responses valid -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/responses`)
      .set(asResponden(respondenId))
      .send({
        answers: [
          { questionId: q1, nilai: 4 },
          { questionId: q2, teks: 'Pelayanan bagus' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.answers).toHaveLength(2);
    expect(res.body.data.userId).toBeUndefined(); // anonim
  });

  it('POST /surveys/:id/responses duplikat single-submit -> 409', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/responses`)
      .set(asResponden(respondenId))
      .send({ answers: [{ questionId: q1, nilai: 3 }] });
    expect(res.status).toBe(409);
  });

  it('POST single-submit oleh responden LAIN tetap -> 201 (dedupe per-user)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/responses`)
      .set(asResponden(respondenId2))
      .send({ answers: [{ questionId: q1, nilai: 4 }] });
    expect(res.status).toBe(201);
  });

  it('GET /surveys/:id/fill sudahMengisi=true setelah submit', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyId}/fill`)
      .set(asResponden(respondenId));
    expect(res.body.data.sudahMengisi).toBe(true);
  });

  it('POST multi-submit boleh berulang oleh user yang sama -> 201 dua kali', async () => {
    const fill = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${multiSurveyId}/fill`)
      .set(asResponden(respondenId));
    const mq = fill.body.data.questions[0].id;
    const first = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${multiSurveyId}/responses`)
      .set(asResponden(respondenId))
      .send({ answers: [{ questionId: mq, nilai: 4 }] });
    const second = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${multiSurveyId}/responses`)
      .set(asResponden(respondenId))
      .send({ answers: [{ questionId: mq, nilai: 2 }] });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
  });

  it('POST /surveys/:id/responses oleh Admin OPD -> 403', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/responses`)
      .set(devHeaders({ role: Role.opd, opdId }))
      .send({ answers: [{ questionId: q1, nilai: 4 }] });
    expect(res.status).toBe(403);
  });

  it('GET /surveys/:id/responses (Admin OPD pemilik) -> 200 tanpa userId', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyId}/responses`)
      .set(devHeaders({ role: Role.opd, opdId }));
    expect(res.status).toBe(200);
    expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].userId).toBeUndefined();
  });

  it('GET /surveys/:id/responses (Admin OPD lain) -> 403', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyId}/responses`)
      .set(devHeaders({ role: Role.opd, opdId: opdId + 99999 }));
    expect(res.status).toBe(403);
  });
});
