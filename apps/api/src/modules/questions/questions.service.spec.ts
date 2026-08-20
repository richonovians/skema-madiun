import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { QuestionType, Role, SurveyStatus } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QuestionsService } from './questions.service';

const opdUser = (opdId: number | null): CurrentUser => ({ userId: 1, role: Role.opd, opdId });

const draftSurvey = (opdId = 5) => ({ id: 1, opdId, status: SurveyStatus.draft });

describe('QuestionsService', () => {
  const prisma = {
    survey: { findUnique: jest.fn() },
    question: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const service = new QuestionsService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('create menambah pertanyaan di urutan berikutnya (survei draft)', async () => {
    (prisma.survey.findUnique as jest.Mock).mockResolvedValue(draftSurvey());
    (prisma.question.aggregate as jest.Mock).mockResolvedValue({ _max: { urutan: 2 } });
    (prisma.question.create as jest.Mock).mockResolvedValue({
      id: 3,
      surveyId: 1,
      teks: 'Q',
      tipe: QuestionType.skala,
      isIkmUnsur: false,
      kodeUnsur: null,
      urutan: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
      options: [],
    });

    const dto: CreateQuestionDto = { teks: 'Q', tipe: QuestionType.skala };
    const result = await service.create(1, dto, opdUser(5));

    expect(result.urutan).toBe(3);
    expect(prisma.question.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ urutan: 3 }) }),
    );
  });

  it('create pada survei non-draft → BadRequest', async () => {
    (prisma.survey.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      opdId: 5,
      status: SurveyStatus.aktif,
    });
    const dto: CreateQuestionDto = { teks: 'Q', tipe: QuestionType.skala };
    await expect(service.create(1, dto, opdUser(5))).rejects.toThrow(BadRequestException);
  });

  it('create pada survei OPD lain → Forbidden', async () => {
    (prisma.survey.findUnique as jest.Mock).mockResolvedValue(draftSurvey(99));
    const dto: CreateQuestionDto = { teks: 'Q', tipe: QuestionType.skala };
    await expect(service.create(1, dto, opdUser(5))).rejects.toThrow(ForbiddenException);
  });

  it('applyTemplate membuat 9 unsur (belum ada)', async () => {
    (prisma.survey.findUnique as jest.Mock).mockResolvedValue(draftSurvey());
    (prisma.question.findMany as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    (prisma.question.create as jest.Mock).mockResolvedValue({});

    await service.applyTemplate(1, opdUser(5));

    expect(prisma.question.create).toHaveBeenCalledTimes(9);
  });

  it('reorder dengan id tidak lengkap → BadRequest', async () => {
    (prisma.survey.findUnique as jest.Mock).mockResolvedValue(draftSurvey());
    (prisma.question.findMany as jest.Mock).mockResolvedValue([{ id: 1 }, { id: 2 }]);
    await expect(service.reorder(1, { orderedIds: [1] }, opdUser(5))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('update pertanyaan pada survei non-draft → BadRequest', async () => {
    (prisma.question.findUnique as jest.Mock).mockResolvedValue({
      id: 7,
      survey: { opdId: 5, status: SurveyStatus.aktif },
    });
    await expect(service.update(7, { teks: 'X' }, opdUser(5))).rejects.toThrow(BadRequestException);
  });

  describe('tipe pilihan', () => {
    it('create pilihan tanpa opsi → BadRequest', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(draftSurvey());
      const dto: CreateQuestionDto = { teks: 'Q', tipe: QuestionType.pilihan };
      await expect(service.create(1, dto, opdUser(5))).rejects.toThrow(BadRequestException);
    });

    it('create pilihan dengan 1 opsi saja → BadRequest (minimal 2)', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(draftSurvey());
      const dto: CreateQuestionDto = {
        teks: 'Q',
        tipe: QuestionType.pilihan,
        options: [{ label: 'A' }],
      };
      await expect(service.create(1, dto, opdUser(5))).rejects.toThrow(BadRequestException);
    });

    it('create pilihan dengan isIkmUnsur=true → BadRequest (unsur IKM hanya skala)', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(draftSurvey());
      const dto: CreateQuestionDto = {
        teks: 'Q',
        tipe: QuestionType.pilihan,
        isIkmUnsur: true,
        options: [{ label: 'A' }, { label: 'B' }],
      };
      await expect(service.create(1, dto, opdUser(5))).rejects.toThrow(BadRequestException);
    });

    it('create skala dengan 2 opsi → BadRequest (skala butuh TEPAT 4 label skor)', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(draftSurvey());
      const dto: CreateQuestionDto = {
        teks: 'Q',
        tipe: QuestionType.skala,
        options: [{ label: 'A' }, { label: 'B' }],
      };
      await expect(service.create(1, dto, opdUser(5))).rejects.toThrow(BadRequestException);
    });

    it('create teks dengan options → BadRequest (isian teks tak punya opsi)', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(draftSurvey());
      const dto: CreateQuestionDto = {
        teks: 'Q',
        tipe: QuestionType.teks,
        options: [{ label: 'A' }, { label: 'B' }],
      };
      await expect(service.create(1, dto, opdUser(5))).rejects.toThrow(BadRequestException);
    });

    it('create pilihan valid (≥2 opsi) → sukses, opsi tersimpan nested', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(draftSurvey());
      (prisma.question.aggregate as jest.Mock).mockResolvedValue({ _max: { urutan: 0 } });
      (prisma.question.create as jest.Mock).mockResolvedValue({
        id: 5,
        surveyId: 1,
        teks: 'Kepuasan',
        tipe: QuestionType.pilihan,
        isIkmUnsur: false,
        kodeUnsur: null,
        urutan: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        options: [
          { id: 1, questionId: 5, label: 'Puas', nilai: 1, urutan: 1 },
          { id: 2, questionId: 5, label: 'Tidak puas', nilai: 0, urutan: 2 },
        ],
      });

      const dto: CreateQuestionDto = {
        teks: 'Kepuasan',
        tipe: QuestionType.pilihan,
        options: [
          { label: 'Puas', nilai: 1 },
          { label: 'Tidak puas', nilai: 0 },
        ],
      };
      const result = await service.create(1, dto, opdUser(5));

      expect(result.options).toHaveLength(2);
      expect(result.options?.[0].label).toBe('Puas');
      expect(prisma.question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            options: {
              create: [
                { label: 'Puas', nilai: 1, urutan: 1 },
                { label: 'Tidak puas', nilai: 0, urutan: 2 },
              ],
            },
          }),
        }),
      );
    });

    it('update pertanyaan pilihan dengan isIkmUnsur=true → BadRequest', async () => {
      (prisma.question.findUnique as jest.Mock).mockResolvedValue({
        id: 5,
        tipe: QuestionType.pilihan,
        survey: { opdId: 5, status: SurveyStatus.draft },
      });
      await expect(service.update(5, { isIkmUnsur: true }, opdUser(5))).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // Opsi jawaban dapat diganti setelah pertanyaan dibuat (2026-08-20, permintaan
  // user) -- termasuk label skala 1-4. Sebelum ini UpdateQuestionDto tak punya
  // `options` sama sekali dan frontend memutarinya dengan buat-baru+hapus-lama.
  describe('ganti opsi lewat update', () => {
    const draftQuestion = (tipe: QuestionType) => ({
      id: 5,
      tipe,
      survey: { opdId: 5, status: SurveyStatus.draft },
    });

    const updatedRow = (tipe: QuestionType, options: unknown[]) => ({
      id: 5,
      surveyId: 1,
      teks: 'Q',
      tipe,
      isIkmUnsur: tipe === QuestionType.skala,
      kodeUnsur: null,
      urutan: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      options,
    });

    it('skala: 4 label → opsi lama dihapus & nilai DIPAKSA 1..4 (bukan dari input)', async () => {
      (prisma.question.findUnique as jest.Mock).mockResolvedValue(
        draftQuestion(QuestionType.skala),
      );
      (prisma.question.update as jest.Mock).mockResolvedValue(
        updatedRow(QuestionType.skala, [
          { id: 1, questionId: 5, label: 'Buruk', nilai: 1, urutan: 1 },
        ]),
      );

      // `nilai` sengaja dikirim ngawur — harus diabaikan supaya label tak bisa
      // menggeser dasar hitungan IKM.
      await service.update(
        5,
        {
          options: [
            { label: 'Buruk', nilai: 99 },
            { label: 'Kurang', nilai: 99 },
            { label: 'Baik', nilai: 99 },
            { label: 'Sangat Baik', nilai: 99 },
          ],
        },
        opdUser(5),
      );

      expect(prisma.question.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            options: {
              deleteMany: {},
              create: [
                { label: 'Buruk', nilai: 1, urutan: 1 },
                { label: 'Kurang', nilai: 2, urutan: 2 },
                { label: 'Baik', nilai: 3, urutan: 3 },
                { label: 'Sangat Baik', nilai: 4, urutan: 4 },
              ],
            },
          }),
        }),
      );
    });

    it('skala: 3 label → BadRequest (tepat 4)', async () => {
      (prisma.question.findUnique as jest.Mock).mockResolvedValue(
        draftQuestion(QuestionType.skala),
      );
      await expect(
        service.update(
          5,
          { options: [{ label: 'A' }, { label: 'B' }, { label: 'C' }] },
          opdUser(5),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.question.update).not.toHaveBeenCalled();
    });

    it('pilihan: ≥2 opsi → tersimpan urut, `nilai` dari input dipertahankan', async () => {
      (prisma.question.findUnique as jest.Mock).mockResolvedValue(
        draftQuestion(QuestionType.pilihan),
      );
      (prisma.question.update as jest.Mock).mockResolvedValue(
        updatedRow(QuestionType.pilihan, [
          { id: 9, questionId: 5, label: 'Baru A', nilai: 7, urutan: 1 },
        ]),
      );

      await service.update(
        5,
        { teks: 'Pertanyaan baru', options: [{ label: 'Baru A', nilai: 7 }, { label: 'Baru B' }] },
        opdUser(5),
      );

      expect(prisma.question.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teks: 'Pertanyaan baru',
            options: {
              deleteMany: {},
              create: [
                { label: 'Baru A', nilai: 7, urutan: 1 },
                { label: 'Baru B', nilai: null, urutan: 2 },
              ],
            },
          }),
        }),
      );
    });

    it('teks: kirim opsi → BadRequest (isian teks tak punya opsi)', async () => {
      (prisma.question.findUnique as jest.Mock).mockResolvedValue(draftQuestion(QuestionType.teks));
      await expect(
        service.update(5, { options: [{ label: 'A' }, { label: 'B' }] }, opdUser(5)),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.question.update).not.toHaveBeenCalled();
    });

    it('tanpa `options` → blok opsi TIDAK ikut dikirim (perubahan teks saja tak menghapus opsi)', async () => {
      (prisma.question.findUnique as jest.Mock).mockResolvedValue(
        draftQuestion(QuestionType.pilihan),
      );
      (prisma.question.update as jest.Mock).mockResolvedValue(updatedRow(QuestionType.pilihan, []));

      await service.update(5, { teks: 'Cuma teks' }, opdUser(5));

      const call = (prisma.question.update as jest.Mock).mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(call.data.options).toBeUndefined();
    });

    it('survei non-draft → BadRequest sebelum opsi disentuh', async () => {
      (prisma.question.findUnique as jest.Mock).mockResolvedValue({
        id: 5,
        tipe: QuestionType.skala,
        survey: { opdId: 5, status: SurveyStatus.aktif },
      });
      await expect(
        service.update(
          5,
          {
            options: [{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }],
          },
          opdUser(5),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.question.update).not.toHaveBeenCalled();
    });
  });
});
