import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, Survey, SurveyStatus } from '@prisma/client';
import { assertOpdAccess, opdWhereFilter } from '../../common/auth/opd-scope.util';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { IkmService } from '../ikm/ikm.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { ListSurveyQueryDto } from './dto/list-survey-query.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { UpdateSurveyStatusDto } from './dto/update-survey-status.dto';
import { SurveyEntity } from './entities/survey.entity';

/** Transisi status yang diizinkan. */
const ALLOWED_TRANSITIONS: Record<SurveyStatus, SurveyStatus[]> = {
  [SurveyStatus.draft]: [SurveyStatus.aktif, SurveyStatus.ditutup],
  [SurveyStatus.aktif]: [SurveyStatus.ditutup],
  [SurveyStatus.ditutup]: [],
};

@Injectable()
export class SurveysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ikmService: IkmService,
  ) {}

  /** Daftar survei — Kabupaten semua, Admin OPD hanya milik OPD-nya (data isolation). */
  async findAll(
    query: ListSurveyQueryDto,
    user: CurrentUser,
  ): Promise<PaginatedResult<SurveyEntity>> {
    const { page, limit, status } = query;
    const where: Prisma.SurveyWhereInput = { ...opdWhereFilter(user) };
    if (status) {
      where.status = status;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.survey.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.survey.count({ where }),
    ]);

    return paginate(
      rows.map((row) => new SurveyEntity(row)),
      total,
      page,
      limit,
    );
  }

  /** Daftar survei berstatus `aktif` (semua OPD) — untuk dipilih responden (BE-21). */
  async findActive(query: PaginationQueryDto): Promise<PaginatedResult<SurveyEntity>> {
    const { page, limit } = query;
    const where: Prisma.SurveyWhereInput = { status: SurveyStatus.aktif };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.survey.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.survey.count({ where }),
    ]);

    return paginate(
      rows.map((row) => new SurveyEntity(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(id: number, user: CurrentUser): Promise<SurveyEntity> {
    return new SurveyEntity(await this.getAccessibleOrThrow(id, user));
  }

  /** Buat paket survei. Admin OPD → OPD-nya sendiri; superuser → wajib `opdId`. */
  async create(dto: CreateSurveyDto, user: CurrentUser): Promise<SurveyEntity> {
    const opdId = this.resolveOpdId(dto, user);
    await this.assertOpdExists(opdId);

    const created = await this.prisma.survey.create({
      data: {
        opdId,
        judul: dto.judul,
        periode: dto.periode,
        allowMultipleSubmit: dto.allowMultipleSubmit ?? false,
      },
    });
    return new SurveyEntity(created);
  }

  /** Ubah survei — hanya saat status `draft`. */
  async update(id: number, dto: UpdateSurveyDto, user: CurrentUser): Promise<SurveyEntity> {
    const survey = await this.getAccessibleOrThrow(id, user);
    this.assertDraft(survey, 'diubah');

    const updated = await this.prisma.survey.update({
      where: { id },
      data: {
        judul: dto.judul,
        periode: dto.periode,
        allowMultipleSubmit: dto.allowMultipleSubmit,
      },
    });
    return new SurveyEntity(updated);
  }

  /** Hapus survei — hanya saat status `draft`. */
  async remove(id: number, user: CurrentUser): Promise<void> {
    const survey = await this.getAccessibleOrThrow(id, user);
    this.assertDraft(survey, 'dihapus');
    await this.prisma.survey.delete({ where: { id } });
  }

  /** Publikasikan / tutup survei (transisi tervalidasi). */
  async updateStatus(
    id: number,
    dto: UpdateSurveyStatusDto,
    user: CurrentUser,
  ): Promise<SurveyEntity> {
    const survey = await this.getAccessibleOrThrow(id, user);

    if (survey.status === dto.status) {
      return new SurveyEntity(survey);
    }
    if (!ALLOWED_TRANSITIONS[survey.status].includes(dto.status)) {
      throw new BadRequestException(
        `Transisi status ${survey.status} → ${dto.status} tidak diizinkan`,
      );
    }

    const updated = await this.prisma.survey.update({
      where: { id },
      data: { status: dto.status },
    });

    if (dto.status === SurveyStatus.ditutup) {
      // Snapshot hasil IKM final saat survei ditutup — sumber rumus tunggal di IkmService.
      await this.ikmService.snapshot(id);
    }

    return new SurveyEntity(updated);
  }

  /** Duplikasi survei (beserta pertanyaannya) sebagai draft baru. */
  async duplicate(id: number, user: CurrentUser): Promise<SurveyEntity> {
    await this.getAccessibleOrThrow(id, user);
    const original = await this.prisma.survey.findUnique({
      where: { id },
      include: { questions: true },
    });
    if (!original) {
      throw new NotFoundException(`Survei dengan id ${id} tidak ditemukan`);
    }

    const created = await this.prisma.survey.create({
      data: {
        opdId: original.opdId,
        judul: `${original.judul} (Salinan)`,
        periode: original.periode,
        allowMultipleSubmit: original.allowMultipleSubmit,
        status: SurveyStatus.draft,
        questions: {
          create: original.questions.map((q) => ({
            teks: q.teks,
            tipe: q.tipe,
            isIkmUnsur: q.isIkmUnsur,
            kodeUnsur: q.kodeUnsur,
            urutan: q.urutan,
          })),
        },
      },
    });
    return new SurveyEntity(created);
  }

  private resolveOpdId(dto: CreateSurveyDto, user: CurrentUser): number {
    if (user.role === Role.opd) {
      if (user.opdId == null) {
        throw new BadRequestException('Akun OPD tidak tertaut ke OPD mana pun');
      }
      return user.opdId; // Admin OPD selalu membuat untuk OPD-nya sendiri
    }
    // superuser (lolos guard) atau lainnya
    if (dto.opdId == null) {
      throw new BadRequestException('opdId wajib diisi');
    }
    return dto.opdId;
  }

  private async assertOpdExists(opdId: number): Promise<void> {
    const opd = await this.prisma.opd.findUnique({ where: { id: opdId } });
    if (!opd) {
      throw new BadRequestException(`OPD dengan id ${opdId} tidak ditemukan`);
    }
  }

  private assertDraft(survey: Survey, aksi: string): void {
    if (survey.status !== SurveyStatus.draft) {
      throw new BadRequestException(`Survei hanya dapat ${aksi} saat berstatus draft`);
    }
  }

  private async getAccessibleOrThrow(id: number, user: CurrentUser): Promise<Survey> {
    const survey = await this.prisma.survey.findUnique({ where: { id } });
    if (!survey) {
      throw new NotFoundException(`Survei dengan id ${id} tidak ditemukan`);
    }
    assertOpdAccess(user, survey.opdId); // Admin OPD hanya OPD-nya; Kabupaten/superuser semua
    return survey;
  }
}
