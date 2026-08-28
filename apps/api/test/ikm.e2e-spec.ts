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
  let opdId2: number;
  let surveyId2: number;
  let q3: number;
  let respondenId3: number;

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
      create: { kode: 'E2EIKM', nama: 'OPD E2E IKM', jenisLayanan: 'Kesehatan', isActive: true },
    });
    opdId = opd.id;

    const opd2 = await prisma.opd.upsert({
      where: { kode: 'E2EIKM2' },
      update: {},
      create: {
        kode: 'E2EIKM2',
        nama: 'OPD E2E IKM 2',
        // Nilai bebas-tabrakan (2026-08-05): sejak GET /dashboard/ikm ikut
        // live-compute survei AKTIF (bukan cuma snapshot ditutup), label umum
        // spt "Pendidikan" bisa tabrakan dgn OPD nyata (mis. seed Dinas
        // Pendidikan) yang kebetulan py jenisLayanan sama -- gagalkan test
        // exclusive-match `.every()` di bawah tanpa ada yg benar-benar salah.
        jenisLayanan: 'E2E-Pendidikan',
        isActive: true,
      },
    });
    opdId2 = opd2.id;

    const survey = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Survei IKM E2E',
        periode: '2026-Q1',
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
          // consentAt juga di `update` supaya baris SISA dari run sebelumnya
          // (yang dibuat sebelum penegakan PDP ada) ikut diperbaiki.
          update: { consentAt: new Date() },
          create: {
            ssoSubject,
            nama: `Responden IKM ${i + 1}`,
            email: `${ssoSubject}@example.go.id`,
            role: Role.responden,
            consentAt: new Date(), // celah 2: warga tanpa persetujuan PDP ditolak 403 saat mengirim data
          },
        }),
      ),
    );
    respondenIds = respondents.map((r) => r.id);

    const survey2 = await prisma.survey.create({
      data: {
        opdId: opdId2,
        judul: 'Survei IKM E2E 2',
        periode: '2026-Q1',
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
          ],
        },
      },
      include: { questions: true },
    });
    surveyId2 = survey2.id;
    q3 = survey2.questions[0].id;

    const r3 = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-ikm-resp-3' },
      // consentAt juga di `update` supaya baris SISA dari run sebelumnya
      // (yang dibuat sebelum penegakan PDP ada) ikut diperbaiki.
      update: { consentAt: new Date() },
      create: {
        ssoSubject: 'e2e-ikm-resp-3',
        nama: 'Responden IKM 3',
        email: 'e2e-ikm-resp-3@example.go.id',
        role: Role.responden,
        consentAt: new Date(), // celah 2: warga tanpa persetujuan PDP ditolak 403 saat mengirim data
      },
    });
    respondenId3 = r3.id;
  }, 60000);

  afterAll(async () => {
    await prisma.ikmResult.deleteMany({ where: { survey: { opdId: { in: [opdId, opdId2] } } } });
    await prisma.surveyResponse.deleteMany({
      where: { survey: { opdId: { in: [opdId, opdId2] } } },
    });
    await prisma.survey.deleteMany({ where: { opdId: { in: [opdId, opdId2] } } });
    await prisma.user.deleteMany({
      where: { ssoSubject: { in: ['e2e-ikm-resp-1', 'e2e-ikm-resp-2', 'e2e-ikm-resp-3'] } },
    });
    await prisma.opd.deleteMany({ where: { kode: { in: ['E2EIKM', 'E2EIKM2'] } } });
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
      where: { surveyId_periode: { surveyId, periode: '2026-Q1' } },
    });
    expect(snapshot).not.toBeNull();
    expect(Number(snapshot?.nilaiIkm)).toBe(100);
    expect(snapshot?.mutu).toBe('A');
    expect(snapshot?.jumlahResponden).toBe(2);
  });

  describe('GET /dashboard/ikm (DASH-1)', () => {
    beforeAll(async () => {
      // OPD kedua: 1 responden menilai 1 (minimal) -> IKM=25, mutu D — untuk pembanding ranking.
      await request(app.getHttpServer())
        .post(`/api/v1/surveys/${surveyId2}/responses`)
        .set(devHeaders({ role: Role.responden, userId: respondenId3 }))
        .send({ answers: [{ questionId: q3, nilai: 1 }] });

      await request(app.getHttpServer())
        .patch(`/api/v1/surveys/${surveyId2}/status`)
        .set(devHeaders({ role: Role.opd, opdId: opdId2 }))
        .send({ status: 'ditutup' });
    });

    it('Admin OPD -> 403 (hanya Kabupaten)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/dashboard/ikm').set(opdHeaders());
      expect(res.status).toBe(403);
    });

    it('Responden -> 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/ikm')
        .set(respondHeaders(respondenIds[0]));
      expect(res.status).toBe(403);
    });

    it('Kabupaten -> 200, terurut dari nilai IKM tertinggi dengan peringkat', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/ikm')
        .set(devHeaders({ role: Role.kabupaten }));

      expect(res.status).toBe(200);
      const items = res.body.data.items as {
        surveyId: number;
        nilaiIkm: number;
        peringkat: number;
      }[];
      const idx1 = items.findIndex((i) => i.surveyId === surveyId);
      const idx2 = items.findIndex((i) => i.surveyId === surveyId2);
      expect(idx1).toBeGreaterThanOrEqual(0);
      expect(idx2).toBeGreaterThanOrEqual(0);
      expect(items[idx1].nilaiIkm).toBe(100);
      expect(items[idx1].peringkat).toBeLessThan(items[idx2].peringkat); // IKM lebih tinggi = peringkat lebih baik
      expect(items[idx2].nilaiIkm).toBe(25);
    });

    it('filter jenisLayanan=E2E-Pendidikan -> hanya OPD kedua', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/ikm')
        .query({ jenisLayanan: 'E2E-Pendidikan' })
        .set(devHeaders({ role: Role.kabupaten }));

      expect(res.status).toBe(200);
      const items = res.body.data.items as { opdId: number }[];
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i) => i.opdId === opdId2)).toBe(true);
    });

    it('filter periode tidak cocok -> items kosong', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/ikm')
        .query({ periode: '1999' })
        .set(devHeaders({ role: Role.kabupaten }));

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.rataRataIkm).toBeNull();
    });
  });

  describe('GET /surveys/:id/results/export (EXP-1)', () => {
    it('format=csv (Admin OPD pemilik) -> 200, Content-Type text/csv, berisi data survei', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${surveyId}/results/export`)
        .query({ format: 'csv' })
        .set(opdHeaders());

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.text).toContain('Survei IKM E2E');
      expect(res.text).toContain('Nilai IKM,100');
    });

    it('format=excel (Kabupaten) -> 200, berkas xlsx valid (magic bytes PK)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${surveyId}/results/export`)
        .query({ format: 'excel' })
        .set(devHeaders({ role: Role.kabupaten }))
        .buffer(true)
        .parse((r, cb) => {
          const chunks: Buffer[] = [];
          r.on('data', (c: Buffer) => chunks.push(c));
          r.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect((res.body as Buffer).subarray(0, 2).toString()).toBe('PK');
    });

    it('format=pdf -> 200, berkas PDF valid (magic bytes %PDF)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${surveyId}/results/export`)
        .query({ format: 'pdf' })
        .set(opdHeaders())
        .buffer(true)
        .parse((r, cb) => {
          const chunks: Buffer[] = [];
          r.on('data', (c: Buffer) => chunks.push(c));
          r.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect((res.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
    });

    it('format tidak valid -> 400', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${surveyId}/results/export`)
        .query({ format: 'xml' })
        .set(opdHeaders());
      expect(res.status).toBe(400);
    });

    it('tanpa format -> 400', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${surveyId}/results/export`)
        .set(opdHeaders());
      expect(res.status).toBe(400);
    });

    it('Admin OPD lain -> 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${surveyId}/results/export`)
        .query({ format: 'csv' })
        .set(devHeaders({ role: Role.opd, opdId: opdId + 99999 }));
      expect(res.status).toBe(403);
    });

    it('Responden -> 403 (bukan OPD/Kabupaten)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${surveyId}/results/export`)
        .query({ format: 'csv' })
        .set(respondHeaders(respondenIds[0]));
      expect(res.status).toBe(403);
    });
  });
});
