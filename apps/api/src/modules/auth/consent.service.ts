import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Kode penolakan karena persetujuan PDP belum diberikan (14 September 2026).
 *
 * Ada supaya klien dapat menawarkan JALAN KELUARNYA -- tombol menuju halaman
 * persetujuan -- tanpa mencocokkan bunyi pesan. Presedennya
 * `ROLE_SELECTION_REQUIRED`, dan alasannya tertulis di api.js: "pesan bisa
 * diubah kapan saja tanpa ada yang memerah".
 *
 * Karena itu pesannya sendiri berhenti menyuruh membuka halaman: yang
 * mengatakan APA YANG SALAH adalah pesan, yang mengatakan APA YANG HARUS
 * DILAKUKAN adalah kode ini.
 */
export const CONSENT_REQUIRED = 'CONSENT_REQUIRED';

/**
 * Persetujuan pemrosesan data pribadi (UU PDP) — kolom `users.consent_at`.
 *
 * KOLOMNYA SUDAH ADA SEJAK AWAL tapi TAK PERNAH PUNYA JALUR TULIS sampai
 * 2026-08-27: tak ada satu pun endpoint, layar, atau efek samping yang
 * mengisinya. Callback SSO pun sengaja membiarkannya null (lihat SsoService),
 * karena mengisinya otomatis berarti mencatat persetujuan yang belum pernah
 * diberikan siapa pun — justru kebalikan dari gunanya kolom itu.
 *
 * SIAPA YANG DIMINTAI: hanya `responden`. Admin (kabupaten/opd/superuser)
 * bertindak dalam kapasitas jabatan atas data warga, bukan sebagai subjek data
 * atas dirinya sendiri; memblokir mereka berarti menghentikan pekerjaan untuk
 * persetujuan yang tak relevan bagi mereka.
 *
 * DI MANA DITEGAKKAN: penjaga navigasi ada di frontend (proxy.js + halaman
 * /persetujuan), tapi itu saja tak cukup — cookie dapat disunting pemiliknya.
 * Penegakan sesungguhnya ada di dua titik tempat data pribadi benar-benar
 * dikumpulkan: `POST /surveys/:id/responses` dan `POST /complaints`. Tanpa itu
 * persetujuan ini cuma kosmetik.
 */
@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Fungsi murni — dipakai juga AuthService.getMe untuk mengisi `consentRequired`. */
  static isRequired(role: Role, consentAt: Date | null): boolean {
    return role === Role.responden && consentAt === null;
  }

  /**
   * Tolak bila peran ini wajib menyetujui tapi belum melakukannya.
   *
   * Peran non-responden keluar LEBIH DULU, sebelum kueri apa pun: mereka tak
   * pernah dimintai persetujuan, jadi tak ada alasan membebani setiap
   * permintaan mereka dengan satu perjalanan ke basis data.
   */
  async assertConsented(user: CurrentUser): Promise<void> {
    if (user.actingRole !== Role.responden) {
      return;
    }

    const row = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { consentAt: true },
    });

    // Baris hilang diperlakukan sebagai BELUM menyetujui, bukan diloloskan:
    // ketiadaan bukti persetujuan bukan bukti adanya persetujuan.
    if (!row || ConsentService.isRequired(user.actingRole, row.consentAt)) {
      throw new ForbiddenException({
        message: 'Anda perlu memberikan persetujuan pemrosesan data pribadi sebelum mengirim data.',
        code: CONSENT_REQUIRED,
      });
    }
  }

  /**
   * Catat persetujuan. IDEMPOTEN — pemanggilan ulang tidak menggeser waktunya.
   *
   * Menimpanya berarti kehilangan kapan persetujuan sebenarnya diberikan, dan
   * itu justru satu-satunya hal yang perlu dibuktikan bila kelak ditanyakan.
   *
   * @returns waktu persetujuan yang berlaku (lama bila sudah ada, baru bila belum)
   */
  async record(user: CurrentUser): Promise<Date> {
    const existing = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { consentAt: true },
    });

    if (existing?.consentAt) {
      return existing.consentAt;
    }

    const updated = await this.prisma.user.update({
      where: { id: user.userId },
      data: { consentAt: new Date() },
      select: { consentAt: true },
    });
    // Kolom `consent_at` bisa tertimpa tanpa bekas; audit log memberi jejak
    // waktu & pelaku yang tak ikut hilang. Untuk catatan hukum itu penting.
    await this.audit.record(user.userId, 'consent', 'auth', {});
    this.logger.log(`Persetujuan PDP dicatat untuk pengguna id=${user.userId}`);

    return updated.consentAt ?? new Date();
  }
}
