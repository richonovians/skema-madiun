import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { IkmMutu, Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardService } from './dashboard.service';
import type { IkmService } from '../ikm/ikm.service';

const opdUser = (opdId: number | null): CurrentUser => ({ userId: 1, role: Role.opd, opdId });
const kabupatenUser = (): CurrentUser => ({ userId: 2, role: Role.kabupaten, opdId: null });
const superUser = (): CurrentUser => ({ userId: 3, role: Role.superuser, opdId: null });
const respondenUser = (): CurrentUser => ({ userId: 4, role: Role.responden, opdId: null });

describe('DashboardService', () => {
  const prisma = {
    // `findMany` default [] -- getStatistics (2026-08-05) ikut query survei
    // `aktif` utk live-compute; tes yg tak peduli survei aktif tak perlu tahu ini.
    survey: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    surveyResponse: { count: jest.fn().mockResolvedValue(0) },
    complaint: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    answer: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
    opd: { count: jest.fn().mockResolvedValue(0) },
    ikmResult: { findMany: jest.fn().mockResolvedValue([]) },
    statisticsInsight: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
  } as unknown as PrismaService;
  const ikmService = {
    getResults: jest.fn(),
    computeResult: jest.fn(),
  } as unknown as IkmService;
  const service = new DashboardService(prisma, ikmService);

  beforeEach(() => jest.clearAllMocks());

  describe('getOpdDashboard', () => {
    it('Admin Kabupaten -> Forbidden, bahkan dengan opdId (keputusan user 2026-08-20)', async () => {
      await expect(service.getOpdDashboard(kabupatenUser())).rejects.toThrow(ForbiddenException);
      await expect(service.getOpdDashboard(kabupatenUser(), { opdId: 5 })).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.survey.findFirst).not.toHaveBeenCalled();
    });

    it('peran lain (responden) -> Forbidden', async () => {
      await expect(service.getOpdDashboard(respondenUser(), { opdId: 5 })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('akun opd tanpa opdId -> Forbidden', async () => {
      await expect(service.getOpdDashboard(opdUser(null))).rejects.toThrow(ForbiddenException);
    });

    it('Superuser tanpa opdId -> BadRequest (tak ada OPD yang bisa disimpulkan)', async () => {
      await expect(service.getOpdDashboard(superUser())).rejects.toThrow(BadRequestException);
      expect(prisma.survey.findFirst).not.toHaveBeenCalled();
    });

    it('Superuser dengan opdId -> memakai OPD ITU untuk seluruh query', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);

      await service.getOpdDashboard(superUser(), { opdId: 7 });

      expect(prisma.survey.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ opdId: 7 }) }),
      );
      expect(prisma.surveyResponse.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { survey: { opdId: 7 } } }),
      );
    });

    it('Admin OPD: opdId di query DIABAIKAN, tetap OPD akunnya sendiri', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);

      await service.getOpdDashboard(opdUser(5), { opdId: 99 });

      expect(prisma.survey.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ opdId: 5 }) }),
      );
    });

    it('tanpa survei non-draft -> ikmScore/mutu null, performanceMetrics kosong', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);
      (prisma.complaint.count as jest.Mock).mockResolvedValue(0);
      (prisma.complaint.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.answer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getOpdDashboard(opdUser(5));

      expect(result.ikmScore).toBeNull();
      expect(result.ikmMutu).toBeNull();
      expect(result.performanceMetrics).toEqual([]);
      expect(ikmService.getResults).not.toHaveBeenCalled();
    });

    it('ada survei -> reuse IkmService.getResults utk ikmScore+performanceMetrics', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue({ id: 10, opdId: 5 });
      (ikmService.getResults as jest.Mock).mockResolvedValue({
        nilaiIkm: 88.5,
        mutu: IkmMutu.A,
        nrrPerUnsur: [
          { kodeUnsur: 'U1', teks: 'Persyaratan', nrr: 3.8, bobot: 0.11, nrrTertimbang: 0.42 },
        ],
      });

      const result = await service.getOpdDashboard(opdUser(5));

      expect(result.ikmScore).toBe(88.5);
      expect(result.ikmMutu).toBe(IkmMutu.A);
      expect(result.performanceMetrics).toEqual([
        { code: 'U1', name: 'Persyaratan', realization: 3.8, target: 4.0 },
      ]);
    });

    it('(D3) avgResponseHours dihitung dari createdAt->updatedAt pengaduan selesai', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      const createdAt = new Date('2026-08-01T00:00:00.000Z');
      const updatedAt = new Date('2026-08-01T05:00:00.000Z'); // 5 jam
      (prisma.complaint.findMany as jest.Mock).mockResolvedValue([{ createdAt, updatedAt }]);

      const result = await service.getOpdDashboard(opdUser(5));

      expect(result.avgResponseHours).toBe(5);
    });

    it('belum ada pengaduan selesai -> avgResponseHours null', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.complaint.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getOpdDashboard(opdUser(5));

      expect(result.avgResponseHours).toBeNull();
      expect(result.slaTargetHours).toBe(24);
    });

    it('(D3) completionRate = selesai/total, null bila belum ada pengaduan', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.complaint.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date(), updatedAt: new Date() },
      ]);
      (prisma.complaint.count as jest.Mock)
        .mockResolvedValueOnce(0) // activeTickets
        .mockResolvedValueOnce(4); // allComplaintsCount

      const result = await service.getOpdDashboard(opdUser(5));

      expect(result.completionRate).toBe(25);
    });

    it('(D5) ikmTrend dibangun dari snapshot ikm_results OPD ini, dikelompokkan per triwulan', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValueOnce([
        { periode: '2026-Q1', nilaiIkm: 80 },
        { periode: '2026-Q2', nilaiIkm: 90 },
      ]);

      const result = await service.getOpdDashboard(opdUser(5));

      expect(result.ikmTrend).toEqual([
        { periode: '2026-Q1', value: 80 },
        { periode: '2026-Q2', value: 90 },
      ]);
      expect(prisma.ikmResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { survey: { opdId: 5 } } }),
      );
    });

    it('(D4) recentFeedback TIDAK menyertakan identitas pengisi', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.answer.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          teks: 'Pelayanan sudah bagus',
          response: { submittedAt: new Date(), answers: [{ nilai: 4 }, { nilai: 3 }] },
        },
      ]);

      const result = await service.getOpdDashboard(opdUser(5));

      expect(result.recentFeedback).toEqual([
        expect.objectContaining({ id: 1, text: 'Pelayanan sudah bagus', ratingAvg: 3.5 }),
      ]);
      expect(result.recentFeedback[0]).not.toHaveProperty('name');
      expect(result.recentFeedback[0]).not.toHaveProperty('userId');
    });
  });

  describe('getStatistics (D2: publik)', () => {
    it('tanpa data -> summary aman (null/0), bukan error', async () => {
      const result = await service.getStatistics();

      expect(result.summary.ikm).toBeNull();
      expect(result.summary.totalRespondents).toBe(0);
      expect(result.summary.completionRate).toBeNull();
      expect(result.ikmTrend).toEqual([]);
      expect(result.insight.text).toBeNull();
    });

    it('(2026-08-05) survei AKTIF yg sudah punya responden ikut masuk summary.ikm/ikmTrend', async () => {
      (prisma.survey.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 30, opdId: 4, periode: '2026-Q3', judul: 'Survei Aktif', opd: { nama: 'Dinas X' } },
      ]);
      (ikmService.computeResult as jest.Mock).mockResolvedValueOnce({
        nilaiIkm: 84,
        mutu: IkmMutu.B,
        jumlahResponden: 2,
        nrrPerUnsur: [{ kodeUnsur: 'U1', teks: 'Persyaratan', nrr: 3.36 }],
      });

      const result = await service.getStatistics();

      expect(result.summary.ikm).toBe(84);
      expect(result.ikmTrend).toEqual([{ periode: '2026-Q3', value: 84 }]);
    });

    it('(D5) ikmTrend dikelompokkan per periode triwulan, terurut kronologis', async () => {
      const survey = { opdId: 1, opd: { nama: 'Dinas Contoh' } };
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValueOnce([
        { nilaiIkm: 80, periode: '2026-Q2', nrrPerUnsur: [], survey },
        { nilaiIkm: 90, periode: '2026-Q1', nrrPerUnsur: [], survey },
        { nilaiIkm: 70, periode: '2026-Q1', nrrPerUnsur: [], survey },
      ]);

      const result = await service.getStatistics();

      expect(result.ikmTrend).toEqual([
        { periode: '2026-Q1', value: 80 }, // rata-rata 90 & 70
        { periode: '2026-Q2', value: 80 },
      ]);
    });

    it('(D3) avgSlaDays & completionRate hanya menghitung status selesai dari query gabungan', async () => {
      (prisma.complaint.count as jest.Mock).mockResolvedValue(4); // totalComplaints
      (prisma.complaint.findMany as jest.Mock).mockResolvedValue([
        {
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
          updatedAt: new Date('2026-08-03T00:00:00.000Z'), // 2 hari
          status: 'selesai',
        },
        { createdAt: new Date(), updatedAt: new Date(), status: 'diterima' }, // belum selesai -- tak ikut dihitung
      ]);

      const result = await service.getStatistics();

      expect(result.summary.avgSlaDays).toBe(2);
      expect(result.summary.completionRate).toBe(25); // 1 selesai / 4 total
    });

    it('(D5) complaintTrend dibucket dari createdAt ke periode triwulan', async () => {
      (prisma.complaint.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date(2026, 0, 10) }, // Q1
        { createdAt: new Date(2026, 1, 10) }, // Q1
        { createdAt: new Date(2026, 4, 10) }, // Q2
      ]);

      const result = await service.getStatistics();

      expect(result.complaintTrend).toEqual([
        { periode: '2026-Q1', value: 2 },
        { periode: '2026-Q2', value: 1 },
      ]);
    });

    it('serviceElements = rata-rata NRR per kode unsur lintas seluruh snapshot', async () => {
      const survey = { opdId: 1, opd: { nama: 'Dinas Contoh' } };
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValueOnce([
        {
          nilaiIkm: 80,
          periode: '2026-Q1',
          nrrPerUnsur: [{ kodeUnsur: 'U1', teks: 'Persyaratan', nrr: 3.6 }],
          survey,
        },
        {
          nilaiIkm: 90,
          periode: '2026-Q1',
          nrrPerUnsur: [{ kodeUnsur: 'U1', teks: 'Persyaratan', nrr: 3.8 }],
          survey,
        },
      ]);

      const result = await service.getStatistics();

      expect(result.serviceElements).toEqual([{ code: 'U1', name: 'Persyaratan', avgNrr: 3.7 }]);
    });

    it('(INT-14) topOpd = rata-rata IKM per OPD, top 5 desc, dgn peringkat', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValueOnce([
        {
          nilaiIkm: 80,
          periode: '2026-Q1',
          nrrPerUnsur: [],
          survey: { opdId: 1, opd: { nama: 'Dinas A' } },
        },
        {
          nilaiIkm: 90,
          periode: '2026-Q1',
          nrrPerUnsur: [],
          survey: { opdId: 2, opd: { nama: 'Dinas B' } },
        },
        {
          nilaiIkm: 70,
          periode: '2026-Q2',
          nrrPerUnsur: [],
          survey: { opdId: 1, opd: { nama: 'Dinas A' } },
        },
      ]);

      const result = await service.getStatistics();

      expect(result.topOpd).toEqual([
        { peringkat: 1, opdId: 2, opdNama: 'Dinas B', nilaiIkm: 90 },
        { peringkat: 2, opdId: 1, opdNama: 'Dinas A', nilaiIkm: 75 }, // rata-rata 80 & 70
      ]);
    });

    it('(INT-14) complaintCategories menerjemahkan kode -> nama & terurut terbanyak', async () => {
      (prisma.complaint.groupBy as jest.Mock).mockImplementation(({ by }: { by: string[] }) => {
        if (by[0] === 'kategori') {
          return Promise.resolve([
            { kategori: 'infrastruktur', _count: { _all: 3 } },
            { kategori: 'kesehatan', _count: { _all: 7 } },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await service.getStatistics();

      expect(result.complaintCategories).toEqual([
        { kode: 'kesehatan', nama: 'Kesehatan', count: 7 },
        { kode: 'infrastruktur', nama: 'Infrastruktur', count: 3 },
      ]);
    });

    it('insight bawa teks tersimpan (D6), bukan dikarang', async () => {
      (prisma.statisticsInsight.findUnique as jest.Mock).mockResolvedValue({
        text: 'Capaian meningkat',
        updatedAt: new Date('2026-08-01'),
      });

      const result = await service.getStatistics();

      expect(result.insight.text).toBe('Capaian meningkat');
    });
  });

  describe('updateInsight', () => {
    it('(D6) upsert baris tunggal id=1', async () => {
      (prisma.statisticsInsight.upsert as jest.Mock).mockResolvedValue({
        id: 1,
        text: 'Narasi baru',
        updatedAt: new Date('2026-08-01'),
        updatedBy: 2,
      });

      const result = await service.updateInsight({ text: 'Narasi baru' }, kabupatenUser());

      expect(prisma.statisticsInsight.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          create: expect.objectContaining({ id: 1, text: 'Narasi baru', updatedBy: 2 }),
          update: expect.objectContaining({ text: 'Narasi baru', updatedBy: 2 }),
        }),
      );
      expect(result.text).toBe('Narasi baru');
    });
  });
});
