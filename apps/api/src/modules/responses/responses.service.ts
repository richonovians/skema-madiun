import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Question, QuestionOption, QuestionType, SurveyStatus } from '@prisma/client';
import { assertOpdAccess } from '../../common/auth/opd-scope.util';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { QuestionOptionEntity } from '../questions/entities/question-option.entity';
import { QuestionEntity } from '../questions/entities/question.entity';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { AnswerEntity } from './entities/answer.entity';
import { MyResponseEntity } from './entities/my-response.entity';
import { ResponseEntity } from './entities/response.entity';
import { SurveyFillEntity } from './entities/survey-fill.entity';

@Injectable()
export class ResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ambil survei aktif beserta pertanyaannya untuk diisi responden (BE-22). */
  async getFill(surveyId: number, user: CurrentUser): Promise<SurveyFillEntity> {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: {
          orderBy: { urutan: 'asc' },
          include: { options: { orderBy: { urutan: 'asc' } } },
        },
      },
    });
    // Survei non-aktif tidak boleh diisi; jangan bocorkan keberadaannya → NotFound.
    if (!survey || survey.status !== SurveyStatus.aktif) {
      throw new NotFoundException(`Survei aktif dengan id ${surveyId} tidak ditemukan`);
    }

    const sudahMengisi = survey.allowMultipleSubmit
      ? false
      : (await this.prisma.surveyResponse.findFirst({
          where: { surveyId, dedupeUserId: user.userId },
          select: { id: true },
        })) !== null;

    return new SurveyFillEntity({
      id: survey.id,
      judul: survey.judul,
      periode: survey.periode,
      status: survey.status,
      allowMultipleSubmit: survey.allowMultipleSubmit,
      sudahMengisi,
      questions: survey.questions.map(
        (q) =>
          new QuestionEntity({
            ...q,
            options: q.options.map((o) => new QuestionOptionEntity(o)),
          }),
      ),
    });
  }

  /** Kirim jawaban survei (BE-23). Validasi kelengkapan + anti-duplikat (409). */
  async submit(
    surveyId: number,
    dto: SubmitResponseDto,
    user: CurrentUser,
  ): Promise<ResponseEntity> {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: { include: { options: true } } },
    });
    if (!survey || survey.status !== SurveyStatus.aktif) {
      throw new NotFoundException(`Survei aktif dengan id ${surveyId} tidak ditemukan`);
    }

    const answerData = this.validateAnswers(survey.questions, dto);

    // Anti-duplikat: kolom diisi userId saat single-submit (null saat multi).
    // @@unique([surveyId, dedupeUserId]) + NULLS DISTINCT Postgres menegakkan aturannya.
    const dedupeUserId = survey.allowMultipleSubmit ? null : user.userId;
    if (dedupeUserId !== null) {
      const existing = await this.prisma.surveyResponse.findFirst({
        where: { surveyId, dedupeUserId },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Anda sudah mengisi survei ini');
      }
    }

    try {
      const created = await this.prisma.surveyResponse.create({
        data: {
          surveyId,
          userId: user.userId,
          dedupeUserId,
          answers: { create: answerData },
        },
        include: { answers: true },
      });
      return this.toResponseEntity(created, created.answers);
    } catch (err) {
      // Jaga-jaga balapan (race) menembus pra-cek → langgar unique constraint.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Anda sudah mengisi survei ini');
      }
      throw err;
    }
  }

  /** Daftar respons sebuah survei untuk admin (BE-24). Isolasi data per-OPD. */
  async findAllForSurvey(
    surveyId: number,
    query: PaginationQueryDto,
    user: CurrentUser,
  ): Promise<PaginatedResult<ResponseEntity>> {
    const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) {
      throw new NotFoundException(`Survei dengan id ${surveyId} tidak ditemukan`);
    }
    assertOpdAccess(user, survey.opdId); // Admin OPD hanya OPD-nya; kabupaten (=superuser) semua

    const { page, limit } = query;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.surveyResponse.findMany({
        where: { surveyId },
        include: { answers: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.surveyResponse.count({ where: { surveyId } }),
    ]);

    return paginate(
      rows.map((r) => this.toResponseEntity(r, r.answers)),
      total,
      page,
      limit,
    );
  }

  /**
   * Riwayat survei yang diisi pengguna yang sedang login (2026-08-24).
   *
   * Disaring `userId`, BUKAN `dedupeUserId`: kolom dedupe sengaja null pada survei
   * ber-`allowMultipleSubmit`, jadi memakainya akan menyembunyikan justru survei
   * yang boleh diisi berulang. `userId` selalu terisi (kolom wajib), sehingga
   * riwayatnya lengkap.
   */
  async findMine(
    query: PaginationQueryDto,
    user: CurrentUser,
  ): Promise<PaginatedResult<MyResponseEntity>> {
    const { page, limit } = query;
    const where: Prisma.SurveyResponseWhereInput = { userId: user.userId };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.surveyResponse.findMany({
        where,
        select: {
          id: true,
          surveyId: true,
          submittedAt: true,
          survey: { select: { judul: true, periode: true, opd: { select: { nama: true } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.surveyResponse.count({ where }),
    ]);

    return paginate(
      rows.map(
        (r) =>
          new MyResponseEntity({
            id: r.id,
            surveyId: r.surveyId,
            surveyJudul: r.survey.judul,
            periode: r.survey.periode,
            opdNama: r.survey.opd?.nama ?? null,
            submittedAt: r.submittedAt,
          }),
      ),
      total,
      page,
      limit,
    );
  }

  /**
   * Validasi jawaban terhadap pertanyaan survei; kembalikan data siap-insert.
   * Aturan: pertanyaan skala & pilihan WAJIB dijawab; pertanyaan teks opsional.
   */
  private validateAnswers(
    questions: (Question & { options: QuestionOption[] })[],
    dto: SubmitResponseDto,
  ): Prisma.AnswerCreateWithoutResponseInput[] {
    const byId = new Map(questions.map((q) => [q.id, q]));
    const seen = new Set<number>();
    const data: Prisma.AnswerCreateWithoutResponseInput[] = [];

    for (const a of dto.answers) {
      const q = byId.get(a.questionId);
      if (!q) {
        throw new BadRequestException(
          `Pertanyaan dengan id ${a.questionId} bukan bagian dari survei ini`,
        );
      }
      if (seen.has(a.questionId)) {
        throw new BadRequestException(`Jawaban ganda untuk pertanyaan ${a.questionId}`);
      }
      seen.add(a.questionId);

      if (q.tipe === QuestionType.skala) {
        if (a.nilai == null) {
          throw new BadRequestException(`Pertanyaan ${q.id} (skala) wajib diisi nilai 1-4`);
        }
        data.push({ question: { connect: { id: q.id } }, nilai: a.nilai });
      } else if (q.tipe === QuestionType.teks) {
        data.push({ question: { connect: { id: q.id } }, teks: a.teks ?? null });
      } else if (q.tipe === QuestionType.pilihan) {
        if (a.selectedOptionId == null) {
          throw new BadRequestException(`Pertanyaan ${q.id} (pilihan) wajib memilih satu opsi`);
        }
        if (!q.options.some((o) => o.id === a.selectedOptionId)) {
          throw new BadRequestException(`Opsi ${a.selectedOptionId} bukan opsi pertanyaan ${q.id}`);
        }
        data.push({
          question: { connect: { id: q.id } },
          selectedOption: { connect: { id: a.selectedOptionId } },
        });
      }
    }

    // Kelengkapan: skala (dasar IKM) & pilihan wajib terjawab; teks tetap opsional.
    for (const q of questions) {
      if ((q.tipe === QuestionType.skala || q.tipe === QuestionType.pilihan) && !seen.has(q.id)) {
        throw new BadRequestException(`Pertanyaan ${q.id} wajib dijawab`);
      }
    }

    return data;
  }

  private toResponseEntity(
    row: { id: number; surveyId: number; submittedAt: Date },
    answers: {
      id: number;
      questionId: number;
      nilai: number | null;
      teks: string | null;
      selectedOptionId: number | null;
    }[],
  ): ResponseEntity {
    return new ResponseEntity({
      id: row.id,
      surveyId: row.surveyId,
      submittedAt: row.submittedAt,
      answers: answers.map(
        (a) =>
          new AnswerEntity({
            id: a.id,
            questionId: a.questionId,
            nilai: a.nilai,
            teks: a.teks,
            selectedOptionId: a.selectedOptionId,
          }),
      ),
    });
  }
}
