import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../prisma/prisma.service';
import { ListOpdQueryDto } from './dto/list-opd-query.dto';
import { OpdEntity } from './entities/opd.entity';

@Injectable()
export class OpdService {
  constructor(private readonly prisma: PrismaService) {}

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
}
