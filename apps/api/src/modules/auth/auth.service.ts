import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MeEntity } from './entities/me.entity';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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
