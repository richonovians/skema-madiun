import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ComplaintStatus, QuestionType, Role, SurveyStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('Dashboard & Statistics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let opdUserId: number;
  let respondenId: number;
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
      where: { kode: 'E2EDASH' },
      update: {},
      create: { kode: 'E2EDASH', nama: 'OPD E2E Dashboard', isActive: true },
    });
    opdId = opd.id;

    const opdUser = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-dash-opd' },
      update: {},
      create: {
        ssoSubject: 'e2e-dash-opd',
        nama: 'Admin OPD Dashboard',
        email: 'e2e-dash-opd@example.go.id',
        role: Role.opd,
        opdId,
      },
    });
    opdUserId = opdUser.id;

    const responden = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-dash-resp' },
      update: {},
      create: {
        ssoSubject: 'e2e-dash-resp',
        nama: 'Responden Dashboard',
        email: 'e2e-dash-resp@example.go.id',
        role: Role.responden,
      },
    });
    respondenId = responden.id;

    const survey = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Survei Dashboard E2E',
        periode: '2026-Q1',
        status: SurveyStatus.aktif,
        questions: {
          create: [
            {
              teks: 'Kepuasan layanan',
              tipe: QuestionType.skala,
              urutan: 1,
              isIkmUnsur: true,
              kodeUnsur: 'U1',
            },
            { teks: 'Saran', tipe: QuestionType.teks, urutan: 2 },
          ],
        },
      },
      include: { questions: { orderBy: { urutan: 'asc' } } },
    });
    surveyId = survey.id;
    const [q1, q2] = survey.questions;

    const response = await prisma.surveyResponse.create({
      data: { surveyId, userId: respondenId, dedupeUserId: respondenId },
    });
    await prisma.answer.createMany({
      data: [
        { responseId: response.id, questionId: q1.id, nilai: 4 },
        { responseId: response.id, questionId: q2.id, teks: 'Pelayanan sudah baik' },
      ],
    });

    await prisma.complaint.create({
      data: {
        ticketNo: 'PGDE2EDASH01',
        userId: respondenId,
        opdId,
        kategori: 'lainnya',
        judul: 'Pengaduan E2E Dashboard',
        uraian: 'Uraian pengaduan e2e dashboard',
        status: ComplaintStatus.diterima,
      },
    });
  }, 60000);

  afterAll(async () => {
    await prisma.complaint.deleteMany({ where: { opdId } });
    await prisma.surveyResponse.deleteMany({ where: { survey: { opdId } } });
    await prisma.survey.deleteMany({ where: { opdId } });
    // Menutup survei (test topOpd) memicu AuditInterceptor mencatat audit_logs
    // ber-FK RESTRICT ke users -- harus dihapus dulu sebelum user dihapus.
    await prisma.auditLog.deleteMany({ where: { actorId: opdUserId } });
    await prisma.user.deleteMany({
      where: { ssoSubject: { in: ['e2e-dash-opd', 'e2e-dash-resp'] } },
    });
    await prisma.opd.deleteMany({ where: { kode: 'E2EDASH' } });
    await prisma.statisticsInsight.deleteMany({ where: { id: 1 } });
    await app.close();
  }, 30000);

  describe('GET /api/v1/dashboard/opd (INT-12)', () => {
    it('Admin OPD -> 200, ikmScore live-compute + performanceMetrics + recentFeedback tanpa identitas (D4)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/opd')
        .set(devHeaders({ role: Role.opd, userId: opdUserId, opdId }));

      expect(res.status).toBe(200);
      expect(res.body.data.ikmScore).toBe(100); // 1 responden, nilai 4 -> NRR 4 -> IKM 100
      expect(res.body.data.performanceMetrics).toHaveLength(1);
      expect(res.body.data.performanceMetrics[0]).toEqual(
        expect.objectContaining({ code: 'U1', realization: 4, target: 4 }),
      );
      expect(res.body.data.recentFeedback).toHaveLength(1);
      expect(res.body.data.recentFeedback[0].text).toBe('Pelayanan sudah baik');
      expect(res.body.data.recentFeedback[0]).not.toHaveProperty('name');
      expect(res.body.data.recentFeedback[0]).not.toHaveProperty('userId');
      expect(res.body.data.activeTickets).toBe(1);
      expect(res.body.data.slaTargetHours).toBe(24);
    });

    it('Admin Kabupaten -> 403 (dashboard ini murni per-OPD)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/opd')
        .set(devHeaders({ role: Role.kabupaten }));
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/statistics (INT-14, D2: publik)', () => {
    it('TANPA header Authorization sama sekali -> 200 (bukan 401)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/statistics');

      expect(res.status).toBe(200);
      expect(res.body.data.summary).toEqual(
        expect.objectContaining({
          totalRespondents: expect.any(Number),
          totalComplaints: expect.any(Number),
          activeOpd: expect.any(Number),
        }),
      );
      expect(Array.isArray(res.body.data.ikmTrend)).toBe(true);
      expect(Array.isArray(res.body.data.complaintStatus)).toBe(true);
      expect(res.body.data.insight).toEqual(expect.objectContaining({ text: null }));
    });

    it('complaintStatus menyertakan pengaduan e2e ini (status diterima)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/statistics');
      const diterima = res.body.data.complaintStatus.find(
        (s: { status: string }) => s.status === 'diterima',
      );
      expect(diterima).toBeDefined();
      expect(diterima.count).toBeGreaterThan(0);
    });

    it('(INT-14) complaintCategories menyertakan kategori "lainnya" dari pengaduan e2e ini', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/statistics');
      const lainnya = res.body.data.complaintCategories.find(
        (c: { kode: string }) => c.kode === 'lainnya',
      );
      expect(lainnya).toBeDefined();
      expect(lainnya.nama).toBe('Lainnya');
      expect(lainnya.count).toBeGreaterThan(0);
    });

    it('(INT-14) topOpd menyertakan OPD e2e ini setelah survei ditutup (snapshot ikm_results)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/surveys/${surveyId}/status`)
        .set(devHeaders({ role: Role.opd, userId: opdUserId, opdId }))
        .send({ status: 'ditutup' });

      const res = await request(app.getHttpServer()).get('/api/v1/statistics');
      const entry = res.body.data.topOpd.find((o: { opdId: number }) => o.opdId === opdId);
      expect(entry).toBeDefined();
      expect(entry.opdNama).toBe('OPD E2E Dashboard');
      expect(entry.nilaiIkm).toBe(100); // 1 responden nilai 4 -> IKM 100
    });
  });

  describe('PATCH /api/v1/statistics/insight (D6)', () => {
    it('Admin Kabupaten -> 200, tersimpan & terbaca via GET /statistics', async () => {
      const patchRes = await request(app.getHttpServer())
        .patch('/api/v1/statistics/insight')
        .set(devHeaders({ role: Role.kabupaten, userId: 999 }))
        .send({ text: 'Capaian pelayanan meningkat triwulan ini.' });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.text).toBe('Capaian pelayanan meningkat triwulan ini.');

      const getRes = await request(app.getHttpServer()).get('/api/v1/statistics');
      expect(getRes.body.data.insight.text).toBe('Capaian pelayanan meningkat triwulan ini.');
    });

    it('Admin OPD -> 403 (hanya Kabupaten yang boleh mengisi narasi org-wide)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/statistics/insight')
        .set(devHeaders({ role: Role.opd, opdId }))
        .send({ text: 'X' });
      expect(res.status).toBe(403);
    });

    it('teks kosong -> 400', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/statistics/insight')
        .set(devHeaders({ role: Role.kabupaten }))
        .send({ text: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/dashboard/ikm (INT-13: openComplaints/newComplaints/systemActivityPercent)', () => {
    it('menyertakan ketiga field baru dgn tipe benar', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/ikm')
        .set(devHeaders({ role: Role.kabupaten }));

      expect(res.status).toBe(200);
      expect(res.body.data.openComplaints).toEqual(expect.any(Number));
      expect(res.body.data.newComplaints).toEqual(expect.any(Number));
      expect(res.body.data.openComplaints).toBeGreaterThanOrEqual(1); // pengaduan e2e ini (status diterima)
    });
  });
});
