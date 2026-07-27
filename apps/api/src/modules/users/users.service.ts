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

  async findAll(query: ListUsersQueryDto): Promise<PaginatedResult<UserEntity>> {
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
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(
      rows.map((row) => new UserEntity(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(id: number): Promise<UserEntity> {
    return new UserEntity(await this.getActiveOrThrow(id));
  }

  async create(dto: CreateUserDto, actor: CurrentUser): Promise<UserEntity> {
    this.assertCanAssignRole(dto.role, actor);

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

  async update(id: number, dto: UpdateUserDto, actor: CurrentUser): Promise<UserEntity> {
    const target = await this.getActiveOrThrow(id);
    this.assertCanManageTarget(target.role, actor);

    if (dto.opdId != null) {
      await this.assertOpdExists(dto.opdId);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { nama: dto.nama, opdId: dto.opdId },
    });
    return new UserEntity(updated);
  }

  async updateStatus(
    id: number,
    dto: UpdateUserStatusDto,
    actor: CurrentUser,
  ): Promise<UserEntity> {
    const target = await this.getActiveOrThrow(id);
    this.assertCanManageTarget(target.role, actor);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
    });
    return new UserEntity(updated);
  }

  /** Hanya superuser boleh menetapkan role kabupaten/superuser (cegah eskalasi privilege). */
  private assertCanAssignRole(role: Role, actor: CurrentUser): void {
    if ((role === Role.kabupaten || role === Role.superuser) && actor.role !== Role.superuser) {
      throw new ForbiddenException(
        'Hanya superuser yang boleh menetapkan role kabupaten atau superuser',
      );
    }
  }

  /** Hanya superuser boleh mengelola akun ber-role kabupaten/superuser. */
  private assertCanManageTarget(targetRole: Role, actor: CurrentUser): void {
    if (
      (targetRole === Role.kabupaten || targetRole === Role.superuser) &&
      actor.role !== Role.superuser
    ) {
      throw new ForbiddenException(
        'Hanya superuser yang boleh mengelola akun kabupaten atau superuser',
      );
    }
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
