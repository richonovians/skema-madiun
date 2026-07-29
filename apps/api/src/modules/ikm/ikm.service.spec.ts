import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IkmMutu, Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { IkmService } from './ikm.service';

const opdUser = (opdId: number | null): CurrentUser => ({ userId: 1, role: Role.opd, opdId });
const kabupatenUser = (): CurrentUser => ({ userId: 2, role: Role.kabupaten, opdId: null });

const survey = (over: Record<string, unknown> = {}) => ({
  id: 1,
  opdId: 5,
  periode: '2026',
  ...over,
});

// 9 unsur, semua responden menilai 4 → NRR=4 tiap unsur, IKM = 4*25=100 → mutu A.
const unsurQuestions = (nilai: number[][]) =>
  nilai.map((nilaiList, i) => ({
    id: i + 1,
    kodeUnsur: `U${i + 1}`,
    teks: `Unsur ${i + 1}`,
    answers: nilaiList.map((n) => ({ nilai: n })),
  }));

describe('IkmService', () => {
  const prisma = {
    survey: { findUnique: jest.fn() },
    question: { findMany: jest.fn() },
    surveyResponse: { count: jest.fn() },
    ikmResult: { upsert: jest.fn() },
  } as unknown as PrismaService;
  const service = new IkmService(prisma);

  beforeEach(() => jest.clearAllMocks());

  describe('getResults', () => {
    it('survei tidak ada → NotFound', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getResults(1, kabupatenUser())).rejects.toThrow(NotFoundException);
    });

    it('Admin OPD lain → Forbidden', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey({ opdId: 99 }));
      await expect(service.getResults(1, opdUser(5))).rejects.toThrow(ForbiddenException);
    });

    it('belum ada responden → nilaiIkm & mutu null', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey());
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[], [], []]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.jumlahResponden).toBe(0);
      expect(result.nilaiIkm).toBeNull();
      expect(result.mutu).toBeNull();
      expect(result.nrrPerUnsur).toEqual([]);
    });

    it('tanpa pertanyaan unsur → nilaiIkm null meski ada responden', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey());
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(5);

      const result = await service.getResults(1, kabupatenUser());
      expect(result.nilaiIkm).toBeNull();
    });

    it('semua nilai 4 (maksimal) → IKM=100, mutu A', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey());
      // 9 unsur, 2 responden, keduanya menilai 4
      (prisma.question.findMany as jest.Mock).mockResolvedValue(
        unsurQuestions(Array.from({ length: 9 }, () => [4, 4])),
      );
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.nilaiIkm).toBe(100);
      expect(result.mutu).toBe(IkmMutu.A);
      expect(result.nrrPerUnsur).toHaveLength(9);
      expect(result.nrrPerUnsur[0].nrr).toBe(4);
    });

    it('semua nilai 1 (minimal) → IKM=25, mutu D', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey());
      (prisma.question.findMany as jest.Mock).mockResolvedValue(
        unsurQuestions(Array.from({ length: 9 }, () => [1, 1])),
      );
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.nilaiIkm).toBe(25);
      expect(result.mutu).toBe(IkmMutu.D);
    });

    it('nilai campuran → NRR & IKM dihitung sesuai rumus PermenPANRB 14/2017', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey());
      // 1 unsur saja, 4 responden: nilai 3,3,4,4 → NRR=3.5, bobot=1 (hanya 1 unsur)
      // IKM = 3.5 * 1 * 25 = 87.5 → mutu B (76.61-88.30)
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[3, 3, 4, 4]]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(4);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.nrrPerUnsur[0].nrr).toBe(3.5);
      expect(result.nilaiIkm).toBe(87.5);
      expect(result.mutu).toBe(IkmMutu.B);
    });
  });

  describe('snapshot', () => {
    it('tanpa responden → tidak upsert', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey());
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[]]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);

      await service.snapshot(1);

      expect(prisma.ikmResult.upsert).not.toHaveBeenCalled();
    });

    it('dengan responden → upsert ke ikm_results', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey());
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[4, 4]]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

      await service.snapshot(1);

      expect(prisma.ikmResult.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { surveyId_periode: { surveyId: 1, periode: '2026' } },
          create: expect.objectContaining({ nilaiIkm: 100, mutu: IkmMutu.A, jumlahResponden: 2 }),
        }),
      );
    });

    it('survei tidak ditemukan → tidak error, tidak upsert', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(null);
      await service.snapshot(999);
      expect(prisma.ikmResult.upsert).not.toHaveBeenCalled();
    });
  });
});
