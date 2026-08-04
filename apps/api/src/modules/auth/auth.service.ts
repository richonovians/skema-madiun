import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MeEntity } from './entities/me.entity';
import { SessionEntity } from './entities/session.entity';
import { SessionService } from './session/session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Login sementara (BUKAN SSO) — terbitkan sesi untuk pengguna seed yang sudah ada,
   * tanpa password (konsisten dgn keputusan arsitektur: tidak ada auth lokal). Dipagari
   * NonProductionGuard di controller. Digantikan callback SSO nyata saat spec Helpdesk
   * tersedia — SessionService.issue() yang dipanggil di sini akan tetap dipakai sama
   * persis oleh callback itu nanti (lihat SessionService).
   */
  async devLogin(dto: DevLoginDto): Promise<SessionEntity> {
    const identifier = dto.identifier.trim();
    const row = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: identifier.toLowerCase() }, { ssoSubject: identifier }],
      },
      include: { respondentProfile: true },
    });
    if (!row) {
      throw new NotFoundException(
        `Pengguna dengan email/ssoSubject "${identifier}" tidak ditemukan`,
      );
    }
    if (!row.isActive) {
      throw new ForbiddenException('Akun tidak aktif');
    }

    await this.prisma.user.update({ where: { id: row.id }, data: { lastLoginAt: new Date() } });

    const token = this.sessionService.issue(row.id);
    return new SessionEntity({ token, user: new MeEntity(row) });
  }

  /**
   * Sesi lokal bersifat stateless (JWT tanpa daftar pencabutan) — logout sungguhan
   * terjadi di klien (buang token tersimpan). Endpoint ini tetap disediakan sebagai
   * kontrak stabil bagi frontend, dan titik perluasan bila pencabutan sisi-server
   * dibutuhkan nanti (mis. saat SSO nyata aktif) tanpa mengubah kontrak klien.
   */
  logout(): { success: true } {
    return { success: true };
  }

  /** Profil pengguna aktif + profil demografis (bila responden). */
  async getMe(user: CurrentUser): Promise<MeEntity> {
    const row = await this.prisma.user.findFirst({
      where: { id: user.userId, deletedAt: null },
      include: { respondentProfile: true },
    });
    if (!row) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }
    return new MeEntity(row);
  }

  /** Ubah nama (semua peran) + demografis (khusus responden). Data dipakai ulang antar survei. */
  async updateProfile(user: CurrentUser, dto: UpdateProfileDto): Promise<MeEntity> {
    if (dto.nama !== undefined) {
      await this.prisma.user.update({ where: { id: user.userId }, data: { nama: dto.nama } });
    }

    if (user.role === Role.responden) {
      await this.upsertRespondentProfile(user.userId, dto);
    }

    return this.getMe(user);
  }

  private async upsertRespondentProfile(userId: number, dto: UpdateProfileDto): Promise<void> {
    const hasDemografis =
      dto.jenisKelamin !== undefined ||
      dto.kelompokUmur !== undefined ||
      dto.pendidikan !== undefined ||
      dto.pekerjaan !== undefined;
    if (!hasDemografis) {
      return;
    }

    const existing = await this.prisma.respondentProfile.findUnique({ where: { userId } });
    if (existing) {
      // Prisma mengabaikan field undefined → update parsial aman.
      await this.prisma.respondentProfile.update({
        where: { userId },
        data: {
          jenisKelamin: dto.jenisKelamin,
          kelompokUmur: dto.kelompokUmur,
          pendidikan: dto.pendidikan,
          pekerjaan: dto.pekerjaan,
        },
      });
      return;
    }

    // Pembuatan profil baru wajib lengkap (kolom NOT NULL).
    if (!dto.jenisKelamin || !dto.kelompokUmur || !dto.pendidikan || !dto.pekerjaan) {
      throw new BadRequestException(
        'Profil demografis baru memerlukan jenisKelamin, kelompokUmur, pendidikan, dan pekerjaan',
      );
    }
    await this.prisma.respondentProfile.create({
      data: {
        userId,
        jenisKelamin: dto.jenisKelamin,
        kelompokUmur: dto.kelompokUmur,
        pendidikan: dto.pendidikan,
        pekerjaan: dto.pekerjaan,
      },
    });
  }
}
