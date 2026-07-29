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
});
