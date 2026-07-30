import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Question, QuestionOption, QuestionType, Survey, SurveyStatus } from '@prisma/client';
import { assertOpdAccess } from '../../common/auth/opd-scope.util';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { SKM_UNSUR } from '../reference/reference.constants';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ReorderQuestionsDto } from './dto/reorder-questions.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionEntity } from './entities/question.entity';
import { QuestionOptionEntity } from './entities/question-option.entity';

type QuestionWithOptions = Question & { options: QuestionOption[] };

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Daftar pertanyaan sebuah survei (urut `urutan`). */
  async findAllForSurvey(surveyId: number, user: CurrentUser): Promise<QuestionEntity[]> {
    await this.getSurveyOrThrow(surveyId, user);
    const rows = await this.prisma.question.findMany({
      where: { surveyId },
      include: { options: { orderBy: { urutan: 'asc' } } },
      orderBy: { urutan: 'asc' },
    });
    return rows.map((row) => this.toEntity(row));
  }

  /** Tambah pertanyaan (skala/teks/pilihan) di akhir urutan. Hanya saat survei draft. */
  async create(
    surveyId: number,
    dto: CreateQuestionDto,
    user: CurrentUser,
  ): Promise<QuestionEntity> {
    const survey = await this.getSurveyOrThrow(surveyId, user);
    this.assertDraft(survey);
    this.assertValidOptionsForType(dto.tipe, dto.options, dto.isIkmUnsur);

    const created = await this.prisma.question.create({
      data: {
        surveyId,
        teks: dto.teks,
        tipe: dto.tipe,
        isIkmUnsur: dto.isIkmUnsur ?? false,
        kodeUnsur: dto.kodeUnsur ?? null,
        urutan: await this.nextUrutan(surveyId),
        options:
          dto.tipe === QuestionType.pilihan
            ? {
                create: dto.options!.map((o, i) => ({
                  label: o.label,
                  nilai: o.nilai ?? null,
                  urutan: i + 1,
                })),
              }
            : undefined,
      },
      include: { options: { orderBy: { urutan: 'asc' } } },
    });
    return this.toEntity(created);
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

  /** Ubah pertanyaan. Hanya saat survei draft. Opsi (tipe pilihan) tidak dapat diubah di sini. */
  async update(id: number, dto: UpdateQuestionDto, user: CurrentUser): Promise<QuestionEntity> {
    const { question, survey } = await this.getQuestionSurveyOrThrow(id, user);
    this.assertDraft(survey);
    if (question.tipe === QuestionType.pilihan && dto.isIkmUnsur) {
      throw new BadRequestException(
        'Pertanyaan pilihan ganda tidak dapat ditandai sebagai unsur IKM (unsur IKM hanya tipe skala)',
      );
    }

    const updated = await this.prisma.question.update({
      where: { id },
      data: { teks: dto.teks, isIkmUnsur: dto.isIkmUnsur, kodeUnsur: dto.kodeUnsur },
      include: { options: { orderBy: { urutan: 'asc' } } },
    });
    return this.toEntity(updated);
  }

  /** Hapus pertanyaan (beserta opsinya, cascade). Hanya saat survei draft. */
  async remove(id: number, user: CurrentUser): Promise<void> {
    const { survey } = await this.getQuestionSurveyOrThrow(id, user);
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

  private async getQuestionSurveyOrThrow(
    questionId: number,
    user: CurrentUser,
  ): Promise<{ question: Question; survey: Survey }> {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { survey: true },
    });
    if (!question) {
      throw new NotFoundException(`Pertanyaan dengan id ${questionId} tidak ditemukan`);
    }
    assertOpdAccess(user, question.survey.opdId);
    const { survey, ...rest } = question;
    return { question: rest, survey };
  }

  /** Tipe `pilihan` wajib punya ≥2 opsi & tidak boleh jadi unsur IKM (unsur IKM hanya skala). */
  private assertValidOptionsForType(
    tipe: QuestionType,
    options: { label: string; nilai?: number }[] | undefined,
    isIkmUnsur: boolean | undefined,
  ): void {
    if (tipe === QuestionType.pilihan) {
      if (!options || options.length < 2) {
        throw new BadRequestException('Pertanyaan pilihan ganda memerlukan minimal 2 opsi');
      }
      if (isIkmUnsur) {
        throw new BadRequestException(
          'Pertanyaan pilihan ganda tidak dapat ditandai sebagai unsur IKM (unsur IKM hanya tipe skala)',
        );
      }
    } else if (options) {
      throw new BadRequestException(`Opsi hanya berlaku untuk tipe pilihan, bukan ${tipe}`);
    }
  }

  private toEntity(row: QuestionWithOptions): QuestionEntity {
    return new QuestionEntity({
      ...row,
      options: row.options.map((o) => new QuestionOptionEntity(o)),
    });
  }
}
