import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UsersService } from './users.service';

const actor = (role: Role): CurrentUser => ({ userId: 1, role, opdId: null });

const userRow = {
  id: 10,
  ssoSubject: 'pending:a@x.go.id',
  nama: 'Admin A',
  email: 'a@x.go.id',
  role: Role.opd,
  opdId: 1,
  isActive: true,
  lastLoginAt: null,
  consentAt: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    opd: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const service = new UsersService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('findAll mengembalikan PaginatedResult (mengecualikan soft-deleted)', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[userRow], 1]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListUsersQueryDto);

    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('findAll (INT-11) menyisipkan opdNama dari relasi opd, tanpa membocorkan objek opd mentah', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [{ ...userRow, opd: { nama: 'Dinas Kesehatan' } }],
      1,
    ]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListUsersQueryDto);

    expect(result.items[0].opdNama).toBe('Dinas Kesehatan');
    expect((result.items[0] as unknown as { opd?: unknown }).opd).toBeUndefined();
  });

  it('findAll: user tanpa opd (responden/kabupaten) → opdNama undefined', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [{ ...userRow, opdId: null, opd: null }],
      1,
    ]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListUsersQueryDto);

    expect(result.items[0].opdNama).toBeUndefined();
  });

  it('findOne melempar NotFound bila tidak ada', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('Kabupaten (= superuser) membuat Admin OPD → sukses', async () => {
    (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(userRow);

    const dto: CreateUserDto = { nama: 'Admin A', email: 'a@x.go.id', role: Role.opd, opdId: 1 };
    const result = await service.create(dto);

    expect(result.role).toBe(Role.opd);
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('Kabupaten (= superuser) membuat akun kabupaten lain → sukses', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      ...userRow,
      role: Role.kabupaten,
      opdId: null,
    });

    const dto: CreateUserDto = { nama: 'K', email: 'k@x.go.id', role: Role.kabupaten };
    const result = await service.create(dto);

    expect(result.role).toBe(Role.kabupaten);
  });

  it('membuat Admin OPD tanpa opdId → BadRequest', async () => {
    const dto: CreateUserDto = { nama: 'A', email: 'a@x.go.id', role: Role.opd };
    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it('email/ssoSubject duplikat → Conflict', async () => {
    (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow);

    const dto: CreateUserDto = { nama: 'A', email: 'a@x.go.id', role: Role.opd, opdId: 1 };
    await expect(service.create(dto)).rejects.toThrow(ConflictException);
  });

  it('updateStatus mengubah isActive → sukses', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow);
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...userRow, isActive: false });

    const result = await service.updateStatus(10, { isActive: false });

    expect(result.isActive).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { isActive: false },
    });
  });

  it('update (2026-08-05) mengubah role akun lain, opd → kabupaten, opdId ikut dikosongkan', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow); // role: opd
    (prisma.user.update as jest.Mock).mockResolvedValue({
      ...userRow,
      role: Role.kabupaten,
      opdId: null,
    });

    const result = await service.update(10, { role: Role.kabupaten }, actor(Role.kabupaten));

    expect(result.role).toBe(Role.kabupaten);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { nama: undefined, role: Role.kabupaten, opdId: null },
    });
  });

  it('update: kabupaten TIDAK BOLEH mengubah role akun sendiri (cegah self-lockout) → Forbidden', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      ...userRow,
      id: 1,
      role: Role.kabupaten,
    });

    await expect(
      service.update(1, { role: Role.opd, opdId: 1 }, actor(Role.kabupaten)),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('update: ubah role ke opd tanpa opdId → BadRequest', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      ...userRow,
      role: Role.kabupaten,
      opdId: null,
    });

    await expect(service.update(10, { role: Role.opd }, actor(Role.kabupaten))).rejects.toThrow(
      BadRequestException,
    );
  });
});
