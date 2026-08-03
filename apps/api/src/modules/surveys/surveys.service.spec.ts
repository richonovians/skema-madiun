import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role, SurveyStatus } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { IkmService } from '../ikm/ikm.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { ListSurveyQueryDto } from './dto/list-survey-query.dto';
import { SurveysService } from './surveys.service';

const opdUser = (opdId: number | null): CurrentUser => ({ userId: 1, role: Role.opd, opdId });
const superUser = (): CurrentUser => ({ userId: 9, role: Role.superuser, opdId: null });

const surveyRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  opdId: 5,
  judul: 'Survei A',
  periode: '2026',
  status: SurveyStatus.draft,
  allowMultipleSubmit: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('SurveysService', () => {
  const prisma = {
    survey: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    opd: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const ikmService = {
    snapshot: jest.fn(),
    getSummary: jest.fn().mockResolvedValue({ respondentsCount: 0, nilaiIkm: null }),
  } as unknown as IkmService;
  const service = new SurveysService(prisma, ikmService);

  beforeEach(() => jest.clearAllMocks());

  it('findAll (Admin OPD) mengembalikan PaginatedResult terfilter OPD-nya', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[surveyRow()], 1]);
    (ikmService.getSummary as jest.Mock).mockResolvedValue({
      respondentsCount: 0,
      nilaiIkm: null,
    });
    const result = await service.findAll({ page: 1, limit: 20 } as ListSurveyQueryDto, opdUser(5));
    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('findAll (INT-9) menyisipkan respondentsCount & nilaiIkm dari IkmService.getSummary', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[surveyRow({ id: 7 })], 1]);
    (ikmService.getSummary as jest.Mock).mockResolvedValue({
      respondentsCount: 12,
      nilaiIkm: 81.25,
    });
    const result = await service.findAll({ page: 1, limit: 20 } as ListSurveyQueryDto, opdUser(5));
    expect(result.items[0].respondentsCount).toBe(12);
    expect(result.items[0].nilaiIkm).toBe(81.25);
    expect(ikmService.getSummary).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it('create (Admin OPD) memakai opdId miliknya', async () => {
    (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
    (prisma.survey.create as jest.Mock).mockResolvedValue(surveyRow());
    const dto: CreateSurveyDto = { judul: 'Survei A', periode: '2026' };
    const result = await service.create(dto, opdUser(5));
    expect(result.opdId).toBe(5);
    expect(prisma.survey.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ opdId: 5 }) }),
    );
  });

  it('create (superuser) tanpa opdId → BadRequest', async () => {
    const dto: CreateSurveyDto = { judul: 'A', periode: '2026' };
    await expect(service.create(dto, superUser())).rejects.toThrow(BadRequestException);
  });

  it('update survei non-draft → BadRequest', async () => {
    (prisma.survey.findUnique as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif }),
    );
    await expect(service.update(1, { judul: 'X' }, opdUser(5))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('updateStatus draft → aktif berhasil', async () => {
    (prisma.survey.findUnique as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.draft }),
    );
    (prisma.survey.update as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif }),
    );
    const result = await service.updateStatus(1, { status: SurveyStatus.aktif }, opdUser(5));
    expect(result.status).toBe(SurveyStatus.aktif);
  });

  it('updateStatus ditutup → aktif ditolak (BadRequest)', async () => {
    (prisma.survey.findUnique as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.ditutup }),
    );
    await expect(
      service.updateStatus(1, { status: SurveyStatus.aktif }, opdUser(5)),
    ).rejects.toThrow(BadRequestException);
  });

  it('findOne: Admin OPD akses survei OPD lain → Forbidden', async () => {
    (prisma.survey.findUnique as jest.Mock).mockResolvedValue(surveyRow({ opdId: 99 }));
    await expect(service.findOne(1, opdUser(5))).rejects.toThrow(ForbiddenException);
  });

  it('updateStatus aktif → ditutup memicu snapshot IKM', async () => {
    (prisma.survey.findUnique as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif }),
    );
    (prisma.survey.update as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.ditutup }),
    );
    await service.updateStatus(1, { status: SurveyStatus.ditutup }, opdUser(5));
    expect(ikmService.snapshot).toHaveBeenCalledWith(1);
  });

  it('updateStatus draft → aktif TIDAK memicu snapshot IKM', async () => {
    (prisma.survey.findUnique as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.draft }),
    );
    (prisma.survey.update as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif }),
    );
    await service.updateStatus(1, { status: SurveyStatus.aktif }, opdUser(5));
    expect(ikmService.snapshot).not.toHaveBeenCalled();
  });
});
