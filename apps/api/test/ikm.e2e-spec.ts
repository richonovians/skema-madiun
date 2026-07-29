import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QuestionType, Role, SurveyStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('IKM (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let surveyId: number;
  let q1: number;
  let q2: number;
  let respondenIds: number[];

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EIKM' },
      update: {},
      create: { kode: 'E2EIKM', nama: 'OPD E2E IKM', isActive: true },
    });
    opdId = opd.id;

    const survey = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Survei IKM E2E',
        periode: '2026',
        status: SurveyStatus.aktif,
        questions: {
          create: [
            {
              teks: 'Unsur 1',
              tipe: QuestionType.skala,
              urutan: 1,
              isIkmUnsur: true,
              kodeUnsur: 'U1',
            },
            {
              teks: 'Unsur 2',
              tipe: QuestionType.skala,
              urutan: 2,
              isIkmUnsur: true,
              kodeUnsur: 'U2',
            },
          ],
        },
      },
      include: { questions: { orderBy: { urutan: 'asc' } } },
    });
    surveyId = survey.id;
    q1 = survey.questions[0].id;
    q2 = survey.questions[1].id;

    const respondents = await Promise.all(
      ['e2e-ikm-resp-1', 'e2e-ikm-resp-2'].map((ssoSubject, i) =>
        prisma.user.upsert({
          where: { ssoSubject },
          update: {},
          create: {
            ssoSubject,
            nama: `Responden IKM ${i + 1}`,
            email: `${ssoSubject}@example.go.id`,
            role: Role.responden,
          },
        }),
      ),
    );
    respondenIds = respondents.map((r) => r.id);
  }, 60000);

  afterAll(async () => {
    await prisma.ikmResult.deleteMany({ where: { survey: { opdId } } });
    await prisma.surveyResponse.deleteMany({ where: { survey: { opdId } } });
    await prisma.survey.deleteMany({ where: { opdId } });
    await prisma.user.deleteMany({
      where: { ssoSubject: { in: ['e2e-ikm-resp-1', 'e2e-ikm-resp-2'] } },
    });
    await prisma.opd.deleteMany({ where: { kode: 'E2EIKM' } });
    await app.close();
  }, 30000);

  const opdHeaders = () => devHeaders({ role: Role.opd, opdId });
  const respondHeaders = (userId: number) => devHeaders({ role: Role.responden, userId });

  it('GET /surveys/:id/results sebelum ada responden -> nilaiIkm null', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyId}/results`)
      .set(opdHeaders());
    expect(res.status).toBe(200);
    expect(res.body.data.jumlahResponden).toBe(0);
    expect(res.body.data.nilaiIkm).toBeNull();
    expect(res.body.data.mutu).toBeNull();
  });

  it('GET /surveys/:id/results (Admin OPD lain) -> 403', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyId}/results`)
      .set(devHeaders({ role: Role.opd, opdId: opdId + 99999 }));
    expect(res.status).toBe(403);
  });

  it('live-compute setelah 2 responden menilai 4 semua -> nilaiIkm=100, mutu A', async () => {
    for (const userId of respondenIds) {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/surveys/${surveyId}/responses`)
        .set(respondHeaders(userId))
        .send({
          answers: [
            { questionId: q1, nilai: 4 },
            { questionId: q2, nilai: 4 },
          ],
        });
      expect(res.status).toBe(201);
    }

    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyId}/results`)
      .set(opdHeaders());
    expect(res.status).toBe(200);
    expect(res.body.data.jumlahResponden).toBe(2);
    expect(res.body.data.nilaiIkm).toBe(100);
    expect(res.body.data.mutu).toBe('A');
    expect(res.body.data.nrrPerUnsur).toHaveLength(2);
  });

  it('menutup survei -> snapshot tersimpan di ikm_results', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${surveyId}/status`)
      .set(opdHeaders())
      .send({ status: 'ditutup' });
    expect(res.status).toBe(200);

    const snapshot = await prisma.ikmResult.findUnique({
      where: { surveyId_periode: { surveyId, periode: '2026' } },
    });
    expect(snapshot).not.toBeNull();
    expect(Number(snapshot?.nilaiIkm)).toBe(100);
    expect(snapshot?.mutu).toBe('A');
    expect(snapshot?.jumlahResponden).toBe(2);
  });
});
