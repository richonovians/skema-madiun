import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  Question,
  QuestionOption,
  QuestionType,
  Survey,
  SurveyStatus,
} from '@prisma/client';
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

/**
 * Skala SKM selalu 1-4 (PermenPANRB 14/2017 Lampiran A) -- karena itu opsi tipe
 * `skala` bukan daftar bebas seperti `pilihan`, melainkan TEPAT 4 label untuk
 * skor 1..4. Skornya tak pernah diambil dari input: `nilai` diisi urutan array
 * (1..4), sehingga label boleh diubah sesuka pengelola TANPA bisa menggeser
 * dasar hitungan IKM.
 */
const SCALE_OPTION_COUNT = 4;

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
        options: dto.options ? { create: this.toOptionRows(dto.tipe, dto.options) } : undefined,
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

  /**
   * Ubah pertanyaan (teks/penandaan unsur) dan/atau GANTI seluruh opsi jawabannya.
   * Hanya saat survei draft.
   *
   * Penggantian opsi dijalankan dalam SATU transaksi bersama perubahan teks:
   * hapus semua opsi lama lalu buat daftar baru. Tak ada jalan "tambal
   * sebagian" (mis. ubah label satu opsi) karena tak ada endpoint per-opsi --
   * dan penggantian penuh justru yang dibutuhkan builder, yang selalu mengirim
   * daftar utuh dari modalnya.
   *
   * Menghapus opsi lama aman terhadap jawaban responden BUKAN karena kebetulan:
   * `assertDraft` memastikan survei masih draf, dan survei draf tak pernah bisa
   * diisi (`ResponsesService.getFill` menuntut status `aktif`), sementara status
   * tak punya transisi kembali ke draf (lihat ALLOWED_TRANSITIONS di
   * SurveysService). Jadi tak mungkin ada baris `answers` yang menunjuk opsi ini.
   */
  async update(id: number, dto: UpdateQuestionDto, user: CurrentUser): Promise<QuestionEntity> {
    const { question, survey } = await this.getQuestionSurveyOrThrow(id, user);
    this.assertDraft(survey);
    if (question.tipe === QuestionType.pilihan && dto.isIkmUnsur) {
      throw new BadRequestException(
        'Pertanyaan pilihan ganda tidak dapat ditandai sebagai unsur IKM (unsur IKM hanya tipe skala)',
      );
    }
    if (dto.options) {
      this.assertReplaceableOptions(question.tipe, dto.options);
    }

    const data: Prisma.QuestionUpdateInput = {
      teks: dto.teks,
      isIkmUnsur: dto.isIkmUnsur,
      kodeUnsur: dto.kodeUnsur,
    };
    if (dto.options) {
      data.options = {
        deleteMany: {},
        create: this.toOptionRows(question.tipe, dto.options),
      };
    }

    const updated = await this.prisma.question.update({
      where: { id },
      data,
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

  /**
   * Aturan opsi per tipe saat MEMBUAT pertanyaan:
   * - `pilihan`: wajib ≥2 opsi, & tak boleh jadi unsur IKM (unsur IKM hanya skala).
   * - `skala`: opsi OPSIONAL (tanpa opsi = label baku SKM 1-4 dipakai frontend);
   *   bila dikirim harus tepat 4, satu label per skor.
   * - `teks`: tak punya opsi sama sekali.
   */
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
      return;
    }
    if (tipe === QuestionType.skala) {
      if (options) {
        this.assertScaleOptionCount(options);
      }
      return;
    }
    if (options) {
      throw new BadRequestException(`Opsi hanya berlaku untuk tipe pilihan & skala, bukan ${tipe}`);
    }
  }

  /** Aturan opsi saat MENGGANTI opsi pertanyaan yang sudah ada (tipe tak bisa berubah). */
  private assertReplaceableOptions(
    tipe: QuestionType,
    options: { label: string; nilai?: number }[],
  ): void {
    if (tipe === QuestionType.teks) {
      throw new BadRequestException('Pertanyaan isian teks tidak memiliki opsi jawaban');
    }
    if (tipe === QuestionType.skala) {
      this.assertScaleOptionCount(options);
      return;
    }
    if (options.length < 2) {
      throw new BadRequestException('Pertanyaan pilihan ganda memerlukan minimal 2 opsi');
    }
  }

  private assertScaleOptionCount(options: { label: string }[]): void {
    if (options.length !== SCALE_OPTION_COUNT) {
      throw new BadRequestException(
        `Pertanyaan skala memerlukan tepat ${SCALE_OPTION_COUNT} label (satu per skor 1-${SCALE_OPTION_COUNT})`,
      );
    }
  }

  /**
   * Bentuk baris `question_options` siap-simpan.
   *
   * `nilai` tipe skala DIPAKSA = posisi (1..4), bukan diambil dari input:
   * skornya adalah dasar rumus IKM, jadi mengubah label tak boleh sampai bisa
   * menggeser bobot. Tipe `pilihan` tetap menerima `nilai` bebas dari pemanggil
   * (di luar cakupan rumus IKM, lihat QuestionOptionInputDto).
   */
  private toOptionRows(
    tipe: QuestionType,
    options: { label: string; nilai?: number }[],
  ): { label: string; nilai: number | null; urutan: number }[] {
    return options.map((o, i) => ({
      label: o.label,
      nilai: tipe === QuestionType.skala ? i + 1 : (o.nilai ?? null),
      urutan: i + 1,
    }));
  }

  private toEntity(row: QuestionWithOptions): QuestionEntity {
    return new QuestionEntity({
      ...row,
      options: row.options.map((o) => new QuestionOptionEntity(o)),
    });
  }
}
