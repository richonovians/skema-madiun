import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../prisma/prisma.service';
import { ListAuditLogQueryDto } from './dto/list-audit-log-query.dto';
import { AuditLogEntity } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Catat satu aksi admin. SENGAJA menelan error-nya sendiri (best-effort) —
   * kegagalan mencatat audit TIDAK BOLEH menggagalkan aksi utama yang sudah sukses.
   */
  async record(actorId: number, aksi: string, entitas: string, detail: unknown): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: { actorId, aksi, entitas, detail: detail as Prisma.InputJsonValue },
      });
    } catch (err) {
      this.logger.warn(
        `Gagal mencatat audit log (${entitas}.${aksi} oleh #${actorId}): ${String(err)}`,
      );
    }
  }

  /** Daftar log aktivitas admin (Admin Kabupaten), terbaru lebih dulu. */
  async findAll(query: ListAuditLogQueryDto): Promise<PaginatedResult<AuditLogEntity>> {
    const { page, limit, entitas, actorId } = query;
    const where: Prisma.AuditLogWhereInput = {};
    if (entitas) {
      where.entitas = entitas;
    }
    if (actorId) {
      where.actorId = actorId;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { nama: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(
      rows.map(
        (row) =>
          new AuditLogEntity({
            id: row.id,
            actorId: row.actorId,
            actorNama: row.actor.nama,
            aksi: row.aksi,
            entitas: row.entitas,
            detail: row.detail,
            timestamp: row.timestamp,
          }),
      ),
      total,
      page,
      limit,
    );
  }
}
