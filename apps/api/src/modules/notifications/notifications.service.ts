import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Complaint, NotificationType, Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../prisma/prisma.service';
import { ListNotificationQueryDto } from './dto/list-notification-query.dto';
import { NotificationEntity } from './entities/notification.entity';

const STATUS_LABEL: Record<string, string> = {
  diterima: 'Diterima',
  diproses: 'Diproses',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
};

/**
 * Notifikasi in-app (D9, 2026-08-05, cakupan disepakati user): HANYA 2 event
 * -- status pengaduan berubah, dan balasan baru pada pengaduan. Bukan sistem
 * event generik utk seluruh aplikasi (belum diminta, jangan diperluas
 * sendiri). Baris per-penerima disimpan langsung (bukan event+fanout
 * terpisah) -- skala pemakaian tak butuh itu.
 *
 * Setiap method `notify*` SENGAJA menelan errornya sendiri (log lalu lanjut)
 * -- notifikasi adalah efek samping, gagal membuatnya TIDAK BOLEH
 * menggagalkan aksi utama (ubah status/kirim balasan), sama semangatnya dgn
 * AuditInterceptor yg juga toleran thd kegagalan pencatatan.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Pengaduan berpindah status -> beri tahu pelapor (responden pemilik). */
  async notifyComplaintStatusChanged(complaint: Complaint): Promise<void> {
    const label = STATUS_LABEL[complaint.status] ?? complaint.status;
    await this.safeCreate({
      userId: complaint.userId,
      type: NotificationType.complaint_status_changed,
      title: 'Status Pengaduan Diperbarui',
      message: `Pengaduan ${complaint.ticketNo} kini berstatus "${label}"`,
      link: `/complaints/${complaint.ticketNo}`,
    });
  }

  /**
   * Balasan baru -> beri tahu PIHAK LAIN dari yang membalas. Responden
   * membalas -> semua Admin OPD pemilik (bisa >1 akun per OPD) diberi tahu.
   * Admin OPD membalas -> pelapor diberi tahu.
   */
  async notifyComplaintReply(complaint: Complaint, replyAuthorUserId: number): Promise<void> {
    if (replyAuthorUserId === complaint.userId) {
      const opdAdmins = await this.prisma.user.findMany({
        where: { role: Role.opd, opdId: complaint.opdId, isActive: true },
        select: { id: true },
      });
      await Promise.all(
        opdAdmins.map((admin) =>
          this.safeCreate({
            userId: admin.id,
            type: NotificationType.complaint_reply,
            title: 'Balasan Baru pada Pengaduan',
            message: `Ada balasan baru dari pelapor pada pengaduan ${complaint.ticketNo}`,
            link: `/admin-opd/complaints/${complaint.ticketNo}`,
          }),
        ),
      );
      return;
    }

    await this.safeCreate({
      userId: complaint.userId,
      type: NotificationType.complaint_reply,
      title: 'Balasan Baru pada Pengaduan',
      message: `OPD membalas pengaduan ${complaint.ticketNo} Anda`,
      link: `/complaints/${complaint.ticketNo}`,
    });
  }

  /** Daftar notifikasi milik pengguna saat ini, terbaru dulu. */
  async findMine(
    query: ListNotificationQueryDto,
    user: CurrentUser,
  ): Promise<PaginatedResult<NotificationEntity>> {
    const { page, limit, unreadOnly } = query;
    const where = { userId: user.userId, ...(unreadOnly ? { isRead: false } : {}) };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return paginate(
      rows.map((row) => new NotificationEntity(row)),
      total,
      page,
      limit,
    );
  }

  async countUnread(user: CurrentUser): Promise<number> {
    return this.prisma.notification.count({ where: { userId: user.userId, isRead: false } });
  }

  /** Tandai satu notifikasi dibaca. `findFirst` gabungan id+userId -- 404 baik saat tak ada maupun bukan milik (privasi, bukan enumerable). */
  async markAsRead(id: number, user: CurrentUser): Promise<NotificationEntity> {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId: user.userId },
    });
    if (!existing) {
      throw new NotFoundException(`Notifikasi dengan id ${id} tidak ditemukan`);
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return new NotificationEntity(updated);
  }

  async markAllAsRead(user: CurrentUser): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId: user.userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count };
  }

  private async safeCreate(data: {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    link: string;
  }): Promise<void> {
    try {
      await this.prisma.notification.create({ data });
    } catch (err) {
      this.logger.warn(`Gagal membuat notifikasi utk user #${data.userId}: ${String(err)}`);
    }
  }
}
