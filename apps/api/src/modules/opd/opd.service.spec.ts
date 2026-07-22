import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListOpdQueryDto } from './dto/list-opd-query.dto';
import { OpdService } from './opd.service';

const opdRow = {
  id: 1,
  externalId: 'HD-001',
  nama: 'Dinas Kesehatan',
  kode: 'DINKES',
  jenisLayanan: 'Kesehatan',
  penanggungJawab: 'Kepala Dinas Kesehatan',
  isActive: true,
  syncedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('OpdService', () => {
  const prisma = {
    opd: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const service = new OpdService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('findAll mengembalikan PaginatedResult dengan meta yang benar', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[opdRow], 1]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListOpdQueryDto);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].kode).toBe('DINKES');
    expect(result.pagination).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
  });

  it('findOne melempar NotFoundException bila OPD tidak ada', async () => {
    (prisma.opd.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('findOne mengembalikan OpdEntity bila ada', async () => {
    (prisma.opd.findUnique as jest.Mock).mockResolvedValue(opdRow);

    const result = await service.findOne(1);

    expect(result.kode).toBe('DINKES');
    expect(result.externalId).toBe('HD-001');
  });
});
