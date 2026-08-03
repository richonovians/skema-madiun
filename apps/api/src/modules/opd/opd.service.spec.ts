import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { ListOpdQueryDto } from './dto/list-opd-query.dto';
import { OpdSource } from './interfaces/opd-source.interface';
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
    opd: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    survey: { groupBy: jest.fn() },
    complaint: { groupBy: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const opdSource = { fetchOpdList: jest.fn() };
  const service = new OpdService(prisma, opdSource as unknown as OpdSource);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.opd.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.survey.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.complaint.groupBy as jest.Mock).mockResolvedValue([]);
  });

  it('findAll mengembalikan PaginatedResult dengan meta yang benar', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[opdRow], 1]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListOpdQueryDto);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].kode).toBe('DINKES');
    expect(result.pagination).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
  });

  it('findAll (INT-10) menyisipkan activeSurveys & openComplaints dari groupBy per OPD', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[opdRow], 1]);
    (prisma.survey.groupBy as jest.Mock).mockResolvedValue([{ opdId: 1, _count: { _all: 3 } }]);
    (prisma.complaint.groupBy as jest.Mock).mockResolvedValue([{ opdId: 1, _count: { _all: 5 } }]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListOpdQueryDto);

    expect(result.items[0].activeSurveys).toBe(3);
    expect(result.items[0].openComplaints).toBe(5);
    expect(prisma.survey.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ opdId: { in: [1] }, status: 'aktif' }),
      }),
    );
    expect(prisma.complaint.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          opdId: { in: [1] },
          status: { in: ['diterima', 'diproses'] },
        }),
      }),
    );
  });

  it('findAll: OPD tanpa survei/pengaduan aktif → default 0 (bukan undefined)', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[opdRow], 1]);
    // groupBy default (dari beforeEach) mengembalikan [] — tak ada baris untuk opdId manapun.

    const result = await service.findAll({ page: 1, limit: 20 } as ListOpdQueryDto);

    expect(result.items[0].activeSurveys).toBe(0);
    expect(result.items[0].openComplaints).toBe(0);
  });

  it('findAll: halaman kosong tidak memanggil groupBy sama sekali', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);

    await service.findAll({ page: 1, limit: 20 } as ListOpdQueryDto);

    expect(prisma.survey.groupBy).not.toHaveBeenCalled();
    expect(prisma.complaint.groupBy).not.toHaveBeenCalled();
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

  it('syncFromSource: create untuk OPD baru, update untuk yang sudah ada', async () => {
    opdSource.fetchOpdList.mockResolvedValue([
      { externalId: 'HD-001', kode: 'DINKES', nama: 'Dinas Kesehatan' },
      { externalId: 'HD-002', kode: 'DISDIK', nama: 'Dinas Pendidikan' },
    ]);
    (prisma.opd.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce(null);

    const report = await service.syncFromSource();

    expect(report.fetched).toBe(2);
    expect(report.updated).toBe(1);
    expect(report.created).toBe(1);
    expect(report.skipped).toBe(0);
    expect(prisma.opd.update).toHaveBeenCalledTimes(1);
    expect(prisma.opd.create).toHaveBeenCalledTimes(1);
  });

  it('syncFromSource: melewati record tak lengkap (skipped) & tidak menonaktifkan apa pun', async () => {
    opdSource.fetchOpdList.mockResolvedValue([{ externalId: '', kode: 'X', nama: 'Y' }]);

    const report = await service.syncFromSource();

    expect(report.skipped).toBe(1);
    expect(report.created).toBe(0);
    expect(report.updated).toBe(0);
    // seenExternalIds kosong → guard mencegah updateMany (hindari mass-deactivate).
    expect(prisma.opd.updateMany).not.toHaveBeenCalled();
  });

  it('OPD-4: menonaktifkan OPD tersinkron yang hilang dari source (bukan menghapus)', async () => {
    opdSource.fetchOpdList.mockResolvedValue([
      { externalId: 'HD-001', kode: 'DINKES', nama: 'Dinas Kesehatan' },
    ]);
    (prisma.opd.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1 });
    (prisma.opd.updateMany as jest.Mock).mockResolvedValueOnce({ count: 2 });

    const report = await service.syncFromSource();

    expect(report.deactivated).toBe(2);
    expect(prisma.opd.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true, externalId: { notIn: ['HD-001'] } }),
        data: expect.objectContaining({ isActive: false }),
      }),
    );
  });

  it('OPD-6: melempar ServiceUnavailableException & tidak menyentuh DB saat source gagal', async () => {
    opdSource.fetchOpdList.mockRejectedValue(new Error('Helpdesk down'));

    await expect(service.syncFromSource()).rejects.toThrow(ServiceUnavailableException);
    expect(prisma.opd.create).not.toHaveBeenCalled();
    expect(prisma.opd.update).not.toHaveBeenCalled();
    expect(prisma.opd.updateMany).not.toHaveBeenCalled();
  });

  it('OPD-5: mencatat ringkasan sinkronisasi via Logger', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    opdSource.fetchOpdList.mockResolvedValue([
      { externalId: 'HD-001', kode: 'DINKES', nama: 'Dinas Kesehatan' },
    ]);
    (prisma.opd.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1 });

    await service.syncFromSource();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Sinkronisasi OPD selesai'));
    logSpy.mockRestore();
  });
});
