import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QuestionType, Role, SurveyStatus } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { ConsentService } from '../auth/consent.service';
import { ResponsesService } from './responses.service';

const responden = (userId = 10): CurrentUser => ({ userId, role: Role.responden, opdId: null });

const skalaQ = (id: number) => ({ id, surveyId: 1, tipe: QuestionType.skala, options: [] });
const teksQ = (id: number) => ({ id, surveyId: 1, tipe: QuestionType.teks, options: [] });
const pilihanQ = (id: number, optionIds: number[]) => ({
  id,
  surveyId: 1,
  tipe: QuestionType.pilihan,
  options: optionIds.map((oid, i) => ({
    id: oid,
    questionId: id,
    label: `Opsi ${i + 1}`,
    nilai: null,
    urutan: i + 1,
  })),
});

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
  const consent = {
    assertConsented: jest.fn().mockResolvedValue(undefined),
  } as unknown as ConsentService;
  const service = new ResponsesService(prisma, consent);

  /**
   * Penegakan persetujuan PDP (celah 2, 2026-08-27). Penjaga navigasi di
   * frontend saja tak cukup — cookie `consent` dapat disunting pemiliknya,
   * jadi titik pengumpulan datanya sendiri yang harus menolak.
   */
  describe('penegakan persetujuan PDP', () => {
    it('menolak SEBELUM survei dibaca, bukan setelah jawaban tervalidasi', async () => {
      (consent.assertConsented as jest.Mock).mockRejectedValueOnce(
        new ForbiddenException('Anda perlu memberikan persetujuan'),
      );

      await expect(
        service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden()),
      ).rejects.toThrow(ForbiddenException);

      // Menolak lebih awal berarti tak ada kueri yang terbuang, dan pesan
      // galatnya soal persetujuan — bukan soal survei tak ditemukan.
      expect(prisma.survey.findUnique).not.toHaveBeenCalled();
    });

    it('sudah menyetujui -> submit berjalan seperti biasa', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(aktifSurvey());
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue({
        id: 1,
        surveyId: 1,
        submittedAt: new Date(),
        answers: [],
      });

      await service.submit(
        1,
        {
          answers: [
            { questionId: 101, nilai: 4 },
            { questionId: 102, teks: 'ok' },
          ],
        },
        responden(),
      );

      expect(consent.assertConsented).toHaveBeenCalledWith(responden());
    });
  });

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

    describe('tipe pilihan', () => {
      const surveyWithPilihan = () =>
        aktifSurvey({ questions: [skalaQ(101), pilihanQ(201, [301, 302])] });

      it('pilihan wajib memilih opsi → BadRequest bila kosong', async () => {
        (prisma.survey.findUnique as jest.Mock).mockResolvedValue(surveyWithPilihan());
        await expect(
          service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden()),
        ).rejects.toThrow(BadRequestException);
      });

      it('selectedOptionId bukan milik pertanyaan tsb → BadRequest', async () => {
        (prisma.survey.findUnique as jest.Mock).mockResolvedValue(surveyWithPilihan());
        await expect(
          service.submit(
            1,
            {
              answers: [
                { questionId: 101, nilai: 4 },
                { questionId: 201, selectedOptionId: 999 },
              ],
            },
            responden(),
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('sukses → Answer dibuat dengan selectedOption terhubung', async () => {
        (prisma.survey.findUnique as jest.Mock).mockResolvedValue(surveyWithPilihan());
        (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue(null);
        (prisma.surveyResponse.create as jest.Mock).mockResolvedValue({
          id: 1,
          surveyId: 1,
          submittedAt: new Date(),
          answers: [
            { id: 1, questionId: 101, nilai: 4, teks: null, selectedOptionId: null },
            { id: 2, questionId: 201, nilai: null, teks: null, selectedOptionId: 302 },
          ],
        });

        const res = await service.submit(
          1,
          {
            answers: [
              { questionId: 101, nilai: 4 },
              { questionId: 201, selectedOptionId: 302 },
            ],
          },
          responden(10),
        );

        expect(res.answers?.[1].selectedOptionId).toBe(302);
        expect(prisma.surveyResponse.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              answers: {
                create: [
                  { question: { connect: { id: 101 } }, nilai: 4 },
                  {
                    question: { connect: { id: 201 } },
                    selectedOption: { connect: { id: 302 } },
                  },
                ],
              },
            }),
          }),
        );
      });
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
