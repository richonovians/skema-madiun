import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QuestionType, Survey, SurveyStatus } from '@prisma/client';
import { assertOpdAccess } from '../../common/auth/opd-scope.util';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { SKM_UNSUR } from '../reference/reference.constants';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ReorderQuestionsDto } from './dto/reorder-questions.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionEntity } from './entities/question.entity';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Daftar pertanyaan sebuah survei (urut `urutan`). */
  async findAllForSurvey(surveyId: number, user: CurrentUser): Promise<QuestionEntity[]> {
    await this.getSurveyOrThrow(surveyId, user);
    const rows = await this.prisma.question.findMany({
      where: { surveyId },
      orderBy: { urutan: 'asc' },
    });
    return rows.map((row) => new QuestionEntity(row));
  }

  /** Tambah pertanyaan (skala/teks) di akhir urutan. Hanya saat survei draft. */
  async create(
    surveyId: number,
    dto: CreateQuestionDto,
    user: CurrentUser,
  ): Promise<QuestionEntity> {
    const survey = await this.getSurveyOrThrow(surveyId, user);
    this.assertDraft(survey);

    const created = await this.prisma.question.create({
      data: {
        surveyId,
        teks: dto.teks,
        tipe: dto.tipe,
        isIkmUnsur: dto.isIkmUnsur ?? false,
        kodeUnsur: dto.kodeUnsur ?? null,
        urutan: await this.nextUrutan(surveyId),
      },
    });
    return new QuestionEntity(created);
  }

  /** Terapkan template 9 unsur baku (skip kode yang sudah ada). Hanya saat draft. */
  async applyTemplate(surveyId: number, user: CurrentUser): Promise<QuestionEntity[]> {
    const survey = await this.getSurveyOrThrow(surveyId, user);
    this.assertDraft(survey);

    const existing = await this.prisma.question.findMany({ where: { surveyId } });
    const existingCodes = new Set(existing.map((q) => q.kodeUnsur).filter(Boolean));
    let urutan = existing.reduce((max, q) => Math.max(max, q.urutan), 0);

    for (const unsur of SKM_UNSUR) {
      if (existingCodes.has(unsur.kode)) {
        continue;
      }
      urutan += 1;
      await this.prisma.question.create({
        data: {
          surveyId,
          teks: unsur.teks,
          tipe: QuestionType.skala,
          isIkmUnsur: true,
          kodeUnsur: unsur.kode,
          urutan,
        },
      });
    }
    return this.findAllForSurvey(surveyId, user);
  }

  /** Ubah pertanyaan. Hanya saat survei draft. */
  async update(id: number, dto: UpdateQuestionDto, user: CurrentUser): Promise<QuestionEntity> {
    const survey = await this.getQuestionSurveyOrThrow(id, user);
    this.assertDraft(survey);

    const updated = await this.prisma.question.update({
      where: { id },
      data: { teks: dto.teks, isIkmUnsur: dto.isIkmUnsur, kodeUnsur: dto.kodeUnsur },
    });
    return new QuestionEntity(updated);
  }

  /** Hapus pertanyaan. Hanya saat survei draft. */
  async remove(id: number, user: CurrentUser): Promise<void> {
    const survey = await this.getQuestionSurveyOrThrow(id, user);
    this.assertDraft(survey);
    await this.prisma.question.delete({ where: { id } });
  }

  /** Ubah urutan seluruh pertanyaan survei. Hanya saat draft. */
  async reorder(
    surveyId: number,
    dto: ReorderQuestionsDto,
    user: CurrentUser,
  ): Promise<QuestionEntity[]> {
    const survey = await this.getSurveyOrThrow(surveyId, user);
    this.assertDraft(survey);

    const questions = await this.prisma.question.findMany({
      where: { surveyId },
      select: { id: true },
    });
    const ids = new Set(questions.map((q) => q.id));
    const uniqueOrdered = new Set(dto.orderedIds);
    if (uniqueOrdered.size !== ids.size || !dto.orderedIds.every((id) => ids.has(id))) {
      throw new BadRequestException(
        'orderedIds harus berisi tepat seluruh id pertanyaan survei ini',
      );
    }

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.question.update({ where: { id }, data: { urutan: index + 1 } }),
      ),
    );
    return this.findAllForSurvey(surveyId, user);
  }

  private async nextUrutan(surveyId: number): Promise<number> {
    const agg = await this.prisma.question.aggregate({
      where: { surveyId },
      _max: { urutan: true },
    });
    return (agg._max.urutan ?? 0) + 1;
  }

  private assertDraft(survey: Survey): void {
    if (survey.status !== SurveyStatus.draft) {
      throw new BadRequestException('Pertanyaan hanya dapat diubah saat survei berstatus draft');
    }
  }

  private async getSurveyOrThrow(surveyId: number, user: CurrentUser): Promise<Survey> {
    const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) {
      throw new NotFoundException(`Survei dengan id ${surveyId} tidak ditemukan`);
    }
    assertOpdAccess(user, survey.opdId);
    return survey;
  }

  private async getQuestionSurveyOrThrow(questionId: number, user: CurrentUser): Promise<Survey> {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { survey: true },
    });
    if (!question) {
      throw new NotFoundException(`Pertanyaan dengan id ${questionId} tidak ditemukan`);
    }
    assertOpdAccess(user, question.survey.opdId);
    return question.survey;
  }
}
