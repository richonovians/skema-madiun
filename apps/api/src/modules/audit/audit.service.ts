import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { redactAuditBody } from '../../common/interceptors/audit-redact.util';
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
   *
   * REDAKSI DILAKUKAN DI SINI, bukan hanya di `AuditInterceptor`
   * (22 September 2026). Sampai tanggal itu redaksi T8 hidup di interceptor
   * saja, sehingga setiap pemanggil `record()` secara langsung melewatinya
   * sepenuhnya — dan ada satu: `SsoService` menulis `sub` Helpdesk apa adanya
   * ketika sebuah akun lahir memegang peran kabupaten.
   *
   * Yang keliru bukan pemanggil yang lupa, melainkan tempat redaksinya
   * dipasang: selama ia di interceptor, setiap pemanggil BARU harus mengingat
   * sendiri, dan lupanya tak menimbulkan gejala apa pun. Di sini ia menjadi
   * satu-satunya jalan menuju `audit_logs.detail`.
   *
   * Interceptor tetap menyunting lebih dulu, jadi jalur teraudit melewati
   * redaksi dua kali. Itu aman — `[disunting]` yang disunting ulang tetap
   * `[disunting]` — dan dijaga uji tersendiri, bukan diandaikan.
   */
  async record(actorId: number, aksi: string, entitas: string, detail: unknown): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          aksi,
          entitas,
          detail: redactAuditBody(detail) as Prisma.InputJsonValue,
        },
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
    const { page, limit, entitas, actorId, aksi, search, startDate, endDate } = query;
    const where: Prisma.AuditLogWhereInput = {};
    if (entitas) {
      where.entitas = entitas;
    }
    if (actorId) {
      where.actorId = actorId;
    }
    if (aksi) {
      where.aksi = { equals: aksi, mode: 'insensitive' };
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { actor: { nama: { contains: q, mode: 'insensitive' } } },
        { aksi: { contains: q, mode: 'insensitive' } },
        { entitas: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
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
