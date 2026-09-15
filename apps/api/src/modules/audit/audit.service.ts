import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../prisma/prisma.service';
import { ListAuditLogQueryDto } from './dto/list-audit-log-query.dto';
import { AuditLogEntity } from './entities/audit-log.entity';

type AuditLogRow = {
  id: number;
  actorId: number;
  actor: { nama: string };
  aksi: string;
  entitas: string;
  detail: unknown;
  timestamp: Date;
};

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

  /**
   * Log aktivitas HANYA untuk `superuser` (2026-08-20, atas permintaan user):
   * Admin Kabupaten biasa tidak boleh melihatnya.
   *
   * Dulu pemeriksaan ini SATU-SATUNYA gerbang, karena RolesGuard memberi
   * `kabupaten` bypass penuh atas seluruh @Roles sehingga
   * `@Roles(Role.kabupaten)` di controller tak berlaku sama sekali. Bypass itu
   * dibongkar T6 (7 September 2026) dan dekoratornya kini ditegakkan apa adanya,
   * jadi controller sudah menolak kabupaten lebih dahulu.
   *
   * Pemeriksaan ini TETAP ADA sebagai lapis kedua, dan itu keputusan: gerbang
   * peran hanyalah satu baris daftar yang mudah diperluas keliru, sementara
   * fungsi ini menyatakan batasnya di tempat aturannya berlaku. Konsekuensinya
   * satu penolakan dapat datang dari dua tempat -- karena itu PESANnya berbeda,
   * supaya sebuah uji tak dapat lulus karena gerbang yang salah.
   */
  private assertKabupaten(user: CurrentUser): void {
    if (user.actingRole !== Role.kabupaten) {
      throw new ForbiddenException('Log aktivitas hanya dapat diakses oleh Admin Kabupaten');
    }
  }

  /** Daftar log aktivitas admin (Admin Kabupaten), terbaru lebih dulu. */
  async findAll(
    query: ListAuditLogQueryDto,
    user: CurrentUser,
  ): Promise<PaginatedResult<AuditLogEntity>> {
    this.assertKabupaten(user);
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
      rows.map((row) => this.toEntity(row)),
      total,
      page,
      limit,
    );
  }

  /** Detail satu log aktivitas (Admin Kabupaten) -- dipakai halaman detail (INT-34). */
  async findOne(id: number, user: CurrentUser): Promise<AuditLogEntity> {
    this.assertKabupaten(user);
    const row = await this.prisma.auditLog.findUnique({
      where: { id },
      include: { actor: { select: { nama: true } } },
    });
    if (!row) {
      throw new NotFoundException(`Audit log dengan id ${id} tidak ditemukan`);
    }
    return this.toEntity(row);
  }

  private toEntity(row: AuditLogRow): AuditLogEntity {
    return new AuditLogEntity({
      id: row.id,
      actorId: row.actorId,
      actorNama: row.actor.nama,
      aksi: row.aksi,
      entitas: row.entitas,
      detail: row.detail,
      timestamp: row.timestamp,
    });
  }
}
