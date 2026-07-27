import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../prisma/prisma.service';
import { ListOpdQueryDto } from './dto/list-opd-query.dto';
import { OpdEntity } from './entities/opd.entity';
import { OpdSyncReport } from './entities/opd-sync-report.entity';
import { OpdSource } from './interfaces/opd-source.interface';
import { OPD_SOURCE } from './opd.constants';

@Injectable()
export class OpdService {
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

    return paginate(
      rows.map((row) => new OpdEntity(row)),
      total,
      page,
      limit,
    );
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
   * Sinkronisasi OPD dari Helpdesk: upsert berdasarkan `externalId`.
   * Bila belum ada baris ber-`externalId` tetapi ada baris dengan `kode` sama
   * (mis. data seed lama), baris itu diadopsi (di-*update* + di-set `externalId`)
   * agar tidak melanggar keunikan `kode`. Record tak lengkap dilewati (skipped).
   */
  async syncFromSource(): Promise<OpdSyncReport> {
    const start = Date.now();
    const items = await this.opdSource.fetchOpdList();
    const syncedAt = new Date();

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of items) {
      if (!item.externalId || !item.kode || !item.nama) {
        skipped += 1;
        continue;
      }

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

    return new OpdSyncReport({
      fetched: items.length,
      created,
      updated,
      skipped,
      durationMs: Date.now() - start,
      syncedAt,
    });
  }
}
