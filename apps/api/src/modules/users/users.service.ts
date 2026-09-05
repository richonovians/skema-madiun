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
    if (actor.actingRole !== Role.superuser) {
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
      // Menyaring KEPEMILIKAN: "punya role ini", bukan "sedang memakai role
      // ini" -- yang terakhir bahkan tak dapat diketahui dari basis data.
      where.roles = { has: role };
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

  /**
   * Aturan bersama himpunan role, dipakai `create` MAUPUN `update`.
   *
   * Satu tempat, bukan dua salinan: aturan "opd wajib bertaut OPD" pernah
   * ditulis dua kali di berkas ini (create & update), dan itulah bentuk yang
   * cepat atau lambat menyimpang saat salah satunya diubah.
   */
  private normalisasiRoles(
    roles: Role[],
    opdId?: number | null,
  ): { roles: Role[]; opdId: number | null } {
    if (!roles || roles.length === 0) {
      throw new BadRequestException('Minimal satu role harus dipilih');
    }
    const unik = [...new Set(roles)];
    if (unik.includes(Role.opd) && opdId == null) {
      throw new BadRequestException('opdId wajib diisi bila role memuat Admin OPD');
    }
    // Tanpa role `opd`, tautan OPD tak punya arti apa pun -- dikosongkan supaya
    // tak ada sisa yang menyesatkan di antarmuka maupun di penyaring data.
    return { roles: unik, opdId: unik.includes(Role.opd) ? (opdId ?? null) : null };
  }

  async create(dto: CreateUserDto, actor: CurrentUser): Promise<UserEntity> {
    this.assertSuperuser(actor);
    const normal = this.normalisasiRoles(dto.roles, dto.opdId);
    if (normal.opdId != null) {
      await this.assertOpdExists(normal.opdId);
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
        roles: normal.roles,
        opdId: normal.opdId,
        ssoSubject,
        isActive: true,
      },
    });
    return new UserEntity(created);
  }

  /** `roles` opsional; sejak 2026-08-20 hanya superuser yang boleh mengubahnya. */
  async update(id: number, dto: UpdateUserDto, actor: CurrentUser): Promise<UserEntity> {
    this.assertSuperuser(actor);
    const target = await this.getActiveOrThrow(id);

    // Perbandingan HIMPUNAN, bukan `!==` pada array: urutan role yang berbeda
    // bukan perubahan apa pun, dan memperlakukannya sebagai perubahan akan
    // mengunci pengguna dari menyunting akunnya sendiri tanpa sebab.
    const berubah =
      dto.roles !== undefined &&
      (dto.roles.length !== target.roles.length ||
        [...new Set(dto.roles)].sort().join(',') !== [...new Set(target.roles)].sort().join(','));
    if (berubah && id === actor.userId) {
      throw new ForbiddenException('Tidak bisa mengubah role akun sendiri');
    }

    const normal = this.normalisasiRoles(dto.roles ?? target.roles, dto.opdId ?? target.opdId);
    if (normal.opdId != null) {
      await this.assertOpdExists(normal.opdId);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { nama: dto.nama, roles: dto.roles ? normal.roles : undefined, opdId: normal.opdId },
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
