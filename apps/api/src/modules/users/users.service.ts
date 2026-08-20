import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Manajemen pengguna HANYA untuk `superuser` (2026-08-20, atas permintaan
   * user) -- Admin Kabupaten biasa tak lagi boleh membuat/mengubah/menghapus akun
   * maupun melihat daftarnya.
   *
   * Diperiksa DI SINI, bukan dengan mengganti `@Roles(Role.kabupaten)` menjadi
   * `@Roles(Role.superuser)` di controller: RolesGuard memberi `kabupaten`
   * BYPASS PENUH atas seluruh @Roles (lihat roles.guard.ts), sehingga dekorator
   * apa pun akan dilewatinya dan pembatasan ini takkan pernah berlaku. Pola sama
   * dipakai `AuditService.assertSuperuser` & `DashboardService.getOpdDashboard`.
   *
   * Konsekuensi yang disengaja: ini juga menutup pintu terakhir untuk MENGUBAH
   * peran akun lain (`PATCH /users/:id`), jadi hanya superuser yang dapat
   * mengangkat/menurunkan admin. Itulah maksud pembatasannya.
   */
  private assertSuperuser(actor: CurrentUser): void {
    if (actor.role !== Role.superuser) {
      throw new ForbiddenException('Manajemen pengguna hanya dapat diakses oleh Superuser');
    }
  }

  async findAll(
    query: ListUsersQueryDto,
    actor: CurrentUser,
  ): Promise<PaginatedResult<UserEntity>> {
    this.assertSuperuser(actor);
    const { page, limit, role, opdId } = query;

    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (role) {
      where.role = role;
    }
    if (opdId !== undefined) {
      where.opdId = opdId;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: { opd: { select: { nama: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(
      rows.map((row) => {
        const { opd, ...rest } = row;
        return new UserEntity({ ...rest, opdNama: opd?.nama });
      }),
      total,
      page,
      limit,
    );
  }

  async findOne(id: number, actor: CurrentUser): Promise<UserEntity> {
    this.assertSuperuser(actor);
    return new UserEntity(await this.getActiveOrThrow(id));
  }

  async create(dto: CreateUserDto, actor: CurrentUser): Promise<UserEntity> {
    this.assertSuperuser(actor);
    if (dto.role === Role.opd && dto.opdId == null) {
      throw new BadRequestException('opdId wajib diisi untuk role opd');
    }
    if (dto.opdId != null) {
      await this.assertOpdExists(dto.opdId);
    }

    const email = dto.email.toLowerCase();
    const ssoSubject = dto.ssoSubject ?? `pending:${email}`;

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { ssoSubject }] },
    });
    if (existing) {
      throw new ConflictException('Email atau ssoSubject sudah digunakan');
    }

    const created = await this.prisma.user.create({
      data: {
        nama: dto.nama,
        email,
        role: dto.role,
        opdId: dto.role === Role.opd ? dto.opdId : null,
        ssoSubject,
        isActive: true,
      },
    });
    return new UserEntity(created);
  }

  /** `role` opsional (2026-08-05); sejak 2026-08-20 hanya superuser yang boleh. */
  async update(id: number, dto: UpdateUserDto, actor: CurrentUser): Promise<UserEntity> {
    this.assertSuperuser(actor);
    const target = await this.getActiveOrThrow(id);

    if (dto.role && dto.role !== target.role && id === actor.userId) {
      throw new ForbiddenException('Tidak bisa mengubah role akun sendiri');
    }

    const nextRole = dto.role ?? target.role;
    const nextOpdId = nextRole === Role.opd ? (dto.opdId ?? target.opdId) : null;
    if (nextRole === Role.opd && nextOpdId == null) {
      throw new BadRequestException('opdId wajib diisi untuk role opd');
    }
    if (nextOpdId != null) {
      await this.assertOpdExists(nextOpdId);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { nama: dto.nama, role: dto.role, opdId: nextOpdId },
    });
    return new UserEntity(updated);
  }

  async updateStatus(
    id: number,
    dto: UpdateUserStatusDto,
    actor: CurrentUser,
  ): Promise<UserEntity> {
    this.assertSuperuser(actor);
    await this.getActiveOrThrow(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
    });
    return new UserEntity(updated);
  }

  /**
   * Hapus akun (2026-08-05, sebelumnya gap: kolom `deletedAt` sudah ada di
   * skema sejak awal -- UU PDP -- tapi tak ada endpoint yg mengisinya sama
   * sekali). SOFT delete (`deletedAt` + `isActive: false`), BUKAN hapus baris
   * -- banyak FK bergantung ke `users` (survey_responses, complaints,
   * audit_logs, dll), lagipula jejak wajib dipertahankan (audit/PDP).
   * Anti-self-lockout sama seperti `update()` role: tak boleh hapus akun sendiri.
   */
  async remove(id: number, actor: CurrentUser): Promise<UserEntity> {
    this.assertSuperuser(actor);
    await this.getActiveOrThrow(id);
    if (id === actor.userId) {
      throw new ForbiddenException('Tidak bisa menghapus akun sendiri');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return new UserEntity(updated);
  }

  private async assertOpdExists(opdId: number): Promise<void> {
    const opd = await this.prisma.opd.findUnique({ where: { id: opdId } });
    if (!opd) {
      throw new BadRequestException(`OPD dengan id ${opdId} tidak ditemukan`);
    }
  }

  private async getActiveOrThrow(id: number): Promise<User> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) {
      throw new NotFoundException(`Pengguna dengan id ${id} tidak ditemukan`);
    }
    return user;
  }
}
