import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { QuestionType, Role, SurveyStatus } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponsesService } from './responses.service';

const responden = (userId = 10): CurrentUser => ({ userId, role: Role.responden, opdId: null });

const skalaQ = (id: number) => ({ id, surveyId: 1, tipe: QuestionType.skala });
const teksQ = (id: number) => ({ id, surveyId: 1, tipe: QuestionType.teks });

const aktifSurvey = (over: Record<string, unknown> = {}) => ({
  id: 1,
  opdId: 5,
  status: SurveyStatus.aktif,
  allowMultipleSubmit: false,
  questions: [skalaQ(101), teksQ(102)],
  ...over,
});

describe('ResponsesService', () => {
  const prisma = {
    survey: { findUnique: jest.fn() },
    surveyResponse: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const service = new ResponsesService(prisma);

  beforeEach(() => jest.clearAllMocks());

  describe('getFill', () => {
    it('survei non-aktif → NotFound', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue({
        ...aktifSurvey(),
        status: SurveyStatus.draft,
      });
      await expect(service.getFill(1, responden())).rejects.toThrow(NotFoundException);
    });

    it('survei aktif → kembalikan fill + flag sudahMengisi', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(aktifSurvey());
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue({ id: 99 });

      const fill = await service.getFill(1, responden());

      expect(fill.questions).toHaveLength(2);
      expect(fill.sudahMengisi).toBe(true);
    });
  });

  describe('submit', () => {
    it('survei tidak aktif → NotFound', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden()),
      ).rejects.toThrow(NotFoundException);
    });

    it('jawaban untuk pertanyaan di luar survei → BadRequest', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(aktifSurvey());
      await expect(
        service.submit(1, { answers: [{ questionId: 999, nilai: 4 }] }, responden()),
      ).rejects.toThrow(BadRequestException);
    });

    it('pertanyaan skala wajib tidak dijawab → BadRequest', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(aktifSurvey());
      // hanya menjawab pertanyaan teks (102), skala (101) terlewat
      await expect(
        service.submit(1, { answers: [{ questionId: 102, teks: 'saran' }] }, responden()),
      ).rejects.toThrow(BadRequestException);
    });

    it('single-submit yang sudah mengisi → Conflict (409)', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(aktifSurvey());
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue({ id: 77 });
      await expect(
        service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden()),
      ).rejects.toThrow(ConflictException);
    });

    it('happy path → buat respons dengan dedupeUserId terisi', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(aktifSurvey());
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue({
        id: 1,
        surveyId: 1,
        submittedAt: new Date(),
        answers: [
          { id: 1, questionId: 101, nilai: 4, teks: null, selectedOptionId: null },
          { id: 2, questionId: 102, nilai: null, teks: 'bagus', selectedOptionId: null },
        ],
      });

      const res = await service.submit(
        1,
        {
          answers: [
            { questionId: 101, nilai: 4 },
            { questionId: 102, teks: 'bagus' },
          ],
        },
        responden(10),
      );

      expect(res.answers).toHaveLength(2);
      expect(prisma.surveyResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ dedupeUserId: 10 }) }),
      );
    });

    it('multi-submit → dedupeUserId null (boleh berulang)', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(
        aktifSurvey({ allowMultipleSubmit: true }),
      );
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue({
        id: 2,
        surveyId: 1,
        submittedAt: new Date(),
        answers: [{ id: 3, questionId: 101, nilai: 3, teks: null, selectedOptionId: null }],
      });

      await service.submit(1, { answers: [{ questionId: 101, nilai: 3 }] }, responden());

      expect(prisma.surveyResponse.findFirst).not.toHaveBeenCalled(); // tak perlu pra-cek
      expect(prisma.surveyResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ dedupeUserId: null }) }),
      );
    });
  });

  describe('findAllForSurvey', () => {
    it('Admin OPD lain → Forbidden', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue({ id: 1, opdId: 5 });
      await expect(
        service.findAllForSurvey(
          1,
          { page: 1, limit: 20 },
          {
            userId: 1,
            role: Role.opd,
            opdId: 999,
          },
        ),
      ).rejects.toThrow(/akses/i);
    });

    it('survei tidak ada → NotFound', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.findAllForSurvey(
          1,
          { page: 1, limit: 20 },
          {
            userId: 1,
            role: Role.kabupaten,
            opdId: null,
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
