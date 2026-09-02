import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ComplaintStatus, Prisma, SurveyStatus } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../prisma/prisma.service';
import { ListOpdQueryDto } from './dto/list-opd-query.dto';
import { OpdEntity } from './entities/opd.entity';
import { OpdSyncReport } from './entities/opd-sync-report.entity';
import { HelpdeskOpd, OpdSource } from './interfaces/opd-source.interface';
import { OPD_SOURCE } from './opd.constants';

@Injectable()
export class OpdService {
  private readonly logger = new Logger(OpdService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPD_SOURCE) private readonly opdSource: OpdSource,
  ) {}

  /** Daftar OPD dari cache lokal (paginated + filter). */
  async findAll(query: ListOpdQueryDto): Promise<PaginatedResult<OpdEntity>> {
    const { page, limit, search, isActive } = query;

    const where: Prisma.OpdWhereInput = {};
    if (search) {
      where.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { kode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.opd.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nama: 'asc' },
      }),
      this.prisma.opd.count({ where }),
    ]);

    const { activeSurveysByOpd, openComplaintsByOpd } = await this.countsByOpd(
      rows.map((row) => row.id),
    );

    const items = rows.map(
      (row) =>
        new OpdEntity({
          ...row,
          activeSurveys: activeSurveysByOpd.get(row.id) ?? 0,
          openComplaints: openComplaintsByOpd.get(row.id) ?? 0,
        }),
    );

    return paginate(items, total, page, limit);
  }

  /** Hitung survei aktif & pengaduan belum tuntas per OPD dalam satu putaran (INT-10). */
  private async countsByOpd(opdIds: number[]): Promise<{
    activeSurveysByOpd: Map<number, number>;
    openComplaintsByOpd: Map<number, number>;
  }> {
    if (opdIds.length === 0) {
      return { activeSurveysByOpd: new Map(), openComplaintsByOpd: new Map() };
    }

    const [surveyCounts, complaintCounts] = await Promise.all([
      this.prisma.survey.groupBy({
        by: ['opdId'],
        where: { opdId: { in: opdIds }, status: SurveyStatus.aktif },
        _count: { _all: true },
      }),
      this.prisma.complaint.groupBy({
        by: ['opdId'],
        where: {
          opdId: { in: opdIds },
          status: { in: [ComplaintStatus.diterima, ComplaintStatus.diproses] },
        },
        _count: { _all: true },
      }),
    ]);

    return {
      activeSurveysByOpd: new Map(surveyCounts.map((c) => [c.opdId, c._count._all])),
      openComplaintsByOpd: new Map(complaintCounts.map((c) => [c.opdId, c._count._all])),
    };
  }

  /** Detail satu OPD dari cache lokal. */
  async findOne(id: number): Promise<OpdEntity> {
    const opd = await this.prisma.opd.findUnique({ where: { id } });
    if (!opd) {
      throw new NotFoundException(`OPD dengan id ${id} tidak ditemukan`);
    }
    return new OpdEntity(opd);
  }

  /**
   * Sinkronisasi OPD dari Helpdesk.
   * - Upsert by `externalId` (fallback adopsi baris ber-`kode` sama agar tak bentrok unik).
   * - OPD yang pernah disinkron tetapi HILANG dari source → dinonaktifkan (`isActive=false`),
   *   TIDAK dihapus (jaga FK surveys/complaints).
   * - Record tak lengkap dilewati (skipped).
   * - Sumber Helpdesk tidak tersedia → 503, cache TIDAK diubah.
   */
  async syncFromSource(): Promise<OpdSyncReport> {
    const start = Date.now();

    let items: HelpdeskOpd[];
    try {
      items = await this.opdSource.fetchOpdList();
    } catch (error) {
      this.logger.error(
        'Sinkronisasi OPD gagal: sumber data Helpdesk tidak tersedia',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException('Sumber data OPD (Helpdesk) tidak tersedia');
    }

    const syncedAt = new Date();
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let deactivated = 0;
    const seenExternalIds: string[] = [];

    for (const item of items) {
      if (!item.externalId || !item.kode || !item.nama) {
        skipped += 1;
        continue;
      }
      seenExternalIds.push(item.externalId);

      const data = {
        externalId: item.externalId,
        nama: item.nama,
        kode: item.kode,
        jenisLayanan: item.jenisLayanan ?? null,
        penanggungJawab: item.penanggungJawab ?? null,
        isActive: item.isActive ?? true,
        syncedAt,
      };

      const existing = await this.prisma.opd.findFirst({
        where: { OR: [{ externalId: item.externalId }, { kode: item.kode }] },
      });

      if (existing) {
        await this.prisma.opd.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await this.prisma.opd.create({ data });
        created += 1;
      }
    }

    // OPD-4: nonaktifkan OPD tersinkron (ber-externalId) yang hilang dari source.
    // `notIn` pada kolom nullable otomatis mengecualikan baris ber-externalId null.
    // Guard: hanya jalan bila ada externalId valid (hindari mass-deactivate saat source kosong/anomali).
    if (seenExternalIds.length > 0) {
      const result = await this.prisma.opd.updateMany({
        where: { isActive: true, externalId: { notIn: seenExternalIds } },
        data: { isActive: false, syncedAt },
      });
      deactivated = result.count;
    }

    const report = new OpdSyncReport({
      fetched: items.length,
      created,
      updated,
      deactivated,
      skipped,
      durationMs: Date.now() - start,
      syncedAt,
    });

    this.logger.log(
      `Sinkronisasi OPD selesai: fetched=${report.fetched} created=${created} updated=${updated} deactivated=${deactivated} skipped=${skipped} (${report.durationMs}ms)`,
    );
    if (skipped > 0) {
      this.logger.warn(`${skipped} record OPD dilewati karena data tidak lengkap`);
    }

    return report;
  }
}
